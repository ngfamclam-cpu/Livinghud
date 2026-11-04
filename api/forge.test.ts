import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { handle } from './forge'
import { sha256, normalizeKey } from '../server/blob'
import { memoryStore } from '../server/memoryStore'
import { FORGE_SERIES, forgePrompt, pickPack } from '../src/engine/forge'

const KEY = 'ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2'
const req = (body: unknown, key: string | null = KEY) =>
  new Request('https://x/api/forge', { method: 'POST', body: JSON.stringify(body), headers: key ? { 'x-sync-key': key } : {} })
const env = (globalThis as unknown as { process: { env: Record<string, string | undefined> } }).process.env

async function withSave() {
  const store = memoryStore()
  await store.write(`saves/${await sha256(normalizeKey(KEY)!)}.json`, '{}')
  return store
}
const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } })) as unknown as typeof fetch

describe('forge api', () => {
  beforeEach(() => {
    env.CLOUDFLARE_ACCOUNT_ID = 'acct'
    env.CLOUDFLARE_API_TOKEN = 'tok'
  })
  afterEach(() => {
    delete env.CLOUDFLARE_ACCOUNT_ID
    delete env.CLOUDFLARE_API_TOKEN
  })

  it('makes a catalog card and sends the catalog prompt to Cloudflare', async () => {
    let sent: { url: string; body: { prompt: string; steps: number }; auth: string } | null = null
    const fetcher = (async (url: string, init: RequestInit) => {
      sent = { url, body: JSON.parse(String(init.body)), auth: new Headers(init.headers).get('authorization') ?? '' }
      return new Response(JSON.stringify({ success: true, result: { image: 'QUJD' } }), { status: 200 })
    }) as unknown as typeof fetch
    const res = await handle(req({ cardId: 'after-0' }), await withSave(), fetcher)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ image: 'QUJD' })
    expect(sent!.url).toContain('/accounts/acct/ai/run/@cf/black-forest-labs/flux-1-schnell')
    expect(sent!.auth).toBe('Bearer tok')
    expect(sent!.body.prompt).toBe(forgePrompt(FORGE_SERIES[0].cards[0]))
  })

  it('only makes catalog cards, for known saves', async () => {
    const ok = reply(200, { success: true, result: { image: 'QUJD' } })
    expect((await handle(req({ cardId: 'anything goes' }), await withSave(), ok)).status).toBe(400)
    expect((await handle(req({ cardId: 'after-0' }), memoryStore(), ok)).status).toBe(403)
    expect((await handle(req({ cardId: 'after-0' }, null), await withSave(), ok)).status).toBe(400)
  })

  it('reports a missing setup, a used-up allowance and errors', async () => {
    expect((await handle(req({ cardId: 'after-0' }), await withSave(), reply(429, { success: false, errors: [{ code: 3036, message: 'daily free allocation exceeded' }] }))).status).toBe(429)
    expect((await handle(req({ cardId: 'after-0' }), await withSave(), reply(401, { success: false }))).status).toBe(503)
    expect((await handle(req({ cardId: 'after-0' }), await withSave(), reply(500, { success: false, errors: [{ code: 1, message: 'boom' }] }))).status).toBe(502)
    delete env.CLOUDFLARE_API_TOKEN
    expect((await handle(req({ cardId: 'after-0' }), await withSave(), reply(200, {}))).status).toBe(503)
  })
})

describe('pack picking', () => {
  it('gives a mixed 2/2/1/1 pack from different series, rarest last', () => {
    const pack = pickPack('seed-1')
    expect(pack.map(p => p.card.rarity)).toEqual(['common', 'common', 'rare', 'rare', 'epic', 'legendary'])
    expect(new Set(pack.map(p => p.card.series)).size).toBe(6)
    expect(new Set(pack.map(p => p.card.id)).size).toBe(6)
  })
  it('skips recently made cards and varies the look', () => {
    const first = pickPack('seed-2')
    const next = pickPack('seed-3', first.map(p => p.card.id))
    for (const p of next) expect(first.map(f => f.card.id)).not.toContain(p.card.id)
    const card = first[0].card
    expect(forgePrompt(card, 0)).not.toBe(forgePrompt(card, 4321))
  })
  it('has both styles at every rarity', () => {
    for (const r of ['common', 'rare', 'epic', 'legendary']) {
      const styles = new Set(FORGE_SERIES.flatMap(s => s.cards).filter(c => c.rarity === r).map(c => c.style))
      expect(styles).toEqual(new Set(['real', 'anime']))
    }
  })
  it('keeps every prompt fictional, adult and non-nude, within the model limit', () => {
    for (const c of FORGE_SERIES.flatMap(s => s.cards)) {
      for (const v of [0, 77, 9999]) {
        const p = forgePrompt(c, v)
        expect(p).toMatch(/woman/)
        expect(p).toMatch(/mid-20s/)
        expect(p).toMatch(/fictional adult/)
        expect(p).toMatch(/No nudity/)
        expect(p).not.toMatch(/\bgirl\b|pasties|topless|nude\b/i)
        expect(p.length).toBeLessThan(2048)
      }
    }
  })
  it('only accepts variants in range', async () => {
    env.CLOUDFLARE_ACCOUNT_ID = 'acct'
    env.CLOUDFLARE_API_TOKEN = 'tok'
    const ok = reply(200, { success: true, result: { image: 'QUJD' } })
    expect((await handle(req({ cardId: 'rave-0', variant: 123 }), await withSave(), ok)).status).toBe(200)
    expect((await handle(req({ cardId: 'rave-0', variant: -1 }), await withSave(), ok)).status).toBe(400)
    expect((await handle(req({ cardId: 'rave-0', variant: 1.5 }), await withSave(), ok)).status).toBe(400)
  })
})

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
    const res = await handle(req({ cardId: 'neon-0' }), await withSave(), fetcher)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ image: 'QUJD' })
    expect(sent!.url).toContain('/accounts/acct/ai/run/@cf/black-forest-labs/flux-1-schnell')
    expect(sent!.auth).toBe('Bearer tok')
    expect(sent!.body.prompt).toBe(forgePrompt(FORGE_SERIES[0].cards[0]))
  })

  it('only makes catalog cards, for known saves', async () => {
    const ok = reply(200, { success: true, result: { image: 'QUJD' } })
    expect((await handle(req({ cardId: 'anything goes' }), await withSave(), ok)).status).toBe(400)
    expect((await handle(req({ cardId: 'neon-0' }), memoryStore(), ok)).status).toBe(403)
    expect((await handle(req({ cardId: 'neon-0' }, null), await withSave(), ok)).status).toBe(400)
  })

  it('reports a missing setup, a used-up allowance and errors', async () => {
    expect((await handle(req({ cardId: 'neon-0' }), await withSave(), reply(429, { success: false, errors: [{ code: 3036, message: 'daily free allocation exceeded' }] }))).status).toBe(429)
    expect((await handle(req({ cardId: 'neon-0' }), await withSave(), reply(401, { success: false }))).status).toBe(503)
    expect((await handle(req({ cardId: 'neon-0' }), await withSave(), reply(500, { success: false, errors: [{ code: 1, message: 'boom' }] }))).status).toBe(502)
    delete env.CLOUDFLARE_API_TOKEN
    expect((await handle(req({ cardId: 'neon-0' }), await withSave(), reply(200, {}))).status).toBe(503)
  })
})

describe('pack picking', () => {
  it('gives six cards of one series, rarest last, avoiding the last series', () => {
    const { series, cards } = pickPack('seed-1', null)
    expect(cards).toHaveLength(6)
    expect(new Set(cards.map(c => c.series))).toEqual(new Set([series.id]))
    expect(cards.at(-1)!.rarity).toBe('legendary')
    for (let i = 0; i < 20; i++) expect(pickPack(`s${i}`, series.id).series.id).not.toBe(series.id)
  })
  it('keeps every prompt fictional, adult and clothed', () => {
    for (const c of FORGE_SERIES.flatMap(s => s.cards)) {
      const p = forgePrompt(c)
      expect(p).toMatch(/fictional adult woman/)
      expect(p).toMatch(/fully clothed/)
      expect(p.length).toBeLessThan(2048)
    }
  })
})

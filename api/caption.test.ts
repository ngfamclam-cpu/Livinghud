import { describe, expect, it } from 'vitest'
import type Anthropic from '@anthropic-ai/sdk'
import { handle } from './caption'
import { sha256, normalizeKey } from '../server/blob'
import { memoryStore } from '../server/memoryStore'

const KEY = 'ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2'
const req = (body: unknown, key: string | null = KEY) =>
  new Request('https://x/api/caption', { method: 'POST', body: JSON.stringify(body), headers: key ? { 'x-sync-key': key } : {} })
const fake = (answer: { stop_reason: string; text: string }) =>
  ({ beta: { messages: { create: async () => ({ stop_reason: answer.stop_reason, content: [{ type: 'text', text: answer.text }] }) } } }) as unknown as Anthropic

async function withSave() {
  const store = memoryStore()
  await store.write(`saves/${await sha256(normalizeKey(KEY)!)}.json`, '{}')
  return store
}

describe('caption api', () => {
  it('returns the AI caption for a known save', async () => {
    const res = await handle(req({ image: 'QUJD' }), await withSave(), fake({ stop_reason: 'end_turn', text: '{"name":"Neon Muse","text":"Lights up the room.","rarity":"epic"}' }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ name: 'Neon Muse', text: 'Lights up the room.', rarity: 'epic' })
  })

  it('refuses unknown saves, bad input and declined images', async () => {
    const ok = fake({ stop_reason: 'end_turn', text: '{"name":"A","text":"B","rarity":"rare"}' })
    expect((await handle(req({ image: 'QUJD' }), memoryStore(), ok)).status).toBe(403)
    expect((await handle(req({ image: 'QUJD' }, null), await withSave(), ok)).status).toBe(400)
    expect((await handle(req({ image: '<script>' }), await withSave(), ok)).status).toBe(400)
    expect((await handle(req({ image: 'QUJD' }), await withSave(), fake({ stop_reason: 'refusal', text: '' }))).status).toBe(422)
    expect((await handle(req({ image: 'QUJD' }), await withSave(), fake({ stop_reason: 'end_turn', text: 'no json here' }))).status).toBe(502)
  })

  it('says it is not set up when there is no API key', async () => {
    expect((await handle(req({ image: 'QUJD' }), await withSave())).status).toBe(503)
  })
})

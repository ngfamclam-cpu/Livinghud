import { describe, expect, it } from 'vitest'
import { handle, normalizeKey, type SaveStore } from './sync'

const KEY = 'ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2'
const save = JSON.stringify({ format: 'livinghud-save', version: 2, players: [{ id: 'local' }] })

function memoryStore(): SaveStore & { files: Map<string, string> } {
  const files = new Map<string, string>()
  return { files, read: async p => files.get(p) ?? null, write: async (p, b) => void files.set(p, b) }
}

const req = (method: string, key: string | null, body?: string) =>
  new Request('https://x/api/sync', { method, body, headers: key ? { 'x-sync-key': key } : {} })

describe('sync api', () => {
  it('stores a save and returns it for the same code', async () => {
    const store = memoryStore()
    expect((await handle(req('GET', KEY), store)).status).toBe(404)
    expect((await handle(req('PUT', KEY, save), store)).status).toBe(200)
    const res = await handle(req('GET', KEY.toLowerCase().replace(/-/g, ' '), undefined), store)
    expect(res.status).toBe(200)
    expect(await res.text()).toBe(save)
  })

  it('never stores the code itself', async () => {
    const store = memoryStore()
    await handle(req('PUT', KEY, save), store)
    const [path] = store.files.keys()
    expect(path).toMatch(/^saves\/[0-9a-f]{64}\.json$/)
    expect(path).not.toContain(normalizeKey(KEY)!)
  })

  it('keeps different codes apart', async () => {
    const store = memoryStore()
    await handle(req('PUT', KEY, save), store)
    expect((await handle(req('GET', 'ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ'), store)).status).toBe(404)
  })

  it('rejects missing codes and things that are not saves', async () => {
    const store = memoryStore()
    expect((await handle(req('GET', null), store)).status).toBe(400)
    expect((await handle(req('GET', 'short'), store)).status).toBe(400)
    expect((await handle(req('PUT', KEY, '{"hello":1}'), store)).status).toBe(400)
    expect((await handle(req('PUT', KEY, 'not json'), store)).status).toBe(400)
    expect(store.files.size).toBe(0)
  })

  it('says when cloud storage is not connected', async () => {
    const broken: SaveStore = {
      read: async () => { throw new Error('No token found. Either configure the BLOB_READ_WRITE_TOKEN environment variable') },
      write: async () => {},
    }
    const res = await handle(req('GET', KEY), broken)
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({ error: 'not-configured' })
  })
})

import { describe, expect, it } from 'vitest'
import { handle, type InboxItem } from './trigger'
import { memoryStore } from '../server/memoryStore'
import type { Store } from '../server/blob'

const T = 'ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2'
const base = 'https://hud.example/api/trigger'
const fire = (store: Store, q: string, extra = '', at = 1000) => handle(new Request(`${base}?t=${T}&q=${q}${extra}`), store, at)
const inbox = async (store: Store): Promise<InboxItem[]> => (await (await handle(new Request(`${base}?t=${T}&inbox=1`), store)).json()).items
const ack = (store: Store, ids: string[]) =>
  handle(new Request(`${base}?t=${T}&ack=1`, { method: 'POST', body: JSON.stringify({ ids }) }), store)

describe('trigger api', () => {
  it('queues completions from a plain link and lists them for the app', async () => {
    const store = memoryStore()
    expect((await fire(store, 'quest-1', '', 1000)).status).toBe(200)
    expect((await fire(store, 'quest-2', '&v=min', 2000)).status).toBe(200)
    const items = await inbox(store)
    expect(items.map(i => [i.questId, i.version, i.at])).toEqual([['quest-1', 'full', 1000], ['quest-2', 'min', 2000]])
  })

  it('removes only the completions the app handled', async () => {
    const store = memoryStore()
    await fire(store, 'a')
    await fire(store, 'b')
    const [first] = await inbox(store)
    await ack(store, [first.id])
    expect((await inbox(store)).map(i => i.questId)).toEqual(['b'])
  })

  it('does not lose a completion when someone else writes at the same moment', async () => {
    const store = memoryStore()
    await fire(store, 'a')
    // Another write sneaks in between this request's read and write, once.
    const racing: Store = {
      ...store,
      read: store.read,
      write: store.write,
      writeIf: async (p, body, etag) => {
        racing.writeIf = store.writeIf
        await fire(store, 'sneaky')
        return store.writeIf(p, body, etag)
      },
    }
    expect((await fire(racing, 'b')).status).toBe(200)
    expect((await inbox(store)).map(i => i.questId).sort()).toEqual(['a', 'b', 'sneaky'])
  })

  it('keeps players apart and stores only a hash of the token', async () => {
    const store = memoryStore()
    await fire(store, 'a')
    const other = await handle(new Request(`${base}?t=ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ-ZZZZZ&inbox=1`), store)
    expect((await other.json()).items).toEqual([])
    expect([...store.files.keys()][0]).toMatch(/^inbox\/[0-9a-f]{64}\.json$/)
  })

  it('rejects links without a token or quest', async () => {
    const store = memoryStore()
    expect((await handle(new Request(`${base}?q=a`), store)).status).toBe(400)
    expect((await handle(new Request(`${base}?t=${T}`), store)).status).toBe(400)
    expect((await handle(new Request(`${base}?t=${T}&q=../../etc`), store)).status).toBe(400)
    expect(store.files.size).toBe(0)
  })
})

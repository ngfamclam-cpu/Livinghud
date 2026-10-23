import { describe, expect, it } from 'vitest'
import { handle } from './photo'
import { memoryPhotoStore } from '../server/memoryStore'

const KEY = 'ABCDE-FGHJK-LMNPQ-RSTUV-WXYZ2'
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 1, 2, 3]).buffer
const req = (method: string, query: string, opts: { key?: string | null; body?: ArrayBuffer; type?: string } = {}) =>
  new Request(`https://x/api/photo?${query}`, {
    method,
    body: opts.body,
    headers: { ...(opts.key === null ? {} : { 'x-sync-key': opts.key ?? KEY }), ...(opts.type ? { 'content-type': opts.type } : {}) },
  })

describe('photo api', () => {
  it('stores, returns and deletes a photo', async () => {
    const store = memoryPhotoStore()
    const id = 'a1b2c3d4-e5f6'
    expect((await handle(req('GET', `id=${id}`), store)).status).toBe(404)
    expect((await handle(req('PUT', `id=${id}`, { body: jpeg, type: 'image/jpeg' }), store)).status).toBe(200)
    const got = await handle(req('GET', `id=${id}`), store)
    expect(got.headers.get('content-type')).toBe('image/jpeg')
    expect(new Uint8Array(await got.arrayBuffer())).toEqual(new Uint8Array(jpeg))
    expect(await (await handle(req('GET', 'usage=1'), store)).json()).toEqual({ count: 1, bytes: 6 })
    expect((await handle(req('DELETE', `id=${id}`), store)).status).toBe(200)
    expect((await handle(req('GET', `id=${id}`), store)).status).toBe(404)
  })

  it('keeps photos in a folder named by a hash of the code', async () => {
    const store = memoryPhotoStore()
    await handle(req('PUT', 'id=abcdefgh', { body: jpeg, type: 'image/jpeg' }), store)
    expect([...store.files.keys()][0]).toMatch(/^photos\/[0-9a-f]{64}\/abcdefgh$/)
    // A different code can't see it.
    expect((await handle(req('GET', 'id=abcdefgh', { key: 'ZZZZZ-FGHJK-LMNPQ-RSTUV-WXYZ2' }), store)).status).toBe(404)
  })

  it('rejects bad requests', async () => {
    const store = memoryPhotoStore()
    expect((await handle(req('GET', 'id=abcdefgh', { key: null }), store)).status).toBe(400)
    expect((await handle(req('GET', 'id=../etc', {}), store)).status).toBe(400)
    expect((await handle(req('PUT', 'id=abcdefgh', { body: jpeg, type: 'text/html' }), store)).status).toBe(415)
    expect((await handle(req('PUT', 'id=abcdefgh', { body: new ArrayBuffer(2_000_000), type: 'image/jpeg' }), store)).status).toBe(413)
  })
})

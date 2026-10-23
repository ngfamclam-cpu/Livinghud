// Cloud save for LivingHUD, stored in this Vercel project's Blob storage.
// A device proves which save is its own with a secret sync code. Only a hash
// of the code is used as the file name, so the code itself is never stored.
//
// GET  /api/sync   header x-sync-key -> the save file, or 404 if none yet
// PUT  /api/sync   header x-sync-key, body = save file -> stores it

import { blobStore, jsonResponse, normalizeKey, sha256, storageError, type Store } from '../server/blob.js'

const MAX_BYTES = 2_000_000

export async function handle(request: Request, store: Store = blobStore): Promise<Response> {
  const key = normalizeKey(request.headers.get('x-sync-key') ?? '')
  if (!key) return jsonResponse({ error: 'bad-key' }, 400)
  const path = `saves/${await sha256(key)}.json`

  try {
    if (request.method === 'GET') {
      const saved = await store.read(path)
      return saved
        ? new Response(saved.body, { headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
        : jsonResponse({ error: 'not-found' }, 404)
    }
    if (request.method === 'PUT') {
      const body = await request.text()
      if (body.length > MAX_BYTES) return jsonResponse({ error: 'too-large' }, 413)
      let data: { format?: string; players?: unknown }
      try {
        data = JSON.parse(body)
      } catch {
        return jsonResponse({ error: 'bad-save' }, 400)
      }
      if (data?.format !== 'livinghud-save' || !Array.isArray(data.players)) return jsonResponse({ error: 'bad-save' }, 400)
      await store.write(path, body)
      return jsonResponse({ ok: true })
    }
    return jsonResponse({ error: 'method' }, 405)
  } catch (e) {
    return storageError(e)
  }
}

export const GET = (request: Request) => handle(request)
export const PUT = (request: Request) => handle(request)

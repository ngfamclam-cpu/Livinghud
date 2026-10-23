// Life-log photos, stored privately in this Vercel project's Blob storage.
// The same secret sync code as the save proves whose photos they are; files
// live in a folder named after a hash of the code. The app shrinks photos to
// about 300 KB before uploading.
//
// PUT    /api/photo?id=ID   header x-sync-key, body = JPEG/WebP -> stores it
// GET    /api/photo?id=ID   header x-sync-key -> the photo, or 404
// DELETE /api/photo?id=ID   header x-sync-key -> removes it
// GET    /api/photo?usage=1 header x-sync-key -> { count, bytes }

import { blobPhotoStore, jsonResponse, normalizeKey, sha256, storageError, type PhotoStore } from '../server/blob.js'

const MAX_BYTES = 1_500_000
const TYPES = ['image/jpeg', 'image/webp']

export async function handle(request: Request, store: PhotoStore = blobPhotoStore): Promise<Response> {
  const key = normalizeKey(request.headers.get('x-sync-key') ?? '')
  if (!key) return jsonResponse({ error: 'bad-key' }, 400)
  const url = new URL(request.url)
  const folder = `photos/${await sha256(key)}/`

  try {
    if (request.method === 'GET' && url.searchParams.has('usage')) return jsonResponse(await store.usage(folder))
    const id = url.searchParams.get('id') ?? ''
    if (!/^[a-zA-Z0-9-]{8,64}$/.test(id)) return jsonResponse({ error: 'bad-id' }, 400)
    const path = `${folder}${id}`

    if (request.method === 'GET') {
      const photo = await store.read(path)
      return photo
        ? new Response(photo.body, { headers: { 'content-type': photo.type, 'cache-control': 'private, max-age=31536000, immutable' } })
        : jsonResponse({ error: 'not-found' }, 404)
    }
    if (request.method === 'PUT') {
      const type = (request.headers.get('content-type') ?? '').split(';')[0]
      if (!TYPES.includes(type)) return jsonResponse({ error: 'bad-type' }, 415)
      const body = await request.arrayBuffer()
      if (body.byteLength === 0) return jsonResponse({ error: 'empty' }, 400)
      if (body.byteLength > MAX_BYTES) return jsonResponse({ error: 'too-large' }, 413)
      await store.write(path, body, type)
      return jsonResponse({ ok: true })
    }
    if (request.method === 'DELETE') {
      await store.remove(path)
      return jsonResponse({ ok: true })
    }
    return jsonResponse({ error: 'method' }, 405)
  } catch (e) {
    return storageError(e)
  }
}

export const GET = (request: Request) => handle(request)
export const PUT = (request: Request) => handle(request)
export const DELETE = (request: Request) => handle(request)

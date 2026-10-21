// Cloud save for LivingHUD, stored in this Vercel project's Blob storage.
// A device proves which save is its own with a secret sync code. Only a hash
// of the code is used as the file name, so the code itself is never stored.
//
// GET  /api/sync   header x-sync-key -> the save file, or 404 if none yet
// PUT  /api/sync   header x-sync-key, body = save file -> stores it

import { get, put } from '@vercel/blob'

const MAX_BYTES = 2_000_000

/** The storage calls the handler needs, swappable in tests. */
export interface SaveStore {
  read(path: string): Promise<string | null>
  write(path: string, body: string): Promise<void>
}

/** Prefer private blobs; fall back to public ones if the store was created as public. */
const blobStore: SaveStore = {
  async read(path) {
    const result = await withAccess(access => get(path, { access, useCache: false }))
    if (!result || result.statusCode !== 200) return null
    return await new Response(result.stream).text()
  },
  async write(path, body) {
    await withAccess(access =>
      put(path, body, { access, allowOverwrite: true, addRandomSuffix: false, contentType: 'application/json', cacheControlMaxAge: 60 }),
    )
  },
}

let preferred: 'private' | 'public' = 'private'
async function withAccess<T>(op: (access: 'private' | 'public') => Promise<T>): Promise<T> {
  try {
    return await op(preferred)
  } catch (e) {
    if (!/access|private|public/i.test(String(e))) throw e
    preferred = preferred === 'private' ? 'public' : 'private'
    return await op(preferred)
  }
}

export async function handle(request: Request, store: SaveStore = blobStore): Promise<Response> {
  const key = normalizeKey(request.headers.get('x-sync-key') ?? '')
  if (!key) return json({ error: 'bad-key' }, 400)
  const path = `saves/${await sha256(key)}.json`

  try {
    if (request.method === 'GET') {
      const body = await store.read(path)
      return body ? new Response(body, { headers: noStore({ 'content-type': 'application/json' }) }) : json({ error: 'not-found' }, 404)
    }
    if (request.method === 'PUT') {
      const body = await request.text()
      if (body.length > MAX_BYTES) return json({ error: 'too-large' }, 413)
      let data: { format?: string; players?: unknown }
      try {
        data = JSON.parse(body)
      } catch {
        return json({ error: 'bad-save' }, 400)
      }
      if (data?.format !== 'livinghud-save' || !Array.isArray(data.players)) return json({ error: 'bad-save' }, 400)
      await store.write(path, body)
      return json({ ok: true })
    }
    return json({ error: 'method' }, 405)
  } catch (e) {
    // Most often: no Blob store connected to this project yet.
    const notSetUp = /token|store/i.test(String(e))
    return json({ error: notSetUp ? 'not-configured' : 'storage-error' }, 503)
  }
}

export const GET = (request: Request) => handle(request)
export const PUT = (request: Request) => handle(request)

/** Sync codes are shown with dashes and read case-insensitively. */
export function normalizeKey(raw: string): string | null {
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return key.length >= 20 && key.length <= 64 ? key : null
}

async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

function noStore(headers: Record<string, string>): Record<string, string> {
  return { ...headers, 'cache-control': 'no-store' }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: noStore({ 'content-type': 'application/json' }) })
}

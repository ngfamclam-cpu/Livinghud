// The Vercel Blob calls the API functions share, behind a small interface so
// tests can swap in an in-memory store. Lives outside api/ so Vercel doesn't
// turn it into an endpoint of its own.

import { BlobPreconditionFailedError, get, put } from '@vercel/blob'

export interface Stored {
  body: string
  /** Version tag; a write that passes it only succeeds if nobody wrote in between. */
  etag: string
}

export interface Store {
  read(path: string): Promise<Stored | null>
  /** Overwrites the file. */
  write(path: string, body: string): Promise<void>
  /**
   * Writes only if the file is still at version etag (or still missing when etag is null).
   * Returns false if someone else wrote first.
   */
  writeIf(path: string, body: string, etag: string | null): Promise<boolean>
}

const json = { contentType: 'application/json', addRandomSuffix: false, cacheControlMaxAge: 60 } as const

export const blobStore: Store = {
  async read(path) {
    const result = await withAccess(access => get(path, { access, useCache: false }))
    if (!result || result.statusCode !== 200) return null
    return { body: await new Response(result.stream).text(), etag: result.blob.etag }
  },
  async write(path, body) {
    await withAccess(access => put(path, body, { ...json, access, allowOverwrite: true }))
  },
  async writeIf(path, body, etag) {
    try {
      await withAccess(access =>
        put(path, body, etag ? { ...json, access, ifMatch: etag } : { ...json, access, allowOverwrite: false }),
      )
      return true
    } catch (e) {
      if (e instanceof BlobPreconditionFailedError || /exist/i.test(String(e))) return false
      throw e
    }
  },
}

/** Prefer private blobs; fall back to public ones if the store was created as public. */
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

/** Most storage errors mean no Blob store is connected to the project yet. */
export function storageError(e: unknown): Response {
  const notSetUp = /token|store/i.test(String(e))
  return jsonResponse({ error: notSetUp ? 'not-configured' : 'storage-error' }, 503)
}

export async function sha256(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Secret codes are shown with dashes and read case-insensitively. */
export function normalizeKey(raw: string): string | null {
  const key = raw.toUpperCase().replace(/[^A-Z0-9]/g, '')
  return key.length >= 20 && key.length <= 64 ? key : null
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } })
}

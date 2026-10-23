// Life-log photos: shrunk on the device, kept in a local cache, and uploaded to
// this app's Vercel Blob storage (api/photo.ts) under the same sync code as the
// save. Other devices download a photo the first time they show it.

import { useEffect, useState } from 'react'
import { db } from './db'
import { syncKey } from './sync'
import { newId } from './db'
import type { MemoryPhoto } from '../engine'

const ENDPOINT = '/api/photo'
/** Longest side after shrinking. Plenty for a phone or a PC screen. */
const MAX_SIDE = 1600
/** Aim for photos around 300 KB. */
const TARGET_BYTES = 350_000

/** Shrinks a camera/gallery image to a JPEG of about 300 KB. */
export async function shrinkPhoto(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => createImageBitmap(file))
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  let blob: Blob | null = null
  for (const quality of [0.82, 0.72, 0.62, 0.5]) {
    blob = await new Promise<Blob | null>(r => canvas.toBlob(r, 'image/jpeg', quality))
    if (blob && blob.size <= TARGET_BYTES) break
  }
  if (!blob) throw new Error('This photo could not be read.')
  return { blob, width, height }
}

/** Shrinks and caches a new photo, then starts its upload. */
export async function addPhoto(file: Blob): Promise<MemoryPhoto> {
  const { blob, width, height } = await shrinkPhoto(file)
  const id = newId()
  await db.photoCache.put({ id, blob, uploaded: 0, createdAt: Date.now() })
  void uploadPending()
  return { id, width, height, bytes: blob.size }
}

let uploading = false

/** Uploads every photo waiting in the cache. Safe to call often. */
export async function uploadPending(): Promise<void> {
  const key = syncKey()
  if (!key || uploading || !navigator.onLine) return
  uploading = true
  try {
    const waiting = await db.photoCache.where('uploaded').equals(0).toArray()
    for (const p of waiting) {
      const res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(p.id)}`, {
        method: 'PUT',
        body: p.blob,
        headers: { 'x-sync-key': key, 'content-type': p.blob.type || 'image/jpeg' },
      }).catch(() => null)
      if (!res?.ok) break // offline or storage not set up: try again later
      await db.photoCache.update(p.id, { uploaded: 1 })
    }
  } finally {
    uploading = false
  }
}

export function startPhotoUploads(): void {
  void uploadPending()
  window.addEventListener('online', () => void uploadPending())
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void uploadPending())
  setInterval(() => void uploadPending(), 120_000)
}

const inFlight = new Map<string, Promise<Blob | null>>()

/** The photo from this device's cache, or downloaded from the cloud (then cached). */
export function loadPhoto(id: string): Promise<Blob | null> {
  if (!inFlight.has(id)) {
    inFlight.set(
      id,
      (async () => {
        const cached = await db.photoCache.get(id)
        if (cached) return cached.blob
        const key = syncKey()
        if (!key) return null
        const res = await fetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { headers: { 'x-sync-key': key } }).catch(() => null)
        if (!res?.ok || !res.headers.get('content-type')?.startsWith('image/')) return null
        const blob = await res.blob()
        await db.photoCache.put({ id, blob, uploaded: 1, createdAt: Date.now() })
        return blob
      })().finally(() => setTimeout(() => inFlight.delete(id), 0)),
    )
  }
  return inFlight.get(id)!
}

/** An object URL for a photo, or null while it loads (or if it can't be found). */
export function usePhotoUrl(id: string | null | undefined): { url: string | null; missing: boolean } {
  const [state, setState] = useState<{ id: string | null; url: string | null; missing: boolean }>({ id: null, url: null, missing: false })
  useEffect(() => {
    if (!id) return
    let url: string | null = null
    let live = true
    void loadPhoto(id).then(blob => {
      if (!live) return
      url = blob ? URL.createObjectURL(blob) : null
      setState({ id, url, missing: !blob })
    })
    return () => {
      live = false
      if (url) URL.revokeObjectURL(url)
    }
  }, [id])
  return state.id === id ? state : { url: null, missing: false }
}

/** Removes photos from this device and the cloud. */
export async function deletePhotos(ids: string[]): Promise<void> {
  await db.photoCache.bulkDelete(ids)
  const key = syncKey()
  if (!key) return
  await Promise.all(ids.map(id => fetch(`${ENDPOINT}?id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { 'x-sync-key': key } }).catch(() => null)))
}

/** How much cloud storage the photos use; null if it can't be checked. */
export async function photoUsage(): Promise<{ count: number; bytes: number } | null> {
  const key = syncKey()
  if (!key) return null
  const res = await fetch(`${ENDPOINT}?usage=1`, { headers: { 'x-sync-key': key } }).catch(() => null)
  if (!res?.ok || !res.headers.get('content-type')?.includes('application/json')) return null
  return res.json()
}

/** Photos on this device still waiting to upload. */
export const pendingUploads = () => db.photoCache.where('uploaded').equals(0).count()

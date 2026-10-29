// Browser side of bulk card import: decode each image once at a working size,
// find the person, measure it, and later cut the final card image. Pure maths
// (crop, quality, rarity, captions) is in src/engine/cardImport.ts.

import { autoCaption, cardCrop, imageStats, qualityScore, type ImageStats, type PoseHint, type Rarity, type Rect } from '../../engine'
import { findPerson } from '../../capture/photoPose'
import { syncKey } from '../../db/sync'

/** Longest side kept for the working copy (enough for a sharp card, light on memory for 50 images). */
const WORK_SIDE = 1600
/** Final card image size (5:7). */
const CARD_W = 750
const CARD_H = 1050
export const MAX_BATCH = 50

export interface Draft {
  key: string
  fileName: string
  /** Working copy of the image (JPEG), and a URL for showing it. */
  blob: Blob
  url: string
  width: number
  height: number
  /** The auto crop, and the one the player adjusted (in working-copy pixels). */
  autoCrop: Rect
  crop: Rect
  zoom: number
  pan: { x: number; y: number }
  person: boolean
  pose: PoseHint | null
  stats: ImageStats
  score: number
  rarity: Rarity
  name: string
  text: string
  /** Where the name and text came from. */
  captionBy: 'auto' | 'ai'
}

function canvasOf(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = Math.max(1, Math.round(w))
  c.height = Math.max(1, Math.round(h))
  return c
}

const toBlob = (c: HTMLCanvasElement, quality: number) =>
  new Promise<Blob>((resolve, reject) => c.toBlob(b => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', quality))

/** Decodes, finds the person, measures and auto-crops one image. Rarity is set later across the batch. */
export async function analyse(file: File, index: number): Promise<Omit<Draft, 'rarity'>> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions).catch(() => createImageBitmap(file))
  const scale = Math.min(1, WORK_SIDE / Math.max(bitmap.width, bitmap.height))
  const work = canvasOf(bitmap.width * scale, bitmap.height * scale)
  work.getContext('2d')!.drawImage(bitmap, 0, 0, work.width, work.height)
  const origMin = Math.min(bitmap.width, bitmap.height)
  bitmap.close?.()

  // The pose model runs on a smaller copy; its box is scaled back up.
  const small = canvasOf(work.width * Math.min(1, 640 / Math.max(work.width, work.height)), work.height * Math.min(1, 640 / Math.max(work.width, work.height)))
  small.getContext('2d')!.drawImage(work, 0, 0, small.width, small.height)
  const found = await findPerson(small)
  const k = work.width / small.width
  const box = found ? { x: found.box.x * k, y: found.box.y * k, w: found.box.w * k, h: found.box.h * k } : null

  const tiny = canvasOf(160, (160 * work.height) / work.width)
  const tctx = tiny.getContext('2d', { willReadFrequently: true })!
  tctx.drawImage(work, 0, 0, tiny.width, tiny.height)
  const stats = imageStats(tctx.getImageData(0, 0, tiny.width, tiny.height).data, tiny.width, tiny.height)

  const blob = await toBlob(work, 0.9)
  const crop = cardCrop(work.width, work.height, box)
  const caption = autoCaption(stats, found?.pose ?? null, `${file.name}:${file.size}:${index}`)
  return {
    key: `${index}-${file.name}-${file.size}`,
    fileName: file.name,
    blob,
    url: URL.createObjectURL(blob),
    width: work.width,
    height: work.height,
    autoCrop: crop,
    crop,
    zoom: 1,
    pan: { x: 0, y: 0 },
    person: !!found,
    pose: found?.pose ?? null,
    stats,
    score: qualityScore(stats, origMin, origMin, !!found),
    name: caption.name,
    text: caption.text,
    captionBy: 'auto',
  }
}

async function cut(d: Pick<Draft, 'blob' | 'crop'>, w: number, h: number, quality: number): Promise<Blob> {
  const bitmap = await createImageBitmap(d.blob)
  const c = canvasOf(w, h)
  const ctx = c.getContext('2d')!
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(bitmap, d.crop.x, d.crop.y, d.crop.w, d.crop.h, 0, 0, w, h)
  bitmap.close?.()
  return toBlob(c, quality)
}

/** The final card image: the crop, at card size. */
export const renderCard = (d: Pick<Draft, 'blob' | 'crop'>) => cut(d, CARD_W, CARD_H, 0.86)

export type AiResult = { name: string; text: string; rarity: Rarity } | 'not-configured' | 'declined' | 'failed'

/** Asks the optional AI caption service (api/caption.ts) to name a card. */
export async function aiCaption(d: Pick<Draft, 'blob' | 'crop'>): Promise<AiResult> {
  const key = syncKey()
  if (!key) return 'not-configured'
  const small = await cut(d, 366, 512, 0.8)
  const bytes = new Uint8Array(await small.arrayBuffer())
  let binary = ''
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000))
  const res = await fetch('/api/caption', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sync-key': key },
    body: JSON.stringify({ image: btoa(binary) }),
  }).catch(() => null)
  if (!res) return 'failed'
  if (!res.headers.get('content-type')?.includes('application/json')) return 'not-configured'
  if (res.status === 503 || res.status === 403) return 'not-configured'
  if (res.status === 422) return 'declined'
  if (!res.ok) return 'failed'
  return res.json()
}

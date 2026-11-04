// Pack Forge, app side: asks api/forge.ts for each card's image, crops it with
// the bulk-import tools, saves it as one of your cards and reveals it as a drop.

import { pickPack, type ForgeCard } from '../engine'
import { addCustomCard, grantCard } from './actions'
import { db, LOCAL_USER } from './db'
import { addPhoto } from './photos'
import { syncKey } from './sync'
import { analyse, renderCard } from '../ui/loot/bulkImport'

export type ForgeOutcome =
  | { ok: true; made: number; series: string }
  | { ok: false; reason: 'no-sync' | 'not-configured' | 'limit' | 'failed'; made: number; series: string; message?: string }

/** Two images at a time: quick, and gentle on the free allowance's rate limit. */
const PARALLEL = 2

async function makeImage(key: string, card: ForgeCard): Promise<Blob | { error: 'not-configured' | 'limit' | 'failed'; message?: string }> {
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sync-key': key },
    body: JSON.stringify({ cardId: card.id }),
  }).catch(() => null)
  if (!res) return { error: 'failed', message: 'No connection.' }
  if (!res.headers.get('content-type')?.includes('application/json')) return { error: 'not-configured', message: 'The forge is not on this server yet.' }
  const data = (await res.json().catch(() => ({}))) as { image?: string; error?: string; message?: string }
  if (res.status === 503 || res.status === 403) return { error: 'not-configured', message: data.message ?? data.error }
  if (res.status === 429) return { error: 'limit', message: data.message }
  if (!res.ok || !data.image) return { error: 'failed', message: data.message ?? data.error }
  const bin = atob(data.image)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

/** Forges one pack (6 cards from one series). Cards that were made are kept even if a later one fails. */
export async function forgePack(onProgress: (done: number, total: number) => void = () => {}): Promise<ForgeOutcome> {
  const player = await db.players.get(LOCAL_USER)
  const mine = await db.customCards.where('userId').equals(LOCAL_USER).toArray()
  const last = mine.filter(c => c.forge).sort((a, b) => b.createdAt - a.createdAt)[0]
  const packId = `forge-${Date.now()}`
  const { series, cards } = pickPack(`${player?.id ?? 'local'}:${packId}`, last?.forge?.split('-')[0] ?? null)
  const key = syncKey()
  if (!key) return { ok: false, reason: 'no-sync', made: 0, series: series.name }

  const images: (Blob | null)[] = new Array(cards.length).fill(null)
  let failure: { error: 'not-configured' | 'limit' | 'failed'; message?: string } | null = null
  let done = 0
  onProgress(0, cards.length)
  for (let i = 0; i < cards.length && !failure; i += PARALLEL) {
    const batch = cards.slice(i, i + PARALLEL)
    const results = await Promise.all(batch.map(c => makeImage(key, c)))
    results.forEach((r, j) => {
      if (r instanceof Blob) images[i + j] = r
      else failure = failure ?? r
    })
    done += batch.length
    onProgress(Math.min(done, cards.length), cards.length)
  }

  // Save in pack order (rarest last), then reveal each one.
  let made = 0
  for (let i = 0; i < cards.length; i++) {
    const image = images[i]
    if (!image) continue
    const card = cards[i]
    const draft = await analyse(new File([image], `${card.id}.jpg`, { type: 'image/jpeg' }), i)
    const photo = await addPhoto(await renderCard(draft))
    URL.revokeObjectURL(draft.url)
    const id = await addCustomCard({ name: card.name, rarity: card.rarity, text: card.text, photoId: photo.id, forge: card.id })
    await grantCard(`custom-${id}`, 'forge', `${packId}-${i}`)
    made++
  }
  const f = failure as { error: 'not-configured' | 'limit' | 'failed'; message?: string } | null
  return f ? { ok: false, reason: f.error, made, series: series.name, message: f.message } : { ok: true, made, series: series.name }
}

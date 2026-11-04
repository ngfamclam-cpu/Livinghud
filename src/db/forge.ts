// Pack Forge, app side: asks api/forge.ts for each card's image, crops it with
// the bulk-import tools, saves it as one of your cards and reveals it as a drop.

import { forgeCard, pickPack, type PackPick } from '../engine'
import { addCustomCard, grantCard } from './actions'
import { db, LOCAL_USER } from './db'
import { addPhoto } from './photos'
import { syncKey } from './sync'
import { analyse, renderCard } from '../ui/loot/bulkImport'

export type ForgeOutcome =
  | { ok: true; made: number; series: string; skipped: number }
  | { ok: false; reason: 'no-sync' | 'not-configured' | 'limit' | 'failed'; made: number; series: string; skipped: number; message?: string }

type FatalError = { error: 'not-configured' | 'limit' | 'failed'; message?: string }
type ImageError = FatalError | { error: 'declined'; message?: string }

/** The last pack's cards and looks (this device), for "Forge again with the same prompts". */
const LAST_KEY = 'livinghud-forge-last'

export function lastPack(): PackPick[] | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LAST_KEY) ?? 'null') as { cardId: string; variant: number }[] | null
    const picks = (raw ?? []).flatMap(r => {
      const card = forgeCard(r.cardId)
      return card ? [{ card, variant: r.variant }] : []
    })
    return picks.length ? picks : null
  } catch {
    return null
  }
}

function rememberPack(picks: PackPick[]) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(picks.map(p => ({ cardId: p.card.id, variant: p.variant }))))
  } catch {
    // Private mode: the "same prompts" button just won't be offered.
  }
}

/** Two images at a time: quick, and gentle on the free allowance's rate limit. */
const PARALLEL = 2

async function makeImage(key: string, { card, variant }: PackPick): Promise<Blob | ImageError> {
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sync-key': key },
    body: JSON.stringify({ cardId: card.id, variant }),
  }).catch(() => null)
  if (!res) return { error: 'failed', message: 'No connection.' }
  if (!res.headers.get('content-type')?.includes('application/json')) return { error: 'not-configured', message: 'The forge is not on this server yet.' }
  const data = (await res.json().catch(() => ({}))) as { image?: string; error?: string; message?: string }
  if (res.status === 503 || res.status === 403) return { error: 'not-configured', message: data.message ?? data.error }
  if (res.status === 429) return { error: 'limit', message: data.message }
  if (res.status === 422) return { error: 'declined', message: data.message }
  if (!res.ok || !data.image) return { error: 'failed', message: data.message ?? data.error }
  const bin = atob(data.image)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: 'image/jpeg' })
}

/**
 * Forges one mixed pack (2 Common, 2 Rare, 1 Epic, 1 Legendary), or remakes the
 * last pack with the same prompts. Cards that were made are kept even if a later
 * one fails; a card the image filter refuses is skipped.
 */
export async function forgePack(onProgress: (done: number, total: number) => void = () => {}, opts: { again?: boolean } = {}): Promise<ForgeOutcome> {
  const player = await db.players.get(LOCAL_USER)
  const mine = await db.customCards.where('userId').equals(LOCAL_USER).toArray()
  // Skip the cards from your last few packs so each pack feels new.
  const recent = mine.filter(c => c.forge).sort((a, b) => b.createdAt - a.createdAt).slice(0, 18).map(c => c.forge!)
  const packId = `forge-${Date.now()}`
  const again = opts.again ? lastPack() : null
  const picks = again ?? pickPack(`${player?.id ?? 'local'}:${packId}`, recent)
  const cards = picks.map(p => p.card)
  const series = { name: again ? 'Same prompts' : 'Mixed pack' }
  const key = syncKey()
  if (!key) return { ok: false, reason: 'no-sync', made: 0, series: series.name, skipped: 0 }
  rememberPack(picks)

  const images: (Blob | null)[] = new Array(cards.length).fill(null)
  let failure: FatalError | null = null
  let skipped = 0
  let done = 0
  onProgress(0, cards.length)
  for (let i = 0; i < cards.length && !failure; i += PARALLEL) {
    const batch = cards.slice(i, i + PARALLEL)
    const results = await Promise.all(picks.slice(i, i + PARALLEL).map(p => makeImage(key, p)))
    results.forEach((r, j) => {
      if (r instanceof Blob) images[i + j] = r
      else if (r.error === 'declined') skipped++
      else failure = failure ?? (r as FatalError)
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
  const f = failure as FatalError | null
  return f ? { ok: false, reason: f.error, made, series: series.name, skipped, message: f.message } : { ok: true, made, series: series.name, skipped }
}

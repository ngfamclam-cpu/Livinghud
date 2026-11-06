// Pack Forge, app side: asks api/forge.ts for each card's image, crops it with
// the bulk-import tools, saves it as one of your cards and reveals it as a drop.

import { forgeCard, pickOwnedCard, pickPack, replacementPick, setCustomCards, customCard, MAX_VARIANT, type PackPick, type Rarity } from '../engine'
import { addCustomCard, grantCard, snapshot } from './actions'
import { db, LOCAL_USER } from './db'
import { addPhoto } from './photos'
import { syncKey } from './sync'
import { analyse, renderCard } from '../ui/loot/bulkImport'

export type ForgeOutcome =
  | { ok: true; made: number; series: string; skipped: number }
  | { ok: false; reason: 'no-sync' | 'not-configured' | 'limit' | 'failed'; made: number; series: string; skipped: number; message?: string }

type FatalError = { error: 'not-configured' | 'limit' | 'failed'; message?: string }
export type ImageError = FatalError | { error: 'declined'; message?: string }

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

const makeImage = (key: string, { card, variant }: PackPick) => forgeImage(key, { cardId: card.id, variant })

/** Asks api/forge.ts for one image (a catalog card or a companion portrait). */
export async function forgeImage(key: string, body: Record<string, string | number>): Promise<Blob | ImageError> {
  const res = await fetch('/api/forge', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-sync-key': key },
    body: JSON.stringify(body),
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

/** Tries per card slot before giving up on it (each try is a different card of the same rarity). */
const TRIES_PER_SLOT = 5

/**
 * Forges one mixed pack (2 Common, 2 Rare, 1 Epic, 1 Legendary), or remakes the
 * last pack with the same prompts. If the image filter refuses a card, a different
 * card of the same rarity takes its place, so a pack still ends up with 6. Cards
 * that were made are kept even if something stops the pack part-way.
 */
export async function forgePack(onProgress: (done: number, total: number) => void = () => {}, opts: { again?: boolean } = {}): Promise<ForgeOutcome> {
  const player = await db.players.get(LOCAL_USER)
  const mine = await db.customCards.where('userId').equals(LOCAL_USER).toArray()
  // Skip the cards from your last few packs so each pack feels new.
  const recent = mine.filter(c => c.forge).sort((a, b) => b.createdAt - a.createdAt).slice(0, 18).map(c => c.forge!)
  const packId = `forge-${Date.now()}`
  const again = opts.again ? lastPack() : null
  const unlocked = (await snapshot()).summary.incentives?.secrets ?? new Set<string>()
  const picks = again ?? pickPack(`${player?.id ?? 'local'}:${packId}`, recent, unlocked)
  const series = { name: again ? 'Same prompts' : 'Mixed pack' }
  const key = syncKey()
  if (!key) return { ok: false, reason: 'no-sync', made: 0, series: series.name, skipped: 0 }
  rememberPack(picks)

  const total = picks.length
  const results: ({ pick: PackPick; image: Blob } | null)[] = new Array(total).fill(null)
  const inPack = new Set(picks.map(p => p.card.id))
  let failure: FatalError | null = null
  let swapped = 0
  let done = 0
  onProgress(0, total)

  const fill = async (slot: number) => {
    let pick: PackPick | null = picks[slot]
    for (let attempt = 0; pick && attempt < TRIES_PER_SLOT && !failure; attempt++) {
      const r = await makeImage(key, pick)
      if (r instanceof Blob) {
        results[slot] = { pick, image: r }
        break
      }
      if (r.error !== 'declined') {
        failure = failure ?? (r as FatalError)
        break
      }
      // Refused even with softer wording: try a different card of the same rarity.
      pick = replacementPick(pick.card.rarity, inPack, `${packId}:${slot}:${attempt}`, recent, unlocked)
      if (pick) {
        inPack.add(pick.card.id)
        swapped++
      }
    }
    done++
    onProgress(done, total)
  }
  // Two slots at a time: quick, and gentle on the free allowance's rate limit.
  let next = 0
  await Promise.all(Array.from({ length: PARALLEL }, async () => {
    while (next < total) await fill(next++)
  }))

  // Save in pack order (rarest last), then reveal each one.
  let made = 0
  for (let i = 0; i < total; i++) {
    const r = results[i]
    if (!r) continue
    const card = r.pick.card
    const photo = await cardPhoto(r.image, card.id)
    const id = await addCustomCard({ name: card.name, rarity: card.rarity, text: card.text, photoId: photo, forge: card.id })
    await grantCard(`custom-${id}`, 'forge', `${packId}-${i}`)
    made++
  }
  const f = failure as FatalError | null
  if (f) return { ok: false, reason: f.error, made, series: series.name, skipped: swapped, message: f.message }
  if (made < total) return { ok: false, reason: 'failed', made, series: series.name, skipped: swapped, message: 'Some cards were refused every time. Try again for the rest.' }
  return { ok: true, made, series: series.name, skipped: swapped }
}

/** Crops a forged image to card shape and stores it; returns the photo id. */
export async function cardPhoto(image: Blob, name: string): Promise<string> {
  const draft = await analyse(new File([image], `${name}.jpg`, { type: 'image/jpeg' }), 0)
  const photo = await addPhoto(await renderCard(draft))
  URL.revokeObjectURL(draft.url)
  return photo.id
}

export type RemakeOutcome = { ok: true } | { ok: false; reason: 'no-sync' | 'not-configured' | 'limit' | 'failed' | 'declined'; message?: string }

/** Draws a new image for one of your forged cards (same card, a fresh look) and swaps it in. */
export async function remakeCard(customId: string): Promise<RemakeOutcome> {
  const mine = await db.customCards.get(customId)
  const card = mine?.forge ? forgeCard(mine.forge) : undefined
  if (!mine || !card) return { ok: false, reason: 'failed', message: 'This card wasn’t made by the forge.' }
  const key = syncKey()
  if (!key) return { ok: false, reason: 'no-sync' }
  for (let attempt = 0; attempt < 3; attempt++) {
    const variant = Math.floor(Math.random() * (MAX_VARIANT + 1))
    const r = await makeImage(key, { card, variant })
    if (r instanceof Blob) {
      const photoId = await cardPhoto(r, card.id)
      await db.customCards.update(customId, { photoId, updatedAt: Date.now() })
      const { deletePhotos } = await import('./photos')
      await deletePhotos([mine.photoId])
      return { ok: true }
    }
    if (r.error !== 'declined') return { ok: false, reason: r.error, message: r.message }
  }
  return { ok: false, reason: 'declined', message: 'Cloudflare refused this card three times in a row.' }
}

/** Drops still being forged, and ones undone while they were (so they never land). */
const inFlight = new Set<string>()
const cancelled = new Set<string>()

export function cancelDrops(sourceIds: string[]): void {
  for (const id of sourceIds) if (inFlight.has(id)) cancelled.add(id)
}

/**
 * A quest reward: forges a brand-new card of the rolled rarity and drops it.
 * If the forge can't make one (offline, not set up, daily allowance used, or the
 * filter refuses it three times), you get a copy of one of your cards instead.
 */
export async function forgeDrop(rarity: Rarity, source: string, sourceId: string, unlocked: Set<string>): Promise<void> {
  if (inFlight.has(sourceId)) return
  inFlight.add(sourceId)
  try {
    const mine = await db.customCards.where('userId').equals(LOCAL_USER).toArray()
    const recent = mine.filter(c => c.forge).sort((a, b) => b.createdAt - a.createdAt).slice(0, 18).map(c => c.forge!)
    const key = syncKey()
    let made: { pick: PackPick; image: Blob } | null = null
    if (key) {
      const tried = new Set<string>()
      for (let attempt = 0; attempt < 3 && !made; attempt++) {
        const pick = replacementPick(rarity, tried, `${sourceId}:${attempt}`, recent, unlocked)
        if (!pick) break
        tried.add(pick.card.id)
        const r = await makeImage(key, pick)
        if (r instanceof Blob) made = { pick, image: r }
        else if (r.error !== 'declined') break
      }
    }
    if (cancelled.has(sourceId) || (await db.loot.where('sourceId').equals(sourceId).count())) return
    if (made) {
      const card = made.pick.card
      const photo = await cardPhoto(made.image, card.id)
      if (cancelled.has(sourceId)) return
      const id = await addCustomCard({ name: card.name, rarity: card.rarity, text: card.text, photoId: photo, forge: card.id })
      await grantCard(`custom-${id}`, source, sourceId)
      return
    }
    // Fallback: a copy of a card you already have (copies power cards up).
    setCustomCards(mine.map(customCard))
    const owned = pickOwnedCard(rarity, sourceId)
    if (owned) await grantCard(owned.id, source, sourceId)
  } finally {
    inFlight.delete(sourceId)
    cancelled.delete(sourceId)
  }
}

/** After an undo takes cards back: forged cards you no longer own any copies of are deleted. */
export async function pruneOrphanForged(): Promise<void> {
  const mine = await db.customCards.where('userId').equals(LOCAL_USER).filter(c => !!c.forge).toArray()
  if (!mine.length) return
  const owned = new Set((await db.loot.where('userId').equals(LOCAL_USER).toArray()).map(d => d.cardId))
  const { deleteCustomCard } = await import('./actions')
  for (const c of mine) if (!owned.has(`custom-${c.id}`)) await deleteCustomCard(c.id)
}

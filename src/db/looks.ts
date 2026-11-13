// AI looks for the Shadow Legion and pets (prompts in src/engine/looks.ts).
// Each look is made once with Cloudflare (same free allowance as the Pack Forge)
// and kept as a 'portrait' bonus record, so it syncs like every other photo.
//   soldier:<soldierId>       one look per soldier
//   pet:<petId>:<level>       one look per pet per growth level

import { useEffect } from 'react'
import { MAX_VARIANT, type Summary } from '../engine'
import { db, LOCAL_USER, newId } from './db'
import { cardPhoto, forgeImage } from './forge'
import { syncKey } from './sync'

export type LookRequest = { soldierKind: string; veteran: boolean; variant: number } | { petId: string; level: number; variant: number }

const inFlight = new Set<string>()
/** Looks made this session (the summary can lag a moment behind the save). */
const made = new Set<string>()
/** Automatic looks per app session, so opening the Legion can't spend the whole daily allowance. */
let autoLeft = 8
let blocked: string | null = null

export const soldierLookKey = (id: string) => `soldier:${id}`
export const petLookKey = (id: string, level: number) => `pet:${id}:${level}`

function stableVariant(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  return (h >>> 0) % (MAX_VARIANT + 1)
}

export const soldierLook = (id: string, kind: string, veteran: boolean): LookRequest => ({ soldierKind: kind, veteran, variant: stableVariant(id) })
export const petLook = (id: string, level: number): LookRequest => ({ petId: id, level, variant: stableVariant(`${id}:${level}`) })

export type LookOutcome = { ok: true } | { ok: false; message: string }

/** Makes one look (or remakes it with `fresh`). */
export async function makeLook(key: string, req: LookRequest, fresh = false): Promise<LookOutcome> {
  const sync = syncKey()
  if (!sync) return { ok: false, message: 'Turn on cloud sync first (More → Settings → Sync).' }
  if (inFlight.has(key)) return { ok: false, message: 'Already being made.' }
  inFlight.add(key)
  try {
    const body: Record<string, string | number | boolean> = { ...req, ...(fresh ? { variant: Math.floor(Math.random() * (MAX_VARIANT + 1)) } : {}) }
    const r = await forgeImage(sync, body as Record<string, string | number>)
    if (!(r instanceof Blob)) {
      if (r.error === 'limit' || r.error === 'not-configured') blocked = r.error
      return { ok: false, message: r.error === 'limit' ? 'Today’s free image allowance is used up. Try again tomorrow.' : r.error === 'not-configured' ? 'Cloudflare isn’t connected.' : r.message ?? 'The image service didn’t answer.' }
    }
    made.add(key)
    const photoId = await cardPhoto(r, key.replace(/:/g, '-'))
    const old = await db.bonuses.where('kind').equals('portrait').filter(b => b.userId === LOCAL_USER && b.value === key).toArray()
    await db.bonuses.add({ id: newId(), userId: LOCAL_USER, kind: 'portrait', day: '', sourceId: `look-${key}`, value: key, photoId, createdAt: Date.now() })
    if (old.length) {
      await db.bonuses.bulkDelete(old.map(o => o.id))
      const { deletePhotos } = await import('./photos')
      await deletePhotos(old.flatMap(o => (o.photoId ? [o.photoId] : [])))
    }
    return { ok: true }
  } finally {
    inFlight.delete(key)
  }
}

/** Quietly makes looks that don't exist yet (a few per session, one at a time). */
export function useAutoLooks(summary: Summary, wanted: { key: string; req: LookRequest }[]): void {
  const missing = wanted.filter(w => !summary.extras.portraits[w.key]).map(w => w.key).join('|')
  useEffect(() => {
    if (!missing || blocked || !syncKey()) return
    let stop = false
    void (async () => {
      for (const w of wanted) {
        if (stop || blocked || autoLeft <= 0) return
        if (summary.extras.portraits[w.key] || inFlight.has(w.key) || made.has(w.key)) continue
        autoLeft--
        await makeLook(w.key, w.req)
      }
    })()
    return () => {
      stop = true
    }
    // Only re-run when the set of missing looks changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing])
}

/** A pet's look: this level's if it exists, else the closest earlier one. */
export function petPhoto(portraits: Record<string, string>, id: string, level: number): string | undefined {
  for (let l = level; l >= 1; l--) {
    const p = portraits[petLookKey(id, l)]
    if (p) return p
  }
  return undefined
}

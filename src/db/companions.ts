// Human companions, writes side: buying one in the Shop, making her outfit
// portraits (Cloudflare, like Pack Forge), choosing an outfit and accepting a
// date-night idea. Rules are in src/engine/pets.ts and forge.ts.

import { HUMAN_COMPANIONS, MAX_VARIANT, dateOffer, emit, humanCompanion, unlockedOutfits } from '../engine'
import { addSideQuest, buyOneOff, snapshot, surpriseSeed } from './actions'
import { db, LOCAL_USER, newId } from './db'
import { cardPhoto, forgeImage } from './forge'
import { syncKey } from './sync'

/** Buys a companion through the normal Shop gates (price rank, level, wallet/Vault, savings goal). Returns why not, or null. */
export async function buyCompanion(id: string): Promise<string | null> {
  const h = humanCompanion(id)
  if (!h) return 'Unknown companion.'
  const { summary } = await snapshot()
  if (summary.extras.pets?.owned.some(p => p.def.id === id)) return 'She is already with you.'
  const before = new Set((await db.purchases.where('userId').equals(LOCAL_USER).toArray()).map(p => p.id))
  const why = await buyOneOff({ title: `Companion: ${h.name}`, price: h.price, category: 'Companion', special: 'none', templateId: `companion:${id}` }, false)
  if (why) return why
  const purchase = (await db.purchases.where('userId').equals(LOCAL_USER).toArray()).find(p => !before.has(p.id))
  await db.bonuses.add({ id: newId(), userId: LOCAL_USER, kind: 'companion', day: summary.today, sourceId: `buy-${purchase?.id ?? Date.now()}`, value: id, createdAt: Date.now() })
  await db.bonuses.add({ id: newId(), userId: LOCAL_USER, kind: 'pet', day: summary.today, sourceId: `pet-${Date.now()}`, value: id, createdAt: Date.now() + 1 })
  emit({ type: 'extra', title: `${h.name} joined you`, text: `${h.tagline} Make her portrait from your companion panel.` })
  return null
}

export type PortraitOutcome = { ok: true } | { ok: false; message: string }

/** Makes (or remakes) her portrait in one outfit. Takes a few seconds. */
export async function makePortrait(id: string, outfitId: string): Promise<PortraitOutcome> {
  const h = humanCompanion(id)
  const key = syncKey()
  if (!h) return { ok: false, message: 'Unknown companion.' }
  if (!key) return { ok: false, message: 'Turn on cloud sync first (More → Settings → Sync).' }
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await forgeImage(key, { companionId: id, outfitId, variant: Math.floor(Math.random() * (MAX_VARIANT + 1)) })
    if (r instanceof Blob) {
      const photoId = await cardPhoto(r, `${id}-${outfitId}`)
      const old = await db.bonuses.where('kind').equals('portrait').filter(b => b.userId === LOCAL_USER && b.value === `${id}:${outfitId}`).toArray()
      await db.bonuses.add({ id: newId(), userId: LOCAL_USER, kind: 'portrait', day: '', sourceId: `portrait-${id}-${outfitId}`, value: `${id}:${outfitId}`, photoId, createdAt: Date.now() })
      if (old.length) {
        await db.bonuses.bulkDelete(old.map(o => o.id))
        const { deletePhotos } = await import('./photos')
        await deletePhotos(old.flatMap(o => (o.photoId ? [o.photoId] : [])))
      }
      return { ok: true }
    }
    if (r.error === 'not-configured') return { ok: false, message: 'Cloudflare isn’t connected (check the two keys in Vercel).' }
    if (r.error === 'limit') return { ok: false, message: 'Today’s free image allowance is used up. Try again tomorrow.' }
    if (r.error === 'failed') return { ok: false, message: r.message ?? 'The image service didn’t answer.' }
  }
  return { ok: false, message: 'Cloudflare refused this look three times. Try again or pick another outfit.' }
}

/** Puts her in an outfit you've unlocked. */
export async function wearOutfit(id: string, outfitId: string): Promise<void> {
  const { summary, player } = await snapshot()
  const h = humanCompanion(id)
  const pet = summary.extras.pets?.owned.find(p => p.def.id === id)
  if (!h || !pet || !unlockedOutfits(h, pet.level).some(o => o.id === outfitId)) return
  await db.players.update(LOCAL_USER, { companionOutfits: { ...(player.companionOutfits ?? {}), [id]: outfitId }, updatedAt: Date.now() })
}

/** Accepts her current date idea: it becomes a side quest; clearing it raises her affection. */
export async function acceptDate(id: string): Promise<void> {
  const { summary, player, quests } = await snapshot()
  const h = humanCompanion(id)
  if (!h) return
  const offer = dateOffer(surpriseSeed(player), id, summary.today)
  if (quests.some(q => q.templateId === offer.templateId)) return
  await addSideQuest({ stat: offer.idea.stat, title: `Date night with ${h.name}: ${offer.idea.title}`, description: offer.idea.description, minVersion: 'A shorter version', templateId: offer.templateId })
  emit({ type: 'extra', title: `It's a date`, text: `${h.name}: "${offer.idea.title}? I'd love that." It's on your side quests.` })
}

export const COMPANIONS_FOR_SALE = HUMAN_COMPANIONS

import { unlockedOutfits, type OwnedPet, type Summary } from '../../engine'

/** The current outfit's portrait for a companion (or the first unlocked outfit's). */
export function portraitOf(summary: Summary, pet: OwnedPet): { outfitId: string; photoId?: string } {
  const h = pet.def.human!
  const open = unlockedOutfits(h, pet.level)
  const outfitId = open.some(o => o.id === summary.extras.outfits[h.id]) ? summary.extras.outfits[h.id] : open[0].id
  return { outfitId, photoId: summary.extras.portraits[`${h.id}:${outfitId}`] }
}


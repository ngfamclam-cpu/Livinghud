import type { CompanionAction, CompanionMood, OwnedPet } from '../../engine'
import { CompanionArt } from './Companion'
import { PetArt } from './PetArt'

/** Any pet's art: Pip keeps its own evolving drawing, every other pet is drawn from parts. */
export function PetPortrait({ pet, mood, action = null, size = 120 }: { pet: OwnedPet; mood: CompanionMood; action?: CompanionAction | null; size?: number }) {
  return pet.def.id === 'pip'
    ? <CompanionArt stage={pet.stage} mood={mood} action={action} size={size} />
    : <PetArt pet={pet.def} level={pet.level} mood={mood} action={action} size={size} />
}

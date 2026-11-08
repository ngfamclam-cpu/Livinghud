import type { CompanionAction, CompanionMood, OwnedPet } from '../../engine'
import { CompanionArt } from './Companion'
import { PetArt } from './PetArt'

/** Any pet's art: Pip keeps its own evolving drawing, every other pet is drawn from parts. */
export function PetPortrait({ pet, mood, action = null, size = 120 }: { pet: OwnedPet; mood: CompanionMood; action?: CompanionAction | null; size?: number }) {
  // A neglected pet looks it: paler and droopier as health falls, a ghost when it dies.
  const cond = pet.condition ?? 'healthy'
  const sad = cond === 'sick' || cond === 'critical' || cond === 'dead' ? 'sulky' : mood
  const art = pet.def.id === 'pip'
    ? <CompanionArt stage={pet.stage} mood={sad} action={cond === 'dead' ? null : action} size={size} />
    : <PetArt pet={pet.def} level={pet.level} mood={sad} action={cond === 'dead' ? null : action} size={size} />
  return <span className={`pet-cond pet-cond-${cond}`}>{art}{cond === 'dead' && <span className="pet-halo" aria-hidden="true" />}</span>
}

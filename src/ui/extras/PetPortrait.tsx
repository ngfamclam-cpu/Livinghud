import type { CompanionAction, CompanionMood, OwnedPet } from '../../engine'
import { CompanionArt } from './Companion'
import { PetArt } from './PetArt'
import { Photo } from '../lifelog/Photo'

/** Any pet's art: its AI look when one has been made, else Pip's evolving drawing or the drawn-from-parts art. */
export function PetPortrait({ pet, mood, action = null, size = 120, photoId }: { pet: OwnedPet; mood: CompanionMood; action?: CompanionAction | null; size?: number; photoId?: string }) {
  // A neglected pet looks it: paler and droopier as health falls, a ghost when it dies.
  const cond = pet.condition ?? 'healthy'
  const sad = cond === 'sick' || cond === 'critical' || cond === 'dead' ? 'sulky' : mood
  const art = photoId
    ? <span className={`pet-photo ${action && cond !== 'dead' ? `act-${action}` : ''} r-${pet.def.rarity}`} style={{ width: size, height: size }}><Photo id={photoId} alt={pet.name} /></span>
    : pet.def.id === 'pip'
    ? <CompanionArt stage={pet.stage} mood={sad} action={cond === 'dead' ? null : action} size={size} />
    : <PetArt pet={pet.def} level={pet.level} mood={sad} action={cond === 'dead' ? null : action} size={size} />
  return <span className={`pet-cond pet-cond-${cond}`}>{art}{cond === 'dead' && <span className="pet-halo" aria-hidden="true" />}</span>
}

import type { OwnedPet, Summary } from '../../engine'
import { setActivePet } from '../../db/extras'
import { HumanPortrait } from './HumanPortrait'
import { PetPortrait } from './PetPortrait'

/** A small round avatar for any companion (pet art, or her current portrait). */
export function CompanionAvatar({ summary, pet, size = 44 }: { summary: Summary; pet: OwnedPet; size?: number }) {
  if (!pet.def.human) return <PetPortrait pet={pet} mood="calm" size={size} />
  const h = pet.def.human
  const outfit = summary.extras.outfits[h.id] ?? h.outfits[0].id
  const photoId = summary.extras.portraits[`${h.id}:${outfit}`] ?? summary.extras.portraits[`${h.id}:${h.outfits[0].id}`]
  return <HumanPortrait human={h} photoId={photoId} size={size} round />
}

/** Swap companions: every pet and companion you own, plus eggs still hatching. */
export function PetSwitcher({ summary, onPets }: { summary: Summary; onPets?: () => void }) {
  const pets = summary.extras.pets
  if (!pets || (pets.owned.length < 2 && pets.eggs.length === 0)) return null
  const active = pets.active.def.id
  return (
    <div className="pet-switcher" role="group" aria-label="Switch companion">
      {pets.owned.map(p => (
        <button key={p.def.id} className={`pet-chip r-${p.def.rarity} ${p.def.id === active ? 'on' : ''}`} aria-pressed={p.def.id === active} onClick={() => void setActivePet(p.def.id)} title={`${p.name} · Lv ${p.level}`}>
          <CompanionAvatar summary={summary} pet={p} />
          {p.condition && p.condition !== 'healthy' && <small className={`cond-dot c-${p.condition}`} title={p.condition}>{p.condition === 'dead' ? '💀' : p.condition === 'weak' ? '·' : '🤒'}</small>}
        </button>
      ))}
      {pets.eggs.map(e => (
        <span key={e.record.id} className="pet-chip egg-chip" title={`Egg: hatches in ${e.needed - e.clears} quest clears`}>🥚<small>{e.needed - e.clears}</small></span>
      ))}
      {onPets && <button className="ghost small" onClick={onPets}>All companions</button>}
    </div>
  )
}

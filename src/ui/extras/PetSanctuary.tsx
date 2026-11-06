import { useState } from 'react'
import { PETS, type OwnedPet, type PetsState } from '../../engine'
import { renamePet, setActivePet } from '../../db/extras'
import { SystemWindow } from '../SystemWindow'
import { PetPortrait } from './PetPortrait'

const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const

/** Every pet: the ones you have (tap to make active or rename), eggs hatching, and the ones still out there. */
export function PetSanctuary({ pets }: { pets: PetsState }) {
  const [open, setOpen] = useState<OwnedPet | null>(null)
  const [name, setName] = useState('')
  const pick = (p: OwnedPet) => {
    setOpen(open?.def.id === p.def.id ? null : p)
    setName(p.name)
  }
  return (
    <SystemWindow title={`Pet sanctuary · ${pets.owned.length}/${PETS.length}`} className="pet-sanctuary">
      <p className="muted">One pet walks with you at a time; swap whenever you like. Each pet grows only while it's your active one. New pets hatch from rare eggs (perfect days, Golden Quests, Red Gates, bosses, lucky rolls), come from milestones, or appear for secret deeds.</p>

      <div className="pet-grid">
        {pets.owned.map(p => (
          <button key={p.def.id} className={`pet-card r-${p.def.rarity} ${p.def.id === pets.active.def.id ? 'active' : ''} ${open?.def.id === p.def.id ? 'open' : ''}`} onClick={() => pick(p)}>
            <PetPortrait pet={p} mood={p.def.id === pets.active.def.id ? 'happy' : 'calm'} size={78} />
            <b>{p.name}</b>
            <small>Lv {p.level} · {RARITY_LABEL[p.def.rarity]}</small>
            {p.def.id === pets.active.def.id && <span className="pet-badge">Active</span>}
          </button>
        ))}
        {pets.eggs.map(e => (
          <div key={e.record.id} className={`pet-card egg r-${e.pet.rarity}`}>
            <span className="pet-egg" aria-hidden="true">🥚</span>
            <b>{RARITY_LABEL[e.pet.rarity]} egg</b>
            <div className="pet-xp small"><span style={{ width: `${(e.clears / e.needed) * 100}%` }} /></div>
            <small>{e.needed - e.clears} quest clear{e.needed - e.clears === 1 ? '' : 's'} to hatch</small>
          </div>
        ))}
        {pets.missing.map(p => (
          <div key={p.id} className={`pet-card missing r-${p.rarity}`}>
            <span className="pet-unknown" aria-hidden="true">?</span>
            <b>{p.source === 'secret' ? '???' : p.name}</b>
            <small>{p.source === 'secret' ? 'Secret' : p.source === 'milestone' ? p.unlock : `${RARITY_LABEL[p.rarity]} · egg`}</small>
          </div>
        ))}
      </div>

      {open && (
        <div className="pet-detail">
          <PetPortrait pet={open} mood="happy" size={110} />
          <div className="grow">
            <p className="soldier-rank">{open.def.name} · {open.def.family} · {open.def.element}</p>
            <p className="muted"><i>“{open.def.blurb}”</i></p>
            <p className="muted">Level {open.level} ({open.stage}) · {open.xp} XP{open.nextXp !== null ? ` / ${open.nextXp}` : ' · max'}</p>
            <form className="inline-form" onSubmit={e => { e.preventDefault(); void renamePet(open.def.id, name) }}>
              <input value={name} maxLength={20} onChange={e => setName(e.target.value)} aria-label="Pet name" />
              <button className="small ghost">Rename</button>
            </form>
            <div className="row end">
              {open.def.id === pets.active.def.id ? <span className="cleared">Your active pet</span> : <button onClick={() => { void setActivePet(open.def.id); setOpen(null) }}>Make active</button>}
            </div>
          </div>
        </div>
      )}
    </SystemWindow>
  )
}

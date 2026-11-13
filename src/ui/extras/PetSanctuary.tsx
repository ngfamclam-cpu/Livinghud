import { useState } from 'react'
import { AFFECTION_NAMES, PETS, type OwnedPet, type Summary } from '../../engine'
import { renamePet, setActivePet } from '../../db/extras'
import { SystemWindow } from '../SystemWindow'
import { CompanionAvatar } from './PetSwitcher'
import { makeLook, petLook, petLookKey } from '../../db/looks'

const RARITY_LABEL = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' } as const

/** Every pet: the ones you have (tap to make active or rename), eggs hatching, and the ones still out there. */
export function PetSanctuary({ summary }: { summary: Summary }) {
  const pets = summary.extras.pets!
  const [open, setOpen] = useState<OwnedPet | null>(null)
  const [name, setName] = useState('')
  const [looking, setLooking] = useState('')
  const pick = (p: OwnedPet) => {
    setOpen(open?.def.id === p.def.id ? null : p)
    setName(p.name)
  }
  return (
    <SystemWindow title={`Companions · ${pets.owned.length}/${PETS.length}`} className="pet-sanctuary">
      <p className="muted">One companion walks with you at a time; swap whenever you like. Each grows only while active. Pets hatch from rare eggs (perfect days, Golden Quests, Red Gates, bosses, lucky rolls), come from milestones, or appear for secret deeds. Human companions are in the Shop.</p>

      <div className="pet-grid">
        {pets.owned.map(p => (
          <button key={p.def.id} className={`pet-card r-${p.def.rarity} ${p.def.id === pets.active.def.id ? 'active' : ''} ${open?.def.id === p.def.id ? 'open' : ''}`} onClick={() => pick(p)}>
            <CompanionAvatar summary={summary} pet={p} size={78} />
            <b>{p.name}</b>
            <small>{p.def.human ? AFFECTION_NAMES[p.level - 1] : `Lv ${p.level}`} · {RARITY_LABEL[p.def.rarity]}</small>
            {p.health !== null && <small className={`cond-text c-${p.condition}`}>{p.condition === 'dead' ? `💀 ghost · ${p.reviveLeft} to revive` : `❤ ${p.health}`}</small>}
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
            <small>{p.source === 'secret' ? 'Secret' : p.source === 'milestone' || p.source === 'shop' ? p.unlock : `${RARITY_LABEL[p.rarity]} · egg`}</small>
          </div>
        ))}
      </div>

      {open && (
        <div className="pet-detail">
          <CompanionAvatar summary={summary} pet={open} size={110} />
          <div className="grow">
            <p className="soldier-rank">{open.def.name} · {open.def.family} · {open.def.element}</p>
            <p className="muted"><i>“{open.def.blurb}”</i></p>
            <p className="muted">Level {open.level} ({open.stage}) · {open.xp} XP{open.nextXp !== null ? ` / ${open.nextXp}` : ' · max'}</p>
            <form className="inline-form" onSubmit={e => { e.preventDefault(); void renamePet(open.def.id, name) }}>
              <input value={name} maxLength={20} onChange={e => setName(e.target.value)} aria-label="Pet name" />
              <button className="small ghost">Rename</button>
            </form>
            {looking && <p className="muted">{looking}</p>}
            <div className="row end">
              {!open.def.human && open.condition !== 'dead' && (
                <button className="ghost small" onClick={() => { setLooking('Drawing a new look…'); void makeLook(petLookKey(open.def.id, open.level), petLook(open.def.id, open.level), !!summary.extras.portraits[petLookKey(open.def.id, open.level)]).then(r => setLooking(r.ok ? '' : r.message)) }}>
                  {summary.extras.portraits[petLookKey(open.def.id, open.level)] ? 'New look' : '✦ Make AI look'}
                </button>
              )}
              {open.def.id === pets.active.def.id ? <span className="cleared">Your active pet</span> : <button onClick={() => { void setActivePet(open.def.id); setOpen(null) }}>Make active</button>}
            </div>
          </div>
        </div>
      )}
    </SystemWindow>
  )
}

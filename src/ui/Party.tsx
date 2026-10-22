import { useState } from 'react'
import {
  CIRCLE_NAMES,
  CONTACT_NAMES,
  CONTACT_XP,
  DEFAULT_BOND_DAYS,
  type Bond,
  type Circle,
  type Contact,
  type ContactKind,
  type Person,
  type Summary,
} from '../engine'
import { addPerson, deleteContact, logContact, removePerson, updatePerson } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

const CIRCLES = Object.keys(CIRCLE_NAMES) as Circle[]

export function Party({ summary, contacts }: { summary: Summary; contacts: Contact[] }) {
  const bonds = summary.party
  const weakening = bonds.filter(b => b.weakening)
  const names = new Map(bonds.map(b => [b.person.id, b.person.name]))
  const recent = [...contacts].sort((a, b) => b.createdAt - a.createdAt).slice(0, 12)

  return (
    <main className="hud">
      <SystemWindow title={`Party · ${bonds.length}`}>
        <p className="muted">
          The people in your life and how long since you were in touch. Logging contact earns CHA XP: message +{CONTACT_XP.message}, call +{CONTACT_XP.call},
          hangout +{CONTACT_XP.hangout}, date +{CONTACT_XP.date}. Any contact clears your reach-out daily.
        </p>
        {weakening.length > 0 && (
          <p className="system-line">Bond weakening: {weakening.map(b => b.person.name).join(', ')}</p>
        )}
        {bonds.length === 0 && <p>No one yet. Add the friends and family you want to stay close to.</p>}
        <ul className="party-list">
          {bonds.map(b => <PersonRow key={b.person.id} bond={b} contacts={contacts.filter(c => c.personId === b.person.id)} />)}
        </ul>
        <AddPerson />
      </SystemWindow>

      {recent.length > 0 && (
        <SystemWindow title="Recent contact">
          <ul className="board-list compact">
            {recent.map(c => (
              <li key={c.id}>
                <span className="quest-title">
                  {CONTACT_NAMES[c.kind]} · {names.get(c.personId) ?? 'someone'} <small className="muted">{c.day} · +{c.xp} XP{c.note && ` · ${c.note}`}</small>
                </span>
                <button className="ghost small icon" aria-label="Delete" title="Delete" onClick={() => deleteContact(c.id)}>×</button>
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}
    </main>
  )
}

function PersonRow({ bond, contacts }: { bond: Bond; contacts: Contact[] }) {
  const { person, daysSince, weakening, lastDay } = bond
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const kinds: ContactKind[] = person.circle === 'dating' ? ['message', 'call', 'hangout', 'date'] : ['message', 'call', 'hangout']

  const log = async (kind: ContactKind) => {
    setNote('')
    await logContact(person.id, kind, note)
  }

  return (
    <li className={`person ${weakening ? 'weakening' : ''}`}>
      <button className="quest-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="quest-title">{person.name} <small className="muted">{CIRCLE_NAMES[person.circle]}</small></span>
        <span className="routine-count">{lastDay ? (daysSince === 0 ? 'today' : `${daysSince}d`) : 'never'}</span>
      </button>
      <Bar value={Math.max(0, person.bondDays - daysSince)} max={person.bondDays} thin />
      <div className="quest-actions">
        {kinds.map(k => (
          <button key={k} className="ghost small" onClick={() => log(k)}>{CONTACT_NAMES[k]}</button>
        ))}
      </div>
      {open && (
        <div className="person-detail">
          <label>Note for the next contact (optional)<input value={note} onChange={e => setNote(e.target.value)} placeholder="e.g. Coffee at the market" maxLength={80} /></label>
          <p className="muted">
            {bond.hangouts} hangout{bond.hangouts === 1 ? '' : 's'} · {contacts.length} contact{contacts.length === 1 ? '' : 's'} logged · warn after {person.bondDays} days
          </p>
          <EditPerson person={person} />
        </div>
      )}
    </li>
  )
}

function EditPerson({ person }: { person: Person }) {
  const [bondDays, setBondDays] = useState(String(person.bondDays))
  const [circle, setCircle] = useState<Circle>(person.circle)
  const changed = Number(bondDays) !== person.bondDays || circle !== person.circle
  return (
    <div className="grid2">
      <label>
        Circle
        <select value={circle} onChange={e => setCircle(e.target.value as Circle)}>
          {CIRCLES.map(c => <option key={c} value={c}>{CIRCLE_NAMES[c]}</option>)}
        </select>
      </label>
      <label>Warn after (days)<input type="number" min={1} inputMode="numeric" value={bondDays} onChange={e => setBondDays(e.target.value)} /></label>
      <div className="row">
        <button className="small" disabled={!changed || !(Number(bondDays) >= 1)} onClick={() => updatePerson(person.id, { circle, bondDays: Math.round(Number(bondDays)) })}>Save</button>
        <button className="ghost small danger" onClick={() => confirm(`Remove ${person.name} from your Party? Their history stays.`) && removePerson(person.id)}>Remove</button>
      </div>
    </div>
  )
}

function AddPerson() {
  const [name, setName] = useState('')
  const [circle, setCircle] = useState<Circle>('friend')
  const add = async () => {
    // Clear first, so a double tap can't add the same person twice.
    setName('')
    await addPerson({ name, circle, bondDays: circle === 'family' ? 14 : DEFAULT_BOND_DAYS })
  }
  return (
    <div className="form">
      <label>Add someone<input value={name} onChange={e => setName(e.target.value)} placeholder="Name" maxLength={40} /></label>
      <div className="row">
        {CIRCLES.map(c => (
          <button key={c} className={`chip ${circle === c ? 'picked' : ''}`} onClick={() => setCircle(c)}>{CIRCLE_NAMES[c]}</button>
        ))}
        <button className="small" disabled={!name.trim()} onClick={add}>Add</button>
      </div>
    </div>
  )
}

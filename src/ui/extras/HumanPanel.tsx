import { useEffect, useRef, useState } from 'react'
import { AFFECTION_NAMES, dateOffer, humanLine, humanReaction, type HumanAction, type OwnedPet, type Summary } from '../../engine'
import { portraitOf } from './companionPortrait'
import { acceptDate, makePortrait, wearOutfit } from '../../db/companions'
import { renamePet } from '../../db/extras'
import { SystemWindow } from '../SystemWindow'
import { HumanPortrait } from './HumanPortrait'
import { PetSwitcher } from './PetSwitcher'

const GIFTS = ['🌹', '🍫', '💐', '🧸', '💎', '🍓']
const GIFTS_PER_DAY = 3
const giftKey = (day: string, id: string) => `livinghud-gifts-${id}-${day}`
const loadGifts = (day: string, id: string) => {
  try {
    return Number(localStorage.getItem(giftKey(day, id)) ?? 0) || 0
  } catch {
    return 0
  }
}

let particleId = 1

/** A human companion on your HUD: she talks, reacts, dresses up as affection grows, and asks you on dates. */
export function HumanPanel({ summary, pet, seed, dailiesTotal, dailiesDone, questTemplates, onPets }: {
  summary: Summary
  pet: OwnedPet
  seed: string
  dailiesTotal: number
  dailiesDone: number
  /** templateIds of quests you already have (to know if a date was accepted). */
  questTemplates: Set<string>
  onPets?: () => void
}) {
  const h = pet.def.human!
  const [tick, setTick] = useState(0)
  const [say, setSay] = useState<string | null>(null)
  const [action, setAction] = useState<HumanAction | null>(null)
  const [particles, setParticles] = useState<{ id: number; text: string; x: number }[]>([])
  const [gifts, setGifts] = useState(() => loadGifts(summary.today, h.id))
  const [making, setMaking] = useState(false)
  const [note, setNote] = useState('')
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(pet.name)
  const timers = useRef<number[]>([])
  useEffect(() => {
    const t = window.setInterval(() => setTick(n => n + 1), 12_000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), [])
  useEffect(() => setGifts(loadGifts(summary.today, h.id)), [summary.today, h.id])
  useEffect(() => setName(pet.name), [pet.name])

  const { outfitId, photoId } = portraitOf(summary, pet)
  const outfits = h.outfits
  const line = say ?? humanLine(h, { dailiesLeft: Math.max(0, dailiesTotal - dailiesDone), dailiesTotal, hour: new Date().getHours() }, tick)
  const date = dateOffer(seed, h.id, summary.today)
  const dateTaken = questTemplates.has(date.templateId)

  const act = (kind: HumanAction) => {
    if (kind === 'gift' && gifts >= GIFTS_PER_DAY) {
      setSay("You've spoiled me enough today. Come back tomorrow~")
      return
    }
    setSay(humanReaction(kind, Math.floor(Math.random() * 100)))
    setAction(kind)
    const text = kind === 'gift' ? GIFTS[Math.floor(Math.random() * GIFTS.length)] : kind === 'compliment' ? '💕' : '✨'
    const fresh = Array.from({ length: kind === 'gift' ? 1 : 3 }, (_, i) => ({ id: particleId++, text, x: 25 + i * 22 + Math.round(Math.random() * 8) }))
    setParticles(p => [...p, ...fresh])
    timers.current.push(window.setTimeout(() => setParticles(p => p.filter(x => !fresh.includes(x))), 1400))
    timers.current.push(window.setTimeout(() => setAction(null), 1200))
    timers.current.push(window.setTimeout(() => setSay(null), 4500))
    if (kind === 'gift') {
      const next = gifts + 1
      setGifts(next)
      try {
        localStorage.setItem(giftKey(summary.today, h.id), String(next))
      } catch {
        // Private mode.
      }
    }
  }
  const make = async () => {
    setMaking(true)
    setNote('Getting ready… (a few seconds)')
    const r = await makePortrait(h.id, outfitId)
    setMaking(false)
    setNote(r.ok ? '' : r.message)
  }

  return (
    <SystemWindow title="Companion" className={`companion-panel human-panel p-${h.personality}`}>
      <div className="companion-stage">
        <div className="companion-speech" aria-live="polite">{line}</div>
        <button className="companion-touch" onClick={() => act('compliment')} aria-label={`Compliment ${pet.name}`}>
          <HumanPortrait human={h} photoId={photoId} action={action} size={170} />
          {particles.map(p => <span key={p.id} className="companion-particle" style={{ left: `${p.x}%` }} aria-hidden="true">{p.text}</span>)}
        </button>
        {!photoId && <button className="small" disabled={making} onClick={make}>{making ? 'Getting ready…' : `📸 Create ${pet.name}'s portrait`}</button>}
        {note && <p className="muted">{note}</p>}
      </div>

      <div className="companion-meta">
        {editing ? (
          <form className="inline-form" onSubmit={e => { e.preventDefault(); void renamePet(h.id, name); setEditing(false) }}>
            <input value={name} maxLength={20} onChange={e => setName(e.target.value)} aria-label="Her name" autoFocus />
            <button className="small">Save</button>
          </form>
        ) : (
          <button className="link-button" onClick={() => setEditing(true)} title="Rename"><b>{pet.name}</b> · {AFFECTION_NAMES[pet.level - 1]} ✎</button>
        )}
        <span className="companion-hearts" aria-label={`Affection level ${pet.level} of 5`}>{'♥'.repeat(pet.level)}<span className="muted">{'♥'.repeat(5 - pet.level)}</span></span>
      </div>

      <div className="row companion-actions">
        <button className="small" onClick={() => act('compliment')}>💬 Compliment</button>
        <button className="small" onClick={() => act('gift')} disabled={gifts >= GIFTS_PER_DAY}>🎁 Gift {gifts}/{GIFTS_PER_DAY}</button>
        <button className="small" onClick={() => act('hangout')}>☕ Hang out</button>
      </div>

      {pet.nextXp !== null ? (
        <div className="pet-xp" aria-label={`${pet.xp} of ${pet.nextXp} affection to the next level`}>
          <span style={{ width: `${Math.min(100, (pet.xp / pet.nextXp) * 100)}%` }} />
          <small>Affection {pet.xp}/{pet.nextXp} · +1 per quest together, +5 per perfect day, +15 per date</small>
        </div>
      ) : (
        <p className="muted">Soulmates. Every outfit unlocked.</p>
      )}

      <div className="outfit-row" role="group" aria-label="Outfits">
        {outfits.map(o => {
          const open = o.level <= pet.level
          const has = !!summary.extras.portraits[`${h.id}:${o.id}`]
          return (
            <button key={o.id} className={`chip ${o.id === outfitId ? 'picked' : ''}`} disabled={!open} aria-pressed={o.id === outfitId} onClick={() => void wearOutfit(h.id, o.id)} title={open ? o.name : `Unlocks at ${AFFECTION_NAMES[o.level - 1]}`}>
              {open ? `${o.name}${has ? '' : ' ·'}` : `🔒 ${AFFECTION_NAMES[o.level - 1]}`}
            </button>
          )
        })}
        {photoId && <button className="ghost small" disabled={making} onClick={make} title="Make a new portrait for this outfit">{making ? '…' : '↻ New take'}</button>}
      </div>

      <div className="date-card">
        <p className="system-line">💌 {pet.name}: “{dateTaken ? `Can't wait for our date: ${date.idea.title.toLowerCase()}.` : `Hey... I have a date idea: ${date.idea.title.toLowerCase()}. Come with me?`}”</p>
        <p className="muted">{date.idea.description}</p>
        {dateTaken ? <span className="cleared">On your side quests · clear it for +15 affection</span> : <div className="row end"><button className="small" onClick={() => void acceptDate(h.id)}>It's a date</button></div>}
      </div>

      <PetSwitcher summary={summary} onPets={onPets} />
    </SystemWindow>
  )
}

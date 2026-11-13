import { useEffect, useRef, useState } from 'react'
import { COMPANION_MEALS, COMPANION_REACTIONS, COMPANION_SNACKS, companionLine, type CompanionAction, type Summary } from '../../engine'
import { renamePet } from '../../db/extras'
import { HumanPanel } from './HumanPanel'
import { PetSwitcher } from './PetSwitcher'
import { SystemWindow } from '../SystemWindow'
import { PetPortrait } from './PetPortrait'
import { petLook, petLookKey, petPhoto, useAutoLooks } from '../../db/looks'

interface Care {
  pets: number
  meals: number
}

// Today's petting and snacks, per device. Just for fun: nothing in the game depends on it.
const careKey = (day: string) => `livinghud-companion-${day}`
function loadCare(day: string): Care {
  try {
    return { pets: 0, meals: 0, ...JSON.parse(localStorage.getItem(careKey(day)) ?? '{}') }
  } catch {
    return { pets: 0, meals: 0 }
  }
}
function saveCare(day: string, care: Care) {
  try {
    localStorage.setItem(careKey(day), JSON.stringify(care))
  } catch {
    // Private mode: affection just won't be remembered.
  }
}

interface Particle {
  id: number
  text: string
  x: number
}
let particleId = 1

interface PanelProps {
  summary: Summary
  dailiesTotal: number
  dailiesDone: number
  onPets?: () => void
  seed: string
  questTemplates: Set<string>
}

/** Your companion: a pet (pet, feed, play) or a human companion (talk, gifts, outfits, dates). */
export function CompanionPanel(props: PanelProps) {
  const pet = props.summary.extras.companion?.pet
  if (pet?.def.human) return <HumanPanel key={pet.def.id} pet={pet} {...props} />
  return <PetPanel {...props} />
}

/** A pet: tap to pet, feed it a snack, play with it. It talks about your day. */
function PetPanel({ summary, dailiesTotal, dailiesDone, onPets }: PanelProps) {
  const c = summary.extras.companion
  const lookPet = c?.pet
  const photo = lookPet && lookPet.condition !== 'dead' ? petPhoto(summary.extras.portraits, lookPet.def.id, lookPet.level) : undefined
  // The active pet gets an AI look for its current level (made once, in the background).
  useAutoLooks(summary, lookPet && !lookPet.def.human && lookPet.condition !== 'dead' ? [{ key: petLookKey(lookPet.def.id, lookPet.level), req: petLook(lookPet.def.id, lookPet.level) }] : [])
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(c?.name ?? 'Pip')
  const [action, setAction] = useState<CompanionAction | null>(null)
  const [say, setSay] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [care, setCare] = useState<Care>(() => loadCare(summary.today))
  const [particles, setParticles] = useState<Particle[]>([])
  const timers = useRef<number[]>([])

  // A new line every 12 seconds while you watch.
  useEffect(() => {
    const t = window.setInterval(() => setTick(n => n + 1), 12_000)
    return () => window.clearInterval(t)
  }, [])
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), [])
  useEffect(() => setCare(loadCare(summary.today)), [summary.today])

  useEffect(() => setName(c?.name ?? 'Pip'), [c?.name])
  if (!c) return null
  const pet = c.pet
  const egg = pet.stage === 'egg'
  const cond = pet.condition
  const sickLine =
    cond === 'dead' ? `*a faint glow* ${c.name} has passed into the spirit realm. Clear ${pet.reviveLeft} more quest${pet.reviveLeft === 1 ? '' : 's'} to bring them back.`
      : cond === 'critical' ? `*barely breathing* ${c.name} needs you. Clear your dailies today or they won't make it.`
        : cond === 'sick' ? `*coughs* ${c.name} doesn't feel well. A perfect day would help.`
          : null
  const line = say ?? sickLine ?? companionLine(
    { name: c.name, mood: c.mood, stage: egg ? 'egg' : 'grown', hour: new Date().getHours(), dailiesLeft: Math.max(0, dailiesTotal - dailiesDone), dailiesTotal, combo: summary.incentives?.combo ?? 0 },
    tick,
  )
  const full = care.meals >= COMPANION_MEALS
  const hearts = Math.min(5, Math.floor((care.pets + care.meals * 2) / 3))

  const burst = (text: string, count: number) => {
    const fresh = Array.from({ length: count }, (_, i) => ({ id: particleId++, text, x: 20 + Math.round(((i + 1) / (count + 1)) * 60) + Math.round(Math.random() * 10 - 5) }))
    setParticles(p => [...p, ...fresh])
    timers.current.push(window.setTimeout(() => setParticles(p => p.filter(x => !fresh.includes(x))), 1400))
  }
  const act = (kind: CompanionAction) => {
    if (kind === 'feed' && full) {
      setSay(`${c.name} is full. Maybe tomorrow!`)
      return
    }
    const options = cond === 'dead' ? ['*your hand passes through the ghost*', '*a cold, faint shimmer*'] : egg ? ['*the egg wiggles happily*', '*warm glow*', '*tap tap from inside*'] : cond === 'critical' || cond === 'sick' ? ['*weak little smile*', '*tries to wag, too tired*'] : COMPANION_REACTIONS[kind]
    setSay(options[Math.floor(Math.random() * options.length)])
    setAction(kind)
    if (kind === 'pet') burst('💗', 3)
    if (kind === 'feed') burst(COMPANION_SNACKS[Math.floor(Math.random() * COMPANION_SNACKS.length)], 1)
    if (kind === 'play') burst('✨', 4)
    const next = { pets: care.pets + (kind === 'pet' || kind === 'play' ? 1 : 0), meals: care.meals + (kind === 'feed' ? 1 : 0) }
    setCare(next)
    saveCare(summary.today, next)
    timers.current.push(window.setTimeout(() => setAction(null), 1200))
    timers.current.push(window.setTimeout(() => setSay(null), 4000))
  }

  return (
    <SystemWindow title="Companion" className={`companion-panel pet-${pet.def.id}`}>
      <div className="companion-stage">
        <div className="companion-speech" aria-live="polite">{line}</div>
        <button className="companion-touch" onClick={() => act('pet')} aria-label={`Pet ${c.name}`}>
          <PetPortrait pet={pet} mood={c.mood} action={action} size={132} photoId={photo} />
          {particles.map(p => <span key={p.id} className="companion-particle" style={{ left: `${p.x}%` }} aria-hidden="true">{p.text}</span>)}
        </button>
      </div>
      <div className="companion-meta">
        {editing ? (
          <form className="inline-form" onSubmit={e => { e.preventDefault(); void renamePet(pet.def.id, name); setEditing(false) }}>
            <input value={name} maxLength={20} onChange={e => setName(e.target.value)} aria-label="Companion name" autoFocus />
            <button className="small">Save</button>
          </form>
        ) : (
          <button className="link-button" onClick={() => setEditing(true)} title="Rename"><b>{c.name}</b> · Lv {pet.level} {pet.def.id === 'pip' ? pet.stage : pet.stage} ✎</button>
        )}
        <span className="companion-hearts" aria-label={`Affection today: ${hearts} of 5`}>{'♥'.repeat(hearts)}<span className="muted">{'♥'.repeat(5 - hearts)}</span></span>
      </div>
      <div className="row companion-actions">
        <button className="small" onClick={() => act('pet')}>🤲 Pet</button>
        <button className="small" onClick={() => act('feed')} disabled={full || cond === 'dead'} title={full ? 'Full for today' : 'Give a snack'}>🍙 Feed {care.meals}/{COMPANION_MEALS}</button>
        <button className="small" onClick={() => act('play')}>🎾 Play</button>
      </div>
      {pet.health !== null && (
        <div className={`pet-health h-${cond}`} aria-label={cond === 'dead' ? `Dead. ${pet.reviveLeft} quest clears to revive.` : `Health ${pet.health} of 100`}>
          <span style={{ width: `${cond === 'dead' ? ((10 - pet.reviveLeft) / 10) * 100 : pet.health}%` }} />
          <small>{cond === 'dead' ? `💀 Ghost · revives in ${pet.reviveLeft} quest clear${pet.reviveLeft === 1 ? '' : 's'}` : `❤ Health ${pet.health}/100 · ${cond === 'healthy' ? 'healthy' : cond} · each missed daily hurts it, perfect days heal`}</small>
        </div>
      )}
      {pet.nextXp !== null ? (
        <div className="pet-xp" aria-label={`${pet.xp} of ${pet.nextXp} pet XP to the next level`}>
          <span style={{ width: `${Math.min(100, (pet.xp / pet.nextXp) * 100)}%` }} />
          <small>{pet.xp}/{pet.nextXp} XP · grows 1 per quest cleared, 5 per perfect day, only while active</small>
        </div>
      ) : (
        <p className="muted">Fully grown. A true {pet.def.rarity} companion.</p>
      )}
      <PetSwitcher summary={summary} onPets={onPets} />
    </SystemWindow>
  )
}

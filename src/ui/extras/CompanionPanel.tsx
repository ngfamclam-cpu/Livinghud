import { useEffect, useRef, useState } from 'react'
import { COMPANION_MEALS, COMPANION_REACTIONS, COMPANION_SNACKS, companionLine, type CompanionAction, type Summary } from '../../engine'
import { nameCompanion } from '../../db/extras'
import { SystemWindow } from '../SystemWindow'
import { CompanionArt } from './Companion'

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

/** Your companion: tap to pet, feed it a snack, play with it. It talks about your day. */
export function CompanionPanel({ summary, dailiesTotal, dailiesDone }: { summary: Summary; dailiesTotal: number; dailiesDone: number }) {
  const c = summary.extras.companion
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

  if (!c) return null
  const egg = c.stage.id === 'egg'
  const line = say ?? companionLine(
    { name: c.name, mood: c.mood, stage: c.stage.id, hour: new Date().getHours(), dailiesLeft: Math.max(0, dailiesTotal - dailiesDone), dailiesTotal, combo: summary.incentives?.combo ?? 0 },
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
    const options = egg ? ['*the egg wiggles happily*', '*warm glow*', '*tap tap from inside*'] : COMPANION_REACTIONS[kind]
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
    <SystemWindow title="Companion" className={`companion-panel stage-${c.stage.id}`}>
      <div className="companion-stage">
        <div className="companion-speech" aria-live="polite">{line}</div>
        <button className="companion-touch" onClick={() => act('pet')} aria-label={`Pet ${c.name}`}>
          <CompanionArt stage={c.stage.id} mood={c.mood} action={action} size={132} />
          {particles.map(p => <span key={p.id} className="companion-particle" style={{ left: `${p.x}%` }} aria-hidden="true">{p.text}</span>)}
        </button>
      </div>
      <div className="companion-meta">
        {editing ? (
          <form className="inline-form" onSubmit={e => { e.preventDefault(); void nameCompanion(name); setEditing(false) }}>
            <input value={name} maxLength={20} onChange={e => setName(e.target.value)} aria-label="Companion name" autoFocus />
            <button className="small">Save</button>
          </form>
        ) : (
          <button className="link-button" onClick={() => setEditing(true)} title="Rename"><b>{c.name}</b> · {c.stage.name} ✎</button>
        )}
        <span className="companion-hearts" aria-label={`Affection today: ${hearts} of 5`}>{'♥'.repeat(hearts)}<span className="muted">{'♥'.repeat(5 - hearts)}</span></span>
      </div>
      <div className="row companion-actions">
        <button className="small" onClick={() => act('pet')}>🤲 Pet</button>
        <button className="small" onClick={() => act('feed')} disabled={full} title={full ? 'Full for today' : 'Give a snack'}>🍙 Feed {care.meals}/{COMPANION_MEALS}</button>
        <button className="small" onClick={() => act('play')}>🎾 Play</button>
      </div>
      <p className="muted">{c.next ? `Evolves into a ${c.next.name} at a ${c.next.combo}-day best combo. Perfect days in a row help it grow.` : 'Fully evolved. Legendary companion.'}</p>
    </SystemWindow>
  )
}

import { useEffect, useRef, useState } from 'react'
import { BATTLE_CRIES, CLEARS_PER_LEVEL, MAX_SOLDIER_LEVEL, QUESTS_PER_SOLDIER, type Quest, type SoldierProfile, type Summary } from '../../engine'
import { renameSoldier, setGuard } from '../../db/extras'
import { SystemWindow } from '../SystemWindow'
import { ShadowFigure } from './ShadowFigure'

const DAY = 86_400_000

/** The Shadow Legion: your army on parade. Tap a soldier to inspect, rename or post them on guard. */
export function LegionView({ summary, quests }: { summary: Summary; quests: Quest[] }) {
  const x = summary.extras
  const [picked, setPicked] = useState<string | null>(null)
  const [cry, setCry] = useState<string | null>(null)
  const [mustering, setMustering] = useState(false)
  const timers = useRef<number[]>([])
  useEffect(() => () => timers.current.forEach(t => window.clearTimeout(t)), [])
  const soldier = x.legion.find(s => s.id === picked) ?? null
  const now = Date.now()

  if (!x.job) {
    return (
      <SystemWindow title="Shadow Legion · sealed" className="legion-panel locked">
        <div className="legion-field">
          {(['Footman', 'Archer', 'Mage'] as const).map((k, i) => (
            <div key={k} className="legion-slot dormant" style={{ animationDelay: `${i * 0.4}s` }}><ShadowFigure kind={k} /></div>
          ))}
        </div>
        <p className="muted">The shadows are waiting. Complete the Shadowcaller Job Change (above) and every quest you clear starts raising your army: a soldier every {QUESTS_PER_SOLDIER} quests, an Elite for each boss, a Knight for each main quest.</p>
      </SystemWindow>
    )
  }

  const muster = () => {
    setMustering(true)
    setCry(BATTLE_CRIES[Math.floor(Math.random() * BATTLE_CRIES.length)])
    timers.current.push(window.setTimeout(() => setMustering(false), 1600))
    timers.current.push(window.setTimeout(() => setCry(null), 2600))
  }
  const guardable = quests.filter(q => q.active && (q.kind === 'daily' || q.kind === 'side'))
  const posted = x.legion.filter(s => s.guardQuestId).length

  return (
    <SystemWindow title={`Shadow ${x.legionTitle} · ${x.legion.length}`} className="legion-panel">
      <div className="legion-stats">
        <span><b>{x.legionPower}</b><small>power</small></span>
        <span><b>{x.legion.length}</b><small>soldiers</small></span>
        <span><b>{posted}</b><small>on guard</small></span>
        <span><b>{x.legionNextIn}</b><small>quests to next</small></span>
      </div>
      <div className="legion-next" aria-label={`${QUESTS_PER_SOLDIER - x.legionNextIn} of ${QUESTS_PER_SOLDIER} quests toward the next soldier`}>
        <span style={{ width: `${((QUESTS_PER_SOLDIER - x.legionNextIn) / QUESTS_PER_SOLDIER) * 100}%` }} />
      </div>

      {x.legion.length === 0 ? (
        <p className="muted">No shadows yet. Clear {x.legionNextIn} more quest{x.legionNextIn === 1 ? '' : 's'} to raise your first.</p>
      ) : (
        <div className={`legion-field ${mustering ? 'mustering' : ''}`}>
          {cry && <div className="battle-cry" aria-live="polite">{cry}</div>}
          {[...x.legion].reverse().map((s, i) => (
            <button
              key={s.id}
              className={`legion-slot ${now - s.at < DAY ? 'arising' : ''} ${picked === s.id ? 'picked' : ''}`}
              style={{ animationDelay: `${(i % 7) * 0.35}s` }}
              onClick={() => setPicked(picked === s.id ? null : s.id)}
              aria-pressed={picked === s.id}
              title={`${s.displayName}, level ${s.level}`}
            >
              <ShadowFigure kind={s.kind} veteran={s.veteran || s.level >= 6} />
              <small className="slot-name">{s.displayName.split(' ')[0]}</small>
              <small className="slot-level">Lv {s.level}{s.guardQuestId ? ' 🛡' : ''}</small>
            </button>
          ))}
        </div>
      )}

      {soldier && <SoldierCard key={soldier.id} soldier={soldier} quests={guardable} allQuests={quests} onClose={() => setPicked(null)} />}

      {x.legion.length > 0 && (
        <div className="row end">
          <button onClick={muster} disabled={mustering}>⚔ Muster the Legion</button>
        </div>
      )}
      <p className="muted">Post soldiers to guard your quests: every {CLEARS_PER_LEVEL} clears of a guarded quest levels its guard up (max level {MAX_SOLDIER_LEVEL}). New soldiers glow for their first day.</p>
    </SystemWindow>
  )
}

function SoldierCard({ soldier: s, quests, allQuests, onClose }: { soldier: SoldierProfile; quests: Quest[]; allQuests: Quest[]; onClose: () => void }) {
  const [name, setName] = useState(s.displayName)
  const guardTitle = s.guardQuestId ? allQuests.find(q => q.id === s.guardQuestId)?.title ?? 'a retired quest' : null
  return (
    <div className="soldier-card">
      <div className="soldier-card-head">
        <ShadowFigure kind={s.kind} veteran size={84} />
        <div className="grow">
          <form className="inline-form" onSubmit={e => { e.preventDefault(); void renameSoldier(s.id, name) }}>
            <input value={name} maxLength={30} onChange={e => setName(e.target.value)} aria-label="Soldier name" />
            <button className="small" disabled={name.trim() === s.displayName}>Rename</button>
          </form>
          <p className="soldier-rank">{s.rank} · Level {s.level} · Power {s.power}</p>
          <p className="muted">{s.kind}{s.veteran ? ' · veteran' : ''} · joined {new Date(s.at).toLocaleDateString()}</p>
        </div>
      </div>
      <p><b>Ability:</b> {s.ability}</p>
      <p className="muted"><i>“{s.lore}”</i></p>
      {s.level < MAX_SOLDIER_LEVEL && (
        <div className="legion-next small" aria-label={`${s.progress} of ${CLEARS_PER_LEVEL} guarded clears to the next level`}>
          <span style={{ width: `${(s.progress / CLEARS_PER_LEVEL) * 100}%` }} />
        </div>
      )}
      <label>
        Guard post {guardTitle ? <span className="muted">(guarding {guardTitle} · {s.guardClears} clears)</span> : <span className="muted">(off duty)</span>}
        <select value={s.guardQuestId ?? ''} onChange={e => void setGuard(s.id, e.target.value || null)}>
          <option value="">Off duty</option>
          {quests.map(q => <option key={q.id} value={q.id}>{q.kind === 'side' ? 'Side: ' : ''}{q.title}</option>)}
        </select>
      </label>
      <div className="row end"><button className="ghost small" onClick={onClose}>Close</button></div>
    </div>
  )
}

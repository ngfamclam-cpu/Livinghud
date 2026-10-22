import { useEffect, useState } from 'react'
import { FOCUS_CLEAR_BONUS, FOCUS_LENGTHS, STATS, featureOn, type FocusRun, type Player, type Quest, type StatKey, type Summary } from '../engine'
import { abandonFocus, activeFocus, endFocus, focusedMinutes, startFocus, type ActiveFocus } from '../db/focus'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

export interface FocusPreset {
  questId?: string
  bossId?: string
}

interface Props {
  player: Player
  quests: Quest[]
  summary: Summary
  runs: FocusRun[]
  preset: FocusPreset
  onClose: () => void
}

/** Quests a focus session can count toward: time-based dailies and side quests. */
const linkable = (q: Quest) => q.active && (q.kind === 'daily' || q.kind === 'side')

export function Focus({ player, quests, summary, runs, preset, onClose }: Props) {
  const [run, setRun] = useState<ActiveFocus | null>(() => activeFocus())
  const [message, setMessage] = useState('')

  // Tick once a second: update the countdown and finish when time is up.
  const [, setTick] = useState(0)
  useEffect(() => {
    if (!run) return
    const timer = setInterval(async () => {
      setTick(t => t + 1)
      if (focusedMinutes(run) >= run.plannedMin) {
        clearInterval(timer)
        await endFocus(run, true)
        say('Dungeon cleared')
        setMessage(`Dungeon cleared: ${run.plannedMin} minutes, +${run.plannedMin + FOCUS_CLEAR_BONUS} XP.`)
        setRun(null)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [run])

  // Coming back to the app: the app-wide check may have ended the session while away.
  useEffect(() => {
    const onShow = () => {
      if (document.visibilityState !== 'visible') return
      setTimeout(() => setRun(activeFocus()), 300)
    }
    document.addEventListener('visibilitychange', onShow)
    return () => document.removeEventListener('visibilitychange', onShow)
  }, [])

  const today = runs.filter(r => r.day === summary.today && !r.manual).sort((a, b) => b.createdAt - a.createdAt)

  return (
    <main className="hud">
      {run ? (
        <Running run={run} onEnd={async () => {
          const minutes = Math.floor(focusedMinutes(run))
          await endFocus(run, false)
          setMessage(minutes > 0 ? `Left the dungeon early: ${minutes} minutes, +${minutes} XP.` : 'Left the dungeon.')
          setRun(null)
        }} onAbandon={() => { abandonFocus(); setRun(null) }} />
      ) : (
        <Setup player={player} quests={quests} summary={summary} preset={preset} onStart={r => { setMessage(''); setRun(r) }} />
      )}
      {message && <p className="system-line clear">{message}</p>}

      <SystemWindow title={`Today · ${summary.focusToday} min`}>
        {today.length === 0 ? (
          <p className="muted">No dungeons cleared today.</p>
        ) : (
          <ul className="board-list compact">
            {today.map(r => (
              <li key={r.id}>
                <span className="stat-key">{r.stat}</span>
                <span className="quest-title">
                  {r.label} <small className="muted">{r.minutes} min · {r.cleared ? 'cleared' : 'broken off'} · +{r.xp} XP</small>
                </span>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>
      <button className="ghost settings-button" onClick={onClose}>Back</button>
    </main>
  )
}

function Setup({ player, quests, summary, preset, onStart }: { player: Player; quests: Quest[]; summary: Summary; preset: FocusPreset; onStart: (r: ActiveFocus) => void }) {
  const bosses = featureOn(player, 'bosses') ? summary.bosses.filter(b => !b.boss.defeatedAt) : []
  const presetQuest = quests.find(q => q.id === preset.questId)
  const presetBoss = bosses.find(b => b.boss.id === preset.bossId)?.boss
  const [questId, setQuestId] = useState(presetQuest?.id ?? '')
  const [bossId, setBossId] = useState(presetBoss?.id ?? '')
  const [label, setLabel] = useState(presetBoss?.name ?? presetQuest?.title ?? '')
  const [stat, setStat] = useState<StatKey>(presetBoss?.stat ?? presetQuest?.stat ?? (player.stats.includes('INT') ? 'INT' : player.stats[0]))
  const [minutes, setMinutes] = useState(30)
  const [strict, setStrict] = useState(false)
  const options = quests.filter(linkable).sort((a, b) => a.createdAt - b.createdAt)

  const pickQuest = (id: string) => {
    setQuestId(id)
    const q = quests.find(x => x.id === id)
    if (q) {
      setStat(q.stat)
      if (!label || quests.some(x => x.title === label)) setLabel(q.title)
    }
  }
  const pickBoss = (id: string) => {
    setBossId(id)
    const b = bosses.find(x => x.boss.id === id)?.boss
    if (b) {
      setStat(b.stat)
      setLabel(b.name)
    }
  }

  return (
    <SystemWindow title="Focus dungeon">
      <p className="muted">
        Pick what you're working on and how long. You earn 1 XP a minute, +{FOCUS_CLEAR_BONUS} for staying the whole time. A linked quest clears at 30+ minutes (minimum at
        10+).
      </p>
      <label>What are you working on?<input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Portfolio site" maxLength={60} /></label>
      <label>
        Counts toward a quest (optional)
        <select value={questId} onChange={e => pickQuest(e.target.value)}>
          <option value="">None</option>
          {options.map(q => (
            <option key={q.id} value={q.id}>{q.kind === 'side' ? 'Side: ' : ''}{q.title}{(q.kind === 'daily' ? summary.todayDone.has(q.id) : summary.weekDone.has(q.id)) ? ' (done)' : ''}</option>
          ))}
        </select>
      </label>
      {bosses.length > 0 && (
        <label>
          Fight a boss (optional)
          <select value={bossId} onChange={e => pickBoss(e.target.value)}>
            <option value="">None</option>
            {bosses.map(b => <option key={b.boss.id} value={b.boss.id}>{b.boss.name} · {b.hpLeft}/{b.boss.hp} HP</option>)}
          </select>
        </label>
      )}
      <label>
        Stat
        <select value={stat} onChange={e => setStat(e.target.value as StatKey)}>
          {player.stats.map(s => <option key={s} value={s}>{s} · {STATS.find(x => x.key === s)?.name}</option>)}
        </select>
      </label>
      <div className="row">
        {FOCUS_LENGTHS.map(m => (
          <button key={m} className={`chip ${minutes === m ? 'picked' : ''}`} onClick={() => setMinutes(m)}>{m} min</button>
        ))}
      </div>
      <label className="check">
        <input type="checkbox" checked={strict} onChange={e => setStrict(e.target.checked)} />
        <span>Strict: leaving the app for over a minute breaks the dungeon</span>
      </label>
      <div className="row end">
        <button className="arise" disabled={!label.trim()} onClick={() => onStart(startFocus({ label: label.trim(), stat, questId: questId || null, bossId: bossId || null, plannedMin: minutes, strict }))}>
          Enter
        </button>
      </div>
    </SystemWindow>
  )
}

function Running({ run, onEnd, onAbandon }: { run: ActiveFocus; onEnd: () => void; onAbandon: () => void }) {
  const elapsed = focusedMinutes(run)
  const left = Math.max(0, run.plannedMin * 60 - Math.floor(elapsed * 60))
  return (
    <SystemWindow title="Dungeon in progress" className="dungeon">
      <p className="system-line">{run.label}</p>
      <div className="live-count">
        <span className="live-number">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
      </div>
      <Bar value={elapsed} max={run.plannedMin} />
      <p className="muted">
        {run.strict ? 'Strict: stay in the app. Leaving for over a minute breaks the dungeon.' : 'You can lock your phone; the timer keeps running.'}
      </p>
      <div className="row end">
        <button className="ghost small danger" onClick={() => confirm('Abandon this dungeon? Nothing is saved.') && onAbandon()}>Abandon</button>
        <button className="ghost" onClick={onEnd}>Leave early (save minutes)</button>
      </div>
    </SystemWindow>
  )
}

function say(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

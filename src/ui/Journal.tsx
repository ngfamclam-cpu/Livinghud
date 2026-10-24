import { useState } from 'react'
import { WEEKDAYS, dailyPrompt, journalPatterns, type Completion, type JournalEntry, type Player, type Quest, type StatKey, type Summary, type TrackedFromReflection } from '../engine'
import { saveJournal, surpriseSeed, trackFromReflection } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

const MOODS = ['Rough', 'Low', 'Okay', 'Good', 'Great']
const ENERGY = ['Empty', 'Low', 'Okay', 'Good', 'Charged']

interface Props {
  player: Player
  summary: Summary
  entries: JournalEntry[]
  completions: Completion[]
  quests: Quest[]
  onClose: () => void
}

export function Journal({ player, summary, entries, completions, quests, onClose }: Props) {
  const todays = entries.find(e => e.day === summary.today)
  const [wentWell, setWentWell] = useState(todays?.wentWell ?? '')
  const [drained, setDrained] = useState(todays?.drained ?? '')
  const [adjust, setAdjust] = useState(todays?.adjust ?? '')
  const [mood, setMood] = useState(todays?.mood ?? 3)
  const [energy, setEnergy] = useState(todays?.energy ?? 3)
  // The random question stays the one you answered, even if the pool changes later.
  const prompt = todays?.prompt || dailyPrompt(summary.today, surpriseSeed(player))
  const [promptAnswer, setPromptAnswer] = useState(todays?.promptAnswer ?? '')
  const [tracked, setTracked] = useState<TrackedFromReflection[]>([])
  const [saved, setSaved] = useState(false)

  const dailies = quests.filter(q => q.kind === 'daily' && q.active).map(q => q.id)
  const dailyDone = completions.filter(c => dailies.includes(c.questId))
  const patterns = journalPatterns(entries, dailyDone, dailies.length, summary.today)
  const past = [...entries].filter(e => e.day !== summary.today).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14)

  const save = async () => {
    await saveJournal({ wentWell, drained, adjust, mood, energy, prompt, promptAnswer, tracked })
    setSaved(true)
  }

  return (
    <main className="hud">
      <SystemWindow title={`Journal · ${summary.today}`}>
        <label>What went well?<textarea rows={2} value={wentWell} onChange={e => { setWentWell(e.target.value); setSaved(false) }} /></label>
        <label>What drained me?<textarea rows={2} value={drained} onChange={e => { setDrained(e.target.value); setSaved(false) }} /></label>
        <label>One thing to adjust tomorrow<textarea rows={2} value={adjust} onChange={e => { setAdjust(e.target.value); setSaved(false) }} /></label>
        <label className="random-prompt">
          <span><span className="prompt-tag">Today's question</span> {prompt}</span>
          <textarea rows={2} value={promptAnswer} onChange={e => { setPromptAnswer(e.target.value); setSaved(false) }} />
        </label>
        <Rating label="Mood" names={MOODS} value={mood} onChange={v => { setMood(v); setSaved(false) }} />
        <Rating label="Energy" names={ENERGY} value={energy} onChange={v => { setEnergy(v); setSaved(false) }} />
        <p className="muted">All three prompts clears the journal daily; one line counts as the minimum. You can come back and edit today's entry.</p>
        <div className="row end">
          {saved && <span className="cleared">Saved</span>}
          <button disabled={!(wentWell.trim() || drained.trim() || adjust.trim() || promptAnswer.trim())} onClick={save}>{todays ? 'Update entry' : 'Save entry'}</button>
        </div>
      </SystemWindow>

      <TrackNew stats={player.stats} already={[...(todays?.tracked ?? []), ...tracked]} onTracked={t => setTracked(list => [...list, t])} />

      <SystemWindow title="Patterns">
        {patterns.entries < 5 ? (
          <p className="muted">Patterns appear after about a week of entries. {patterns.entries} so far.</p>
        ) : (
          <>
            <p>
              <b>{patterns.streak}</b>-day journal streak · {patterns.entries} entries
            </p>
            <ul className="stats weekday-moods">
              {WEEKDAYS.map((name, i) => (
                <li key={name}>
                  <span className="stat-key">{name.slice(0, 3)}</span>
                  <Bar value={patterns.moodByWeekday[i] ?? 0} max={5} thin />
                  <span className="stat-value">{patterns.moodByWeekday[i]?.toFixed(1) ?? '–'}</span>
                </li>
              ))}
            </ul>
            {patterns.bestDay && <p className="muted">Best mood on {patterns.bestDay}s, lowest on {patterns.worstDay}s.</p>}
            {patterns.drains.length > 0 && (
              <p className="muted">What keeps draining you (last 30 days): {patterns.drains.map(d => `${d.word} (${d.count})`).join(', ')}.</p>
            )}
            {patterns.moodWhenProductive !== null && patterns.moodOtherwise !== null && (
              <p className="muted">
                On days you clear most of your dailies your mood averages {patterns.moodWhenProductive.toFixed(1)}, versus {patterns.moodOtherwise.toFixed(1)} on other days.
              </p>
            )}
          </>
        )}
      </SystemWindow>

      {past.length > 0 && (
        <SystemWindow title="Past entries">
          <ul className="journal-list">
            {past.map(e => <PastEntry key={e.id} entry={e} />)}
          </ul>
        </SystemWindow>
      )}
      <button className="ghost settings-button" onClick={onClose}>Back</button>
    </main>
  )
}

function Rating({ label, names, value, onChange }: { label: string; names: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rating">
      <span className="muted">{label}</span>
      <div className="row">
        {names.map((n, i) => (
          <button key={n} className={`chip ${value === i + 1 ? 'picked' : ''}`} onClick={() => onChange(i + 1)} aria-pressed={value === i + 1}>{n}</button>
        ))}
      </div>
    </div>
  )
}

function PastEntry({ entry }: { entry: JournalEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button className="quest-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="quest-title">{entry.day}</span>
        <small className="muted">mood {MOODS[entry.mood - 1]} · energy {ENERGY[entry.energy - 1]}</small>
      </button>
      {open && (
        <div className="quest-detail">
          {entry.wentWell && <p><b>Went well:</b> {entry.wentWell}</p>}
          {entry.drained && <p><b>Drained me:</b> {entry.drained}</p>}
          {entry.adjust && <p><b>Adjust:</b> {entry.adjust}</p>}
          {entry.prompt && entry.promptAnswer && <p><b>{entry.prompt}</b> {entry.promptAnswer}</p>}
          {entry.tracked?.length ? <p className="muted">Started tracking: {entry.tracked.map(t => t.title).join(', ')}</p> : null}
        </div>
      )}
    </li>
  )
}

const KINDS: { key: TrackedFromReflection['kind']; label: string; help: string }[] = [
  { key: 'daily', label: 'Daily quest', help: 'Every day, with a minimum version for bad days. Daily pay re-splits to include it.' },
  { key: 'side', label: 'Weekly side quest', help: 'Once a week, resets on Mondays.' },
  { key: 'goal', label: "Tomorrow's top 3", help: "Adds it to tomorrow's goals (if there's room)." },
]

/** "Track something new": turn a thought from the reflection into a quest or goal. */
function TrackNew({ stats, already, onTracked }: { stats: StatKey[]; already: TrackedFromReflection[]; onTracked: (t: TrackedFromReflection) => void }) {
  const [kind, setKind] = useState<TrackedFromReflection['kind']>('daily')
  const [title, setTitle] = useState('')
  const [stat, setStat] = useState<StatKey>(stats[0])
  const [minVersion, setMinVersion] = useState('')
  const [error, setError] = useState('')

  const add = async () => {
    const t = title
    setTitle('')
    setMinVersion('')
    const problem = await trackFromReflection({ kind, title: t, stat, minVersion })
    if (problem) {
      setError(problem)
      setTitle(t)
      return
    }
    setError('')
    onTracked({ kind, title: t.trim(), stat: kind === 'goal' ? null : stat })
  }

  return (
    <SystemWindow title="Track something new">
      <p className="muted">Did the reflection turn up something you want to start doing or keep an eye on? Add it here and it becomes part of the game.</p>
      <div className="tabs-inline">
        {KINDS.map(k => (
          <button key={k.key} className={`chip ${kind === k.key ? 'picked' : ''}`} aria-pressed={kind === k.key} onClick={() => setKind(k.key)}>{k.label}</button>
        ))}
      </div>
      <p className="muted">{KINDS.find(k => k.key === kind)!.help}</p>
      <label>What to track<input value={title} maxLength={80} onChange={e => setTitle(e.target.value)} placeholder={kind === 'goal' ? 'e.g. Book the physio appointment' : 'e.g. 10 minutes of stretching after work'} /></label>
      {kind !== 'goal' && (
        <div className="grid2">
          <label>
            Stat
            <select value={stat} onChange={e => setStat(e.target.value as StatKey)}>
              {stats.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <label>Minimum version<input value={minVersion} maxLength={60} onChange={e => setMinVersion(e.target.value)} placeholder="e.g. 3 minutes" /></label>
        </div>
      )}
      {error && <p className="muted error">{error}</p>}
      <div className="row end">
        <button disabled={!title.trim()} onClick={add}>Start tracking</button>
      </div>
      {already.length > 0 && (
        <p className="muted">From today's reflection: {already.map(t => t.title).join(', ')}</p>
      )}
    </SystemWindow>
  )
}

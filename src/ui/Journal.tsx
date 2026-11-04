import { useState } from 'react'
import { ANSWERS_FOR_FULL, THEME_NAMES, WEEKDAYS, answeredCount, dailyQuestions, journalPatterns, swapQuestion, type Completion, type DailyQuestion, type DayGoals, type JournalEntry, type Player, type Quest, type StatKey, type Summary, type TrackedFromReflection } from '../engine'
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
  goals?: DayGoals[]
  onClose: () => void
}

export function Journal({ player, summary, entries, completions, quests, goals, onClose }: Props) {
  const todays = entries.find(e => e.day === summary.today)
  const [wentWell, setWentWell] = useState(todays?.wentWell ?? '')
  const [drained, setDrained] = useState(todays?.drained ?? '')
  const [adjust, setAdjust] = useState(todays?.adjust ?? '')
  const [mood, setMood] = useState(todays?.mood ?? 3)
  const [energy, setEnergy] = useState(todays?.energy ?? 3)
  const ctx = { day: summary.today, seed: surpriseSeed(player), entries, goals, stats: summary.stats }
  // Today's evolving questions. Once you've answered some, those stay exactly as asked.
  const [questions, setQuestions] = useState<DailyQuestion[]>(() => {
    const fresh = dailyQuestions(ctx)
    const kept = (todays?.answers ?? []).map(a => ({ id: a.id, theme: a.theme as DailyQuestion['theme'], text: a.question }))
    return [...kept, ...fresh.filter(q => !kept.some(k => k.id === q.id))].slice(0, Math.max(kept.length, fresh.length))
  })
  const [answers, setAnswers] = useState<Record<string, string>>(() => Object.fromEntries((todays?.answers ?? []).map(a => [a.id, a.answer])))
  const [skipped, setSkipped] = useState<string[]>([])
  const [tracked, setTracked] = useState<TrackedFromReflection[]>([])
  const [saved, setSaved] = useState(false)

  const dailies = quests.filter(q => q.kind === 'daily' && q.active).map(q => q.id)
  const dailyDone = completions.filter(c => dailies.includes(c.questId))
  const patterns = journalPatterns(entries, dailyDone, dailies.length, summary.today)
  const past = [...entries].filter(e => e.day !== summary.today).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14)

  const answerList = questions.filter(q => (answers[q.id] ?? '').trim()).map(q => ({ id: q.id, theme: q.theme, question: q.text, answer: answers[q.id] }))
  const count = answeredCount({ wentWell, drained, adjust, promptAnswer: todays?.promptAnswer, answers: answerList })
  const touch = () => setSaved(false)

  const swap = (q: DailyQuestion) => {
    const shown = questions.map(x => x.id)
    const next = swapQuestion(ctx, [...shown, ...skipped], skipped.length + 1)
    if (!next) return
    setQuestions(list => list.map(x => (x.id === q.id ? next : x)))
    setAnswers(a => {
      const rest = { ...a }
      delete rest[q.id]
      return rest
    })
    setSkipped(list => [...list, q.id])
    touch()
  }

  const save = async () => {
    await saveJournal({ wentWell, drained, adjust, mood, energy, answers: answerList, skipped, tracked })
    setSaved(true)
  }

  const classic = (id: string, label: string, value: string, set: (v: string) => void) => (
    <label key={id} className={`reflect-q ${value.trim() ? 'answered' : ''}`}>
      <span className="reflect-text">{label}</span>
      <textarea rows={2} value={value} onChange={e => { set(e.target.value); touch() }} />
    </label>
  )

  return (
    <main className="hud">
      <SystemWindow title={`Reflection · ${summary.today}`}>
        <p className={`reflect-count ${count >= ANSWERS_FOR_FULL ? 'done' : ''}`}>
          {count >= ANSWERS_FOR_FULL ? `${count} answered ✓ full clear` : `Answer any ${ANSWERS_FOR_FULL}: ${count}/${ANSWERS_FOR_FULL}`}
          <small className="muted"> · every question is optional; one or two count as the minimum</small>
        </p>

        <h3>Today's questions</h3>
        {questions.map(q => (
          <div key={q.id} className={`reflect-q evolving ${(answers[q.id] ?? '').trim() ? 'answered' : ''}`}>
            <div className="reflect-head">
              <span className="prompt-tag">{THEME_NAMES[q.theme] ?? q.theme}</span>
              {q.why && <small className="muted">{q.why}</small>}
              <span className="grow" />
              {!(answers[q.id] ?? '').trim() && <button className="ghost small" onClick={() => swap(q)} title="Ask me something else">Swap</button>}
            </div>
            <label>
              <span className="reflect-text">{q.text}</span>
              <textarea rows={q.theme === 'ideas' ? 3 : 2} value={answers[q.id] ?? ''} onChange={e => { const v = e.target.value; setAnswers(a => ({ ...a, [q.id]: v })); touch() }} />
            </label>
          </div>
        ))}

        <h3>The classics</h3>
        {classic('wentWell', 'What went well?', wentWell, setWentWell)}
        {classic('drained', 'What drained me?', drained, setDrained)}
        {classic('adjust', 'One thing to adjust tomorrow', adjust, setAdjust)}
        {todays?.prompt && todays.promptAnswer && (
          <p className="muted">Earlier today: {todays.prompt} {todays.promptAnswer}</p>
        )}

        <Rating label="Mood" names={MOODS} value={mood} onChange={v => { setMood(v); touch() }} />
        <Rating label="Energy" names={ENERGY} value={energy} onChange={v => { setEnergy(v); touch() }} />
        <p className="muted">Questions learn from you: follow-ups on what you wrote, patterns in what drains you, goals that slip, and more of the themes you write about most. Swapping a question tells the System to ask fewer like it.</p>
        <div className="row end">
          {saved && <span className="cleared">Saved</span>}
          <button disabled={count === 0} onClick={save}>{todays ? 'Update entry' : 'Save entry'}</button>
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
          {(entry.answers ?? []).map(a => <p key={a.id}><b>{a.question}</b> {a.answer}</p>)}
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

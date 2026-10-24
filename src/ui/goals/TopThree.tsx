import { useState } from 'react'
import { GOALS_PER_DAY, addDays, unfinished, type DayGoals, type Summary } from '../../engine'
import { saveGoals, toggleGoal } from '../../db/actions'
import { SystemWindow } from '../SystemWindow'

/** Today's top 3 to tick off, and the form to write tomorrow's. */
export function TopThree({ summary, goals, planning, onPlanning, onHistory }: {
  summary: Summary
  goals: DayGoals[]
  planning: boolean
  onPlanning: (open: boolean) => void
  onHistory: () => void
}) {
  const today = goals.find(g => g.day === summary.today)
  const tomorrowDay = addDays(summary.today, 1)
  const tomorrow = goals.find(g => g.day === tomorrowDay)
  const doneCount = today?.items.filter(i => i.done).length ?? 0

  return (
    <SystemWindow title="Top 3" className="top-three">
      {today && today.items.length > 0 ? (
        <>
          <p className="muted">Today · {doneCount}/{today.items.length} done</p>
          <ul className="goal-list">
            {today.items.map((item, i) => (
              <li key={i} className={item.done ? 'done' : ''}>
                <label className="goal-check">
                  <input type="checkbox" checked={item.done} onChange={() => toggleGoal(today.id, i)} />
                  <span>{item.text}</span>
                </label>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="muted">No goals set for today.{!planning && ' You can still set them now.'}</p>
      )}

      {planning ? (
        <GoalForm
          key={tomorrowDay}
          summary={summary}
          goals={goals}
          onDone={() => onPlanning(false)}
        />
      ) : (
        <div className="row">
          <span className="muted grow">
            {tomorrow?.items.length ? `Tomorrow: ${tomorrow.items.map(i => i.text).join(' · ')}` : "Tomorrow's top 3 aren't set yet."}
          </span>
        </div>
      )}
      {!planning && (
        <div className="row end">
          <button className="ghost small" onClick={onHistory}>History & stats</button>
          <button className="small" onClick={() => onPlanning(true)}>{tomorrow?.items.length ? 'Edit tomorrow' : "Plan tomorrow's top 3"}</button>
        </div>
      )}
    </SystemWindow>
  )
}

function GoalForm({ summary, goals, onDone }: { summary: Summary; goals: DayGoals[]; onDone: () => void }) {
  const today = goals.find(g => g.day === summary.today)
  // Plan tomorrow by default; today too if you didn't set it last night.
  const [forToday, setForToday] = useState(false)
  const day = forToday ? summary.today : addDays(summary.today, 1)
  const current = goals.find(g => g.day === day)
  const carry = forToday ? [] : unfinished(today)
  const [texts, setTexts] = useState<string[]>(() => {
    const start = current?.items.map(i => i.text) ?? []
    return Array.from({ length: GOALS_PER_DAY }, (_, i) => start[i] ?? '')
  })
  const switchDay = (toToday: boolean) => {
    setForToday(toToday)
    const g = goals.find(x => x.day === (toToday ? summary.today : addDays(summary.today, 1)))
    const start = g?.items.map(i => i.text) ?? []
    setTexts(Array.from({ length: GOALS_PER_DAY }, (_, i) => start[i] ?? ''))
  }
  const addCarry = (t: string) => setTexts(list => {
    const slot = list.findIndex(x => !x.trim())
    return slot < 0 || list.includes(t) ? list : list.map((x, i) => (i === slot ? t : x))
  })
  const filled = texts.filter(t => t.trim()).length

  const save = async () => {
    await saveGoals(day, texts)
    onDone()
  }

  return (
    <div className="form goal-form">
      <div className="tabs-inline">
        <button className={`chip ${!forToday ? 'picked' : ''}`} onClick={() => switchDay(false)}>Tomorrow</button>
        {!(today?.items.length) && <button className={`chip ${forToday ? 'picked' : ''}`} onClick={() => switchDay(true)}>Today</button>}
      </div>
      {texts.map((t, i) => (
        <label key={i}>
          Goal {i + 1}{i === 0 ? ' (the one that matters most)' : ''}
          <input value={t} maxLength={140} onChange={e => setTexts(list => list.map((x, j) => (j === i ? e.target.value : x)))} placeholder={['e.g. Send the invoice to Sam', 'e.g. 45 min on the side project', 'e.g. Book the rave tickets'][i]} />
        </label>
      ))}
      {carry.length > 0 && (
        <div className="carry">
          <span className="muted">Not done today:</span>
          {carry.map(t => (
            <button key={t} className="chip" disabled={texts.includes(t)} onClick={() => addCarry(t)}>+ {t}</button>
          ))}
        </div>
      )}
      <p className="muted">All three clears "Plan tomorrow's top 3"; one or two count as the minimum. Every goal is kept in your history.</p>
      <div className="row end">
        <button className="ghost" onClick={onDone}>Cancel</button>
        <button disabled={filled === 0} onClick={save}>Save {forToday ? "today's" : "tomorrow's"} goals</button>
      </div>
    </div>
  )
}

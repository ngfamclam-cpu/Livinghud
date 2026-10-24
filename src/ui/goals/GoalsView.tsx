import { useMemo, useState } from 'react'
import { WEEKDAYS, addDays, goalStats, searchGoals, weekdayExtremes, type DayGoals, type Summary } from '../../engine'
import { toggleGoal } from '../../db/actions'
import { SystemWindow } from '../SystemWindow'
import { ColumnChart } from '../desktop/charts'

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`)
const shortDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** Every top 3 you've set, with hit rates, patterns and search. */
export function GoalsView({ goals, summary, onDay }: { goals: DayGoals[]; summary: Summary; onDay?: (day: string) => void }) {
  const stats = useMemo(() => goalStats(goals, summary.today, addDays), [goals, summary.today])
  const extremes = weekdayExtremes(stats.byWeekday)
  const [q, setQ] = useState('')
  const [shown, setShown] = useState(14)
  const hits = useMemo(() => searchGoals(goals, q).slice(0, 50), [goals, q])
  const history = useMemo(() => [...goals].filter(g => g.items.length && g.day <= addDays(summary.today, 1)).sort((a, b) => b.day.localeCompare(a.day)), [goals, summary.today])
  const byDay = new Map(goals.map(g => [g.day, g]))
  const last14 = Array.from({ length: 14 }, (_, i) => addDays(summary.today, i - 14)).map(day => {
    const g = byDay.get(day)
    const done = g?.items.filter(i => i.done).length ?? 0
    return { key: day, label: day.slice(8), value: done, muted: !g, tip: g ? <><b>{done}/{g.items.length}</b> done on {shortDay(day)}</> : <>No goals on {shortDay(day)}</> }
  })

  return (
    <>
      <SystemWindow title="Top 3 · stats">
        {stats.planned === 0 ? (
          <p className="muted">Stats appear once a day with goals is over. {stats.days > 0 ? 'Your first goals are set.' : "Set tomorrow's top 3 to start."}</p>
        ) : (
          <>
            <div className="goal-tiles">
              <div><span className="muted">Hit rate</span><b>{pct(stats.rate)}</b><small className="muted">{stats.done}/{stats.planned} goals</small></div>
              <div><span className="muted">Last 7 days</span><b>{pct(stats.rate7)}</b><small className="muted">30 days: {pct(stats.rate30)}</small></div>
              <div><span className="muted">All 3 done</span><b>{stats.perfectDays}</b><small className="muted">perfect days</small></div>
              <div><span className="muted">Planning streak</span><b>{stats.planStreak}</b><small className="muted">days in a row</small></div>
            </div>
            <p className="muted chart-title">Goals done per day, last 2 weeks</p>
            <ColumnChart bars={last14} format={v => String(Math.round(v))} label="Goals done per day for the last two weeks" />
            {extremes && (
              <p className="muted">
                Best day: <b>{extremes.best}</b> ({pct(stats.byWeekday[WEEKDAYS.indexOf(extremes.best)])}) · toughest: <b>{extremes.worst}</b> ({pct(stats.byWeekday[WEEKDAYS.indexOf(extremes.worst)])})
              </p>
            )}
            {stats.carried.length > 0 && (
              <>
                <p className="muted chart-title">Goals that keep coming back</p>
                <ul className="board-list compact">
                  {stats.carried.map(c => (
                    <li key={c.text}>
                      <span className="quest-title">{c.text}</span>
                      <span className="streak">{c.times}×</span>
                      {c.done && <span className="cleared">DONE</span>}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </SystemWindow>

      <SystemWindow title="Search goals">
        <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="e.g. invoice, gym, Sam" />
        {q.trim() && (
          <ul className="board-list compact">
            {hits.length === 0 && <li className="muted">No goals match.</li>}
            {hits.map((h, i) => (
              <li key={`${h.day}-${i}`}>
                <span className={`goal-mark ${h.done ? 'done' : ''}`}>{h.done ? '✓' : '·'}</span>
                <span className="quest-title">{h.text}</span>
                <button className="ghost small" onClick={() => onDay?.(h.day)} disabled={!onDay}>{shortDay(h.day)}</button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>

      <SystemWindow title={`History · ${history.length} days`}>
        {history.length === 0 && <p className="muted">Nothing yet.</p>}
        <ol className="goal-history">
          {history.slice(0, shown).map(g => (
            <li key={g.id}>
              <div className="row">
                <b className="grow">{g.day === summary.today ? 'Today' : g.day > summary.today ? 'Tomorrow' : shortDay(g.day)}</b>
                <span className="muted">{g.items.filter(i => i.done).length}/{g.items.length}</span>
                {onDay && g.day <= summary.today && <button className="ghost small" onClick={() => onDay(g.day)}>Day page</button>}
              </div>
              <ul className="goal-list">
                {g.items.map((item, i) => (
                  <li key={i} className={item.done ? 'done' : ''}>
                    <label className="goal-check">
                      <input type="checkbox" checked={item.done} onChange={() => toggleGoal(g.id, i)} aria-label={`${item.text} done`} />
                      <span>{item.text}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        {history.length > shown && (
          <div className="row end">
            <button className="ghost small" onClick={() => setShown(n => n + 30)}>Show more</button>
          </div>
        )}
      </SystemWindow>
    </>
  )
}

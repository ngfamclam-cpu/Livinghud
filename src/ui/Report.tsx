import { useState } from 'react'
import { addDays, weeklyReport, type ReportInput, type Summary } from '../engine'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

const pct = (n: number | null) => (n === null ? '–' : `${Math.round(n * 100)}%`)

/** The weekly report card: last full week by default, or this week so far. */
export function Report({ summary, input, onClose }: { summary: Summary; input: ReportInput; onClose: () => void }) {
  const [which, setWhich] = useState<'last' | 'this'>('last')
  const start = which === 'last' ? addDays(summary.week, -7) : summary.week
  const r = weeklyReport(input, start)

  return (
    <main className="hud">
      <SystemWindow title="Weekly report" className="report">
        <div className="tabs-inline">
          <button className={`chip ${which === 'last' ? 'picked' : ''}`} onClick={() => setWhich('last')}>Last week</button>
          <button className={`chip ${which === 'this' ? 'picked' : ''}`} onClick={() => setWhich('this')}>This week so far</button>
        </div>
        <p className="muted">{r.start} to {r.end}</p>
        <div className="report-grade">
          <span className="grade">{r.grade}</span>
          <span>
            <b>{pct(r.completion)}</b> of dailies done
          </span>
        </div>

        <ul className="stats">
          {r.byStat.map(s => {
            const change = s.rate !== null && s.previous !== null ? Math.round((s.rate - s.previous) * 100) : null
            return (
              <li key={s.stat}>
                <span className="stat-key">{s.stat}</span>
                <span className="stat-name">{change === null ? '' : change > 0 ? `▲ ${change}` : change < 0 ? `▼ ${-change}` : '='}</span>
                <Bar value={s.rate ?? 0} max={1} thin />
                <span className="stat-value">{pct(s.rate)}</span>
              </li>
            )
          })}
        </ul>

        <dl className="status-list report-list">
          <dt>XP earned</dt><dd>{r.xp}</dd>
          <dt>Money earned</dt><dd>${r.dollars.toFixed(2)}</dd>
          <dt>Focus</dt><dd>{Math.floor(r.focusMinutes / 60)}h {r.focusMinutes % 60}m</dd>
          <dt>Bosses defeated</dt><dd>{r.bossesDefeated}</dd>
          <dt>People contacted</dt><dd>{r.contacts}</dd>
          <dt>Journal</dt><dd>{r.journalEntries} entries{r.avgMood !== null && `, mood ${r.avgMood.toFixed(1)}/5`}</dd>
        </dl>
        <p className="system-line">{r.suggestion}</p>
      </SystemWindow>
      <button className="ghost settings-button" onClick={onClose}>Back</button>
    </main>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DAY_NAMES,
  EXERCISES,
  STATS,
  THEMES,
  activityFeed,
  addDays,
  calendarDays,
  exerciseHistory,
  exerciseInfo,
  lifetimeTotals,
  moneyByMonth,
  statHistory,
  weeklyReport,
  featureOn,
  goalProgress,
  REWARD_IDEAS,
  type FeedKind,
  type ReportInput,
  type StatKey,
  type Summary,
} from '../../engine'
import { SystemWindow } from '../SystemWindow'
import { Bar } from '../Bar'
import { money, monthName } from '../format'
import { ColumnChart, LineChart, Radar, Sparkline } from './charts'
import type { DashData } from './Desktop'

const shortDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
const shortMonth = (month: string) => monthName(month).slice(0, 3)

/** A number that counts up when it changes (System look only; CSS hides motion for reduced-motion users). */
export function CountUp({ value, format = v => String(Math.round(v)) }: { value: number; format?: (v: number) => string }) {
  const [shown, setShown] = useState(value)
  const from = useRef(value)
  useEffect(() => {
    const start = from.current
    if (start === value || document.documentElement.dataset.look === 'clean' || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      from.current = value
      setShown(value)
      return
    }
    const t0 = performance.now()
    let frame = 0
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / 700)
      const eased = 1 - (1 - k) ** 3
      setShown(start + (value - start) * eased)
      if (k < 1) frame = requestAnimationFrame(step)
      else from.current = value
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <>{format(shown)}</>
}

export function ProfileCard({ data, summary }: { data: DashData; summary: Summary }) {
  const { player } = data
  const repKeys = useMemo(() => new Set(EXERCISES.filter(e => e.unit === 'reps').map(e => e.key)), [])
  const life = lifetimeTotals(player, summary.today, data, repKeys)
  const theme = THEMES.find(t => t.id === player.theme)
  const title = featureOn(player, 'badges') && player.title && summary.badges.some(b => b.title === player.title) ? player.title : null
  const totals: [string, string][] = [
    ['Days played', String(life.daysPlayed)],
    ['Quests cleared', String(life.questsCleared)],
    ['Earned', money(life.dollarsEarned)],
    ['Focus', `${life.focusHours} h`],
    ['Reps', String(life.reps)],
    ['Contacts', String(life.contacts)],
    ['Bosses', String(life.bossesDefeated)],
    ['Journal', String(life.journalEntries)],
  ]
  return (
    <SystemWindow title="Hunter profile" className="profile-card">
      <div className="profile-head">
        <div className="rank-badge" aria-label={`Rank ${summary.rank}`}><span>{summary.rank}</span></div>
        <div className="grow">
          <div className="player-name">{player.name}</div>
          {title && <div className="player-title">{title}</div>}
          <div className="muted">
            {summary.badges.length} title{summary.badges.length === 1 ? '' : 's'}
            {theme && featureOn(player, 'loot') ? ` · ${theme.name} theme` : ''}
          </div>
        </div>
        <div className="level"><small>LV.</small><CountUp value={summary.level.level} /></div>
      </div>
      <Bar value={summary.level.xpIntoLevel} max={summary.level.xpForNext} label={`${summary.level.xpIntoLevel} / ${summary.level.xpForNext} XP · ${summary.totalXp} total`} />
      <Radar values={player.stats.map(k => ({ key: k, value: summary.stats[k] ?? 0 }))} />
      <dl className="lifetime">
        {totals.map(([k, v]) => (
          <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
        ))}
      </dl>
    </SystemWindow>
  )
}

export function StatTrends({ data, summary }: { data: DashData; summary: Summary }) {
  const { player } = data
  const [picked, setPicked] = useState<StatKey | null>(null)
  const history = useMemo(
    () => statHistory(player, data.quests, data.completions, summary.restDays, summary.today, 30),
    [player, data.quests, data.completions, summary.restDays, summary.today],
  )
  const stat = picked ?? player.stats[0]
  return (
    <SystemWindow title="Stats · 30 days">
      <ul className="stat-tiles">
        {player.stats.map(k => {
          const values = history.map(h => h.stats[k] ?? 0)
          const now = summary.stats[k] ?? 0
          const weekAgo = values.length > 7 ? values[values.length - 8] : null
          const delta = weekAgo === null ? null : now - weekAgo
          return (
            <li key={k}>
              <button className={`stat-tile ${stat === k ? 'on' : ''}`} onClick={() => setPicked(k)} aria-pressed={stat === k}>
                <span className="stat-key">{k}</span>
                <span className="stat-tile-value"><CountUp value={now} /></span>
                <span className={`delta ${delta === null || delta === 0 ? '' : delta > 0 ? 'up' : 'down'}`}>
                  {delta === null ? 'new' : delta === 0 ? '= 7d' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta)} 7d`}
                </span>
                <Sparkline values={values} label={`${k} over 30 days`} />
              </button>
            </li>
          )
        })}
      </ul>
      <p className="muted chart-title">{STATS.find(s => s.key === stat)?.name} ({stat}), score at the end of each day</p>
      <LineChart points={history.map(h => ({ x: h.day, y: h.stats[stat] ?? 0, label: shortDay(h.day) }))} max={100} label={`${stat} score over the last 30 days`} />
    </SystemWindow>
  )
}

const LEVELS = ['None', 'Some', 'Half', 'Most', 'All']

export function StreakCalendar({ data, summary }: { data: DashData; summary: Summary }) {
  const weeks = 20
  const days = useMemo(
    () => calendarDays(data.player, data.quests, data.completions, summary.restDays, summary.today, weeks),
    [data.player, data.quests, data.completions, summary.restDays, summary.today],
  )
  const moods = useMemo(() => new Map(data.journal.map(j => [j.day, j.mood])), [data.journal])
  const [hover, setHover] = useState<string | null>(null)
  const level = (d: (typeof days)[number]) => (d.due === 0 ? 0 : d.done >= d.due ? 4 : Math.ceil((d.done / d.due) * 3))
  const shown = days.find(d => d.day === (hover ?? summary.today))
  const bestNow = Math.max(0, ...summary.streaks.values())
  const perfect = days.filter(d => !d.outside && d.due > 0 && d.done >= d.due).length

  return (
    <SystemWindow title="Streak calendar">
      <div className="calendar-wrap">
        <div className="calendar-days" aria-hidden>
          {['Mon', '', 'Wed', '', 'Fri', '', 'Sun'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="calendar" role="grid" aria-label={`Daily quests done, last ${weeks} weeks`}>
          {days.map(d => (
            <span
              key={d.day}
              role="gridcell"
              aria-label={`${d.day}: ${d.outside ? 'not played' : `${d.done} of ${d.due}`}${d.rest ? ', Recovery Day' : ''}`}
              className={`cell l${d.outside ? 'x' : level(d)} ${d.rest ? 'rest' : ''} ${d.day === summary.today ? 'today' : ''}`}
              onPointerEnter={() => setHover(d.day)}
              onPointerLeave={() => setHover(null)}
            />
          ))}
        </div>
      </div>
      <div className="calendar-legend">
        <span className="muted">Less</span>
        {[0, 1, 2, 3, 4].map(l => <span key={l} className={`cell l${l}`} title={LEVELS[l]} />)}
        <span className="muted">More</span>
        <span className="cell rest l0" /> <span className="muted">Recovery Day</span>
      </div>
      <p className="calendar-readout">
        {shown && !shown.outside ? (
          <>
            <b>{shortDay(shown.day)}</b>: {shown.done}/{shown.due} dailies{shown.rest ? ' · Recovery Day' : ''}
            {moods.has(shown.day) ? ` · mood ${moods.get(shown.day)}/5` : ''}
          </>
        ) : (
          <span className="muted">Hover a day for details.</span>
        )}
      </p>
      <p className="muted">Best streak running: <b>{bestNow} days</b> · {perfect} perfect days in {weeks} weeks</p>
    </SystemWindow>
  )
}

export function MoneyPanel({ data, summary, onPlans, onShop }: { data: DashData; summary: Summary; onPlans: (id?: string | null) => void; onShop: () => void }) {
  const { wallet, savings } = summary
  const months = moneyByMonth(data.completions, data.purchases, data.savings, summary.today, 6)
  return (
    <SystemWindow title="Treasury">
      <div className="money-hero">
        <div>
          <div className="muted">Wallet · {monthName(wallet.month)}</div>
          <div className="hero-number"><CountUp value={wallet.available} format={money} /></div>
          <div className="muted">earned {money(wallet.earned)} of {money(wallet.budget)}</div>
        </div>
        <div className="vault">
          <div className="muted">Vault</div>
          <div className="big"><CountUp value={wallet.vault} format={money} /></div>
          <div className="muted">{wallet.inPlans > 0 ? `+ ${money(wallet.inPlans)} in plans` : wallet.perMonth !== null ? `~${money(wallet.perMonth)}/month` : 'grows from overflow'}</div>
        </div>
      </div>
      <Bar value={wallet.earned} max={wallet.budget} variant="gold" thin />
      {(savings.target > 0 || data.player.settings.savingsGoal.type === 'percent') && (
        <p className={`muted gate ${savings.met ? 'met' : ''}`}>
          Savings gate: {money(savings.saved)} of {money(savings.target)} {savings.met ? '✓ open' : '· shop locked'}
        </p>
      )}
      <p className="muted chart-title">Quest earnings per month</p>
      <ColumnChart
        bars={months.map(m => ({
          key: m.month,
          label: shortMonth(m.month),
          value: m.earned,
          tip: <><b>{money(m.earned)}</b> earned in {monthName(m.month)}<br />{money(m.spent)} spent from the wallet · {money(m.saved)} saved</>,
        }))}
        format={v => `$${Math.round(v)}`}
        reference={{ value: wallet.budget, label: 'budget' }}
        label="Quest earnings for the last six months"
      />
      <Goals data={data} summary={summary} onShop={onShop} />
      {featureOn(data.player, 'plans') && (
        <div className="plan-list">
          {summary.plans.map(s => (
            <button key={s.plan.id} className="plan-row" onClick={() => onPlans(s.plan.id)}>
              <span className="plan-name">{s.plan.name}</span>
              <span className="plan-when">{s.daysLeft === null ? 'no date' : s.daysLeft > 0 ? `${s.daysLeft} days` : s.daysLeft === 0 ? 'today!' : 'past'}</span>
              <Bar value={s.progress} max={1} variant="gold" thin />
              <span className="muted plan-meta">
                {Math.round(s.progress * 100)}% of {money(s.total)}
                {s.remaining > 0 && s.readyBy ? ` · ready ~${monthName(s.readyBy)}` : ''}
              </span>
            </button>
          ))}
          <div className="row end">
            <button className="ghost small" onClick={onShop}>Shop</button>
            <button className="small" onClick={() => onPlans(null)}>{summary.plans.length ? 'All plans' : 'Plan an adventure'}</button>
          </div>
        </div>
      )}
    </SystemWindow>
  )
}

export function TrainingPanel({ data, summary, onWorkout, onScan }: { data: DashData; summary: Summary; onWorkout: () => void; onScan: () => void }) {
  const { routine } = summary
  const options = useMemo(() => {
    const keys = new Set([...routine.exercises.map(e => e.key), ...data.sets.map(s => s.exercise)])
    return [...keys]
  }, [routine.exercises, data.sets])
  const [picked, setPicked] = useState<string | null>(null)
  const key = picked && options.includes(picked) ? picked : options[0]
  const info = key ? exerciseInfo(key) : undefined
  const target = routine.exercises.find(e => e.key === key)?.target
  const history = key ? exerciseHistory(data.sets, key, summary.today, 14) : []
  const unit = info?.unit === 'reps' ? '' : info?.unit === 'seconds' ? 's' : info?.unit === 'minutes' ? ' min' : ''
  const head = data.scans.filter(s => s.kind === 'head').sort((a, b) => a.createdAt - b.createdAt).slice(-12)
  const doneCount = routine.exercises.filter(e => (routine.done[e.key] ?? 0) >= e.target).length
  const cycle = [routine.kind, ...routine.upcoming].slice(0, 6)

  return (
    <SystemWindow title="Training">
      <div className="cycle-strip" aria-label="Training cycle">
        {cycle.map((k, i) => (
          <span key={i} className={`cycle-day ${i === 0 ? 'now' : ''} day-${k}`}>{i === 0 ? 'Today' : i === 1 ? 'Next' : `+${i}`}<b>{DAY_NAMES[k]}</b></span>
        ))}
      </div>
      <p className="muted">{doneCount}/{routine.exercises.length} exercises done today</p>
      <ul className="exercise-today">
        {routine.exercises.map(e => (
          <li key={e.key} className={(routine.done[e.key] ?? 0) >= e.target ? 'done' : ''}>
            <span className="grow">{e.name}</span>
            <span className="muted">{Math.min(routine.done[e.key] ?? 0, e.target)}/{e.target}</span>
          </li>
        ))}
      </ul>
      {key && (
        <>
          <label className="chart-picker">
            Last 14 days
            <select value={key} onChange={e => setPicked(e.target.value)}>
              {options.map(k => <option key={k} value={k}>{exerciseInfo(k)?.name ?? routine.exercises.find(e => e.key === k)?.name ?? k}</option>)}
            </select>
          </label>
          <ColumnChart
            bars={history.map(h => ({ key: h.day, label: shortDay(h.day).replace(/^\w+ /, ''), value: h.total, tip: <><b>{h.total}{unit}</b> on {shortDay(h.day)}</> }))}
            reference={target ? { value: target, label: 'target' } : undefined}
            label={`${info?.name ?? key} per day for two weeks`}
          />
        </>
      )}
      {head.length > 1 && (
        <>
          <p className="muted chart-title">Head angle from posture scans (higher = head further back)</p>
          <LineChart points={head.map(s => ({ x: s.day, y: Math.round(s.value), label: shortDay(s.day) }))} format={v => `${Math.round(v)}°`} label="Head angle trend" height={100} />
        </>
      )}
      <div className="row end">
        <button className="ghost small" onClick={onScan}>Posture scan</button>
        <button className="small" onClick={onWorkout}>Start workout</button>
      </div>
    </SystemWindow>
  )
}

export function ReportWall({ input, summary, onReport }: { input: ReportInput; summary: Summary; onReport: () => void }) {
  const weeks = useMemo(() => {
    const list = []
    for (let i = 7; i >= 1; i--) list.push(weeklyReport(input, addDays(summary.week, -7 * i)))
    return list
  }, [input, summary.week])
  const thisWeek = weeklyReport(input, summary.week)
  const played = weeks.filter(w => w.completion > 0)
  return (
    <SystemWindow title="Weekly reports">
      <ul className="grade-wall">
        {weeks.map(w => (
          <li key={w.start} className={`grade-tile g-${w.grade} ${w.completion === 0 ? 'empty' : ''}`} title={`${w.start} to ${w.end}: ${Math.round(w.completion * 100)}%`}>
            <span className="tile-grade">{w.completion === 0 ? '–' : w.grade}</span>
            <span className="tile-pct">{Math.round(w.completion * 100)}%</span>
            <span className="tile-date">{shortDay(w.start)}</span>
            {w.avgMood !== null && <span className="tile-mood">mood {w.avgMood.toFixed(1)}</span>}
          </li>
        ))}
        <li className={`grade-tile g-${thisWeek.grade} current`} title="This week so far">
          <span className="tile-grade">{thisWeek.grade}</span>
          <span className="tile-pct">{Math.round(thisWeek.completion * 100)}%</span>
          <span className="tile-date">so far</span>
        </li>
      </ul>
      {played.length === 0 && <p className="muted">Grades fill in as weeks finish.</p>}
      <p className="muted">{thisWeek.suggestion}</p>
      <div className="row end">
        <button className="small" onClick={onReport}>Full report</button>
      </div>
    </SystemWindow>
  )
}

const FILTERS: { key: 'all' | FeedKind[]; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: ['quest', 'surprise'], label: 'Quests' },
  { key: ['set'], label: 'Training' },
  { key: ['contact'], label: 'Party' },
  { key: ['focus', 'boss'], label: 'Focus' },
  { key: ['reward', 'savings', 'plan'], label: 'Money' },
  { key: ['journal', 'memory'], label: 'Journal' },
  { key: ['goal'], label: 'Goals' },
]

export function Timeline({ data }: { data: DashData }) {
  const [filter, setFilter] = useState(0)
  const feed = useMemo(
    () =>
      activityFeed(
        {
          ...data,
          planNames: new Map(data.plans.map(p => [p.id, p.name])),
          exerciseName: k => exerciseInfo(k)?.name ?? k,
        },
        200,
      ),
    [data],
  )
  const f = FILTERS[filter].key
  const shown = (f === 'all' ? feed : feed.filter(e => f.includes(e.kind))).slice(0, 60)
  return (
    <SystemWindow title="System log" className="timeline">
      <div className="tabs-inline">
        {FILTERS.map((x, i) => (
          <button key={x.label} className={`chip ${filter === i ? 'picked' : ''}`} onClick={() => setFilter(i)} aria-pressed={filter === i}>{x.label}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <p className="muted">Nothing logged yet.</p>
      ) : (
        <ol className="log">
          {shown.map(e => (
            <li key={e.id} className={`log-${e.kind}`}>
              <time className="log-time" dateTime={new Date(e.at).toISOString()}>{ago(e.at)}</time>
              {e.stat ? <span className="stat-key">{e.stat}</span> : <span className="stat-key">SYS</span>}
              <span className="log-text">{e.text}</span>
              {e.gain && <span className="log-gain">{e.gain}</span>}
            </li>
          ))}
        </ol>
      )}
    </SystemWindow>
  )
}

function ago(at: number): string {
  const min = Math.round((Date.now() - at) / 60_000)
  if (min < 1) return 'now'
  if (min < 60) return `${min}m`
  const h = Math.round(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.round(h / 24)
  if (d < 7) return `${d}d`
  return new Date(at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Starred shop ideas and how close each one is. */
function Goals({ data, summary, onShop }: { data: DashData; summary: Summary; onShop: () => void }) {
  const goals = (data.player.favoriteRewards ?? []).map(id => REWARD_IDEAS.find(i => i.id === id)).filter(i => !!i)
  if (goals.length === 0) return null
  const ctx = {
    level: summary.level.level,
    stats: summary.stats,
    wallet: summary.wallet.available,
    vault: summary.wallet.vault,
    savingsMet: summary.savings.met,
    mainQuestsCleared: summary.mainQuestsCleared,
  }
  return (
    <div className="plan-list">
      <p className="muted chart-title">★ Working toward</p>
      {goals.map(g => {
        const p = goalProgress(g, ctx)
        return (
          <button key={g.id} className="plan-row" onClick={onShop}>
            <span className="plan-name">{g.title}</span>
            <span className="plan-when">{money(g.price)}</span>
            <Bar value={p.have} max={g.price} variant="gold" thin />
            <span className="muted plan-meta">{p.blockers.length ? p.blockers[0] : 'Ready to buy'}</span>
          </button>
        )
      })}
    </div>
  )
}

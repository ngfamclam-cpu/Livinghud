import { useMemo, useState } from 'react'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  MONTH_UNDER_XP,
  WEEK_UNDER_XP,
  addDays,
  billMonthly,
  daysBetween,
  categoryName,
  monthOf,
  monthPace,
  monthRange,
  monthReport,
  totals,
  weekFinance,
  type Bill,
  type FinanceSettings,
  type Summary,
  type Transaction,
} from '../../engine'
import { addBill, deleteTransaction, markMonthReviewed, markWeekReviewed, payBill, saveFinanceSettings, skipBill, updateBill, updateTransaction } from '../../db/finance'
import { SystemWindow } from '../SystemWindow'
import { Bar } from '../Bar'
import { money, monthName } from '../format'

type Tab = 'overview' | 'entries' | 'bills' | 'week' | 'month'
const TABS: { key: Tab; label: string }[] = [
  { key: 'overview', label: 'Overview' },
  { key: 'entries', label: 'Entries' },
  { key: 'bills', label: 'Bills' },
  { key: 'week', label: 'Weekly' },
  { key: 'month', label: 'Monthly report' },
]

const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + n, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
const shortDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

/** The finance tracker: this month, every entry, bills, the weekly check-in and the monthly report. */
export function Finance({ summary, finance, transactions, bills, onClose }: {
  summary: Summary
  finance: FinanceSettings | undefined
  transactions: Transaction[]
  bills: Bill[]
  onClose?: () => void
}) {
  const [tab, setTab] = useState<Tab>('overview')
  return (
    <main className="hud finance">
      <SystemWindow title="Finances">
        <div className="tabs-inline">
          {TABS.map(t => (
            <button key={t.key} className={`chip ${tab === t.key ? 'picked' : ''}`} aria-pressed={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</button>
          ))}
          {onClose && <button className="ghost small" onClick={onClose}>Back</button>}
        </div>
        <p className="muted">Real money, tracked privately on your devices. Staying under your limit earns WLT XP (+{WEEK_UNDER_XP} a week, +{MONTH_UNDER_XP} a month), never game dollars.</p>
      </SystemWindow>
      {tab === 'overview' && <Overview summary={summary} finance={finance} transactions={transactions} bills={bills} />}
      {tab === 'entries' && <Entries summary={summary} transactions={transactions} />}
      {tab === 'bills' && <Bills summary={summary} bills={bills} />}
      {tab === 'week' && <Weekly summary={summary} finance={finance} transactions={transactions} />}
      {tab === 'month' && <Monthly summary={summary} finance={finance} transactions={transactions} bills={bills} />}
    </main>
  )
}

function Overview({ summary, finance, transactions, bills }: { summary: Summary; finance: FinanceSettings | undefined; transactions: Transaction[]; bills: Bill[] }) {
  const month = monthOf(summary.today)
  const t = totals(transactions, finance, monthRange(month).from, summary.today)
  const pace = finance?.limit ? monthPace(transactions, finance, summary.today) : null
  const [limit, setLimit] = useState(String(finance?.limit || ''))
  const [billsIn, setBillsIn] = useState(finance?.billsInLimit ?? true)
  const [saved, setSaved] = useState(false)
  const biggest = Math.max(1, ...EXPENSE_CATEGORIES.map(c => t.byCategory[c.key] ?? 0))
  const committed = bills.filter(b => b.active).reduce((s, b) => s + billMonthly(b), 0)

  return (
    <>
      <SystemWindow title={`${monthName(month)} so far`}>
        <div className="money-hero">
          <div>
            <div className="muted">Spent</div>
            <div className="hero-number">{money(t.spent)}</div>
            <div className="muted">{pace ? `of ${money(pace.limit)} limit` : 'no limit set'}</div>
          </div>
          <div className="vault">
            <div className="muted">Income</div>
            <div className="big">{money(t.income)}</div>
            <div className="muted">saved {money(t.saved)}</div>
          </div>
        </div>
        {pace && (
          <>
            <Bar value={pace.spent} max={pace.limit} variant={pace.status === 'over' ? 'hp' : 'gold'} />
            <p className={`muted pace-line ${pace.status}`}>
              {pace.status === 'over'
                ? `Over by ${money(-pace.left)}.`
                : `${money(pace.left)} left, about ${money(pace.perDayLeft)} a day. By today an even pace would be ${money(pace.expected)}.`}
            </p>
          </>
        )}
        <ul className="stats category-bars">
          {EXPENSE_CATEGORIES.map(c => (
            <li key={c.key}>
              <span className="stat-key">{c.name.slice(0, 4).toUpperCase()}</span>
              <span className="stat-name">{c.name}</span>
              <Bar value={t.byCategory[c.key] ?? 0} max={biggest} thin />
              <span className="stat-value">{money(t.byCategory[c.key] ?? 0)}</span>
            </li>
          ))}
        </ul>
        <p className="muted">
          {t.loggedDays} day{t.loggedDays === 1 ? '' : 's'} logged · {t.noSpendDays} no-spend day{t.noSpendDays === 1 ? '' : 's'}
          {committed > 0 && ` · bills ${money(committed)}/month`}
        </p>
      </SystemWindow>

      <SystemWindow title="Monthly spending limit">
        <div className="inline-form">
          <input type="number" min={0} inputMode="decimal" placeholder="e.g. 1800" value={limit} onChange={e => { setLimit(e.target.value); setSaved(false) }} aria-label="Monthly limit" />
          <button className="small" onClick={async () => { await saveFinanceSettings(Number(limit) || 0, billsIn); setSaved(true) }}>Save</button>
        </div>
        <label className="toggle-line">
          <input type="checkbox" checked={billsIn} onChange={e => { setBillsIn(e.target.checked); setSaved(false) }} />
          <span>Bills and subscriptions count toward the limit</span>
        </label>
        <p className="muted">Savings transfers never count as spending. XP counts from the day you first set a limit; a month only counts if you logged at least 5 entries.{saved && ' Saved.'}</p>
      </SystemWindow>
    </>
  )
}

function Entries({ summary, transactions }: { summary: Summary; transactions: Transaction[] }) {
  const [month, setMonth] = useState(monthOf(summary.today))
  const [editing, setEditing] = useState<string | null>(null)
  const { from, to } = monthRange(month)
  const list = transactions.filter(t => t.day >= from && t.day <= to && t.kind !== 'nospend').sort((a, b) => b.day.localeCompare(a.day) || b.createdAt - a.createdAt)
  const days = [...new Set(list.map(t => t.day))]
  return (
    <SystemWindow title={`Entries · ${monthName(month)}`}>
      <div className="day-nav">
        <button className="ghost small" aria-label="Previous month" onClick={() => setMonth(m => shiftMonth(m, -1))}>◀</button>
        <span className="grow" />
        <button className="ghost small" aria-label="Next month" disabled={month >= monthOf(summary.today)} onClick={() => setMonth(m => shiftMonth(m, 1))}>▶</button>
      </div>
      {list.length === 0 && <p className="muted">Nothing logged this month.</p>}
      {days.map(day => (
        <div key={day} className="entry-day">
          <p className="muted entry-day-head">{shortDay(day)}</p>
          <ul className="board-list compact">
            {list.filter(t => t.day === day).map(t =>
              editing === t.id ? (
                <EditEntry key={t.id} t={t} onDone={() => setEditing(null)} />
              ) : (
                <li key={t.id}>
                  <span className={`entry-kind ${t.kind}`}>{t.kind === 'income' ? '+' : '−'}</span>
                  <span className="quest-title">{t.note || categoryName(t.category)} <small className="muted">{categoryName(t.category)}{t.billId ? ' · bill' : ''}</small></span>
                  <span className="price">{money(t.amount)}</span>
                  <button className="ghost small" onClick={() => setEditing(t.id)}>Edit</button>
                </li>
              ),
            )}
          </ul>
        </div>
      ))}
    </SystemWindow>
  )
}

function EditEntry({ t, onDone }: { t: Transaction; onDone: () => void }) {
  const [amount, setAmount] = useState(String(t.amount))
  const [category, setCategory] = useState(t.category)
  const [note, setNote] = useState(t.note)
  const [day, setDay] = useState(t.day)
  const cats = t.kind === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  return (
    <li className="edit-entry">
      <div className="grid2">
        <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount" />
        <input type="date" value={day} onChange={e => setDay(e.target.value)} aria-label="Day" />
      </div>
      <select value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
        {cats.map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
      </select>
      <input value={note} maxLength={80} onChange={e => setNote(e.target.value)} placeholder="Note" aria-label="Note" />
      <div className="row end">
        <button className="ghost small danger" onClick={async () => { if (confirm('Delete this entry?')) { await deleteTransaction(t.id); onDone() } }}>Delete</button>
        <button className="ghost small" onClick={onDone}>Cancel</button>
        <button className="small" disabled={!(Number(amount) > 0) || !day} onClick={async () => { await updateTransaction(t.id, { amount: Number(amount), category, note, day }); onDone() }}>Save</button>
      </div>
    </li>
  )
}

function Bills({ summary, bills }: { summary: Summary; bills: Bill[] }) {
  const active = bills.filter(b => b.active).sort((a, b) => a.nextDue.localeCompare(b.nextDue))
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('')
  const [cycle, setCycle] = useState<Bill['cycle']>('monthly')
  const [category, setCategory] = useState('needs')
  const [due, setDue] = useState(summary.today)
  const total = active.reduce((s, b) => s + billMonthly(b), 0)
  return (
    <>
      <SystemWindow title={`Bills & subscriptions · ${money(total)}/month`}>
        {active.length === 0 && <p className="muted">No bills yet. Add rent, phone, streaming, gym and so on below.</p>}
        <ul className="board-list">
          {active.map(b => {
            const inDays = daysBetween(summary.today, b.nextDue)
            return (
              <li key={b.id}>
                <span className="quest-title">
                  {b.name} <small className="muted">{b.cycle} · {categoryName(b.category)} · {inDays < 0 ? `overdue ${-inDays}d` : inDays === 0 ? 'due today' : `due ${shortDay(b.nextDue)}`}</small>
                </span>
                <span className="price">{money(b.amount)}</span>
                <button className="small" onClick={() => payBill(b.id)}>Paid</button>
                <button className="ghost small" title="Skip this cycle without logging" onClick={() => skipBill(b.id)}>Skip</button>
                <button className="ghost small icon" aria-label={`Remove ${b.name}`} onClick={() => confirm(`Stop tracking ${b.name}?`) && updateBill(b.id, { active: false })}>×</button>
              </li>
            )
          })}
        </ul>
        <p className="muted">"Paid" logs the payment as spending and moves the due date to the next cycle. Bills due within 3 days show on the HUD.</p>
      </SystemWindow>
      <SystemWindow title="Add a bill">
        <div className="form">
          <label>Name<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="e.g. Phone plan" /></label>
          <div className="grid2">
            <label>Amount ($)<input type="number" inputMode="decimal" min={0} value={amount} onChange={e => setAmount(e.target.value)} /></label>
            <label>
              Every
              <select value={cycle} onChange={e => setCycle(e.target.value as Bill['cycle'])}>
                <option value="weekly">Week</option>
                <option value="monthly">Month</option>
                <option value="yearly">Year</option>
              </select>
            </label>
          </div>
          <div className="grid2">
            <label>Next due<input type="date" value={due} onChange={e => setDue(e.target.value)} /></label>
            <label>
              Category
              <select value={category} onChange={e => setCategory(e.target.value)}>
                {EXPENSE_CATEGORIES.filter(c => c.key !== 'savings').map(c => <option key={c.key} value={c.key}>{c.name}</option>)}
              </select>
            </label>
          </div>
          <div className="row end">
            <button disabled={!name.trim() || !(Number(amount) > 0) || !due} onClick={async () => { await addBill({ name, amount: Number(amount), cycle, category, nextDue: due }); setName(''); setAmount('') }}>Add bill</button>
          </div>
        </div>
      </SystemWindow>
    </>
  )
}

function Weekly({ summary, finance, transactions }: { summary: Summary; finance: FinanceSettings | undefined; transactions: Transaction[] }) {
  const [which, setWhich] = useState<'this' | 'last'>('this')
  const [reviewed, setReviewed] = useState(false)
  const start = which === 'this' ? summary.week : addDays(summary.week, -7)
  const w = weekFinance(transactions, finance, start)
  const change = w.previous.spent > 0 ? Math.round(((w.totals.spent - w.previous.spent) / w.previous.spent) * 100) : null
  return (
    <SystemWindow title="Weekly money check-in">
      <div className="tabs-inline">
        <button className={`chip ${which === 'this' ? 'picked' : ''}`} onClick={() => setWhich('this')}>This week</button>
        <button className={`chip ${which === 'last' ? 'picked' : ''}`} onClick={() => setWhich('last')}>Last week</button>
      </div>
      <p className="muted">{shortDay(w.start)} to {shortDay(w.end)}</p>
      <dl className="report-stats">
        <dt>Spent</dt><dd>{money(w.totals.spent)}{change !== null && ` (${change > 0 ? '▲' : change < 0 ? '▼' : '='} ${Math.abs(change)}% vs the week before)`}</dd>
        {w.pace !== null && <><dt>Weekly pace</dt><dd>{money(w.pace)} · {w.underPace ? `under by ${money(w.pace - w.totals.spent)} ✓` : `over by ${money(w.totals.spent - w.pace)}`}</dd></>}
        <dt>Income</dt><dd>{money(w.totals.income)}</dd>
        <dt>Saved</dt><dd>{money(w.totals.saved)}</dd>
        <dt>Needs · Wants</dt><dd>{money(w.totals.byCategory.needs ?? 0)} · {money(w.totals.byCategory.wants ?? 0)}</dd>
        <dt>Logged</dt><dd>{w.totals.loggedDays}/7 days · {w.totals.noSpendDays} no-spend</dd>
      </dl>
      {w.biggest.length > 0 && (
        <>
          <p className="muted chart-title">Biggest expenses</p>
          <ul className="board-list compact">
            {w.biggest.map(t => <li key={t.id}><span className="quest-title">{t.note || categoryName(t.category)} <small className="muted">{shortDay(t.day)}</small></span><span className="price">{money(t.amount)}</span></li>)}
          </ul>
        </>
      )}
      <div className="row end">
        {reviewed ? <span className="cleared">REVIEWED</span> : <button className="small" onClick={async () => { await markWeekReviewed(); setReviewed(true) }}>Done reviewing</button>}
      </div>
      <p className="muted">"Done reviewing" clears the Money check-in side quest, if you have it. This summary also appears in the weekly report.</p>
    </SystemWindow>
  )
}

function Monthly({ summary, finance, transactions, bills }: { summary: Summary; finance: FinanceSettings | undefined; transactions: Transaction[]; bills: Bill[] }) {
  // The last finished month by default: that's the one worth reviewing.
  const [month, setMonth] = useState(shiftMonth(monthOf(summary.today), -1))
  const [reviewed, setReviewed] = useState(false)
  const r = useMemo(() => monthReport(transactions, bills, finance, month), [transactions, bills, finance, month])
  const cats = EXPENSE_CATEGORIES.map(c => ({ ...c, now: r.totals.byCategory[c.key] ?? 0, before: r.previous.byCategory[c.key] ?? 0 }))
  const top = Math.max(1, ...cats.map(c => Math.max(c.now, c.before)))
  const current = month === monthOf(summary.today)
  return (
    <SystemWindow title={`Monthly report · ${monthName(month)} ${month.slice(0, 4)}`} className="report">
      <div className="day-nav">
        <button className="ghost small" aria-label="Previous month" onClick={() => { setMonth(m => shiftMonth(m, -1)); setReviewed(false) }}>◀</button>
        <span className="grow muted">{current ? 'This month so far' : ''}</span>
        <button className="ghost small" aria-label="Next month" disabled={current} onClick={() => { setMonth(m => shiftMonth(m, 1)); setReviewed(false) }}>▶</button>
      </div>
      <div className="report-grade">
        <span className="grade">{r.grade}</span>
        <span>
          Spent <b>{money(r.totals.spent)}</b>
          {r.limit !== null && <> of {money(r.limit)} {r.underLimit ? '✓' : '(over)'}</>}
          <br />
          <small className="muted">Income {money(r.totals.income)} · saved {money(r.totals.saved)}{r.keptRate !== null && ` · kept ${Math.round(r.keptRate * 100)}%`}</small>
        </span>
      </div>
      <p className="muted chart-title">By category (this month, with last month in brackets)</p>
      <ul className="stats category-bars">
        {cats.map(c => (
          <li key={c.key}>
            <span className="stat-key">{c.name.slice(0, 4).toUpperCase()}</span>
            <span className="stat-name">{c.before > 0 && c.now !== c.before ? (c.now > c.before ? '▲' : '▼') : ''}</span>
            <Bar value={c.now} max={top} thin />
            <span className="stat-value">{money(c.now)} <small className="muted">({money(c.before)})</small></span>
          </li>
        ))}
      </ul>
      <dl className="report-stats">
        <dt>Daily average</dt><dd>{money(r.dailyAverage)}</dd>
        <dt>Last month</dt><dd>spent {money(r.previous.spent)}, income {money(r.previous.income)}</dd>
        <dt>Bills</dt><dd>{money(r.billsMonthly)}/month committed</dd>
        <dt>Logging</dt><dd>{r.totals.loggedDays} days · {r.totals.entries} entries · {r.totals.noSpendDays} no-spend days</dd>
      </dl>
      {r.top.length > 0 && (
        <>
          <p className="muted chart-title">Top expenses</p>
          <ul className="board-list compact">
            {r.top.map(t => <li key={t.id}><span className="quest-title">{t.note || categoryName(t.category)} <small className="muted">{shortDay(t.day)} · {categoryName(t.category)}</small></span><span className="price">{money(t.amount)}</span></li>)}
          </ul>
        </>
      )}
      <p className="system-line">{r.tip}</p>
      <div className="row end">
        {reviewed ? <span className="cleared">REVIEWED</span> : <button className="small" onClick={async () => { await markMonthReviewed(); setReviewed(true) }}>Done reviewing</button>}
      </div>
      <p className="muted">"Done reviewing" clears the Spending autopsy side quest, if you have it.</p>
    </SystemWindow>
  )
}

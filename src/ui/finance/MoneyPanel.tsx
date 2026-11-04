import { useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, billsDue, monthPace, type Bill, type FinanceSettings, type Summary, type Transaction } from '../../engine'
import { addTransaction, markNoSpend, payBill } from '../../db/finance'
import { SystemWindow } from '../SystemWindow'
import { Bar } from '../Bar'
import { money } from '../format'

/** The HUD's money panel: log an expense or income in a few taps, see the month's pace and bills due. */
export function MoneyPanel({ summary, finance, transactions, bills, onOpen }: {
  summary: Summary
  finance: FinanceSettings | undefined
  transactions: Transaction[]
  bills: Bill[]
  onOpen: () => void
}) {
  const [kind, setKind] = useState<'expense' | 'income'>('expense')
  const [amount, setAmount] = useState('')
  const [category, setCategory] = useState('wants')
  const [note, setNote] = useState('')
  const value = Number(amount)
  const pace = finance?.limit ? monthPace(transactions, finance, summary.today) : null
  const due = billsDue(bills, summary.today)
  const todays = transactions.filter(t => t.day === summary.today)
  const spentToday = todays.filter(t => t.kind === 'expense' && t.category !== 'savings').reduce((s, t) => s + t.amount, 0)
  const noSpendToday = todays.some(t => t.kind === 'nospend')
  const categories = kind === 'expense' ? EXPENSE_CATEGORIES : INCOME_CATEGORIES

  const save = async () => {
    const entry = { kind, amount: value, category, note }
    setAmount('')
    setNote('')
    await addTransaction(entry)
  }
  const switchKind = (k: 'expense' | 'income') => {
    setKind(k)
    setCategory(k === 'expense' ? 'wants' : 'pay')
  }

  return (
    <SystemWindow title="Money" className="money-panel">
      {pace ? (
        <>
          <Bar value={pace.spent} max={pace.limit} variant={pace.status === 'over' ? 'hp' : 'gold'} thin label={`${money(pace.spent)} of ${money(pace.limit)}`} />
          <p className={`muted pace-line ${pace.status}`}>
            {pace.status === 'over' ? `Over the monthly limit by ${money(-pace.left)}.` : `${money(pace.left)} left · about ${money(pace.perDayLeft)}/day`}
            {pace.status === 'near' && ' · ahead of pace, ease off a little'}
          </p>
        </>
      ) : (
        <p className="muted">Set a monthly spending limit in Finances to track your pace and earn WLT XP for staying under.</p>
      )}

      <div className="tabs-inline">
        <button className={`chip ${kind === 'expense' ? 'picked' : ''}`} aria-pressed={kind === 'expense'} onClick={() => switchKind('expense')}>Spent</button>
        <button className={`chip ${kind === 'income' ? 'picked' : ''}`} aria-pressed={kind === 'income'} onClick={() => switchKind('income')}>Income</button>
      </div>
      <div className="quick-add">
        <input type="number" inputMode="decimal" min={0} step="0.01" placeholder="$0.00" value={amount} onChange={e => setAmount(e.target.value)} aria-label="Amount" />
        <input value={note} maxLength={80} onChange={e => setNote(e.target.value)} placeholder="Note (optional)" aria-label="Note" />
      </div>
      <div className="category-chips">
        {categories.map(c => (
          <button key={c.key} className={`chip ${category === c.key ? 'picked' : ''}`} aria-pressed={category === c.key} title={'hint' in c ? c.hint : undefined} onClick={() => setCategory(c.key)}>{c.name}</button>
        ))}
      </div>
      <div className="row">
        <span className="muted grow">
          Today: {money(spentToday)}{noSpendToday && spentToday === 0 ? ' · no-spend day ✓' : ''}
        </span>
        {!noSpendToday && spentToday === 0 && <button className="ghost small" onClick={() => markNoSpend(summary.today)}>No spend today</button>}
        <button className="small" disabled={!(value > 0)} onClick={save}>Log</button>
      </div>

      {due.length > 0 && (
        <ul className="board-list compact bills-due">
          {due.map(({ bill, inDays }) => (
            <li key={bill.id}>
              <span className="quest-title">{bill.name} <small className="muted">{inDays < 0 ? `overdue ${-inDays}d` : inDays === 0 ? 'due today' : `due in ${inDays}d`}</small></span>
              <span className="price">{money(bill.amount)}</span>
              <button className="ghost small" onClick={() => payBill(bill.id)}>Paid</button>
            </li>
          ))}
        </ul>
      )}
      <div className="row end">
        <button className="ghost small" onClick={onOpen}>Finances & reports</button>
      </div>
    </SystemWindow>
  )
}

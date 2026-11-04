// The finance tracker: spending, income and bills, a monthly spending limit,
// the weekly check-in and the monthly report. Real money, so nothing here ever
// pays game dollars: staying under the limit earns WLT XP only. Everything is
// derived from the transaction log, like the rest of the game.

import { addDays, daysBetween, monthOf, weekOf } from './time'
import type { Bill, FinanceSettings, Transaction } from './types'

export type ExpenseCategory = 'needs' | 'wants' | 'savings' | 'other'
export type IncomeCategory = 'pay' | 'side' | 'other-income'

export const EXPENSE_CATEGORIES: { key: ExpenseCategory; name: string; hint: string }[] = [
  { key: 'needs', name: 'Needs', hint: 'Rent, bills, groceries, transport' },
  { key: 'wants', name: 'Wants', hint: 'Fun, eating out, shopping, raves, gaming' },
  { key: 'savings', name: 'Savings', hint: 'Money moved to savings or investing (not counted as spending)' },
  { key: 'other', name: 'Other', hint: 'Anything else' },
]
export const INCOME_CATEGORIES: { key: IncomeCategory; name: string }[] = [
  { key: 'pay', name: 'Pay' },
  { key: 'side', name: 'Side income' },
  { key: 'other-income', name: 'Other income' },
]
export const categoryName = (key: string) =>
  [...EXPENSE_CATEGORIES, ...INCOME_CATEGORIES].find(c => c.key === key)?.name ?? key

/** XP for a finished week under your weekly pace, and for a finished month under the limit (XP only, never dollars). */
export const WEEK_UNDER_XP = 15
export const MONTH_UNDER_XP = 50
/** A month only counts for the bonus with at least this many entries logged (so not logging isn't "under budget"). */
export const MONTH_MIN_LOGS = 5

const round2 = (n: number) => Math.round(n * 100) / 100
const daysInMonth = (month: string) => {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m, 0).getDate()
}

/** Does this expense count as spending against the limit? (Savings never does; bills only if you say so.) */
export function countsAsSpending(t: Transaction, settings: Pick<FinanceSettings, 'billsInLimit'> | undefined): boolean {
  if (t.kind !== 'expense' || t.category === 'savings') return false
  return !(t.billId && settings && !settings.billsInLimit)
}

export interface Totals {
  income: number
  /** Spending that counts against the limit. */
  spent: number
  /** All expenses except savings, bills included. */
  outgoings: number
  saved: number
  byCategory: Record<string, number>
  /** Days with at least one entry (an expense, income or a no-spend check). */
  loggedDays: number
  noSpendDays: number
  entries: number
}

export function totals(list: Transaction[], settings: FinanceSettings | undefined, from: string, to: string): Totals {
  const inRange = list.filter(t => t.day >= from && t.day <= to)
  const byCategory: Record<string, number> = {}
  let income = 0
  let spent = 0
  let outgoings = 0
  let saved = 0
  for (const t of inRange) {
    if (t.kind === 'income') income += t.amount
    if (t.kind === 'expense') {
      byCategory[t.category] = (byCategory[t.category] ?? 0) + t.amount
      if (t.category === 'savings') saved += t.amount
      else outgoings += t.amount
      if (countsAsSpending(t, settings)) spent += t.amount
    }
  }
  const spendDays = new Set(inRange.filter(t => t.kind === 'expense' && t.category !== 'savings').map(t => t.day))
  const noSpend = new Set(inRange.filter(t => t.kind === 'nospend' && !spendDays.has(t.day)).map(t => t.day))
  for (const k of Object.keys(byCategory)) byCategory[k] = round2(byCategory[k])
  return {
    income: round2(income),
    spent: round2(spent),
    outgoings: round2(outgoings),
    saved: round2(saved),
    byCategory,
    loggedDays: new Set(inRange.map(t => t.day)).size,
    noSpendDays: noSpend.size,
    entries: inRange.length,
  }
}

export const monthRange = (month: string) => ({ from: `${month}-01`, to: `${month}-${String(daysInMonth(month)).padStart(2, '0')}` })

export interface Pace {
  limit: number
  spent: number
  /** Where spending "should" be by today if spread evenly over the month. */
  expected: number
  left: number
  /** Spending per day you can still afford for the rest of the month. */
  perDayLeft: number
  status: 'under' | 'near' | 'over'
}

/** This month's spending against the limit, as of today. */
export function monthPace(list: Transaction[], settings: FinanceSettings, today: string): Pace {
  const month = monthOf(today)
  const { from } = monthRange(month)
  const spent = totals(list, settings, from, today).spent
  const days = daysInMonth(month)
  const day = Number(today.slice(8))
  const expected = round2((settings.limit * day) / days)
  const left = round2(settings.limit - spent)
  const perDayLeft = round2(Math.max(0, left) / Math.max(1, days - day + 1))
  const status = spent > settings.limit ? 'over' : spent > expected * 1.1 ? 'near' : 'under'
  return { limit: settings.limit, spent, expected, left, perDayLeft, status }
}

/** The weekly share of a monthly limit (12 months over 52 weeks). */
export const weeklyPace = (limit: number) => round2((limit * 12) / 52)

export interface WeekFinance {
  start: string
  end: string
  totals: Totals
  previous: Totals
  /** null without a limit. */
  pace: number | null
  underPace: boolean | null
  biggest: Transaction[]
}

/** The weekly check-in: this Monday-to-Sunday week, against the week before and your weekly pace. */
export function weekFinance(list: Transaction[], settings: FinanceSettings | undefined, start: string): WeekFinance {
  const end = addDays(start, 6)
  const t = totals(list, settings, start, end)
  const pace = settings?.limit ? weeklyPace(settings.limit) : null
  return {
    start,
    end,
    totals: t,
    previous: totals(list, settings, addDays(start, -7), addDays(start, -1)),
    pace,
    underPace: pace === null ? null : t.spent <= pace,
    biggest: list.filter(x => x.kind === 'expense' && x.category !== 'savings' && x.day >= start && x.day <= end).sort((a, b) => b.amount - a.amount).slice(0, 3),
  }
}

export interface MonthReport {
  month: string
  totals: Totals
  previous: Totals
  limit: number | null
  underLimit: boolean | null
  /** Share of income not spent (savings included as kept); null with no income logged. */
  keptRate: number | null
  dailyAverage: number
  top: Transaction[]
  /** What active bills cost per month. */
  billsMonthly: number
  grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'E'
  tip: string
}

/** Monthly cost of a bill, whatever its cycle. */
export const billMonthly = (b: Pick<Bill, 'amount' | 'cycle'>) =>
  b.cycle === 'weekly' ? (b.amount * 52) / 12 : b.cycle === 'yearly' ? b.amount / 12 : b.amount

export function monthReport(list: Transaction[], bills: Bill[], settings: FinanceSettings | undefined, month: string): MonthReport {
  const { from, to } = monthRange(month)
  const prevMonth = monthOf(addDays(from, -1))
  const prev = monthRange(prevMonth)
  const t = totals(list, settings, from, to)
  const previous = totals(list, settings, prev.from, prev.to)
  const limit = settings?.limit || null
  const underLimit = limit === null ? null : t.spent <= limit
  const keptRate = t.income > 0 ? Math.max(-1, (t.income - t.outgoings) / t.income) : null
  const billsMonthly = round2(bills.filter(b => b.active).reduce((s, b) => s + billMonthly(b), 0))

  // Grade: how far under the limit, and how much of your income you kept.
  let points = 0
  if (limit !== null) points += t.spent <= limit * 0.9 ? 2 : t.spent <= limit ? 1 : -1
  if (keptRate !== null) points += keptRate >= 0.3 ? 2 : keptRate >= 0.15 ? 1 : keptRate >= 0 ? 0 : -1
  if (t.loggedDays >= daysInMonth(month) * 0.6) points += 1
  const grade = points >= 5 ? 'S' : points >= 4 ? 'A' : points >= 3 ? 'B' : points >= 2 ? 'C' : points >= 1 ? 'D' : 'E'

  const wants = t.byCategory.wants ?? 0
  const needs = t.byCategory.needs ?? 0
  const wantsUp = (previous.byCategory.wants ?? 0) > 0 && wants > (previous.byCategory.wants ?? 0) * 1.25
  const tip =
    t.entries < MONTH_MIN_LOGS ? 'Log a little more next month: even a quick “amount + category” after each purchase makes this report useful.' :
    limit !== null && t.spent > limit ? `You went ${money(t.spent - limit)} over your limit. Pick one Wants expense to skip each week next month.` :
    wantsUp ? `Wants spending rose to ${money(wants)} (up from ${money(previous.byCategory.wants ?? 0)}). Try a no-spend day each week.` :
    wants > needs && wants > 0 ? 'Wants cost more than Needs this month. Fine if it was planned; if not, set a Wants cap for next month.' :
    keptRate !== null && keptRate < 0.1 ? 'You kept less than 10% of your income. Move a fixed amount to Savings on payday before anything else.' :
    billsMonthly > 0 && t.income > 0 && billsMonthly > t.income * 0.5 ? 'Bills take over half your income. Check your subscriptions for one to cancel.' :
    'Solid month. Keep logging, and consider raising your savings transfer a little.'

  return {
    month,
    totals: t,
    previous,
    limit,
    underLimit,
    keptRate,
    dailyAverage: round2(t.spent / daysInMonth(month)),
    top: list.filter(x => x.kind === 'expense' && x.category !== 'savings' && x.day >= from && x.day <= to).sort((a, b) => b.amount - a.amount).slice(0, 5),
    billsMonthly,
    grade,
    tip,
  }
}

const money = (n: number) => `$${n.toFixed(2)}`

/**
 * Finance XP (XP only): +15 for each finished week at or under the weekly pace
 * with something logged, +50 for each finished month under the limit with at
 * least 5 entries. Only counts from the day you set the limit.
 */
export function financeXp(list: Transaction[], settings: FinanceSettings | undefined, today: string): number {
  if (!settings?.limit || !settings.since) return 0
  let xp = 0
  const pace = weeklyPace(settings.limit)
  for (let start = weekOf(settings.since) < settings.since ? addDays(weekOf(settings.since), 7) : settings.since; addDays(start, 6) < today; start = addDays(start, 7)) {
    const t = totals(list, settings, start, addDays(start, 6))
    if (t.entries > 0 && t.spent <= pace) xp += WEEK_UNDER_XP
  }
  let month = monthOf(settings.since)
  if (settings.since > `${month}-01`) month = monthOf(addDays(monthRange(month).to, 1)) // only whole months
  while (monthRange(month).to < today) {
    const { from, to } = monthRange(month)
    const t = totals(list, settings, from, to)
    if (t.entries >= MONTH_MIN_LOGS && t.spent <= settings.limit) xp += MONTH_UNDER_XP
    month = monthOf(addDays(to, 1))
  }
  return xp
}

/** The next due day after a bill is paid. */
export function nextDue(due: string, cycle: Bill['cycle']): string {
  if (cycle === 'weekly') return addDays(due, 7)
  const [y, m, d] = due.split('-').map(Number)
  const months = cycle === 'yearly' ? 12 : 1
  const target = new Date(y, m - 1 + months, 1)
  const last = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  const day = Math.min(d, last)
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

/** Bills due within `days` days (or overdue), soonest first. */
export function billsDue(bills: Bill[], today: string, days = 3): { bill: Bill; inDays: number }[] {
  return bills
    .filter(b => b.active)
    .map(b => ({ bill: b, inDays: daysBetween(today, b.nextDue) }))
    .filter(x => x.inDays <= days)
    .sort((a, b) => a.inDays - b.inDays)
}

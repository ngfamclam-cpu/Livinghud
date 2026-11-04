import { describe, expect, it } from 'vitest'
import { MONTH_UNDER_XP, WEEK_UNDER_XP, billMonthly, billsDue, financeXp, monthPace, monthReport, nextDue, summarize, totals, weekFinance, weeklyPace, type Bill, type FinanceSettings, type Player, type Transaction } from './index'

let n = 0
const tx = (day: string, kind: Transaction['kind'], amount: number, category: string, billId: string | null = null): Transaction => ({
  id: `t${n++}`, userId: 'local', day, kind, amount, category, note: '', billId, createdAt: n, updatedAt: n,
})
const settings: FinanceSettings = { limit: 1300, billsInLimit: true, since: '2026-10-01' }

describe('finance totals', () => {
  it('separates spending, savings, income and no-spend days', () => {
    const list = [
      tx('2026-10-01', 'income', 2000, 'pay'),
      tx('2026-10-02', 'expense', 50, 'wants'),
      tx('2026-10-02', 'expense', 200, 'savings'),
      tx('2026-10-03', 'expense', 900, 'needs', 'rent'),
      tx('2026-10-04', 'nospend', 0, 'other'),
      tx('2026-10-05', 'nospend', 0, 'other'),
      tx('2026-10-05', 'expense', 10, 'wants'), // spent after all: not a no-spend day
    ]
    const t = totals(list, settings, '2026-10-01', '2026-10-31')
    expect(t).toMatchObject({ income: 2000, spent: 960, outgoings: 960, saved: 200, noSpendDays: 1, loggedDays: 5 })
    expect(totals(list, { ...settings, billsInLimit: false }, '2026-10-01', '2026-10-31').spent).toBe(60)
  })

  it('paces the month against the limit', () => {
    const list = [tx('2026-10-01', 'expense', 600, 'wants')]
    const p = monthPace(list, settings, '2026-10-10')
    expect(p.expected).toBeCloseTo((1300 * 10) / 31, 1)
    expect(p.status).toBe('near')
    expect(p.left).toBe(700)
    expect(monthPace([tx('2026-10-01', 'expense', 1400, 'needs')], settings, '2026-10-10').status).toBe('over')
  })
})

describe('weekly check-in and monthly report', () => {
  it('compares the week with the one before and the weekly pace', () => {
    const list = [tx('2026-10-05', 'expense', 100, 'wants'), tx('2026-10-12', 'expense', 400, 'wants'), tx('2026-10-13', 'expense', 20, 'needs')]
    const w = weekFinance(list, settings, '2026-10-12')
    expect(w.totals.spent).toBe(420)
    expect(w.previous.spent).toBe(100)
    expect(w.pace).toBe(weeklyPace(1300))
    expect(w.underPace).toBe(false)
    expect(w.biggest[0].amount).toBe(400)
  })

  it('grades the month and gives a tip', () => {
    const list = [
      tx('2026-10-01', 'income', 3000, 'pay'),
      ...Array.from({ length: 25 }, (_, i) => tx(`2026-10-${String(i + 2).padStart(2, '0')}`, 'expense', 30, i % 2 ? 'wants' : 'needs')),
      tx('2026-10-28', 'expense', 600, 'savings'),
    ]
    const r = monthReport(list, [], settings, '2026-10')
    expect(r.totals.spent).toBe(750)
    expect(r.underLimit).toBe(true)
    expect(r.keptRate).toBeCloseTo(0.75)
    expect(r.grade).toBe('S')
    const over = monthReport([...list, tx('2026-10-29', 'expense', 900, 'wants')], [], settings, '2026-10')
    expect(over.underLimit).toBe(false)
    expect(over.tip).toMatch(/over your limit/)
  })
})

describe('finance XP', () => {
  it('pays for finished weeks under pace and months under the limit, XP only', () => {
    const list = [
      ...Array.from({ length: 6 }, (_, i) => tx(`2026-10-0${i + 1}`, 'expense', 20, 'wants')),
      tx('2026-10-14', 'expense', 1000, 'needs'), // blows the week of Oct 12
    ]
    // Weeks starting Oct 5, 12, 19, 26 are finished by Nov 4; Oct 5 has a log and is under; Oct 12 is over; 19 and 26 have no logs.
    const xp = financeXp(list, settings, '2026-11-04')
    expect(xp).toBe(WEEK_UNDER_XP + MONTH_UNDER_XP)
    expect(financeXp(list, { ...settings, limit: 0 }, '2026-11-04')).toBe(0)
    const player: Player = {
      id: 'p', userId: 'local', name: 'T', stats: ['WLT'], fitness: null,
      settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'normal', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
      createdAt: new Date(2026, 9, 1, 12).getTime(), updatedAt: 0, finance: settings,
    }
    const s = summarize(player, [], [], new Date(2026, 10, 4, 12), { transactions: list })
    expect(s.totalXp).toBe(WEEK_UNDER_XP + MONTH_UNDER_XP)
    expect(s.wallet.vault).toBe(0) // never dollars
  })
})

describe('bills', () => {
  it('rolls due dates forward and lists what is due soon', () => {
    expect(nextDue('2026-01-31', 'monthly')).toBe('2026-02-28')
    expect(nextDue('2026-10-10', 'weekly')).toBe('2026-10-17')
    expect(nextDue('2026-10-10', 'yearly')).toBe('2027-10-10')
    const bill = (name: string, nextDueDay: string): Bill => ({ id: name, userId: 'local', name, amount: 10, category: 'needs', cycle: 'monthly', nextDue: nextDueDay, active: true, createdAt: 0, updatedAt: 0 })
    expect(billsDue([bill('late', '2026-11-01'), bill('soon', '2026-11-06'), bill('later', '2026-11-20')], '2026-11-04').map(x => x.bill.name)).toEqual(['late', 'soon'])
    expect(billMonthly({ amount: 120, cycle: 'yearly' })).toBe(10)
  })
})

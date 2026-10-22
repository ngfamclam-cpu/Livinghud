import { describe, expect, it } from 'vitest'
import { bookingBlock, planStatus, savedStageReached, summarize, type Completion, type Plan, type PlanFund, type Player, type Purchase } from './index'

const plan = (extra: Partial<Plan> = {}): Plan => ({
  id: 'asia', userId: 'local', name: 'Asia', kind: 'trip', date: '2027-04-01', questId: null, status: 'active', createdAt: 0, updatedAt: 0,
  items: [
    { id: 'flights', label: 'Flights', kind: 'travel', cost: 1000, purchaseId: null },
    { id: 'stay', label: 'Stay', kind: 'stay', cost: 1000, purchaseId: null },
  ],
  ...extra,
})
const fund = (amount: number, planId = 'asia'): PlanFund => ({ id: `${planId}-${amount}-${Math.random()}`, userId: 'local', planId, amount, day: '2026-10-22', createdAt: 0 })
const booked = (price: number, extra: Partial<Purchase> = {}): Purchase => ({
  id: 'p', userId: 'local', rewardId: 'plan:asia', title: 'x', price, rank: 'S', special: 'none', day: '2026-10-22', fromWallet: 0, fromVault: price, xp: 0, stat: null, planId: 'asia', createdAt: 0, ...extra,
})

describe('plans', () => {
  it('adds up saved and booked money against the total', () => {
    // Saved 1500 into the plan, then booked 1000 of flights from it.
    const s = planStatus(plan(), [fund(1500), fund(-1000)], [booked(1000)], '2026-10-22', null)
    expect(s).toMatchObject({ total: 2000, booked: 1000, fund: 500, remaining: 500, progress: 0.75 })
  })

  it('works out the monthly saving needed and a rough ready date', () => {
    const s = planStatus(plan(), [fund(500)], [], '2026-10-22', 250)
    expect(s.daysLeft).toBe(161)
    expect(s.perMonthNeeded).toBeCloseTo(1500 / (161 / 30.4), 1)
    expect(s.readyBy).toBe('2027-04-23') // 6 months at $250
  })

  it('lets money be the gate: savings goal met and enough in the plan', () => {
    expect(bookingBlock(1000, 1200, true)).toBe(null)
    expect(bookingBlock(1000, 400, true)).toBe('Plan needs $600.00 more')
    expect(bookingBlock(10, 1200, false)).toBe('Savings goal not met this month')
  })

  it('knows which saving stages are reached', () => {
    expect(savedStageReached('save-50', 0.5)).toBe(true)
    expect(savedStageReached('save-75', 0.74)).toBe(false)
    expect(savedStageReached('go', 1)).toBe(false)
  })
})

describe('plans and the Vault', () => {
  const player: Player = {
    id: 'p', userId: 'local', name: 'T', stats: ['STR'], fitness: null, createdAt: new Date(2026, 7, 1, 12).getTime(), updatedAt: 0,
    settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'casual', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
  }
  const earned = (day: string, dollars: number): Completion => ({ id: day, userId: 'local', questId: 'q', stat: 'STR', day, version: 'full', xp: 0, dollars, createdAt: 0 })
  // August: 200 earned (50 overflow + 150 unspent wallet); September: 100 unspent. Vault = 300, growing 150/month.
  const log = [earned('2026-08-10', 200), earned('2026-09-10', 100)]
  const now = new Date(2026, 9, 22, 12)

  it('takes money set aside in plans out of the free Vault, and measures the Vault pace', () => {
    const s = summarize(player, [], log, now, { plans: [plan()], planFunds: [fund(100)] })
    expect(s.wallet).toMatchObject({ vault: 200, inPlans: 100, perMonth: 150 })
    expect(s.plans[0].fund).toBe(100)
  })

  it('keeps the free Vault the same when a part is booked from the plan', () => {
    const before = summarize(player, [], log, now, { plans: [plan()], planFunds: [fund(150)] })
    const after = summarize(player, [], log, now, { plans: [plan()], planFunds: [fund(150), fund(-100)], purchases: [booked(100)] })
    expect(before.wallet).toMatchObject({ vault: 150, inPlans: 150 })
    expect(after.wallet).toMatchObject({ vault: 150, inPlans: 50 })
  })

  it('gives a ticket booked ahead its Recovery Day after the event', () => {
    const ticket = booked(120, { special: 'bigNight', forDay: '2026-11-14', planId: 'rave' })
    expect(summarize(player, [], log, now, { purchases: [ticket] }).restDays.has('2026-11-15')).toBe(true)
  })
})

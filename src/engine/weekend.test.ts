import { describe, expect, it } from 'vitest'
import { checkPurchase } from './economy'
import { DEFAULT_WEEKEND_PLAN, planCost, weekendOf, weekendSpend } from './weekend'
import type { Purchase } from './types'

const ctx = { level: 1, stats: {}, wallet: 40, vault: 100, savingsMet: true, mainQuestsCleared: 0 }

describe('weekend menu', () => {
  it('needs no level: date night at level 1 spends the wallet, then the Vault', () => {
    expect(checkPurchase({ price: 100, statGate: null }, ctx).ok).toBe(false)
    expect(checkPurchase({ price: 100, statGate: null }, ctx, { realLife: true })).toEqual({ ok: true, fromWallet: 40, fromVault: 60 })
    expect(checkPurchase({ price: 200, statGate: null }, ctx, { realLife: true }).ok).toBe(false)
    expect(checkPurchase({ price: 15, statGate: null }, { ...ctx, savingsMet: false }, { realLife: true }).ok).toBe(false)
    expect(checkPurchase({ price: 15, statGate: null }, { ...ctx, locked: 'Penalty' }, { realLife: true }).ok).toBe(false)
  })

  it('turns a typical month of weekends into a budget', () => {
    // 3 drinks 45 + 20 + 35 = 100 a weekend; ×52/12 = 433.33 + 50 ticket + 200 dates + 50 = 733 -> 735
    expect(planCost(DEFAULT_WEEKEND_PLAN)).toEqual({ perWeekend: 100, perMonth: 735 })
    expect(planCost({ ...DEFAULT_WEEKEND_PLAN, drinks: 0 }, { 'food-low': 10 }).perWeekend).toBe(45)
  })

  it('groups days into weekends and totals weekend buys', () => {
    expect(weekendOf('2026-11-13')).toBe('2026-11-13') // Friday
    expect(weekendOf('2026-11-15')).toBe('2026-11-13') // Sunday
    expect(weekendOf('2026-11-11')).toBe('2026-11-13') // Wednesday counts toward the coming weekend
    const p = (day: string, price: number, rewardId = 'weekend:drink') => ({ day, price, rewardId }) as Purchase
    expect(weekendSpend([p('2026-11-14', 45), p('2026-11-15', 100, 'weekend:date'), p('2026-11-14', 60, 'reward-1'), p('2026-11-08', 15)], '2026-11-15')).toEqual({ total: 145, count: 2 })
  })
})

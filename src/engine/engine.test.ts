import { describe, expect, it } from 'vitest'
import {
  addDays,
  checkPurchase,
  savingsStatus,
  weekOf,
  type Purchase,
  type SavingsEntry,
  dailyPay,
  dayKey,
  levelFromXp,
  playerRank,
  questReward,
  rewardRank,
  summarize,
  type Completion,
  type Player,
  type Quest,
} from './index'

const player: Player = {
  id: 'p',
  userId: 'local',
  name: 'Test',
  stats: ['STR', 'VIT'],
  fitness: null,
  settings: {
    monthlyBudget: 150,
    savingsGoal: { type: 'off', amount: 0 },
    difficulty: 'normal',
    resetHour: 4,
    wakeTime: '07:00',
    bedTime: '23:00',
  },
  createdAt: new Date(2026, 9, 1, 12).getTime(),
  updatedAt: 0,
}

const quest = (id: string, stat: 'STR' | 'VIT'): Quest => ({
  id,
  userId: 'local',
  kind: 'daily',
  stat,
  title: id,
  description: '',
  minVersion: '',
  active: true,
  templateId: null,
  createdAt: 0,
  updatedAt: 0,
})

const done = (questId: string, stat: 'STR' | 'VIT', day: string, dollars = 1, version: 'full' | 'min' = 'full'): Completion => ({
  id: `${questId}-${day}`,
  userId: 'local',
  questId,
  stat,
  day,
  version,
  xp: version === 'full' ? 20 : 10,
  dollars,
  createdAt: 0,
})

describe('time', () => {
  it('counts late nights as the previous day', () => {
    expect(dayKey(new Date(2026, 9, 20, 1, 30), 4)).toBe('2026-10-19')
    expect(dayKey(new Date(2026, 9, 20, 4, 0), 4)).toBe('2026-10-20')
  })
  it('adds days across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01')
  })
})

describe('leveling', () => {
  it('starts at level 1 and levels at 100 XP', () => {
    expect(levelFromXp(0)).toEqual({ level: 1, xpIntoLevel: 0, xpForNext: 100 })
    expect(levelFromXp(100).level).toBe(2)
    expect(levelFromXp(224).level).toBe(2)
    expect(levelFromXp(225).level).toBe(3)
  })
})

describe('economy', () => {
  it('pays so 80% completion earns the budget', () => {
    const pay = dailyPay(150, 4)
    expect(pay * 30 * 0.8 * 4).toBeCloseTo(150, 0)
  })
  it('pays the strength routine 3 shares without growing the monthly pot', () => {
    // Routine + 3 other dailies = 6 shares.
    const routine = questReward({ kind: 'daily', templateId: 'str-routine' }, 'full', 150, 6)
    const other = questReward({ kind: 'daily', templateId: 'vit-trio' }, 'full', 150, 6)
    expect(routine.dollars).toBeCloseTo(other.dollars * 3, 1)
    expect(routine.xp).toBe(other.xp)
    expect((routine.dollars + 3 * other.dollars) * 30 * 0.8).toBeCloseTo(150, 0)
  })
  it('pays half for the minimum version', () => {
    const full = questReward({ kind: 'daily' }, 'full', 150, 4)
    const min = questReward({ kind: 'daily' }, 'min', 150, 4)
    expect(min.xp).toBe(full.xp / 2)
    expect(min.dollars).toBeCloseTo(full.dollars / 2, 1)
  })
  it('ranks rewards by price', () => {
    expect(rewardRank(5)).toBe('E')
    expect(rewardRank(50)).toBe('C')
    expect(rewardRank(150)).toBe('B')
    expect(rewardRank(900)).toBe('S')
  })
  it('ranks players by completion rate', () => {
    expect(playerRank(0.2)).toBe('E')
    expect(playerRank(0.8)).toBe('B')
    expect(playerRank(1)).toBe('S')
  })
})

describe('summary', () => {
  const quests = [quest('a', 'STR'), quest('b', 'VIT')]
  const now = new Date(2026, 9, 3, 12) // third game day

  it('derives XP, level and today from the log', () => {
    const s = summarize(player, quests, [done('a', 'STR', '2026-10-03')], now)
    expect(s.today).toBe('2026-10-03')
    expect(s.totalXp).toBe(20)
    expect(s.todayDone.has('a')).toBe(true)
  })

  it('does not drop stats for quests not yet done today', () => {
    const log = [done('a', 'STR', '2026-10-01'), done('a', 'STR', '2026-10-02')]
    const s = summarize(player, quests, log, now)
    expect(s.stats.STR).toBe(100)
    expect(s.stats.VIT).toBe(0)
  })

  it('counts the minimum version as half', () => {
    const log = [done('a', 'STR', '2026-10-01', 1, 'min'), done('a', 'STR', '2026-10-02')]
    expect(summarize(player, quests, log, now).stats.STR).toBe(75)
  })

  it('caps the wallet at the budget and sends overflow to the vault', () => {
    const log = [done('a', 'STR', '2026-10-01', 120), done('b', 'VIT', '2026-10-02', 50)]
    const s = summarize(player, quests, log, now)
    expect(s.wallet.earned).toBe(150)
    expect(s.wallet.vault).toBe(20)
  })

  it('counts streaks back from today or yesterday', () => {
    const log = [done('a', 'STR', '2026-10-01'), done('a', 'STR', '2026-10-02')]
    expect(summarize(player, quests, log, now).streaks.get('a')).toBe(2)
  })
})

describe('quest pay', () => {
  it('pays side quests a share of the budget, half for the minimum', () => {
    expect(questReward({ kind: 'side' }, 'full', 150, 4)).toEqual({ xp: 40, dollars: 10 })
    expect(questReward({ kind: 'side' }, 'min', 150, 4)).toEqual({ xp: 20, dollars: 5 })
  })
  it('scales main quest stage pay to the budget', () => {
    const stage = { id: 's', title: '', description: '', xp: 100, basePay: 30 }
    expect(questReward({ kind: 'main' }, 'full', 300, 4, stage)).toEqual({ xp: 100, dollars: 60 })
  })
  it('weeks start on Monday', () => {
    expect(weekOf('2026-10-21')).toBe('2026-10-19') // a Wednesday
    expect(weekOf('2026-10-19')).toBe('2026-10-19')
    expect(weekOf('2026-10-25')).toBe('2026-10-19') // Sunday
  })
})

describe('savings gate', () => {
  const entry = (kind: 'saved' | 'income', amount: number, day = '2026-10-05'): SavingsEntry => ({
    id: `${kind}-${amount}-${day}`, userId: 'local', kind, amount, day, createdAt: 0,
  })
  it('opens at a fixed amount saved this month', () => {
    const goal = { type: 'fixed' as const, amount: 200 }
    expect(savingsStatus(goal, [entry('saved', 150)], '2026-10').met).toBe(false)
    expect(savingsStatus(goal, [entry('saved', 150), entry('saved', 50)], '2026-10').met).toBe(true)
    expect(savingsStatus(goal, [entry('saved', 500, '2026-09-30')], '2026-10').met).toBe(false)
  })
  it('needs income logged for a percent goal', () => {
    const goal = { type: 'percent' as const, amount: 10 }
    expect(savingsStatus(goal, [entry('saved', 100)], '2026-10').met).toBe(false)
    expect(savingsStatus(goal, [entry('saved', 100), entry('income', 1000)], '2026-10')).toMatchObject({ target: 100, met: true })
  })
  it('is always open when off', () => {
    expect(savingsStatus({ type: 'off', amount: 0 }, [], '2026-10').met).toBe(true)
  })
})

describe('shop', () => {
  const ctx = { level: 25, stats: { STR: 50 }, wallet: 40, vault: 100, savingsMet: true, mainQuestsCleared: 0 }
  it('gates by level', () => {
    expect(checkPurchase({ price: 50, statGate: null }, { ...ctx, level: 9 })).toEqual({ ok: false, reason: 'Needs level 10' })
  })
  it('gates by stat', () => {
    expect(checkPurchase({ price: 50, statGate: { stat: 'STR', min: 60 } }, ctx)).toEqual({ ok: false, reason: 'Needs STR 60' })
  })
  it('stays locked until the savings goal is met', () => {
    expect(checkPurchase({ price: 5, statGate: null }, { ...ctx, savingsMet: false }).ok).toBe(false)
  })
  it('spends the wallet first, then the Vault', () => {
    expect(checkPurchase({ price: 30, statGate: null }, ctx)).toEqual({ ok: true, fromWallet: 30, fromVault: 0 })
    expect(checkPurchase({ price: 100, statGate: null }, ctx)).toEqual({ ok: true, fromWallet: 40, fromVault: 60 })
    expect(checkPurchase({ price: 150, statGate: null }, ctx).ok).toBe(false)
  })
  it('pays A rank only from the Vault', () => {
    const rich = { ...ctx, level: 40, wallet: 150, vault: 250 }
    expect(checkPurchase({ price: 300, statGate: null }, rich).ok).toBe(false)
    expect(checkPurchase({ price: 240, statGate: null }, rich)).toEqual({ ok: true, fromWallet: 0, fromVault: 240 })
  })
  it('needs a cleared main quest for S rank', () => {
    const rich = { ...ctx, level: 50, vault: 2000 }
    expect(checkPurchase({ price: 900, statGate: null }, rich)).toEqual({ ok: false, reason: 'Clear a main quest first' })
    expect(checkPurchase({ price: 900, statGate: null }, { ...rich, mainQuestsCleared: 1 }).ok).toBe(true)
  })
})

describe('wallet and Vault with purchases', () => {
  const quests = [quest('a', 'STR'), quest('b', 'VIT')]
  const buy = (day: string, fromWallet: number, fromVault: number, special: Purchase['special'] = 'none'): Purchase => ({
    id: `p-${day}-${fromWallet}-${fromVault}`, userId: 'local', rewardId: 'r', title: 'r', price: fromWallet + fromVault,
    rank: 'D', special, day, fromWallet, fromVault, xp: special === 'date' ? 40 : 0, stat: special === 'date' ? 'CHA' : null, createdAt: 0,
  })

  it('subtracts wallet spending this month', () => {
    const now = new Date(2026, 9, 3, 12)
    const s = summarize(player, quests, [done('a', 'STR', '2026-10-01', 50)], now, { purchases: [buy('2026-10-02', 20, 0)] })
    expect(s.wallet).toMatchObject({ earned: 50, spent: 20, available: 30, vault: 0 })
  })

  it('rolls last month’s unspent wallet into the Vault', () => {
    const now = new Date(2026, 10, 3, 12)
    const log = [done('a', 'STR', '2026-10-01', 160), done('a', 'STR', '2026-11-01', 5)]
    const s = summarize(player, quests, log, now, { purchases: [buy('2026-10-10', 100, 0), buy('2026-11-02', 0, 30)] })
    // October: 150 capped, 10 overflow, 50 unspent. Minus 30 spent from the Vault in November.
    expect(s.wallet.vault).toBe(30)
    expect(s.wallet.available).toBe(5)
  })

  it('gives dates XP', () => {
    const s = summarize(player, quests, [], new Date(2026, 9, 3, 12), { purchases: [buy('2026-10-02', 25, 0, 'date')] })
    expect(s.totalXp).toBe(40)
  })

  it('protects streaks and stats on a Recovery Day', () => {
    const now = new Date(2026, 9, 4, 12)
    const log = [done('a', 'STR', '2026-10-01'), done('a', 'STR', '2026-10-02'), done('a', 'STR', '2026-10-04')]
    const purchases = [buy('2026-10-02', 60, 0, 'bigNight')] // Oct 3 becomes a Recovery Day
    const s = summarize(player, quests, log, now, { purchases })
    expect(s.streaks.get('a')).toBe(3)
    expect(s.stats.STR).toBe(100)
    const without = summarize(player, quests, log, now)
    expect(without.streaks.get('a')).toBe(1)
    expect(summarize(player, quests, log, new Date(2026, 9, 3, 12), { purchases }).recoveryToday).toBe(true)
  })
})

describe('side and main quests', () => {
  const side: Quest = { ...quest('s', 'STR'), kind: 'side' }
  const main: Quest = {
    ...quest('m', 'STR'),
    kind: 'main',
    stages: [
      { id: 'one', title: '1', description: '', xp: 100, basePay: 20 },
      { id: 'two', title: '2', description: '', xp: 100, basePay: 20 },
    ],
  }
  const now = new Date(2026, 9, 21, 12) // Wednesday

  it('counts a side quest as done for the whole week', () => {
    const s = summarize(player, [side], [done('s', 'STR', '2026-10-19')], now)
    expect(s.weekDone.has('s')).toBe(true)
    expect(s.todayDone.has('s')).toBe(false)
    expect(summarize(player, [side], [done('s', 'STR', '2026-10-18')], now).weekDone.has('s')).toBe(false)
  })

  it('tracks main quest stages in order', () => {
    const stage = (id: string): Completion => ({ ...done('m', 'STR', '2026-10-20'), id, stageId: id })
    expect(summarize(player, [main], [], now).mainProgress.get('m')).toEqual({ cleared: 0, current: 'one', done: false })
    expect(summarize(player, [main], [stage('one')], now).mainProgress.get('m')).toEqual({ cleared: 1, current: 'two', done: false })
    const finished = summarize(player, [main], [stage('one'), stage('two')], now)
    expect(finished.mainProgress.get('m')?.done).toBe(true)
    expect(finished.mainQuestsCleared).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import {
  addDays,
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

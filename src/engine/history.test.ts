import { describe, expect, it } from 'vitest'
import { activityFeed, calendarDays, exerciseHistory, moneyByMonth, statHistory, summarize, type Completion, type ExerciseSet, type Player, type Quest } from './index'

const player: Player = {
  id: 'p',
  userId: 'local',
  name: 'Test',
  stats: ['STR', 'VIT'],
  fitness: null,
  settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'normal', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
  createdAt: new Date(2026, 9, 1, 12).getTime(),
  updatedAt: 0,
}

const quest = (id: string, stat: 'STR' | 'VIT'): Quest => ({
  id, userId: 'local', kind: 'daily', stat, title: id, description: '', minVersion: '', active: true, templateId: null, createdAt: player.createdAt, updatedAt: 0,
})
const done = (questId: string, stat: 'STR' | 'VIT', day: string, version: 'full' | 'min' = 'full'): Completion => ({
  id: `${questId}-${day}`, userId: 'local', questId, stat, day, version, xp: 20, dollars: 2.5, createdAt: new Date(day).getTime(),
})
const quests = [quest('a', 'STR'), quest('b', 'VIT')]

describe('calendarDays', () => {
  it('lays out whole Monday-first weeks and marks days outside play', () => {
    const days = calendarDays(player, quests, [done('a', 'STR', '2026-10-05'), done('b', 'VIT', '2026-10-05', 'min')], new Set(['2026-10-06']), '2026-10-08', 2)
    expect(days).toHaveLength(14)
    expect(days[0].day).toBe('2026-09-28') // a Monday
    expect(days[0].outside).toBe(true) // before signup
    const oct5 = days.find(d => d.day === '2026-10-05')!
    expect(oct5).toMatchObject({ done: 1.5, due: 2, outside: false })
    expect(days.find(d => d.day === '2026-10-06')!.rest).toBe(true)
    expect(days.find(d => d.day === '2026-10-09')!.outside).toBe(true) // after today
  })
})

describe('statHistory', () => {
  it("matches the HUD's stats for today", () => {
    const completions = [done('a', 'STR', '2026-10-01'), done('a', 'STR', '2026-10-02'), done('b', 'VIT', '2026-10-02')]
    const history = statHistory(player, quests, completions, new Set(), '2026-10-03', 10)
    expect(history.map(h => h.day)).toEqual(['2026-10-01', '2026-10-02', '2026-10-03'])
    const now = summarize(player, quests, completions, new Date(2026, 9, 3, 12))
    expect(history[history.length - 1].stats).toEqual(now.stats)
    expect(history[0].stats.STR).toBe(100)
  })
})

describe('moneyByMonth', () => {
  it('sums each month, oldest first', () => {
    const list = moneyByMonth([done('a', 'STR', '2026-09-30'), done('a', 'STR', '2026-10-01'), done('b', 'VIT', '2026-10-02')], [], [], '2026-10-20', 3)
    expect(list.map(m => m.month)).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(list.map(m => m.earned)).toEqual([0, 2.5, 5])
  })
})

describe('exerciseHistory', () => {
  it('totals each day and never goes below zero', () => {
    const set = (day: string, amount: number): ExerciseSet => ({ id: `${day}${amount}`, userId: 'local', exercise: 'pushups', amount, day, source: 'manual', createdAt: 0 })
    const h = exerciseHistory([set('2026-10-02', 10), set('2026-10-02', 5), set('2026-10-03', -3)], 'pushups', '2026-10-03', 3)
    expect(h).toEqual([{ day: '2026-10-01', total: 0 }, { day: '2026-10-02', total: 15 }, { day: '2026-10-03', total: 0 }])
  })
})

describe('activityFeed', () => {
  it('merges logs newest first', () => {
    const feed = activityFeed(
      {
        quests, completions: [done('a', 'STR', '2026-10-01'), done('b', 'VIT', '2026-10-03')], purchases: [], sets: [], people: [], contacts: [], focusRuns: [],
        bosses: [], journal: [], surprises: [], savings: [], planFunds: [], planNames: new Map(), exerciseName: k => k,
      },
      10,
    )
    expect(feed.map(f => f.text)).toEqual(['Cleared: b', 'Cleared: a'])
    expect(feed[0].gain).toBe('+20 XP · +$2.50')
  })
})

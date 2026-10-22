import { describe, expect, it } from 'vitest'
import { penalties, summarize, type Completion, type PenaltyInput, type Player, type Quest } from './index'

const dailies = [{ id: 'a', since: '2026-10-01' }, { id: 'b', since: '2026-10-01' }]
const doneOn = (entries: Record<string, string[]>) => new Map(Object.entries(entries).map(([d, ids]) => [d, new Set(ids)]))
const input = (p: Partial<PenaltyInput>): PenaltyInput => ({
  difficulty: 'normal', since: '2026-10-01', today: '2026-10-04', dailies, doneOn: new Map(), restDays: new Set(), earnedBy: new Map(), ...p,
})

describe('penalties', () => {
  it('casual loses nothing', () => {
    expect(penalties(input({ difficulty: 'casual' }))).toMatchObject({ xpLost: 0, hp: null })
  })

  it('normal costs 5 XP per missed daily, and only from the start day', () => {
    // Oct 1-3 counted; Oct 1 both done, Oct 2 one missed, Oct 3 both missed.
    const p = penalties(input({ doneOn: doneOn({ '2026-10-01': ['a', 'b'], '2026-10-02': ['a'] }) }))
    expect(p.xpLost).toBe(15)
    expect(p.missedYesterday).toBe(2)
    expect(penalties(input({ since: '2026-10-04' })).xpLost).toBe(0)
  })

  it('skips Recovery Days and dailies added later', () => {
    const p = penalties(input({ restDays: new Set(['2026-10-02', '2026-10-03']), dailies: [...dailies, { id: 'c', since: '2026-10-03' }] }))
    expect(p.xpLost).toBe(10) // only Oct 1, two dailies
  })

  it('hardcore loses HP, heals on perfect days, and costs $10 at 0 HP', () => {
    const healed = penalties(input({ difficulty: 'hardcore', doneOn: doneOn({ '2026-10-01': ['a', 'b'], '2026-10-02': ['a'] }) }))
    expect(healed.hp).toBe(100 - 10 - 20) // capped at 100 after the perfect day, then -10, then -20

    const today = '2026-10-07'
    const ko = penalties(input({ difficulty: 'hardcore', today, earnedBy: new Map([['2026-10', 25]]) })) // 6 days x 2 missed
    expect(ko.knockouts).toEqual([{ day: '2026-10-05', dollars: 10 }])
    expect(ko.dollarsLost.get('2026-10')).toBe(10)
    expect(ko.hp).toBe(30)
  })

  it('never takes more money than was earned that month', () => {
    const ko = penalties(input({ difficulty: 'hardcore', today: '2026-10-07', earnedBy: new Map([['2026-10', 4]]) }))
    expect(ko.dollarsLost.get('2026-10')).toBe(4)
    expect(ko.knockouts[0].dollars).toBe(4)
  })
})

describe('penalties in the summary', () => {
  const player: Player = {
    id: 'p', userId: 'local', name: 'T', stats: ['STR'], fitness: null, createdAt: new Date(2026, 9, 1, 12).getTime(), updatedAt: 0,
    settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'casual', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
    penaltiesSince: '2026-10-01',
  }
  const quest: Quest = { id: 'a', userId: 'local', kind: 'daily', stat: 'STR', title: 'a', description: '', minVersion: '', active: true, templateId: null, createdAt: player.createdAt, updatedAt: 0 }
  const done = (day: string): Completion => ({ id: day, userId: 'local', questId: 'a', stat: 'STR', day, version: 'full', xp: 20, dollars: 1, createdAt: 0 })
  const log = ['2026-10-01', '2026-10-02', '2026-10-05'].map(done) // missed Oct 3 and 4
  const now = new Date(2026, 9, 5, 12)

  it('casual pauses a streak over two missed days', () => {
    expect(summarize(player, [quest], log, now).streaks.get('a')).toBe(3)
  })

  it('normal breaks the streak and takes XP', () => {
    const normal = { ...player, settings: { ...player.settings, difficulty: 'normal' as const } }
    const s = summarize(normal, [quest], log, now)
    expect(s.streaks.get('a')).toBe(1)
    expect(s.totalXp).toBe(60 - 10)
  })

  it('does nothing when penalties are switched off', () => {
    const off = { ...player, settings: { ...player.settings, difficulty: 'normal' as const }, features: { penalties: false } }
    expect(summarize(off, [quest], log, now)).toMatchObject({ totalXp: 60, penalty: null })
  })
})

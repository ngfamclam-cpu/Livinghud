import { describe, expect, it } from 'vitest'
import { addDays, earnedBadges, longestStreak, streakBonuses, unlockedThemes, type BadgeInput } from './index'

const base: BadgeInput = { level: 1, bestStreak: {}, currentStreak: {}, bossesDefeated: 0, focusMinutes: 0, journalEntries: 0, hangouts: 0 }
const run = (start: string, n: number) => Array.from({ length: n }, (_, i) => addDays(start, i))

describe('streaks', () => {
  it('finds the longest run, letting rest days pass', () => {
    const days = new Set([...run('2026-10-01', 5), ...run('2026-10-07', 10)]) // a gap on the 6th
    expect(longestStreak(days, new Set(), addDays)).toBe(10)
    expect(longestStreak(days, new Set(['2026-10-06']), addDays)).toBe(15)
    expect(longestStreak(new Set(), new Set(), addDays)).toBe(0)
  })
})

describe('badges', () => {
  it('gives a stat title for a 30-day streak, kept after the streak ends', () => {
    const titles = earnedBadges({ ...base, bestStreak: { STR: 30 }, currentStreak: { STR: 2 } }).map(b => b.title)
    expect(titles).toContain('Iron Will')
    expect(titles).toContain('Steady')
  })

  it('only gives the +10% bonus while a 30-day streak holds', () => {
    expect([...streakBonuses({ ...base, currentStreak: { STR: 31, INT: 12 } })]).toEqual(['STR'])
    expect(streakBonuses({ ...base, bestStreak: { STR: 40 }, currentStreak: { STR: 3 } }).size).toBe(0)
  })

  it('awards milestones for levels, bosses, focus, journal and hangouts', () => {
    const titles = earnedBadges({ ...base, level: 12, bossesDefeated: 1, focusMinutes: 600, journalEntries: 30, hangouts: 10 }).map(b => b.title)
    expect(titles).toEqual(expect.arrayContaining(['Awakened', 'Hunter', 'Slayer', 'Deep Diver', 'Chronicler', 'Socialite']))
    expect(titles).not.toContain('Veteran')
  })

  it('drops loot themes at levels and milestones', () => {
    expect(unlockedThemes(base)).toEqual(['system'])
    expect(unlockedThemes({ ...base, level: 5, bossesDefeated: 1 })).toEqual(['system', 'crimson', 'violet', 'ember'])
  })
})

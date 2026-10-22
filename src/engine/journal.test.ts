import { describe, expect, it } from 'vitest'
import { addDays, journalPatterns, journalVersion, type Completion, type JournalEntry } from './index'

const entry = (day: string, mood: number, drained = ''): JournalEntry => ({
  id: day, userId: 'local', day, wentWell: 'x', drained, adjust: 'y', mood, energy: 3, createdAt: 0, updatedAt: 0,
})
const done = (day: string, n: number): Completion[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${day}-${i}`, userId: 'local', questId: `q${i}`, stat: 'INT', day, version: 'full', xp: 20, dollars: 1, createdAt: 0 }))

describe('journal', () => {
  it('gives full credit for all three prompts and the minimum for one line', () => {
    expect(journalVersion({ wentWell: 'a', drained: 'b', adjust: 'c' })).toBe('full')
    expect(journalVersion({ wentWell: 'a', drained: ' ', adjust: '' })).toBe('min')
    expect(journalVersion({ wentWell: '', drained: '', adjust: '' })).toBe(null)
  })

  // 2026-10-19 is a Monday.
  const days = Array.from({ length: 14 }, (_, i) => addDays('2026-10-19', i))
  const entries = days.map((d, i) => entry(d, i % 7 === 0 ? 1 : i % 7 === 5 ? 5 : 3, i % 2 ? 'Long commute and emails' : 'emails piling up'))

  it('counts the streak and finds the best and worst weekdays', () => {
    const p = journalPatterns(entries, [], 4, '2026-11-01')
    expect(p.streak).toBe(14)
    expect(p.worstDay).toBe('Monday')
    expect(p.bestDay).toBe('Saturday')
  })

  it('finds what keeps draining you, skipping filler words', () => {
    const p = journalPatterns(entries, [], 4, '2026-11-01')
    expect(p.drains[0]).toEqual({ word: 'emails', count: 14 })
    expect(p.drains.map(d => d.word)).toContain('commute')
  })

  it('compares mood on productive days with other days', () => {
    // Rough Mondays and Tuesdays with little done; the rest productive.
    const moods = days.map((d, i) => entry(d, i % 7 <= 1 ? 2 : 4))
    const completions = days.flatMap((d, i) => done(d, i % 7 <= 1 ? 1 : 4))
    const p = journalPatterns(moods, completions, 4, '2026-11-01')
    expect(p.moodWhenProductive).toBe(4)
    expect(p.moodOtherwise).toBe(2)
  })
})

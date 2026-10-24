import { describe, expect, it } from 'vitest'
import { addDays, goalStats, planVersion, searchGoals, unfinished, weekdayExtremes, weeklyReport, type DayGoals } from './index'

const g = (day: string, items: [string, boolean][]): DayGoals => ({
  id: day, userId: 'local', day, plannedOn: addDays(day, -1), createdAt: 0, updatedAt: 0,
  items: items.map(([text, done]) => ({ text, done, doneAt: done ? 1 : null })),
})

describe('top 3 goals', () => {
  it('clears the planning quest: three = full, fewer = minimum', () => {
    expect(planVersion(['a', 'b', 'c'])).toBe('full')
    expect(planVersion(['a', ' ', ''])).toBe('min')
    expect(planVersion(['', ''])).toBeNull()
  })

  it('offers unfinished goals to carry over', () => {
    expect(unfinished(g('2026-10-05', [['Invoice', true], ['Gym', false]]))).toEqual(['Gym'])
    expect(unfinished(undefined)).toEqual([])
  })

  it('works out hit rates, perfect days, streaks and repeats', () => {
    const list = [
      g('2026-10-05', [['Invoice', true], ['Gym', false], ['Call mum', true]]), // Monday
      g('2026-10-06', [['Gym', true], ['Read', true], ['Tidy', true]]), // Tuesday, perfect
      g('2026-10-07', [['Side project', false]]), // Wednesday
      g('2026-10-08', [['Side project', false]]), // today, still open: not counted yet
    ]
    const s = goalStats(list, '2026-10-08', addDays)
    expect(s.planned).toBe(7)
    expect(s.done).toBe(5)
    expect(s.rate).toBeCloseTo(5 / 7)
    expect(s.perfectDays).toBe(1)
    expect(s.planStreak).toBe(4)
    expect(s.byWeekday.slice(0, 3)).toEqual([2 / 3, 1, 0])
    expect(s.carried.map(c => [c.text, c.times])).toEqual([['Gym', 2], ['Side project', 2]])
    expect(weekdayExtremes(s.byWeekday)).toEqual({ best: 'Tuesday', worst: 'Wednesday' })
  })

  it('searches goal history, newest first', () => {
    const list = [g('2026-10-05', [['Gym session', true]]), g('2026-10-07', [['Gym again', false], ['Read', true]])]
    expect(searchGoals(list, 'gym').map(h => h.day)).toEqual(['2026-10-07', '2026-10-05'])
  })

  it('shows up in the weekly report', () => {
    const r = weeklyReport(
      { stats: ['AGI'], quests: [], completions: [], purchases: [], contacts: [], focusRuns: [], bosses: [], journal: [], restDays: new Set(), resetHour: 4, weakening: [],
        goals: [g('2026-10-05', [['a', true], ['b', false]]), g('2026-10-13', [['c', true]])] },
      '2026-10-05',
    )
    expect([r.goalsDone, r.goalsPlanned]).toEqual([1, 2])
  })
})

import { describe, expect, it } from 'vitest'
import {
  COMBO_MAX,
  DEFAULT_PENALTY_MENU,
  PERFECT_DAY_XP,
  bestCombo,
  combo,
  comboMultiplier,
  defaultIncentives,
  incentiveState,
  isPerfect,
  missedOn,
  packMilestone,
  penaltyDays,
  penaltyTask,
  shieldsEarned,
  unlockedSecrets,
  type PlayLog,
} from './index'

/** Two dailies from Oct 1; `done` maps day -> how many of them were done. */
function log(done: Record<string, number>, rest: string[] = []): PlayLog {
  const doneOn = new Map<string, Set<string>>()
  for (const [day, n] of Object.entries(done)) doneOn.set(day, new Set(['a', 'b'].slice(0, n)))
  return { dailies: [{ id: 'a', since: '2026-10-01' }, { id: 'b', since: '2026-10-01' }], doneOn, restDays: new Set(rest) }
}
const days = (from: number, to: number, n = 2) => Object.fromEntries(Array.from({ length: to - from + 1 }, (_, i) => [`2026-10-${String(from + i).padStart(2, '0')}`, n]))

describe('perfect days and combo', () => {
  it('counts perfect days in a row, skipping Recovery Days', () => {
    const l = log({ ...days(1, 3), '2026-10-05': 2, '2026-10-06': 1 }, ['2026-10-04'])
    expect(isPerfect(l, '2026-10-03')).toBe(true)
    expect(isPerfect(l, '2026-10-06')).toBe(false)
    expect(combo(l, '2026-10-05', '2026-10-01')).toBe(4) // Oct 4 is a Recovery Day, counted as neither
    expect(combo(l, '2026-10-07', '2026-10-01')).toBe(0) // Oct 6 broke it
    expect(bestCombo(l, '2026-10-07', '2026-10-01')).toBe(4)
  })

  it('multiplies XP up to a cap and hits pack milestones', () => {
    expect(comboMultiplier(0)).toBe(1)
    expect(comboMultiplier(3)).toBeCloseTo(1.3)
    expect(comboMultiplier(50)).toBe(COMBO_MAX)
    expect(packMilestone(2, 3)).toBe(3)
    expect(packMilestone(3, 4)).toBeNull()
    expect([...unlockedSecrets(7)]).toEqual(['eclipse'])
  })

  it('earns a Shield for each perfect week', () => {
    // Oct 5-11 2026 is a Monday-to-Sunday week.
    const l = log(days(5, 11), ['2026-10-08'])
    expect(shieldsEarned(l, '2026-10-20', '2026-10-01')).toBe(1)
    expect(shieldsEarned(log({ ...days(5, 11), '2026-10-09': 1 }), '2026-10-20', '2026-10-01')).toBe(0)
  })
})

describe('penalty quests', () => {
  const settings = defaultIncentives('2026-10-01')

  it('trigger the day after clearing less than 75% of the dailies', () => {
    // Four dailies: 3 of 4 (75%) is safe, 2 of 4 isn't.
    const ids = ['a', 'b', 'c', 'd']
    const four = (done: Record<string, number>): PlayLog => ({
      dailies: ids.map(id => ({ id, since: '2026-10-01' })),
      doneOn: new Map(Object.entries(done).map(([d, n]) => [d, new Set(ids.slice(0, n))])),
      restDays: new Set(),
    })
    const l = four({ '2026-10-01': 4, '2026-10-02': 3, '2026-10-03': 2, '2026-10-04': 0 })
    expect(missedOn(l, '2026-10-03')).toBe(2)
    expect(penaltyDays(l, settings, '2026-10-05')).toEqual(['2026-10-04', '2026-10-05'])
    expect(penaltyDays(l, { ...settings, minRate: 1 }, '2026-10-05')).toEqual(['2026-10-03', '2026-10-04', '2026-10-05'])
    // With two dailies, missing one is 50%: still a penalty.
    expect(penaltyDays(log({ '2026-10-01': 1 }), settings, '2026-10-02')).toEqual(['2026-10-02'])
  })

  it('never trigger from a Recovery Day', () => {
    const l = log({ '2026-10-01': 2 }, ['2026-10-02'])
    expect(penaltyDays(l, settings, '2026-10-03')).toEqual([])
  })

  it('pick a task from your menu, the same everywhere', () => {
    const t = penaltyTask('2026-10-03', 'seed', ['Cold shower', 'Clean the oven'])
    expect(['Cold shower', 'Clean the oven']).toContain(t)
    expect(penaltyTask('2026-10-03', 'seed', [])).toBe(penaltyTask('2026-10-03', 'seed', DEFAULT_PENALTY_MENU))
  })

  it('stay open until cleared or shielded, and pay perfect-day XP', () => {
    const l = log({ ...days(5, 11), '2026-10-12': 0 })
    const settings = { ...defaultIncentives('2026-10-05'), threshold: 2 }
    const open = incentiveState(l, settings, [], '2026-10-14', 's', true)
    expect(open.penalty?.day).toBe('2026-10-13')
    expect(open.penalty?.daysOpen).toBe(1)
    expect(open.shields).toBe(1)
    expect(open.perfectXp).toBe(7 * PERFECT_DAY_XP)
    const shielded = incentiveState(l, settings, [{ day: '2026-10-13', kind: 'shield' }], '2026-10-14', 's', true)
    // Oct 13 was missed too, so the next one is already waiting.
    expect(shielded.penalty?.day).toBe('2026-10-14')
    expect(shielded.shields).toBe(0)
    expect(incentiveState(l, settings, [], '2026-10-14', 's', false).penalty).toBeNull()
  })
})

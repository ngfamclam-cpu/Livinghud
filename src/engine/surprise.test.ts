import { describe, expect, it } from 'vitest'
import { addDays, dailySurprise, surpriseState } from './index'

describe('surprise challenges', () => {
  it('is the same for the same day and player, on any device', () => {
    const a = dailySurprise('2026-10-22', 'seed', ['STR', 'CHA'], '07:00', '23:00')
    const b = dailySurprise('2026-10-22', 'seed', ['STR', 'CHA'], '07:00', '23:00')
    expect(a).toEqual(b)
  })

  it('only picks challenges for your stats', () => {
    for (let i = 0; i < 30; i++) {
      const s = dailySurprise(addDays('2026-10-01', i), 'seed', ['WLT'], '07:00', '23:00')!
      expect(s.challenge.stat).toBe('WLT')
    }
    expect(dailySurprise('2026-10-22', 'seed', [], '07:00', '23:00')).toBe(null)
  })

  it('appears between an hour after waking and two hours before bed, open for an hour', () => {
    for (let i = 0; i < 60; i++) {
      const day = addDays('2026-10-01', i)
      const s = dailySurprise(day, 'seed', ['STR', 'VIT', 'INT'], '07:30', '23:00')!
      const at = new Date(s.opensAt)
      const minutes = at.getHours() * 60 + at.getMinutes()
      expect(minutes).toBeGreaterThanOrEqual(8 * 60 + 30)
      expect(minutes).toBeLessThan(21 * 60)
      expect(s.closesAt - s.opensAt).toBe(60 * 60_000)
    }
  })

  it('handles a bedtime after midnight', () => {
    const s = dailySurprise('2026-10-22', 'seed', ['STR'], '10:00', '01:00')!
    expect(s.opensAt).toBeGreaterThanOrEqual(new Date(2026, 9, 22, 11, 0).getTime())
    expect(s.opensAt).toBeLessThan(new Date(2026, 9, 22, 23, 0).getTime())
  })

  it('moves from upcoming to open to missed, unless cleared', () => {
    const s = dailySurprise('2026-10-22', 'seed', ['STR'], '07:00', '23:00')!
    expect(surpriseState(s, false, s.opensAt - 1)).toBe('upcoming')
    expect(surpriseState(s, false, s.opensAt + 1)).toBe('open')
    expect(surpriseState(s, false, s.closesAt)).toBe('missed')
    expect(surpriseState(s, true, s.closesAt)).toBe('cleared')
  })
})

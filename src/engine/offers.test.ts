import { describe, expect, it } from 'vitest'
import { MAIN_OFFERS, SIDE_OFFERS, addDays, mainOffers, sideOffers, sideWindow, type StatKey } from './index'

const stats: StatKey[] = ['STR', 'VIT', 'INT', 'CHA', 'AGI', 'WLT']
const base = { seed: 'player-1', stats, scores: { STR: 90, VIT: 80, INT: 20, CHA: 70, AGI: 60, WLT: 10 }, owned: new Map<string, string>() }

describe('side quest offers', () => {
  it('change every 3 days and stay put within a window', () => {
    expect(sideWindow(0, '2026-10-01', addDays)).toEqual({ period: 0, startedOn: '2026-10-01', nextOn: '2026-10-04' })
    expect(sideWindow(4, '2026-10-05', addDays)).toEqual({ period: 1, startedOn: '2026-10-04', nextOn: '2026-10-07' })
    const a = sideOffers({ ...base, daysSinceStart: 3 }, addDays, '2026-10-04').offers.map(o => o.id)
    const b = sideOffers({ ...base, daysSinceStart: 5 }, addDays, '2026-10-06').offers.map(o => o.id)
    const c = sideOffers({ ...base, daysSinceStart: 6 }, addDays, '2026-10-07').offers.map(o => o.id)
    expect(b).toEqual(a)
    expect(c).not.toEqual(a)
  })

  it('mixes for-you, better-you and dark-side quests, leaning to the weakest stats', () => {
    const even = sideOffers({ ...base, daysSinceStart: 0 }, addDays, '2026-10-01').offers
    const odd = sideOffers({ ...base, daysSinceStart: 3 }, addDays, '2026-10-04').offers
    expect(even.filter(o => o.kind === 'you')).toHaveLength(3)
    expect(even.filter(o => o.kind === 'better')).toHaveLength(2)
    expect(even.filter(o => o.kind === 'dark')).toHaveLength(1)
    expect(odd.filter(o => o.kind === 'dark')).toHaveLength(2)
    // Two of the "for you" picks are INT or WLT, the weakest stats.
    expect(even.filter(o => o.kind === 'you' && ['INT', 'WLT'].includes(o.stat)).length).toBeGreaterThanOrEqual(2)
    expect(new Set(even.map(o => o.id)).size).toBe(even.length)
  })

  it('only offers stats you track, and skips quests you already had', () => {
    const offers = sideOffers({ ...base, stats: ['STR', 'CHA'], daysSinceStart: 0 }, addDays, '2026-10-01').offers
    expect(offers.every(o => ['STR', 'CHA'].includes(o.stat))).toBe(true)
    const first = sideOffers({ ...base, daysSinceStart: 0 }, addDays, '2026-10-01').offers[0]
    // Added before this window: skipped. Added during it: still shown (as added).
    expect(sideOffers({ ...base, owned: new Map([[first.id, '2026-09-30']]), daysSinceStart: 0 }, addDays, '2026-10-01').offers.map(o => o.id)).not.toContain(first.id)
    expect(sideOffers({ ...base, owned: new Map([[first.id, '2026-10-01']]), daysSinceStart: 0 }, addDays, '2026-10-01').offers.map(o => o.id)).toContain(first.id)
  })

  it('have unique ids and real minimum versions', () => {
    const ids = [...SIDE_OFFERS, ...MAIN_OFFERS].map(o => o.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(SIDE_OFFERS.every(o => o.minVersion.length > 0)).toBe(true)
  })
})

describe('main quest offers', () => {
  it('offers two big quests a week from different stats, starting with the weakest', () => {
    const set = mainOffers({ ...base, week: '2026-10-05' }, addDays)
    expect(set.nextOn).toBe('2026-10-12')
    expect(set.offers).toHaveLength(2)
    expect(set.offers[0].stat).toBe('WLT')
    expect(set.offers[1].stat).not.toBe('WLT')
    expect(mainOffers({ ...base, week: '2026-10-05' }, addDays).offers.map(o => o.id)).toEqual(set.offers.map(o => o.id))
    expect(MAIN_OFFERS.every(o => o.stages.length >= 4)).toBe(true)
  })
})

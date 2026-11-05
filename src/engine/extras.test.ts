import { describe, expect, it } from 'vitest'
import {
  COUPONS, GATE_MINUTES, JOBS, PLATES, collection, companionState, couponFor, earnedHidden, foilFor, gateCount, goldenQuestId, luckyRoll, redGate, rollReward, shadowLegion, summarize, wildcardOffers,
  type BonusRecord, type Boss, type Completion, type Player, type Quest,
} from './index'

const quest = (id: string, kind: Quest['kind'] = 'daily'): Quest => ({
  id, userId: 'local', kind, stat: 'STR', title: id, description: '', minVersion: '', active: true, templateId: null, createdAt: new Date(2026, 9, 1, 12).getTime(), updatedAt: 0,
}) as Quest
const done = (questId: string, day: string, at = new Date(`${day}T12:00:00`).getTime(), extra: Partial<Completion> = {}): Completion => ({
  id: `${questId}-${day}-${at}`, userId: 'local', questId, stat: 'STR', day, version: 'full', xp: 20, dollars: 1, createdAt: at, ...extra,
})

describe('golden quest and red gates', () => {
  it('picks one daily a day, the same on every device', () => {
    const dailies = [quest('a'), quest('b'), quest('c')]
    const pick = goldenQuestId('seed', '2026-11-05', dailies)
    expect(['a', 'b', 'c']).toContain(pick)
    expect(goldenQuestId('seed', '2026-11-05', [...dailies].reverse())).toBe(pick)
    const days = new Set(Array.from({ length: 20 }, (_, i) => goldenQuestId('seed', `2026-11-${String(i + 1).padStart(2, '0')}`, dailies)))
    expect(days.size).toBeGreaterThan(1)
    expect(goldenQuestId('seed', '2026-11-05', [])).toBeNull()
  })

  it('opens a gate about every other day while you are awake, and counts dailies inside it', () => {
    const days = Array.from({ length: 200 }, (_, i) => `2027-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`)
    const gates = days.map(d => redGate('seed', d, '07:00', '23:00')).filter(Boolean)
    expect(gates.length).toBeGreaterThan(70)
    expect(gates.length).toBeLessThan(130)
    for (const g of gates) {
      const h = new Date(g!.opensAt).getHours()
      expect(h).toBeGreaterThanOrEqual(9)
      expect(h).toBeLessThan(21)
      expect(g!.closesAt - g!.opensAt).toBe(GATE_MINUTES * 60_000)
    }
    const g = gates[0]!
    const inside = (n: number) => done(`q${n}`, g.day, g.opensAt + n * 60_000)
    const list = [inside(1), inside(2), inside(3), done('q4', g.day, g.closesAt + 1)]
    expect(gateCount(g, list, new Set(['q1', 'q2', 'q3', 'q4']))).toBe(3)
  })
})

describe('lucky roll, foil and coupons', () => {
  it('rolls a fixed d20 per day with escalating rewards', () => {
    expect(luckyRoll('s', '2026-11-05')).toBe(luckyRoll('s', '2026-11-05'))
    const all = new Set(Array.from({ length: 400 }, (_, i) => luckyRoll('s', `d${i}`)))
    expect(Math.min(...all)).toBe(1)
    expect(Math.max(...all)).toBe(20)
    expect(rollReward(1).cursed).toBe(true)
    expect(rollReward(20)).toMatchObject({ card: 'legendary', coupon: true, xp: 100 })
    expect(rollReward(18).wildcard).toBe(true)
    for (let n = 2; n <= 20; n++) expect(rollReward(n).xp).toBeGreaterThanOrEqual(rollReward(n - 1).xp)
  })

  it('makes about 1 in 15 drops foil, and a foil counts as two copies', () => {
    const foils = Array.from({ length: 3000 }, (_, i) => foilFor('s', `src${i}`)).filter(Boolean).length
    expect(foils / 3000).toBeGreaterThan(0.04)
    expect(foils / 3000).toBeLessThan(0.1)
    const entry = collection([{ cardId: 'x', createdAt: 1, foil: true }, { cardId: 'x', createdAt: 2 }])
    expect(entry.size).toBe(0) // unknown card ids are ignored
  })

  it('hands out real coupons, lazy days rarely', () => {
    const picks = Array.from({ length: 1000 }, (_, i) => couponFor('s', `c${i}`).id)
    expect(new Set(picks).size).toBe(COUPONS.length)
    expect(picks.filter(p => p === 'lazy-day').length / 1000).toBeLessThan(0.12)
  })
})

describe('wildcards', () => {
  it('offers to save yesterday for a 3+ day streak, and the save keeps the streak going', () => {
    const q = quest('a')
    const list = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04'].map(d => done('a', d))
    const offers = wildcardOffers([q], list, '2026-11-06', new Set(), new Set(), '2026-10-01')
    expect(offers).toEqual([{ questId: 'a', day: '2026-11-05', streak: 4 }])
    expect(wildcardOffers([q], list, '2026-11-06', new Set(), new Set(['a:2026-11-05']), '2026-10-01')).toEqual([])
    expect(wildcardOffers([q], list.slice(2), '2026-11-06', new Set(), new Set(), '2026-10-01')).toEqual([])
  })
})

describe('companion, legion and jobs', () => {
  it('evolves with the best combo and reacts to today', () => {
    expect(companionState(0, 0, 3, 0).stage.id).toBe('egg')
    expect(companionState(7, 0, 3, 0).stage.id).toBe('wisp')
    expect(companionState(40, 3, 3, 0)).toMatchObject({ mood: 'happy', next: null })
    expect(companionState(3, 0, 3, 2).mood).toBe('sulky')
  })

  it('raises a soldier every 5 quests after the first job change, plus elites and knights', () => {
    const list = Array.from({ length: 23 }, (_, i) => done(`q${i}`, '2026-11-05', 1000 + i))
    expect(shadowLegion('s', null, null, list, [], []).soldiers).toEqual([])
    const boss = { id: 'b1', name: 'Taxes', defeatedAt: 5000 } as Boss
    const { soldiers, nextIn } = shadowLegion('s', 0, null, list, [boss], [6000])
    expect(soldiers.filter(s => s.kind === 'Elite').map(s => s.name)).toEqual(['Shade of Taxes'])
    expect(soldiers.filter(s => s.kind === 'Knight')).toHaveLength(1)
    expect(soldiers.filter(s => s.kind !== 'Elite' && s.kind !== 'Knight')).toHaveLength(4)
    expect(nextIn).toBe(2)
  })

  it('has three job trials at rising levels and plates that unlock', () => {
    expect(JOBS.map(j => j.level)).toEqual([10, 25, 40])
    const input = { level: 10, perfectDays: 3, sideClears: 5, bestCombo: 0, soldiers: 0, bossesDefeated: 0, mainsCleared: 0 }
    expect(JOBS[0].trial.every(t => t.done(input))).toBe(true)
    expect(JOBS[1].trial.every(t => t.done(input))).toBe(false)
    expect(PLATES.filter(p => p.earned({ level: 1, bestCombo: 0, gatesCleared: 0, jobs: new Set() })).map(p => p.id)).toEqual(['plain'])
  })
})

describe('hidden achievements', () => {
  it('stay hidden until earned', () => {
    const base = { completions: [], dailyIds: new Set<string>(), perfectDays: [], activeDays: new Set<string>(), startDay: '2026-10-01', gatesCleared: 0, goldenCleared: 0, rolls: [], loot: [], soldiers: 0, couponsUsed: 0 }
    expect(earnedHidden(base)).toEqual([])
    const early = done('a', '2026-11-05', new Date(2026, 10, 5, 5, 10).getTime())
    expect(earnedHidden({ ...base, completions: [early], rolls: [20], gatesCleared: 1 }).map(h => h.id).sort()).toEqual(['early-bird', 'gatecrasher', 'natural-20'])
  })
})

describe('summary', () => {
  const player: Player = {
    id: 'p', userId: 'local', name: 'T', stats: ['STR'], fitness: null,
    settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'normal', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
    createdAt: new Date(2026, 9, 1, 12).getTime(), updatedAt: 0,
  }
  const record = (kind: BonusRecord['kind'], value: string, day = '2026-11-05', extra: Partial<BonusRecord> = {}): BonusRecord => ({ id: `${kind}-${value}-${day}`, userId: 'local', kind, day, sourceId: `${kind}-${day}`, value, createdAt: 1, ...extra })

  it('pays XP for rolls, gates and job changes, and lazy-day coupons make a Recovery Day', () => {
    const now = new Date(2026, 10, 5, 12)
    const base = summarize(player, [], [], now).totalXp
    const coupon = record('coupon', 'lazy-day')
    const s = summarize(player, [], [], now, { bonuses: [record('roll', '20'), record('gate', ''), record('job', 'shadowcaller'), coupon, record('coupon-use', coupon.id), record('wildcard', '')] })
    // Roll 20 + gate + job, plus the Natural 20 and Gatecrasher hidden achievements.
    expect(s.totalXp - base).toBe(100 + 40 + 100 + 30 * 2)
    expect(s.recoveryToday).toBe(true)
    expect(s.extras.coupons).toEqual([])
    expect(s.extras.wildcards).toBe(1)
    expect(s.extras.job?.title).toBe('Shadowcaller')
    expect(summarize({ ...player, features: { extras: false, legion: false } }, [], [], now, { bonuses: [record('roll', '20')] }).totalXp).toBe(base)
  })

  it('a used wildcard keeps a streak alive', () => {
    const q = quest('a')
    const list = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-06'].map(d => done('a', d))
    const now = new Date(2026, 10, 6, 12)
    expect(summarize(player, [q], list, now).streaks.get('a')).toBe(1)
    const save = record('wildcard-use', '', '2026-11-05', { questId: 'a' })
    expect(summarize(player, [q], list, now, { bonuses: [save] }).streaks.get('a')).toBe(5)
  })
})

import { describe, expect, it } from 'vitest'
import { CARDS, DROP_CHANCE, collection, featuredSeries, rollDrop, starUpXp, stars, summarize, type LootDrop, type Player } from './index'

describe('loot', () => {
  it('has unique card ids and a full deck', () => {
    expect(new Set(CARDS.map(c => c.id)).size).toBe(CARDS.length)
    expect(CARDS.filter(c => c.kind === 'playing')).toHaveLength(54)
    expect(CARDS.filter(c => c.kind === 'idol').length).toBeGreaterThanOrEqual(20)
    expect(CARDS.filter(c => c.portrait).length).toBeGreaterThanOrEqual(12)
    expect(CARDS.every(c => c.kind !== 'idol' || !!c.pose !== !!c.portrait)).toBe(true)
  })

  it('always drops something good from big moments', () => {
    for (let i = 0; i < 50; i++) {
      const boss = rollDrop('boss', `b${i}`, 'seed', '2026-10')!
      expect(['epic', 'legendary']).toContain(boss.rarity)
      const strength = rollDrop('strength', `s${i}`, 'seed', '2026-10')!
      expect(strength.rarity).not.toBe('common')
    }
  })

  it('drops from about a quarter of ordinary quests, the same way every time', () => {
    const drops = Array.from({ length: 2000 }, (_, i) => rollDrop('quest', `q${i}`, 'seed', '2026-10')).filter(Boolean).length
    expect(drops / 2000).toBeGreaterThan(DROP_CHANCE.quest - 0.05)
    expect(drops / 2000).toBeLessThan(DROP_CHANCE.quest + 0.05)
    expect(rollDrop('quest', 'q7', 'seed', '2026-10')?.id).toBe(rollDrop('quest', 'q7', 'seed', '2026-10')?.id)
  })

  it('features a different series as months change', () => {
    const months = new Set(['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'].map(m => featuredSeries(m, 'seed')))
    expect(months.size).toBeGreaterThan(1)
  })

  it('powers cards up with duplicates and pays XP for each star', () => {
    expect([1, 2, 3, 5, 6].map(stars)).toEqual([1, 1, 2, 2, 3])
    const drop = (n: number, cardId = 'relic-duck'): LootDrop => ({ id: `d${n}`, userId: 'local', cardId, source: 'quest', sourceId: `s${n}`, day: '2026-10-01', createdAt: n })
    const drops = [1, 2, 3, 4, 5, 6].map(n => drop(n))
    expect(collection(drops).get('relic-duck')).toMatchObject({ copies: 6, stars: 3 })
    expect(starUpXp(drops)).toBe(30)
    const player: Player = {
      id: 'p', userId: 'local', name: 'T', stats: ['STR'], fitness: null,
      settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'normal', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
      createdAt: new Date(2026, 9, 1, 12).getTime(), updatedAt: 0,
    }
    expect(summarize(player, [], [], new Date(2026, 9, 2, 12), { loot: drops }).totalXp).toBe(30)
    expect(summarize({ ...player, features: { cards: false } }, [], [], new Date(2026, 9, 2, 12), { loot: drops }).totalXp).toBe(0)
  })
})

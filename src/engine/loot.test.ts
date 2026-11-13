import { describe, expect, it } from 'vitest'
import { CARDS, DROP_CHANCE, FUNNY_PER_PACK, packGirls, packRarities, pickFunny, cardById, setCustomCards, collection, pickOwnedCard, rollRarity, starUpXp, stars, summarize, type LootDrop, type Player } from './index'

describe('custom cards', () => {
  it('are the whole card set once registered', () => {
    const mine = { id: 'custom-1', kind: 'idol' as const, name: 'Mine', rarity: 'legendary' as const, series: 'custom', text: '', photoId: 'p1' }
    setCustomCards([mine])
    expect(cardById('custom-1')?.name).toBe('Mine')
    expect(pickOwnedCard('legendary', 'x')?.id).toBe('custom-1')
    // No card of the rolled rarity: the nearest one you own.
    expect(pickOwnedCard('common', 'x')?.id).toBe('custom-1')
    setCustomCards([])
    expect(cardById('custom-1')).toBeUndefined()
    expect(pickOwnedCard('rare', 'x')).toBeNull()
  })

  it('prefers the rolled rarity, then lower ones', () => {
    const card = (id: string, rarity: 'common' | 'rare' | 'epic' | 'legendary') => ({ id, kind: 'idol' as const, name: id, rarity, series: 'custom', text: '', photoId: id })
    setCustomCards([card('c', 'common'), card('r', 'rare'), card('l', 'legendary')])
    expect(pickOwnedCard('rare', 'a')?.id).toBe('r')
    expect(pickOwnedCard('epic', 'a')?.id).toBe('r')
    setCustomCards([])
  })
})

describe('loot', () => {
  it('has no built-in cards any more', () => {
    expect(CARDS).toEqual([])
  })

  it('always rolls something good from big moments', () => {
    for (let i = 0; i < 50; i++) {
      expect(['epic', 'legendary']).toContain(rollRarity('boss', `b${i}`, 'seed'))
      expect(rollRarity('strength', `s${i}`, 'seed')).not.toBe('common')
      expect(rollRarity('perfect', `p${i}`, 'seed', { minRarity: 'rare' })).not.toBe('common')
      expect(['epic', 'legendary']).toContain(rollRarity('pack', `k${i}`, 'seed', { minRarity: 'epic' }))
    }
  })

  it('drops from about a quarter of ordinary quests, the same way every time', () => {
    const drops = Array.from({ length: 2000 }, (_, i) => rollRarity('quest', `q${i}`, 'seed')).filter(Boolean).length
    expect(drops / 2000).toBeGreaterThan(DROP_CHANCE.quest - 0.05)
    expect(drops / 2000).toBeLessThan(DROP_CHANCE.quest + 0.05)
    expect(rollRarity('quest', 'q7', 'seed')).toBe(rollRarity('quest', 'q7', 'seed'))
  })

  it('powers cards up with duplicates and pays XP for each star', () => {
    expect([1, 2, 3, 5, 6].map(stars)).toEqual([1, 1, 2, 2, 3])
    const drop = (n: number, cardId = 'custom-duck'): LootDrop => ({ id: `d${n}`, userId: 'local', cardId, source: 'quest', sourceId: `s${n}`, day: '2026-10-01', createdAt: n })
    const drops = [1, 2, 3, 4, 5, 6].map(n => drop(n))
    setCustomCards([{ id: 'custom-duck', kind: 'idol', name: 'Duck', rarity: 'rare', series: 'custom', text: '', photoId: 'd' }])
    expect(collection(drops).get('custom-duck')).toMatchObject({ copies: 6, stars: 3 })
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

describe('card packs', () => {
  it('hold 5 different funny cards and 1 or 2 girl cards', () => {
    const ids = Array.from({ length: 40 }, (_, i) => `fun-${i + 1}`)
    const five = pickFunny('seed:q1', ids)
    expect(five).toHaveLength(FUNNY_PER_PACK)
    expect(new Set(five).size).toBe(5)
    expect(pickFunny('seed:q1', ids)).toEqual(five)
    expect(packGirls('boss', 'b1', 's')).toBe(2)
    expect(packGirls('strength', 'x', 's')).toBe(2)
    const n = Array.from({ length: 400 }, (_, i) => packGirls('quest', `q${i}`, 's')).filter(g => g === 2).length
    expect(n).toBeGreaterThan(40)
    expect(n).toBeLessThan(130)
    expect(packRarities('common', 2)).toEqual(['common', 'rare'])
    expect(packRarities('epic', 2)).toEqual(['epic', 'epic'])
    expect(packRarities('common', 1)).toEqual(['common'])
  })
})

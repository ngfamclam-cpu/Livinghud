import { describe, expect, it } from 'vitest'
import { activeSkills, avatarStage, canLearn, hunterRank, perkAmount, perkText, petAbility, petXpBoost, pointsLeft, skillEffects, skillPoints, abilityXp } from './progression'
import { avatarPrompt, petPrompt } from './looks'

describe('skill tree', () => {
  it('gives a point per level and learns in order', () => {
    expect(skillPoints(1)).toBe(0)
    expect(skillPoints(10)).toBe(9)
    expect(canLearn('might-1', [], 1)).toEqual({ ok: false, reason: 'Level 2' })
    expect(canLearn('might-1', [], 2)).toEqual({ ok: true })
    expect(canLearn('might-2', [], 9)).toMatchObject({ ok: false })
    expect(canLearn('might-2', ['might-1'], 9)).toEqual({ ok: true })
    expect(pointsLeft(['might-1', 'might-2'], 9)).toBe(6)
    // Tier 3 costs 2 points and needs level 15.
    expect(canLearn('might-3', ['might-1', 'might-2'], 14)).toEqual({ ok: false, reason: 'Level 15' })
  })

  it('ignores skills the level no longer pays for, and turns them into effects', () => {
    const chosen = ['might-1', 'fortune-1', 'shadow-1', 'might-2']
    expect([...activeSkills(chosen, 3)]).toEqual(['might-1', 'fortune-1'])
    const e = skillEffects(activeSkills(['might-1', 'might-2', 'fortune-1', 'fortune-2', 'shadow-1', 'shadow-2'], 10))
    expect(e.xp).toBeCloseTo(1.1)
    expect(e.rollBonus).toBe(2)
    expect(e.doubleGirl).toBe(0.35)
    expect(e.petDamage).toBe(0.75)
    expect(e.restRune).toBe(true)
    expect(e.gateMinutes).toBe(120)
    expect(skillEffects(new Set()).goldenMult).toBe(3)
  })
})

describe('hunter rank and avatar', () => {
  it('ranks up by level and evolves the avatar every 5 levels', () => {
    expect(hunterRank(1).rank).toBe('E')
    expect(hunterRank(9)).toMatchObject({ rank: 'D', next: { rank: 'C', level: 10 } })
    expect(hunterRank(50)).toMatchObject({ rank: 'S', title: 'S-Rank Hunter', next: null })
    expect([avatarStage(4), avatarStage(5), avatarStage(49), avatarStage(80)]).toEqual([0, 1, 9, 10])
    expect(avatarPrompt(0)).toMatch(/face/)
    expect(avatarPrompt(11)).toBeNull()
  })
})

describe('pet perks, abilities and evolution', () => {
  it('scale with level, rarity and evolution', () => {
    const fox = { id: 'ember-fox', rarity: 'common', level: 3, evolved: false }
    expect(perkAmount(fox)).toBeCloseTo(0.06)
    expect(petXpBoost(fox, 'STR')).toBeCloseTo(1.06)
    expect(petXpBoost(fox, 'INT')).toBe(1)
    expect(perkAmount({ ...fox, level: 5, evolved: true })).toBeCloseTo(0.15)
    expect(perkText({ id: 'phoenix', rarity: 'legendary', level: 2, evolved: false }, k => k)).toBe('+4% XP on every quest')
    expect(petAbility('pip', 'spirit')).toBe('fetch')
    expect(petAbility('ember-fox', 'fire')).toBe('spark')
    expect(abilityXp('spark', fox)).toBe(18)
    expect(petPrompt('ember-fox', 6)).toMatch(/ascended/)
  })
})

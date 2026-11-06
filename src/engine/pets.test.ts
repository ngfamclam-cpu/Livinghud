import { describe, expect, it } from 'vitest'
import { AFFECTION_NAMES, COMPANION_DATE_XP, EGG_CHANCE, HATCH_CLEARS, HUMAN_COMPANIONS, PETS, companionPrompt, dateOffer, humanLine, petsState, rollEgg, unlockedOutfits, type BonusRecord, type Completion } from './index'

const clear = (n: number, at: number, day = '2026-11-01'): Completion => ({ id: `c${n}`, userId: 'local', questId: `q${n % 3}`, stat: 'STR', day, version: 'full', xp: 20, dollars: 1, createdAt: at })
const bonus = (kind: BonusRecord['kind'], value: string, createdAt: number, sourceId = `${kind}-${createdAt}`): BonusRecord => ({ id: `${kind}-${value}-${createdAt}`, userId: 'local', kind, day: '2026-11-01', sourceId, value, createdAt })
const base = { completions: [] as Completion[], perfectDays: [] as string[], bonuses: [] as BonusRecord[], milestones: { bestCombo: 0, level: 1, bossesDefeated: 0, gatesCleared: 0, hiddenIds: new Set<string>() }, pipHeadStart: 0 }

describe('pets', () => {
  it('has unique ids, Mythic and Elemental families, and Pip as the starter', () => {
    expect(new Set(PETS.map(p => p.id)).size).toBe(PETS.length)
    expect(new Set(PETS.map(p => p.family))).toEqual(new Set(['Starter', 'Elemental', 'Mythic', 'Companion']))
    const s = petsState(base)
    expect(s.owned.map(p => p.def.id)).toEqual(['pip'])
    expect(s.active.def.id).toBe('pip')
  })

  it('drops eggs rarely, only for pets you do not have', () => {
    const n = 4000
    const eggs = Array.from({ length: n }, (_, i) => rollEgg('s', 'perfect', `p${i}`, new Set())).filter(Boolean).length
    expect(eggs / n).toBeGreaterThan(EGG_CHANCE.perfect - 0.03)
    expect(eggs / n).toBeLessThan(EGG_CHANCE.perfect + 0.03)
    const allEggPets = new Set(PETS.filter(p => p.source === 'egg').map(p => p.id))
    expect(rollEgg('s', 'roll20', 'x', allEggPets)).toBeNull()
    const one = rollEgg('s', 'roll20', 'x', new Set())
    expect(PETS.find(p => p.id === one)?.source).toBe('egg')
  })

  it('hatches an egg after enough quest clears, then you can swap to it', () => {
    const egg = bonus('egg', 'ember-fox', 1000)
    const need = HATCH_CLEARS.common
    const some = Array.from({ length: need - 1 }, (_, i) => clear(i, 2000 + i))
    const waiting = petsState({ ...base, bonuses: [egg], completions: some })
    expect(waiting.eggs[0]).toMatchObject({ clears: need - 1, needed: need })
    expect(waiting.owned).toHaveLength(1)
    const hatched = petsState({ ...base, bonuses: [egg], completions: [...some, clear(99, 9000)] })
    expect(hatched.owned.map(p => p.def.id)).toEqual(['pip', 'ember-fox'])
    expect(hatched.eggs).toEqual([])
    const switched = petsState({ ...base, bonuses: [egg, bonus('pet', 'ember-fox', 9500)], completions: [...some, clear(99, 9000)] })
    expect(switched.active.def.id).toBe('ember-fox')
  })

  it('unlocks milestone and secret pets', () => {
    const s = petsState({ ...base, milestones: { bestCombo: 30, level: 25, bossesDefeated: 5, gatesCleared: 5, hiddenIds: new Set(['night-owl', 'snake-eyes']) } })
    expect(s.owned.map(p => p.def.id).sort()).toEqual(['azure-dragon', 'chaos-wyrm', 'frost-owl', 'lunar-moth', 'phoenix', 'pip', 'qilin', 'thunderbird'])
  })

  it('grows only the pet that was active at the time', () => {
    const bonuses = [bonus('egg', 'ember-fox', 0), bonus('pet', 'ember-fox', 100)]
    const before = Array.from({ length: 5 }, (_, i) => clear(i, 10 + i))
    const after = Array.from({ length: 12 }, (_, i) => clear(10 + i, 200 + i, '2026-11-02'))
    const s = petsState({ ...base, bonuses, completions: [...before, ...after], perfectDays: ['2026-11-02'] })
    const fox = s.owned.find(p => p.def.id === 'ember-fox')!
    const pip = s.owned.find(p => p.def.id === 'pip')!
    expect(pip.xp).toBe(5)
    expect(fox.xp).toBe(12 + 5)
    expect(fox.level).toBe(2)
    expect(s.active.def.id).toBe('ember-fox')
  })
})

describe('human companions', () => {
  it('join when bought, level up with quests and dates, and unlock outfits', () => {
    const s0 = petsState(base)
    expect(s0.missing.some(p => p.id === 'mina' && p.source === 'shop')).toBe(true)
    const bought = bonus('companion', 'mina', 10)
    const active = bonus('pet', 'mina', 11)
    const clears = Array.from({ length: 6 }, (_, i) => clear(i, 100 + i))
    const s = petsState({ ...base, bonuses: [bought, active], completions: clears, dateClears: new Map([['mina', 2]]) })
    const mina = s.owned.find(p => p.def.id === 'mina')!
    expect(s.active.def.id).toBe('mina')
    expect(mina.xp).toBe(6 + 2 * COMPANION_DATE_XP)
    expect(mina.level).toBe(3)
    expect(mina.stage).toBe(AFFECTION_NAMES[2])
    expect(unlockedOutfits(mina.def.human!, mina.level).map(o => o.level)).toEqual([1, 2, 3])
  })

  it('offers one date idea per 4-day window and talks in character', () => {
    const a = dateOffer('s', 'rei', '2026-11-04')
    expect(dateOffer('s', 'rei', '2026-11-04')).toEqual(a)
    const windows = new Set(['2026-11-01', '2026-11-05', '2026-11-09', '2026-11-13', '2026-11-17'].map(d => dateOffer('s', 'rei', d).templateId))
    expect(windows.size).toBe(5)
    const rei = HUMAN_COMPANIONS.find(h => h.id === 'rei')!
    expect(humanLine(rei, { dailiesLeft: 2, dailiesTotal: 5, hour: 14 }, 0)).toBeTruthy()
    expect(humanLine(rei, { dailiesLeft: 0, dailiesTotal: 5, hour: 14 }, 1)).toMatch(/perfect|clear|impressive|co-op/i)
  })

  it('keeps every outfit prompt adult, non-explicit and under the model limit', () => {
    for (const h of HUMAN_COMPANIONS) {
      for (const o of h.outfits) {
        for (const level of [0, 1] as const) {
          const p = companionPrompt(h, o.id, 42, level)!
          expect(p).toMatch(/early 20s/)
          expect(p).toMatch(/fictional adult/)
          expect(p).not.toMatch(/\bgirl\b|teen|pasties|topless|nud(e|ity)|nipple|genital|sexual|sexy|seductive|sultry|pin-up/i)
          expect(p.length).toBeLessThan(2048)
        }
      }
    }
    expect(companionPrompt(HUMAN_COMPANIONS[0], 'nope')).toBeNull()
  })
})

import { describe, expect, it } from 'vitest'
import { EGG_CHANCE, HATCH_CLEARS, PETS, petsState, rollEgg, type BonusRecord, type Completion } from './index'

const clear = (n: number, at: number, day = '2026-11-01'): Completion => ({ id: `c${n}`, userId: 'local', questId: `q${n % 3}`, stat: 'STR', day, version: 'full', xp: 20, dollars: 1, createdAt: at })
const bonus = (kind: BonusRecord['kind'], value: string, createdAt: number, sourceId = `${kind}-${createdAt}`): BonusRecord => ({ id: `${kind}-${value}-${createdAt}`, userId: 'local', kind, day: '2026-11-01', sourceId, value, createdAt })
const base = { completions: [] as Completion[], perfectDays: [] as string[], bonuses: [] as BonusRecord[], milestones: { bestCombo: 0, level: 1, bossesDefeated: 0, gatesCleared: 0, hiddenIds: new Set<string>() }, pipHeadStart: 0 }

describe('pets', () => {
  it('has unique ids, Mythic and Elemental families, and Pip as the starter', () => {
    expect(new Set(PETS.map(p => p.id)).size).toBe(PETS.length)
    expect(new Set(PETS.map(p => p.family))).toEqual(new Set(['Starter', 'Elemental', 'Mythic']))
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

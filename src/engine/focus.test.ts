import { describe, expect, it } from 'vitest'
import { bossStatus, focusQuestVersion, focusXp, runDamage, type Boss, type FocusRun } from './index'

const boss = (id: string, hp: number, extra: Partial<Boss> = {}): Boss => ({
  id, userId: 'local', name: id, stat: 'AGI', hp, active: true, defeatedAt: null, createdAt: 0, updatedAt: 0, ...extra,
})
const run = (bossId: string | null, minutes: number, manual = false): FocusRun => ({
  id: `${bossId}-${minutes}-${manual}`, userId: 'local', label: 'x', stat: 'AGI', questId: null, bossId, plannedMin: minutes, minutes, cleared: true, manual,
  day: '2026-10-22', xp: 0, startedAt: 0, createdAt: 0,
})

describe('focus', () => {
  it('pays 1 XP a minute plus a bonus for a full clear', () => {
    expect(focusXp(30, true)).toBe(40)
    expect(focusXp(12.7, false)).toBe(12)
  })

  it('clears a linked quest at 30 minutes, the minimum at 10', () => {
    expect(focusQuestVersion(45)).toBe('full')
    expect(focusQuestVersion(15)).toBe('min')
    expect(focusQuestVersion(9)).toBe(null)
  })
})

describe('bosses', () => {
  it('takes a hit per 15 minutes, and a by-hand hit is one', () => {
    expect(runDamage(run('b', 44))).toBe(2)
    expect(runDamage(run('b', 15, true))).toBe(1)
  })

  it('tracks HP left from the sessions fought against it', () => {
    const [status] = bossStatus([boss('taxes', 4)], [run('taxes', 30), run('taxes', 15, true), run(null, 60)])
    expect(status).toMatchObject({ damage: 3, hpLeft: 1, minutes: 45 })
  })

  it('never goes below 0 HP, lists live bosses first and hides removed ones', () => {
    const list = bossStatus([boss('done', 1, { defeatedAt: 1, createdAt: 0 }), boss('live', 2, { createdAt: 5 }), boss('gone', 1, { active: false })], [run('done', 90)])
    expect(list.map(b => [b.boss.id, b.hpLeft])).toEqual([['live', 2], ['done', 0]])
  })
})

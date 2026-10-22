import { describe, expect, it } from 'vitest'
import { addDays, weeklyReport, type Completion, type JournalEntry, type Quest, type ReportInput } from './index'

const created = new Date(2026, 9, 1, 12).getTime()
const q = (id: string, stat: 'STR' | 'INT'): Quest => ({ id, userId: 'local', kind: 'daily', stat, title: id, description: '', minVersion: '', active: true, templateId: null, createdAt: created, updatedAt: 0 })
const done = (questId: string, day: string): Completion => ({ id: `${questId}-${day}`, userId: 'local', questId, stat: 'STR', day, version: 'full', xp: 20, dollars: 1.5, createdAt: 0 })
const week = '2026-10-12' // a Monday
const days = (start: string, n = 7) => Array.from({ length: n }, (_, i) => addDays(start, i))

const base = (extra: Partial<ReportInput> = {}): ReportInput => ({
  stats: ['STR', 'INT'], quests: [q('s', 'STR'), q('i', 'INT')], completions: [], purchases: [], contacts: [], focusRuns: [], bosses: [], journal: [],
  restDays: new Set(), resetHour: 4, weakening: [], ...extra,
})

describe('weekly report', () => {
  it('grades the week and compares each stat with the week before', () => {
    const completions = [...days(week).map(d => done('s', d)), ...days(addDays(week, -7), 7).map(d => done('i', d)), done('i', week)]
    const r = weeklyReport(base({ completions }), week)
    expect(r.completion).toBeCloseTo(8 / 14)
    expect(r.grade).toBe('C')
    expect(r.byStat).toEqual([
      { stat: 'STR', rate: 1, previous: 0 },
      { stat: 'INT', rate: 1 / 7, previous: 1 },
    ])
    expect(r.xp).toBe(160)
    expect(r.dollars).toBe(12)
  })

  it('suggests working on the weakest area', () => {
    const r = weeklyReport(base({ completions: days(week).map(d => done('s', d)) }), week)
    expect(r.suggestion).toMatch(/^INT was your weakest area \(0%\)/)
  })

  it('puts a low mood first', () => {
    const journal: JournalEntry[] = days(week, 3).map(d => ({ id: d, userId: 'local', day: d, wentWell: '', drained: '', adjust: '', mood: 2, energy: 2, createdAt: 0, updatedAt: 0 }))
    const r = weeklyReport(base({ journal, completions: days(week).flatMap(d => [done('s', d), done('i', d)]) }), week)
    expect(r.avgMood).toBe(2)
    expect(r.suggestion).toMatch(/mood ran low/)
  })

  it('skips Recovery Days', () => {
    const completions = days(week).filter(d => d !== addDays(week, 2)).flatMap(d => [done('s', d), done('i', d)])
    const r = weeklyReport(base({ completions, restDays: new Set([addDays(week, 2)]) }), week)
    expect(r.completion).toBe(1)
    expect(r.grade).toBe('S')
  })
})

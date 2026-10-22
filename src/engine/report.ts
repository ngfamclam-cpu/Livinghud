// The weekly report card: how a Monday-to-Sunday week went, compared with the
// week before, plus one suggestion. Worked out from the logs; no AI.

import { playerRank } from './economy'
import { BOSS_XP } from './focus'
import { addDays, dayKey } from './time'
import type { Boss, Completion, Contact, FocusRun, JournalEntry, Purchase, Quest, RewardRank, StatKey } from './types'

export interface ReportInput {
  stats: StatKey[]
  quests: Quest[]
  completions: Completion[]
  purchases: Purchase[]
  contacts: Contact[]
  focusRuns: FocusRun[]
  bosses: Boss[]
  journal: JournalEntry[]
  restDays: Set<string>
  resetHour: number
  /** Names of people whose bond is weakening now. */
  weakening: string[]
}

export interface WeekReport {
  start: string
  end: string
  grade: RewardRank
  completion: number
  /** Share of dailies done per stat, this week and the week before (null if no dailies). */
  byStat: { stat: StatKey; rate: number | null; previous: number | null }[]
  xp: number
  dollars: number
  focusMinutes: number
  bossesDefeated: number
  contacts: number
  journalEntries: number
  avgMood: number | null
  suggestion: string
}

const inWeek = (day: string, start: string) => day >= start && day <= addDays(start, 6)

/** Share of active dailies done in a week, overall and per stat. */
function rates(input: ReportInput, start: string) {
  const dailies = input.quests.filter(q => q.kind === 'daily' && q.active)
  const done = new Set(input.completions.filter(c => inWeek(c.day, start)).map(c => `${c.questId}@${c.day}`))
  const per = new Map<StatKey, { done: number; due: number }>()
  for (let i = 0; i < 7; i++) {
    const day = addDays(start, i)
    if (input.restDays.has(day)) continue
    for (const q of dailies) {
      if (dayKey(new Date(q.createdAt), input.resetHour) > day) continue
      const p = per.get(q.stat) ?? { done: 0, due: 0 }
      p.due++
      if (done.has(`${q.id}@${day}`)) p.done++
      per.set(q.stat, p)
    }
  }
  let doneAll = 0
  let dueAll = 0
  for (const p of per.values()) {
    doneAll += p.done
    dueAll += p.due
  }
  return { overall: dueAll ? doneAll / dueAll : 0, per }
}

export function weeklyReport(input: ReportInput, start: string): WeekReport {
  const end = addDays(start, 6)
  const now = rates(input, start)
  const before = rates(input, addDays(start, -7))
  const byStat = input.stats.map(stat => {
    const a = now.per.get(stat)
    const b = before.per.get(stat)
    return { stat, rate: a?.due ? a.done / a.due : null, previous: b?.due ? b.done / b.due : null }
  })

  const week = <T extends { day: string }>(xs: T[]) => xs.filter(x => inWeek(x.day, start))
  const defeated = input.bosses.filter(b => b.defeatedAt && inWeek(dayKey(new Date(b.defeatedAt), input.resetHour), start)).length
  const xp =
    week(input.completions).reduce((s, c) => s + c.xp, 0) +
    week(input.purchases).reduce((s, p) => s + p.xp, 0) +
    week(input.contacts).reduce((s, c) => s + c.xp, 0) +
    week(input.focusRuns).reduce((s, r) => s + r.xp, 0) +
    defeated * BOSS_XP
  const entries = week(input.journal)
  const avgMood = entries.length ? entries.reduce((s, e) => s + e.mood, 0) / entries.length : null

  const report: WeekReport = {
    start,
    end,
    grade: playerRank(now.overall),
    completion: now.overall,
    byStat,
    xp,
    dollars: Math.round(week(input.completions).reduce((s, c) => s + c.dollars, 0) * 100) / 100,
    focusMinutes: week(input.focusRuns).reduce((s, r) => s + r.minutes, 0),
    bossesDefeated: defeated,
    contacts: week(input.contacts).length,
    journalEntries: entries.length,
    avgMood,
    suggestion: '',
  }
  report.suggestion = suggest(report, input.weakening)
  return report
}

/** One concrete suggestion, from the most pressing thing the week shows. */
function suggest(r: WeekReport, weakening: string[]): string {
  const rated = r.byStat.filter(s => s.rate !== null) as { stat: StatKey; rate: number; previous: number | null }[]
  const weakest = [...rated].sort((a, b) => a.rate - b.rate)[0]
  if (rated.length === 0) return 'Add a few dailies so next week has something to measure.'
  if (r.avgMood !== null && r.avgMood < 2.5) return 'Your mood ran low this week. Plan a lighter week, use minimum versions without guilt, and consider a Recovery Day.'
  if (weakest && weakest.rate < 0.5) return `${weakest.stat} was your weakest area (${Math.round(weakest.rate * 100)}%). Pick its easiest daily and do the minimum version every day this week.`
  if (weakening.length > 0) return `Bond weakening with ${weakening.slice(0, 2).join(' and ')}. Reach out early in the week.`
  if (r.completion >= 0.9) return 'Excellent week. If it felt easy, it may be time to raise a target or add a side quest.'
  const dropped = rated.find(s => s.previous !== null && s.rate < s.previous - 0.2)
  if (dropped) return `${dropped.stat} slipped compared with the week before. Put its daily first thing in the morning.`
  return 'Solid week. Keep the streaks going and pick one dreaded task to turn into a boss.'
}

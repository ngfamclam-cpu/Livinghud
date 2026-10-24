// Tomorrow's top 3: the goals you write for a day, whether you hit them, and
// the patterns over time. Derived from the `goals` log like everything else.

import { WEEKDAYS } from './journal'
import type { DayGoals } from './types'

export const GOALS_PER_DAY = 3

/** How writing goals clears "Plan tomorrow's top 3": all three = full, one or two = the minimum ("Top 1"). */
export function planVersion(texts: string[]): 'full' | 'min' | null {
  const n = texts.filter(t => t.trim()).length
  if (n >= GOALS_PER_DAY) return 'full'
  return n > 0 ? 'min' : null
}

/** Goals set for a day that weren't done, to offer carrying them over. */
export function unfinished(g: DayGoals | undefined): string[] {
  return g ? g.items.filter(i => !i.done && i.text.trim()).map(i => i.text) : []
}

const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, ' ')

export interface GoalStats {
  /** Days with goals, up to and including today. */
  days: number
  planned: number
  done: number
  /** Share of goals done, all time (0-1); null with nothing finished yet. */
  rate: number | null
  rate7: number | null
  rate30: number | null
  /** Days where every goal was done. */
  perfectDays: number
  /** Days in a row (ending today or yesterday) with goals set. */
  planStreak: number
  /** Share done per weekday (Monday first); null where there's no data. */
  byWeekday: (number | null)[]
  /** Goals that keep coming back (planned on 2+ days), most repeated first. */
  carried: { text: string; times: number; done: boolean }[]
}

/**
 * Patterns over finished days. Today counts toward totals only once it's over,
 * so an afternoon with goals still open doesn't drag the rate down.
 */
export function goalStats(list: DayGoals[], today: string, addDays: (d: string, n: number) => string): GoalStats {
  const past = list.filter(g => g.day < today && g.items.length > 0)
  const count = (gs: DayGoals[]) => {
    const planned = gs.reduce((n, g) => n + g.items.length, 0)
    const done = gs.reduce((n, g) => n + g.items.filter(i => i.done).length, 0)
    return { planned, done, rate: planned ? done / planned : null }
  }
  const all = count(past)
  const since = (n: number) => count(past.filter(g => g.day >= addDays(today, -n)))

  const weekday = Array.from({ length: 7 }, () => ({ planned: 0, done: 0 }))
  for (const g of past) {
    const [y, m, d] = g.day.split('-').map(Number)
    const w = (new Date(y, m - 1, d).getDay() + 6) % 7
    weekday[w].planned += g.items.length
    weekday[w].done += g.items.filter(i => i.done).length
  }

  const daysSet = new Set(list.filter(g => g.items.length > 0).map(g => g.day))
  let streak = 0
  let day = daysSet.has(today) ? today : addDays(today, -1)
  while (daysSet.has(day)) {
    streak++
    day = addDays(day, -1)
  }

  const seen = new Map<string, { text: string; days: Set<string>; done: boolean }>()
  for (const g of [...list].sort((a, b) => a.day.localeCompare(b.day))) {
    for (const i of g.items) {
      const key = norm(i.text)
      if (!key) continue
      const s = seen.get(key) ?? { text: i.text.trim(), days: new Set<string>(), done: false }
      s.days.add(g.day)
      s.done = i.done // the latest outcome
      seen.set(key, s)
    }
  }

  return {
    days: list.filter(g => g.day <= today && g.items.length > 0).length,
    planned: all.planned,
    done: all.done,
    rate: all.rate,
    rate7: since(7).rate,
    rate30: since(30).rate,
    perfectDays: past.filter(g => g.items.every(i => i.done)).length,
    planStreak: streak,
    byWeekday: weekday.map(w => (w.planned ? w.done / w.planned : null)),
    carried: [...seen.values()]
      .filter(s => s.days.size >= 2)
      .map(s => ({ text: s.text, times: s.days.size, done: s.done }))
      .sort((a, b) => b.times - a.times)
      .slice(0, 5),
  }
}

/** Best and worst weekday for getting goals done, when there's enough data (2+ weekdays). */
export function weekdayExtremes(byWeekday: (number | null)[]): { best: string; worst: string } | null {
  const known = byWeekday.map((r, i) => ({ r, i })).filter((x): x is { r: number; i: number } => x.r !== null)
  if (known.length < 2) return null
  const sorted = [...known].sort((a, b) => b.r - a.r)
  return { best: WEEKDAYS[sorted[0].i], worst: WEEKDAYS[sorted[sorted.length - 1].i] }
}

/** Goals whose text matches every word of a query, newest day first. */
export function searchGoals(list: DayGoals[], query: string): { day: string; text: string; done: boolean }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return [...list]
    .sort((a, b) => b.day.localeCompare(a.day))
    .flatMap(g => g.items.filter(i => words.every(w => i.text.toLowerCase().includes(w))).map(i => ({ day: g.day, text: i.text, done: i.done })))
}

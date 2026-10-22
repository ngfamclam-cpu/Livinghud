// The reflection journal: three prompts and two quick ratings a day, and the
// patterns that show up over time. No AI: just counting and averages.

import { addDays } from './time'
import type { Completion, JournalEntry } from './types'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/** Journal quest credit: all three prompts is the full quest, any one line the minimum. */
export function journalVersion(e: Pick<JournalEntry, 'wentWell' | 'drained' | 'adjust'>): 'full' | 'min' | null {
  const filled = [e.wentWell, e.drained, e.adjust].filter(t => t.trim()).length
  if (filled === 3) return 'full'
  return filled > 0 ? 'min' : null
}

const weekdayOf = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return (new Date(y, m - 1, d).getDay() + 6) % 7 // Monday = 0
}

const STOPWORDS = new Set(
  'about after again also because been being could didn doing done from have just like made make more much need only really should some than that their them then there they thing things this time today very want were what when which while with work would your'.split(' '),
)

export interface JournalPatterns {
  entries: number
  /** Days in a row with an entry, ending today or yesterday. */
  streak: number
  /** Average mood per weekday (Monday first); null where there are no entries. */
  moodByWeekday: (number | null)[]
  bestDay: string | null
  worstDay: string | null
  /** Most frequent words in "what drained me", last 30 days. */
  drains: { word: string; count: number }[]
  /** Average mood on days you cleared most of your dailies vs. the rest. */
  moodWhenProductive: number | null
  moodOtherwise: number | null
}

/**
 * Patterns across journal entries. `dailiesPerDay` is how many dailies were
 * active, so "productive" means clearing at least 80% of them that day.
 */
export function journalPatterns(entries: JournalEntry[], completions: Completion[], dailiesPerDay: number, today: string): JournalPatterns {
  const byDay = new Map(entries.map(e => [e.day, e]))

  let streak = 0
  let day = byDay.has(today) ? today : addDays(today, -1)
  while (byDay.has(day)) {
    streak++
    day = addDays(day, -1)
  }

  const sums = Array(7).fill(0)
  const counts = Array(7).fill(0)
  for (const e of entries) {
    const w = weekdayOf(e.day)
    sums[w] += e.mood
    counts[w]++
  }
  const moodByWeekday = sums.map((s, i) => (counts[i] ? s / counts[i] : null))
  const ranked = moodByWeekday.map((m, i) => ({ m, i })).filter(x => x.m !== null) as { m: number; i: number }[]
  ranked.sort((a, b) => a.m - b.m)
  const enough = ranked.length >= 2 && ranked[0].m !== ranked[ranked.length - 1].m

  const counted = new Map<string, number>()
  const monthAgo = addDays(today, -30)
  for (const e of entries.filter(e => e.day >= monthAgo)) {
    for (const word of e.drained.toLowerCase().match(/[a-z']+/g) ?? []) {
      const w = word.replace(/'s$/, '')
      if (w.length < 4 || STOPWORDS.has(w)) continue
      counted.set(w, (counted.get(w) ?? 0) + 1)
    }
  }
  const drains = [...counted.entries()]
    .filter(([, n]) => n >= 2)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 5)
    .map(([word, count]) => ({ word, count }))

  const doneOn = new Map<string, number>()
  for (const c of completions) doneOn.set(c.day, (doneOn.get(c.day) ?? 0) + 1)
  const productive: number[] = []
  const other: number[] = []
  for (const e of entries) {
    if (dailiesPerDay > 0 && (doneOn.get(e.day) ?? 0) >= 0.8 * dailiesPerDay) productive.push(e.mood)
    else other.push(e.mood)
  }
  const avg = (xs: number[]) => (xs.length >= 3 ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

  return {
    entries: entries.length,
    streak,
    moodByWeekday,
    bestDay: enough ? WEEKDAYS[ranked[ranked.length - 1].i] : null,
    worstDay: enough ? WEEKDAYS[ranked[0].i] : null,
    drains,
    moodWhenProductive: avg(productive),
    moodOtherwise: avg(other),
  }
}

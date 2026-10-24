// The reflection journal: three prompts and two quick ratings a day, and the
// patterns that show up over time. No AI: just counting and averages.

import { addDays } from './time'
import type { Completion, JournalEntry } from './types'

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

/**
 * Journal quest credit: all three prompts is the full quest, any one line the
 * minimum. The random question counts as a line too.
 */
export function journalVersion(e: Pick<JournalEntry, 'wentWell' | 'drained' | 'adjust'> & { promptAnswer?: string }): 'full' | 'min' | null {
  const filled = [e.wentWell, e.drained, e.adjust].filter(t => t.trim()).length
  if (filled === 3) return 'full'
  return filled > 0 || !!e.promptAnswer?.trim() ? 'min' : null
}

/**
 * The random question of the day, on top of the three standard prompts. Some
 * dig into how you feel, some into what you want, and some nudge you to start
 * tracking something new.
 */
export const REFLECTION_PROMPTS: string[] = [
  'What is one habit you wish you were already tracking?',
  'What did you put off today, and what is the smallest first step on it?',
  'What would make tomorrow a 9 out of 10?',
  'Who gave you energy today, and who took it?',
  'What are you avoiding thinking about?',
  'What did you learn today that you want to remember in a year?',
  'If today repeated every day for a year, where would you end up?',
  'What is one thing you could stop doing that would free up time?',
  'What small win are you not giving yourself credit for?',
  'What would the strongest version of you do differently tomorrow?',
  'What is a goal you keep mentioning but never start?',
  'When did you feel most like yourself today?',
  'What is one thing your body is asking for right now?',
  'What are you looking forward to this week? If nothing, what could you plan?',
  'What is a skill you want to be known for in a year?',
  'Who do you want to reconnect with, and what would you say?',
  'What drained your money today, and was it worth it?',
  'What would you try if you knew you could not fail?',
  'What is one rule you want to live by this month?',
  'What did your posture feel like today? When did you notice it?',
  'What experience do you want to have before the Asia trip?',
  'What is one thing you would tell yourself from a month ago?',
  'What is something you are proud of that nobody saw?',
  'What is the next big night or event worth saving for?',
  'What are you tolerating that you should change?',
  'What would make your mornings easier?',
  'Which daily quest feels pointless right now, and what would replace it?',
  'What is one number you want to improve, and how would you measure it?',
  'What did you do today that future you will thank you for?',
  'What is a new challenge you want to take on next week?',
]

/** Today's random question, the same on every device for the same day. */
export function dailyPrompt(day: string, seed: string): string {
  let h = 2166136261
  for (const ch of `${seed}:prompt:${day}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619)
  h ^= h >>> 13
  return REFLECTION_PROMPTS[(h >>> 0) % REFLECTION_PROMPTS.length]
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

// Penalty modes, worked out from your history from the day penalties were
// switched on (so earlier misses never count). Recovery Days are always safe.
// - Casual: nothing is lost; a missed day pauses a streak (up to 2 in a row).
// - Normal: streaks break, and each missed daily costs 5 XP.
// - Hardcore: 100 HP. Each missed daily costs 10 HP; a day with every daily done
//   heals 10. At 0 HP you lose $10 from that month's wallet and HP resets to 50.

import { addDays, daysBetween, monthOf } from './time'
import type { Difficulty } from './types'

export const NORMAL_XP_PER_MISS = 5
export const MAX_HP = 100
export const HP_PER_MISS = 10
export const HP_PER_CLEAN_DAY = 10
export const HP_AFTER_KNOCKOUT = 50
export const KNOCKOUT_DOLLARS = 10
export const LOW_HP = 30
/** Casual mode: missed days in a row a streak survives. */
export const CASUAL_PAUSE_DAYS = 2

export interface PenaltyInput {
  difficulty: Difficulty
  /** First game day penalties count. */
  since: string
  today: string
  /** Active dailies, with the game day each was added. */
  dailies: { id: string; since: string }[]
  /** Daily quest ids done on each day (full or minimum). */
  doneOn: Map<string, Set<string>>
  restDays: Set<string>
  /** Dollars earned per month, so a knockout can't take more than was earned. */
  earnedBy: Map<string, number>
}

export interface Penalties {
  xpLost: number
  dollarsLost: Map<string, number>
  /** Current HP in hardcore, otherwise null. */
  hp: number | null
  /** Hardcore knockouts: the day HP hit 0 and the dollars it actually took. */
  knockouts: { day: string; dollars: number }[]
  /** Dailies missed yesterday (0 if penalties weren't counting yet). */
  missedYesterday: number
}

export function penalties(i: PenaltyInput): Penalties {
  const result: Penalties = { xpLost: 0, dollarsLost: new Map(), hp: i.difficulty === 'hardcore' ? MAX_HP : null, knockouts: [], missedYesterday: 0 }
  const days = daysBetween(i.since, i.today)
  for (let n = 0; n < days; n++) {
    const day = addDays(i.since, n)
    if (i.restDays.has(day)) continue
    const due = i.dailies.filter(d => d.since <= day)
    if (due.length === 0) continue
    const done = i.doneOn.get(day) ?? new Set()
    const missed = due.filter(d => !done.has(d.id)).length
    if (day === addDays(i.today, -1)) result.missedYesterday = missed

    if (i.difficulty === 'normal') result.xpLost += missed * NORMAL_XP_PER_MISS
    if (i.difficulty === 'hardcore' && result.hp !== null) {
      result.hp = missed === 0 ? Math.min(MAX_HP, result.hp + HP_PER_CLEAN_DAY) : result.hp - missed * HP_PER_MISS
      if (result.hp <= 0) {
        const m = monthOf(day)
        const taken = result.dollarsLost.get(m) ?? 0
        const loss = Math.min(KNOCKOUT_DOLLARS, Math.max(0, (i.earnedBy.get(m) ?? 0) - taken))
        result.dollarsLost.set(m, taken + loss)
        result.knockouts.push({ day, dollars: loss })
        result.hp = HP_AFTER_KNOCKOUT
      }
    }
  }
  return result
}

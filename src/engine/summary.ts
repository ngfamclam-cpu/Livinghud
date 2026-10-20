// Everything on the HUD is derived from the completion log, never stored as
// running totals. Undo is just deleting a completion, nothing can drift, and
// syncing devices later only has to merge logs.

import { levelFromXp, type LevelInfo } from './leveling'
import { playerRank, type RewardRank } from './economy'
import { addDays, dayKey, daysBetween, monthOf } from './time'
import type { Completion, Player, Quest, StatKey } from './types'

export const STAT_WINDOW_DAYS = 30

export interface WalletSummary {
  month: string
  budget: number
  /** Earned this month, capped at the budget. */
  earned: number
  /** Overflow from every month beyond its budget, saved for A/S-rank rewards. */
  vault: number
}

export interface Summary {
  today: string
  totalXp: number
  level: LevelInfo
  wallet: WalletSummary
  /** 0-100 per stat: how that life area went over the last 30 days. */
  stats: Partial<Record<StatKey, number>>
  /** Share of dailies done over the last 30 days, 0-1. */
  completionRate: number
  rank: RewardRank
  todayDone: Map<string, Completion>
  streaks: Map<string, number>
}

const weight = (c: Completion) => (c.version === 'full' ? 1 : 0.5)

export function summarize(
  player: Player,
  quests: Quest[],
  completions: Completion[],
  now: Date,
): Summary {
  const today = dayKey(now, player.settings.resetHour)
  const startDay = dayKey(new Date(player.createdAt), player.settings.resetHour)
  const budget = player.settings.monthlyBudget

  const totalXp = completions.reduce((sum, c) => sum + c.xp, 0)

  // Wallet: each month caps at the budget, the rest goes to the Vault.
  const byMonth = new Map<string, number>()
  for (const c of completions) {
    const m = monthOf(c.day)
    byMonth.set(m, (byMonth.get(m) ?? 0) + c.dollars)
  }
  const month = monthOf(today)
  let vault = 0
  for (const total of byMonth.values()) vault += Math.max(0, total - budget)
  const wallet: WalletSummary = {
    month,
    budget,
    earned: round2(Math.min(budget, byMonth.get(month) ?? 0)),
    vault: round2(vault),
  }

  const todayDone = new Map<string, Completion>()
  for (const c of completions) if (c.day === today) todayDone.set(c.questId, c)

  // Rolling 30-day window. Past days count fully; today only counts what is
  // already done, so stats don't dip every morning before you start.
  const pastDays = Math.min(STAT_WINDOW_DAYS - 1, Math.max(0, daysBetween(startDay, today)))
  const windowStart = addDays(today, -pastDays)
  const dailies = quests.filter(q => q.kind === 'daily' && q.active)
  const inWindow = completions.filter(c => c.day >= windowStart && c.day <= today)

  const stats: Partial<Record<StatKey, number>> = {}
  let allDone = 0
  let allPossible = 0
  for (const stat of player.stats) {
    const statDailies = dailies.filter(q => q.stat === stat)
    const ids = new Set(statDailies.map(q => q.id))
    const done = inWindow.filter(c => ids.has(c.questId)).reduce((s, c) => s + weight(c), 0)
    const doneToday = statDailies.filter(q => todayDone.has(q.id)).length
    const possible = statDailies.length * pastDays + doneToday
    stats[stat] = possible > 0 ? Math.round((100 * Math.min(done, possible)) / possible) : 0
    allDone += done
    allPossible += possible
  }
  const completionRate = allPossible > 0 ? Math.min(1, allDone / allPossible) : 0

  const streaks = new Map<string, number>()
  for (const q of dailies) {
    const days = new Set(completions.filter(c => c.questId === q.id).map(c => c.day))
    let day = days.has(today) ? today : addDays(today, -1)
    let streak = 0
    while (days.has(day)) {
      streak++
      day = addDays(day, -1)
    }
    streaks.set(q.id, streak)
  }

  return {
    today,
    totalXp,
    level: levelFromXp(totalXp),
    wallet,
    stats,
    completionRate,
    rank: playerRank(completionRate),
    todayDone,
    streaks,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

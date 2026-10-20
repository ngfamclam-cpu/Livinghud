import type { CompletionVersion, Quest } from './types'

export const DAILY_XP = 20
/** The bad-day minimum version pays this share of the full quest. */
export const MIN_VERSION_SHARE = 0.5
/** Completion rate at which a month earns the whole budget. */
export const TARGET_COMPLETION = 0.8
export const DAYS_PER_MONTH = 30

/**
 * Dollars one full daily pays. Tuned so hitting ~80% of your dailies for a
 * month earns about your monthly budget.
 */
export function dailyPay(monthlyBudget: number, activeDailies: number): number {
  if (activeDailies <= 0) return 0
  const pay = monthlyBudget / (DAYS_PER_MONTH * TARGET_COMPLETION * activeDailies)
  return Math.round(pay * 100) / 100
}

export function questReward(
  quest: Pick<Quest, 'kind'>,
  version: CompletionVersion,
  monthlyBudget: number,
  activeDailies: number,
): { xp: number; dollars: number } {
  // Side and main quests arrive in Phase 2; only dailies pay for now.
  if (quest.kind !== 'daily') return { xp: 0, dollars: 0 }
  const share = version === 'full' ? 1 : MIN_VERSION_SHARE
  return {
    xp: Math.round(DAILY_XP * share),
    dollars: Math.round(dailyPay(monthlyBudget, activeDailies) * share * 100) / 100,
  }
}

export type RewardRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

/** Reward rank from its real price, matching the design doc's table. */
export function rewardRank(price: number): RewardRank {
  if (price < 10) return 'E'
  if (price < 30) return 'D'
  if (price < 75) return 'C'
  if (price < 200) return 'B'
  if (price < 500) return 'A'
  return 'S'
}

/** Player rank from the 30-day completion rate (0-1). */
export function playerRank(rate: number): RewardRank {
  if (rate >= 0.95) return 'S'
  if (rate >= 0.85) return 'A'
  if (rate >= 0.7) return 'B'
  if (rate >= 0.55) return 'C'
  if (rate >= 0.4) return 'D'
  return 'E'
}

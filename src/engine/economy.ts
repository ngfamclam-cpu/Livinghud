import type { CompletionVersion, Quest, QuestStage, Reward, RewardRank, SavingsGoal, SavingsEntry, StatKey } from './types'

export const DAILY_XP = 20
export const SIDE_XP = 40
/** The bad-day minimum version pays this share of the full quest. */
export const MIN_VERSION_SHARE = 0.5
/** Completion rate at which a month earns the whole budget. */
export const TARGET_COMPLETION = 0.8
export const DAYS_PER_MONTH = 30
/** A side quest pays this share of the monthly budget ($10 at $150). */
export const SIDE_PAY_SHARE = 1 / 15
/** Main quest stage pay is written for this budget and scaled to the player's. */
export const BASE_BUDGET = 150
/** CHA XP for going on a date bought from the shop. */
export const DATE_XP = 40

/**
 * Dollars one full daily pays. Tuned so hitting ~80% of your dailies for a
 * month earns about your monthly budget.
 */
export function dailyPay(monthlyBudget: number, activeDailies: number): number {
  if (activeDailies <= 0) return 0
  const pay = monthlyBudget / (DAYS_PER_MONTH * TARGET_COMPLETION * activeDailies)
  return round2(pay)
}

/**
 * What a quest pays. Dailies alone fill the wallet; side quests and main quest
 * stages pay on top, so their extra earnings overflow into the Vault.
 */
export function questReward(
  quest: Pick<Quest, 'kind'>,
  version: CompletionVersion,
  monthlyBudget: number,
  activeDailies: number,
  stage?: QuestStage,
): { xp: number; dollars: number } {
  const share = version === 'full' ? 1 : MIN_VERSION_SHARE
  switch (quest.kind) {
    case 'daily':
      return { xp: Math.round(DAILY_XP * share), dollars: round2(dailyPay(monthlyBudget, activeDailies) * share) }
    case 'side':
      return { xp: Math.round(SIDE_XP * share), dollars: round2(monthlyBudget * SIDE_PAY_SHARE * share) }
    case 'main':
      // A stage takes weeks, so it has no bad-day version: it is cleared or not.
      if (!stage) return { xp: 0, dollars: 0 }
      return { xp: stage.xp, dollars: round2((stage.basePay * monthlyBudget) / BASE_BUDGET) }
  }
}

export const REWARD_RANKS: RewardRank[] = ['E', 'D', 'C', 'B', 'A', 'S']

/** Reward rank from its real price, matching the design doc's table. */
export function rewardRank(price: number): RewardRank {
  if (price < 10) return 'E'
  if (price < 30) return 'D'
  if (price < 75) return 'C'
  if (price < 200) return 'B'
  if (price < 500) return 'A'
  return 'S'
}

/** Player level needed before a reward rank can be bought. */
export const RANK_MIN_LEVEL: Record<RewardRank, number> = { E: 1, D: 5, C: 10, B: 20, A: 35, S: 50 }

/** A and S rewards can only be paid for from the Vault. */
export const vaultOnly = (rank: RewardRank) => rank === 'A' || rank === 'S'

/** Player rank from the 30-day completion rate (0-1). */
export function playerRank(rate: number): RewardRank {
  if (rate >= 0.95) return 'S'
  if (rate >= 0.85) return 'A'
  if (rate >= 0.7) return 'B'
  if (rate >= 0.55) return 'C'
  if (rate >= 0.4) return 'D'
  return 'E'
}

// ---- Savings gate: pay yourself first ----

export interface SavingsStatus {
  saved: number
  income: number
  /** Dollars to save this month; 0 when the gate is off. */
  target: number
  met: boolean
}

export function savingsStatus(goal: SavingsGoal, entries: SavingsEntry[], month: string): SavingsStatus {
  let saved = 0
  let income = 0
  for (const e of entries) {
    if (e.day.slice(0, 7) !== month) continue
    if (e.kind === 'saved') saved += e.amount
    else income += e.amount
  }
  saved = round2(saved)
  income = round2(income)
  if (goal.type === 'off') return { saved, income, target: 0, met: true }
  if (goal.type === 'fixed') return { saved, income, target: goal.amount, met: saved >= goal.amount }
  // A percent goal needs this month's income logged before it can be met.
  const target = round2((goal.amount / 100) * income)
  return { saved, income, target, met: income > 0 && saved >= target }
}

// ---- The shop ----

export interface ShopContext {
  level: number
  stats: Partial<Record<StatKey, number>>
  /** Spendable this month. */
  wallet: number
  vault: number
  savingsMet: boolean
  mainQuestsCleared: number
}

export type BuyCheck =
  | { ok: true; fromWallet: number; fromVault: number }
  | { ok: false; reason: string }

/**
 * Whether a reward can be bought right now, and how it would be paid.
 * E-B rewards spend the wallet first and top up from the Vault; A and S spend only the Vault.
 */
export function checkPurchase(reward: Pick<Reward, 'price' | 'statGate'>, ctx: ShopContext): BuyCheck {
  const rank = rewardRank(reward.price)
  const minLevel = RANK_MIN_LEVEL[rank]
  if (ctx.level < minLevel) return { ok: false, reason: `Needs level ${minLevel}` }
  if (reward.statGate && (ctx.stats[reward.statGate.stat] ?? 0) < reward.statGate.min) {
    return { ok: false, reason: `Needs ${reward.statGate.stat} ${reward.statGate.min}` }
  }
  if (rank === 'S' && ctx.mainQuestsCleared < 1) return { ok: false, reason: 'Clear a main quest first' }
  if (!ctx.savingsMet) return { ok: false, reason: 'Savings goal not met' }

  const price = round2(reward.price)
  if (vaultOnly(rank)) {
    if (ctx.vault < price) return { ok: false, reason: `Vault needs $${(price - ctx.vault).toFixed(2)} more` }
    return { ok: true, fromWallet: 0, fromVault: price }
  }
  const fromWallet = round2(Math.min(Math.max(0, ctx.wallet), price))
  const fromVault = round2(price - fromWallet)
  if (fromVault > ctx.vault) {
    return { ok: false, reason: `Needs $${(fromVault - ctx.vault).toFixed(2)} more` }
  }
  return { ok: true, fromWallet, fromVault }
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

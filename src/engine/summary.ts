// Everything on the HUD is derived from the logs (completions, purchases,
// savings), never stored as running totals. Undo is just deleting a record,
// nothing can drift, and syncing devices later only has to merge logs.

import { levelFromXp, type LevelInfo } from './leveling'
import { playerRank, round2, savingsStatus, type SavingsStatus } from './economy'
import { addDays, dayKey, daysBetween, monthOf, weekOf } from './time'
import { dayExercises, planDay, playerPlan, progressionDue, raisePlan, routineDone, routineTargets, type RoutineTargets } from './workout'
import { partyBonds, type Bond } from './party'
import { BOSS_XP, bossStatus, type BossStatus } from './focus'
import { planStatus, type PlanStatus } from './plans'
import { CASUAL_PAUSE_DAYS, penalties, type Penalties } from './penalties'
import { TRAVEL_IDS, TRAVEL_XP, earnedBadges, longestStreak, streakBonuses, unlockedThemes, type Badge } from './badges'
import { travelCounts } from './memories'
import type { Memory, Place, Boss, Completion, Contact, DayKind, FocusRun, JournalEntry, Person, Plan, PlanFund, SurpriseClear, ExerciseSet, Player, Purchase, Quest, RewardRank, RoutineExercise, SavingsEntry, StatKey, TrainingPlan } from './types'

export const STAT_WINDOW_DAYS = 30

export interface WalletSummary {
  month: string
  budget: number
  /** Earned this month, capped at the budget. */
  earned: number
  /** Spent from the wallet this month. */
  spent: number
  /** Left to spend this month. */
  available: number
  /**
   * Overflow from every month beyond its budget, plus wallet money left unspent
   * when a month ends, minus Vault purchases and money set aside for plans.
   * The only way to pay for A/S rewards.
   */
  vault: number
  /** Vault money set aside in plans (raves, festivals, trips). */
  inPlans: number
  /** Average the Vault grew by in recent full months; null before the first month ends. */
  perMonth: number | null
}

export interface MainQuestProgress {
  /** Stages cleared, in order. */
  cleared: number
  /** The stage to work on next; null once every stage is cleared. */
  current: string | null
  done: boolean
}

export interface Summary {
  today: string
  week: string
  totalXp: number
  level: LevelInfo
  wallet: WalletSummary
  savings: SavingsStatus
  /** 0-100 per stat: how that life area went over the last 30 days. */
  stats: Partial<Record<StatKey, number>>
  /** Share of dailies done over the last 30 days, 0-1. */
  completionRate: number
  rank: RewardRank
  /** Dailies done today. */
  todayDone: Map<string, Completion>
  /** Side quests done this week. */
  weekDone: Map<string, Completion>
  /** Main quest progress by quest id. */
  mainProgress: Map<string, MainQuestProgress>
  mainQuestsCleared: number
  streaks: Map<string, number>
  /** Today is a Recovery Day: streaks are protected and missed dailies don't count. */
  recoveryToday: boolean
  /** Today's training: where the plan's cycle is, today's exercises, targets and logged progress. */
  routine: {
    plan: TrainingPlan
    kind: DayKind
    /** Position of today in plan.cycle. */
    index: number
    upcoming: DayKind[]
    exercises: (RoutineExercise & { part: 'workout' | 'posture' })[]
    targets: RoutineTargets
    done: RoutineTargets
  }
  /** Everyone in the Party list, most overdue first. */
  party: Bond[]
  /** Dreaded-task bosses with the damage they've taken. */
  bosses: BossStatus[]
  /** Minutes in focus sessions today. */
  focusToday: number
  /** Earned badges (titles). */
  badges: Badge[]
  /** Stats whose quests earn +10% XP while a 30-day streak holds. */
  streakBonus: Set<StatKey>
  /** Unlocked HUD themes (loot). */
  themes: string[]
  /** Penalty mode results; null when penalties are off or haven't started. */
  penalty: Penalties | null
  /** Recovery Days (from big-night rewards). */
  restDays: Set<string>
  /** Active plans (raves, festivals, trips), soonest first. */
  plans: PlanStatus[]
  /** Distinct places, cities and countries in the Life log. */
  travel: { places: number; cities: number; countries: number }
  /** The plan with raised targets the System offers after 3 clean weeks; null when not due. */
  routineOffer: TrainingPlan | null
}

export interface Logs {
  purchases?: Purchase[]
  savings?: SavingsEntry[]
  sets?: ExerciseSet[]
  people?: Person[]
  contacts?: Contact[]
  focusRuns?: FocusRun[]
  bosses?: Boss[]
  journal?: JournalEntry[]
  surprises?: SurpriseClear[]
  plans?: Plan[]
  planFunds?: PlanFund[]
  memories?: Memory[]
  places?: Place[]
}

const weight = (c: Completion) => (c.version === 'full' ? 1 : 0.5)

export function summarize(
  player: Player,
  quests: Quest[],
  completions: Completion[],
  now: Date,
  { purchases = [], savings = [], sets = [], people = [], contacts = [], focusRuns = [], bosses = [], journal = [], surprises = [], plans = [], planFunds = [], memories = [], places = [] }: Logs = {},
): Summary {
  const today = dayKey(now, player.settings.resetHour)
  const week = weekOf(today)
  const startDay = dayKey(new Date(player.createdAt), player.settings.resetHour)
  const budget = player.settings.monthlyBudget
  const month = monthOf(today)
  // A big night out grants a Recovery Day token for the next day.
  const recoveryDays = new Set(purchases.filter(p => p.special === 'bigNight').map(p => addDays(p.forDay ?? p.day, 1)))

  // Travel titles pay XP once each; they don't depend on level, so they're counted first.
  const travel = player.features?.memories !== false ? travelCounts(memories, places) : { places: 0, cities: 0, countries: 0 }
  const travelXp = earnedBadges({ level: 0, bestStreak: {}, currentStreak: {}, bossesDefeated: 0, focusMinutes: 0, journalEntries: 0, hangouts: 0, ...travel }).filter(b => TRAVEL_IDS.has(b.id)).length * TRAVEL_XP
  const rawXp =
    completions.reduce((sum, c) => sum + c.xp, 0) + purchases.reduce((sum, p) => sum + p.xp, 0) + contacts.reduce((sum, c) => sum + c.xp, 0) +
    focusRuns.reduce((sum, r) => sum + r.xp, 0) +
    bosses.filter(b => b.defeatedAt).length * BOSS_XP +
    surprises.reduce((sum, s) => sum + s.xp, 0) +
    travelXp

  // Wallet: each month caps at the budget and the overflow goes to the Vault.
  // When a month ends, whatever the wallet didn't spend rolls into the Vault too.
  const earnedBy = new Map<string, number>()
  for (const c of completions) earnedBy.set(monthOf(c.day), (earnedBy.get(monthOf(c.day)) ?? 0) + c.dollars)
  // Penalties (if on) come off XP and that month's earnings.
  const resetHour = player.settings.resetHour
  const doneOn = new Map<string, Set<string>>()
  for (const c of completions) {
    if (!doneOn.has(c.day)) doneOn.set(c.day, new Set())
    doneOn.get(c.day)!.add(c.questId)
  }
  const penalty =
    player.features?.penalties !== false && player.penaltiesSince
      ? penalties({
          difficulty: player.settings.difficulty,
          since: player.penaltiesSince,
          today,
          dailies: quests.filter(q => q.kind === 'daily' && q.active).map(q => ({ id: q.id, since: dayKey(new Date(q.createdAt), resetHour) })),
          doneOn,
          restDays: recoveryDays,
          earnedBy,
        })
      : null
  for (const [m, lost] of penalty?.dollarsLost ?? []) earnedBy.set(m, (earnedBy.get(m) ?? 0) - lost)
  const totalXp = Math.max(0, rawXp - (penalty?.xpLost ?? 0))

  const spentBy = new Map<string, number>()
  let vaultSpent = 0
  for (const p of purchases) {
    spentBy.set(monthOf(p.day), (spentBy.get(monthOf(p.day)) ?? 0) + p.fromWallet)
    vaultSpent += p.fromVault
  }
  let vault = -vaultSpent
  const inflow: number[] = []
  for (const [m, total] of [...earnedBy].sort()) {
    const overflow = Math.max(0, total - budget)
    const rollover = m < month ? Math.max(0, Math.min(budget, total) - (spentBy.get(m) ?? 0)) : 0
    vault += overflow + rollover
    if (m < month && m >= monthOf(startDay)) inflow.push(overflow + rollover)
  }
  const recent = inflow.slice(-3)
  const inPlans = Math.max(0, planFunds.reduce((sum, f) => sum + f.amount, 0))
  const earned = round2(Math.min(budget, earnedBy.get(month) ?? 0))
  const spent = round2(spentBy.get(month) ?? 0)
  const wallet: WalletSummary = {
    month,
    budget,
    earned,
    spent,
    available: round2(Math.max(0, earned - spent)),
    vault: round2(Math.max(0, vault - inPlans)),
    inPlans: round2(inPlans),
    perMonth: recent.length ? round2(recent.reduce((a, b) => a + b, 0) / recent.length) : null,
  }


  const byId = new Map(quests.map(q => [q.id, q]))
  const todayDone = new Map<string, Completion>()
  const weekDone = new Map<string, Completion>()
  const stagesDone = new Map<string, Set<string>>()
  for (const c of completions) {
    const kind = byId.get(c.questId)?.kind
    if (kind === 'daily' && c.day === today) todayDone.set(c.questId, c)
    if (kind === 'side' && weekOf(c.day) === week) weekDone.set(c.questId, c)
    if (kind === 'main' && c.stageId) {
      if (!stagesDone.has(c.questId)) stagesDone.set(c.questId, new Set())
      stagesDone.get(c.questId)!.add(c.stageId)
    }
  }

  const mainProgress = new Map<string, MainQuestProgress>()
  let mainQuestsCleared = 0
  for (const q of quests) {
    if (q.kind !== 'main') continue
    const stages = q.stages ?? []
    const doneIds = stagesDone.get(q.id) ?? new Set()
    const cleared = stages.filter(s => doneIds.has(s.id)).length
    const current = stages.find(s => !doneIds.has(s.id))?.id ?? null
    const done = stages.length > 0 && current === null
    if (done) mainQuestsCleared++
    mainProgress.set(q.id, { cleared, current, done })
  }

  const dailies = quests.filter(q => q.kind === 'daily' && q.active)
  const { stats, completionRate } = statScores(player, dailies, completions, recoveryDays, today, startDay)

  // Streaks count back from today (or yesterday if today isn't done yet).
  // A Recovery Day neither breaks a streak nor adds to it.
  const streaks = new Map<string, number>()
  const casualPause = !!penalty && player.settings.difficulty === 'casual'
  for (const q of dailies) {
    const days = new Set(completions.filter(c => c.questId === q.id).map(c => c.day))
    let day = days.has(today) ? today : addDays(today, -1)
    let streak = 0
    let gap = 0
    for (let guard = 0; guard < 3650; guard++) {
      if (days.has(day)) {
        streak++
        gap = 0
      } else if (!recoveryDays.has(day)) {
        // Casual mode pauses a streak over a couple of missed days instead of breaking it.
        if (!casualPause || day < (player.penaltiesSince ?? today) || ++gap > CASUAL_PAUSE_DAYS) break
      }
      day = addDays(day, -1)
    }
    streaks.set(q.id, streak)
  }

  // Badges: best-ever and current streak per stat, from every daily of that stat.
  const bestStreak: Partial<Record<StatKey, number>> = {}
  const currentStreak: Partial<Record<StatKey, number>> = {}
  for (const q of dailies) {
    const days = new Set(completions.filter(c => c.questId === q.id).map(c => c.day))
    bestStreak[q.stat] = Math.max(bestStreak[q.stat] ?? 0, longestStreak(days, recoveryDays, addDays))
    currentStreak[q.stat] = Math.max(currentStreak[q.stat] ?? 0, streaks.get(q.id) ?? 0)
  }
  const level = levelFromXp(totalXp)
  const badgeInput = {
    level: level.level,
    bestStreak,
    currentStreak,
    bossesDefeated: bosses.filter(b => b.defeatedAt).length,
    focusMinutes: focusRuns.reduce((sum, r) => sum + r.minutes, 0),
    journalEntries: journal.length,
    hangouts: contacts.filter(c => c.kind === 'hangout').length,
    ...travel,
  }

  const plan = playerPlan(player, startDay)
  const routineQuestIds = new Set(quests.filter(q => q.templateId === 'str-routine').map(q => q.id))
  const routineDone_ = completions.filter(c => routineQuestIds.has(c.questId))
  const trainedDays = new Set(routineDone_.map(c => c.day))
  const routineFullDays = new Set(routineDone_.filter(c => c.version === 'full').map(c => c.day))
  const { kind, index, upcoming } = planDay(plan, trainedDays, today)
  const exercises = dayExercises(plan, kind)

  return {
    today,
    week,
    totalXp,
    level,
    badges: earnedBadges(badgeInput),
    streakBonus: streakBonuses(badgeInput),
    themes: unlockedThemes(badgeInput),
    penalty,
    restDays: recoveryDays,
    plans: plans
      .filter(p => p.status === 'active')
      .map(p => planStatus(p, planFunds, purchases, today, wallet.perMonth))
      .sort((a, b) => (a.plan.date || '9999').localeCompare(b.plan.date || '9999')),
    wallet,
    savings: savingsStatus(player.settings.savingsGoal, savings, month),
    stats,
    completionRate,
    rank: playerRank(completionRate),
    todayDone,
    weekDone,
    mainProgress,
    mainQuestsCleared,
    streaks,
    recoveryToday: recoveryDays.has(today),
    routine: { plan, kind, index, upcoming, exercises, targets: routineTargets(exercises), done: routineDone(sets, today) },
    bosses: bossStatus(bosses, focusRuns),
    focusToday: focusRuns.filter(r => r.day === today).reduce((sum, r) => sum + r.minutes, 0),
    party: partyBonds(people, contacts, today, at => dayKey(new Date(at), player.settings.resetHour)),
    travel,
    routineOffer: progressionDue(routineFullDays, recoveryDays, today, player.routineReviewedOn) ? raisePlan(plan) : null,
  }
}

/**
 * 0-100 per stat over the rolling 30-day window ending on `today`. Past days
 * count fully; `today` only counts what is already done, so stats don't dip
 * every morning before you start. Recovery Days are skipped, so a planned rest
 * never lowers a stat. Also used to draw stat history (each past day as "today").
 */
export function statScores(
  player: Pick<Player, 'stats'>,
  dailies: Quest[],
  completions: Completion[],
  recoveryDays: Set<string>,
  today: string,
  startDay: string,
): { stats: Partial<Record<StatKey, number>>; completionRate: number } {
  const pastDays = Math.min(STAT_WINDOW_DAYS - 1, Math.max(0, daysBetween(startDay, today)))
  const windowStart = addDays(today, -pastDays)
  let restDays = 0
  for (const d of recoveryDays) if (d >= windowStart && d < today) restDays++
  const countedDays = pastDays - restDays
  const inWindow = completions.filter(c => c.day >= windowStart && c.day <= today)
  const doneToday = new Set(inWindow.filter(c => c.day === today).map(c => c.questId))

  const stats: Partial<Record<StatKey, number>> = {}
  let allDone = 0
  let allPossible = 0
  for (const stat of player.stats) {
    const statDailies = dailies.filter(q => q.stat === stat)
    const ids = new Set(statDailies.map(q => q.id))
    const done = inWindow.filter(c => ids.has(c.questId)).reduce((s, c) => s + weight(c), 0)
    const possible = statDailies.length * countedDays + statDailies.filter(q => doneToday.has(q.id)).length
    const counted = Math.min(done, possible)
    stats[stat] = possible > 0 ? Math.round((100 * counted) / possible) : 0
    allDone += counted
    allPossible += possible
  }
  return { stats, completionRate: allPossible > 0 ? Math.min(1, allDone / allPossible) : 0 }
}

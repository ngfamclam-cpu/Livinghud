// Incentives beyond XP loss.
//  Carrots: a perfect-day chest (every daily done), a combo meter (perfect days
//  in a row multiply quest XP), card packs at combo milestones, secret card
//  series that unlock at long combos, and Shields earned by perfect weeks.
//  Stick: the Penalty Quest. Miss too many dailies (you set how many) and the
//  next day brings a mandatory quest from your own "things I hate doing" menu.
//  Until it's done the Shop is locked (and, if you set it up, MacroDroid locks
//  your games). A Shield cancels one.
// Everything is derived from the completion log; only clears and shield uses
// are stored. XP only, never dollars, so the $150 budget stays balanced.

import { addDays, daysBetween, weekOf } from './time'

export const COMBO_STEP = 0.1
export const COMBO_MAX = 2
/** XP for each perfect day (on top of the dailies themselves). */
export const PERFECT_DAY_XP = 25
/** Card packs drop when the combo reaches these days. */
export const PACK_MILESTONES = [3, 7, 14, 30]
export const PACK_SIZE = 3
/** Secret series that can only drop once your best combo reaches these. */
export const SECRET_UNLOCKS: { series: string; combo: number }[] = [
  { series: 'eclipse', combo: 7 },
  { series: 'zenith', combo: 30 },
]

/** Default things-I-hate list for Penalty Quests (you edit it in Settings). */
export const DEFAULT_PENALTY_MENU = [
  'Take a 2-minute cold shower',
  'Deep-clean the bathroom',
  '100 burpees (split into sets if you need to)',
  'One full hour with your phone in another room',
  'Do the most boring chore you have been avoiding',
  'Walk 5 km, no music',
  'Write 300 words on why you skipped your quests',
  'No games or social media until bedtime',
]

export interface IncentiveSettings {
  /** Missed dailies in one day that trigger a Penalty Quest the next day (1-5). */
  threshold: number
  menu: string[]
  /** Lock the Shop while a Penalty Quest is open. */
  lockShop: boolean
  /** The day these rules started: nothing before it counts. */
  since: string
}

export const defaultIncentives = (since: string): IncentiveSettings => ({ threshold: 2, menu: DEFAULT_PENALTY_MENU, lockShop: true, since })

export interface DailyRef {
  id: string
  /** First game day it was due. */
  since: string
}

export interface PlayLog {
  dailies: DailyRef[]
  /** Quest ids completed on each game day. */
  doneOn: Map<string, Set<string>>
  restDays: Set<string>
}

const due = (log: PlayLog, day: string) => log.dailies.filter(d => d.since <= day)

/** Every daily due that day was done (minimum versions count). */
export function isPerfect(log: PlayLog, day: string): boolean {
  const list = due(log, day)
  if (list.length === 0) return false
  const done = log.doneOn.get(day)
  return !!done && list.every(d => done.has(d.id))
}

/** Dailies due but not done on a day (0 on Recovery Days). */
export function missedOn(log: PlayLog, day: string): number {
  if (log.restDays.has(day)) return 0
  const done = log.doneOn.get(day) ?? new Set()
  return due(log, day).filter(d => !done.has(d.id)).length
}

/**
 * Perfect days in a row, ending today if today is already perfect (else
 * yesterday). Recovery Days neither add to it nor break it.
 */
export function combo(log: PlayLog, today: string, start: string): number {
  let day = isPerfect(log, today) ? today : addDays(today, -1)
  let n = 0
  for (let guard = 0; guard < 3650 && day >= start; guard++) {
    if (isPerfect(log, day)) n++
    else if (!log.restDays.has(day)) break
    day = addDays(day, -1)
  }
  return n
}

export function bestCombo(log: PlayLog, today: string, start: string): number {
  let best = 0
  let run = 0
  for (let day = start; day <= today; day = addDays(day, 1)) {
    if (isPerfect(log, day)) best = Math.max(best, ++run)
    else if (!log.restDays.has(day) && day !== today) run = 0
  }
  return best
}

export const comboMultiplier = (n: number) => Math.min(COMBO_MAX, 1 + COMBO_STEP * n)

export function perfectDays(log: PlayLog, from: string, to: string): string[] {
  const out: string[] = []
  for (let day = from; day <= to; day = addDays(day, 1)) if (isPerfect(log, day)) out.push(day)
  return out
}

/** The milestone a combo just reached (going from `before` to `after`), if any. */
export function packMilestone(before: number, after: number): number | null {
  return PACK_MILESTONES.find(m => before < m && after >= m) ?? null
}

/** Secret series your best combo has unlocked. */
export function unlockedSecrets(best: number): Set<string> {
  return new Set(SECRET_UNLOCKS.filter(s => best >= s.combo).map(s => s.series))
}

/**
 * Shields earned: one per finished Monday-to-Sunday week (from `since`) where
 * every day was perfect or a Recovery Day, with at least one perfect day.
 */
export function shieldsEarned(log: PlayLog, today: string, since: string): number {
  let n = 0
  let week = weekOf(since)
  if (week < since) week = addDays(week, 7)
  for (; addDays(week, 6) < today; week = addDays(week, 7)) {
    let perfect = 0
    let ok = true
    for (let i = 0; i < 7; i++) {
      const day = addDays(week, i)
      if (isPerfect(log, day)) perfect++
      else if (!log.restDays.has(day)) {
        ok = false
        break
      }
    }
    if (ok && perfect > 0) n++
  }
  return n
}

/** Days (up to today) that carry a Penalty Quest: the day after missing `threshold`+ dailies. */
export function penaltyDays(log: PlayLog, settings: IncentiveSettings, today: string): string[] {
  const out: string[] = []
  for (let day = addDays(settings.since, 1); day <= today; day = addDays(day, 1)) {
    if (missedOn(log, addDays(day, -1)) >= Math.max(1, settings.threshold)) out.push(day)
  }
  return out
}

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  return h >>> 0
}

/** The penalty task for a day, picked from your menu (the same on every device). */
export function penaltyTask(day: string, seed: string, menu: string[]): string {
  const list = menu.filter(m => m.trim())
  const pool = list.length ? list : DEFAULT_PENALTY_MENU
  return pool[hash(`${seed}:penalty:${day}`) % pool.length]
}

export interface PenaltyClear {
  /** The Penalty Quest's day. */
  day: string
  kind: 'done' | 'shield'
}

export interface IncentiveState {
  combo: number
  bestCombo: number
  multiplier: number
  perfectToday: boolean
  perfectDayCount: number
  /** XP from perfect days (XP only). */
  perfectXp: number
  shields: number
  /** The oldest Penalty Quest still open, if any. */
  penalty: { day: string; task: string; missed: number; daysOpen: number } | null
  secrets: Set<string>
}

export function incentiveState(log: PlayLog, settings: IncentiveSettings, clears: PenaltyClear[], today: string, seed: string, penaltiesOn: boolean): IncentiveState {
  const start = settings.since
  const c = combo(log, today, start)
  const best = bestCombo(log, today, start)
  const perfect = perfectDays(log, start, today)
  const cleared = new Set(clears.map(x => x.day))
  const open = penaltiesOn ? penaltyDays(log, settings, today).filter(d => !cleared.has(d)) : []
  const first = open[0]
  return {
    combo: c,
    bestCombo: best,
    multiplier: comboMultiplier(c),
    perfectToday: isPerfect(log, today),
    perfectDayCount: perfect.length,
    perfectXp: perfect.length * PERFECT_DAY_XP,
    shields: Math.max(0, shieldsEarned(log, today, start) - clears.filter(x => x.kind === 'shield').length),
    penalty: first ? { day: first, task: penaltyTask(first, seed, settings.menu), missed: missedOn(log, addDays(first, -1)), daysOpen: daysBetween(first, today) } : null,
    secrets: unlockedSecrets(best),
  }
}

/** Why the Shop is locked, if an open Penalty Quest locks it. */
export function shopLock(state: IncentiveState | null, settings: IncentiveSettings | undefined, penaltyQuestOn: boolean): string | null {
  if (!penaltyQuestOn || !state?.penalty || settings?.lockShop === false) return null
  return 'Clear your Penalty Quest first'
}

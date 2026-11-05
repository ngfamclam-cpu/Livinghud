// Surprise rewards (owner's picks, Nov 2026): the Golden Quest, Red Gates, the
// perfect-day Lucky Roll, foil cards, name plates, the companion, treat coupons,
// wildcards, hidden achievements, and Job Changes that raise the Shadow Legion.
// Everything here is pure and derived; the few things that are earned at a
// moment (a roll, a coupon, a wildcard, a job change) are BonusRecords in the
// save. They pay XP, cards and coupons, and (owner's call, Nov 2026) real
// dollars too: the better the reward, the more it pays (EXTRA_PAY). Those
// dollars land in the month's wallet like quest pay, so past the budget they
// overflow into the Vault.
// Original names throughout (the look is inspired by Solo Leveling, not copied).

import { addDays } from './time'
import type { Boss, Completion, LootDrop, Quest } from './types'

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return (h ^ (h >>> 15)) >>> 0
}
const unit = (text: string) => hash(text) / 4294967296
const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}
const startOfDay = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).getTime()
}

/** Saved moments: rolls, Red Gate clears, coupons (earned and used), wildcards (earned and used), job changes. */
export type BonusKind = 'roll' | 'gate' | 'coupon' | 'coupon-use' | 'wildcard' | 'wildcard-use' | 'job' | 'hidden'

export interface BonusRecord {
  id: string
  userId: string
  kind: BonusKind
  /** Game day it happened (for wildcard-use: the day it saved). */
  day: string
  /** What earned it, so undo can take it back (e.g. "gate-2026-11-05"). */
  sourceId: string
  /** roll: the number; coupon: the coupon id; coupon-use: the coupon record id; job: the job id. */
  value: string
  /** wildcard-use: the daily it saved. */
  questId?: string
  createdAt: number
}

// ---- Dollar pay ----

/**
 * What each reward pays at the default $150 budget (scaled to your budget):
 * better rewards pay more. Golden Quest pay is added to that completion.
 */
export const EXTRA_PAY = {
  golden: 2,
  gate: 3,
  perfect: 1,
  hidden: 1,
  job: { shadowcaller: 10, 'legion-captain': 20, 'night-sovereign': 30 } as Record<string, number>,
}

/** The Lucky Roll pays by how high you roll (a 1 pays nothing). */
export function rollPay(n: number): number {
  if (n <= 1) return 0
  if (n <= 9) return 0.5
  if (n <= 15) return 1
  if (n <= 17) return 2
  if (n <= 19) return 3
  return 5
}

/** Scales a $150-budget amount to your monthly budget, to the cent. */
export const scalePay = (amount: number, budget: number) => Math.round(amount * (budget / 150) * 100) / 100

/**
 * Bonus dollars per game day from rolls, Red Gates, perfect-day chests, hidden
 * achievements and Job Changes (Golden Quest pay is already on its completion).
 */
export function extraDollarsByDay(bonuses: BonusRecord[], perfectDays: string[], budget: number, legionOn: boolean): Map<string, number> {
  const out = new Map<string, number>()
  const add = (day: string, amount: number) => out.set(day, (out.get(day) ?? 0) + scalePay(amount, budget))
  for (const b of bonuses) {
    if (b.kind === 'roll') add(b.day, rollPay(Number(b.value)))
    if (b.kind === 'gate') add(b.day, EXTRA_PAY.gate)
    if (b.kind === 'hidden') add(b.day, EXTRA_PAY.hidden)
    if (b.kind === 'job' && legionOn) add(b.day, EXTRA_PAY.job[b.value] ?? 0)
  }
  for (const d of perfectDays) add(d, EXTRA_PAY.perfect)
  return out
}

// ---- Golden Quest ----

export const GOLDEN_XP_MULT = 3

/** Today's Golden Quest: one active daily, picked fresh every day. */
export function goldenQuestId(seed: string, day: string, dailies: Quest[]): string | null {
  const list = [...dailies].sort((a, b) => a.id.localeCompare(b.id))
  return list.length ? list[hash(`${seed}:golden:${day}`) % list.length].id : null
}

// ---- Red Gate ----

export const GATE_MINUTES = 120
export const GATE_NEEDED = 3
export const GATE_XP = 40

export interface RedGate {
  day: string
  opensAt: number
  closesAt: number
}

/** About every other day a Red Gate opens at a random time while you're awake. */
export function redGate(seed: string, day: string, wakeTime: string, bedTime: string): RedGate | null {
  if (unit(`${seed}:gate:${day}`) >= 0.5) return null
  const wake = minutesOf(wakeTime)
  let bed = minutesOf(bedTime)
  if (bed <= wake) bed += 24 * 60
  const from = wake + 120
  const to = Math.max(from + 30, bed - 180)
  const at = from + Math.floor(unit(`${seed}:gate-time:${day}`) * (to - from))
  const opensAt = startOfDay(day) + at * 60_000
  return { day, opensAt, closesAt: opensAt + GATE_MINUTES * 60_000 }
}

/** Dailies cleared while the gate was open. */
export function gateCount(gate: RedGate, completions: Completion[], dailyIds: Set<string>): number {
  return completions.filter(c => c.day === gate.day && dailyIds.has(c.questId) && c.createdAt >= gate.opensAt && c.createdAt < gate.closesAt).length
}

// ---- Lucky Roll (after a perfect day) ----

/** The d20 for a perfect day. Fixed per day, so it can't be re-rolled. */
export const luckyRoll = (seed: string, day: string) => 1 + (hash(`${seed}:roll:${day}`) % 20)

export interface RollReward {
  xp: number
  card: 'rare' | 'legendary' | null
  coupon: boolean
  wildcard: boolean
  cursed: boolean
  text: string
}

export function rollReward(n: number): RollReward {
  if (n === 1) return { xp: 5, card: null, coupon: false, wildcard: false, cursed: true, text: 'Critical fail. Cursed by the Dice for the rest of the day (+5 XP for bravery).' }
  if (n <= 9) return { xp: 10, card: null, coupon: false, wildcard: false, cursed: false, text: '+10 XP.' }
  if (n <= 15) return { xp: 25, card: null, coupon: false, wildcard: false, cursed: false, text: '+25 XP.' }
  if (n <= 17) return { xp: 40, card: null, coupon: true, wildcard: false, cursed: false, text: '+40 XP and a treat coupon.' }
  if (n <= 19) return { xp: 50, card: 'rare', coupon: false, wildcard: true, cursed: false, text: '+50 XP, a Rare card and a wildcard.' }
  return { xp: 100, card: 'legendary', coupon: true, wildcard: false, cursed: false, text: 'NATURAL 20. +100 XP, a Legendary card and a treat coupon.' }
}

// ---- Foil cards ----

export const FOIL_CHANCE = 1 / 15
export const foilFor = (seed: string, sourceId: string) => unit(`${seed}:foil:${sourceId}`) < FOIL_CHANCE

// ---- Treat coupons (real life, honour system) ----

export interface Coupon {
  id: string
  name: string
  /** A lazy-day coupon makes today a Recovery Day in the game too. */
  recovery?: boolean
}

export const COUPONS: Coupon[] = [
  { id: 'takeout', name: 'Guilt-free takeout night' },
  { id: 'sleep-in', name: 'Sleep in tomorrow, alarm off' },
  { id: 'skip-chore', name: 'Skip one chore' },
  { id: 'gaming', name: 'A guilt-free gaming hour' },
  { id: 'dessert', name: 'Dessert, no questions asked' },
  { id: 'movie', name: 'Movie night, your pick' },
  { id: 'spa', name: 'A long bath or spa hour' },
  { id: 'nap', name: 'An afternoon nap' },
  { id: 'lazy-day', name: 'Lazy day: today becomes a Recovery Day', recovery: true },
]
export const couponById = (id: string) => COUPONS.find(c => c.id === id)

/** Which coupon a source gives (lazy days are rarer than the rest). */
export function couponFor(seed: string, sourceId: string): Coupon {
  const r = unit(`${seed}:coupon:${sourceId}`)
  if (r < 0.06) return COUPONS.find(c => c.id === 'lazy-day')!
  const pool = COUPONS.filter(c => !c.recovery)
  return pool[hash(`${seed}:coupon-pick:${sourceId}`) % pool.length]
}

/** Chance a source gives a coupon (rolls decide their own). */
export const COUPON_CHANCE = { perfect: 0.25, gate: 0.5, golden: 0.25 } as const
export const rollsCoupon = (seed: string, source: keyof typeof COUPON_CHANCE, sourceId: string) => unit(`${seed}:coupon-chance:${sourceId}`) < COUPON_CHANCE[source]

/** Red Gates sometimes leave a wildcard behind. */
export const gateWildcard = (seed: string, day: string) => unit(`${seed}:gate-wild:${day}`) < 0.2

// ---- Wildcards ----

export interface WildcardOffer {
  questId: string
  /** The missed day it would save (yesterday). */
  day: string
  /** The streak it would keep. */
  streak: number
}

/**
 * Dailies you missed yesterday that had a streak of 3+ going before that: a
 * wildcard can save yesterday so the streak carries on.
 */
export function wildcardOffers(dailies: Quest[], completions: Completion[], today: string, restDays: Set<string>, saved: Set<string>, startDay: string): WildcardOffer[] {
  const yesterday = addDays(today, -1)
  if (restDays.has(yesterday) || yesterday < startDay) return []
  const out: WildcardOffer[] = []
  for (const q of dailies) {
    const days = new Set(completions.filter(c => c.questId === q.id).map(c => c.day))
    if (days.has(yesterday) || saved.has(`${q.id}:${yesterday}`)) continue
    let streak = 0
    let d = addDays(yesterday, -1)
    for (let guard = 0; guard < 3650; guard++) {
      if (days.has(d)) streak++
      else if (!restDays.has(d) && !saved.has(`${q.id}:${d}`)) break
      d = addDays(d, -1)
    }
    if (streak >= 3) out.push({ questId: q.id, day: yesterday, streak })
  }
  return out
}

// ---- Name plates and auras ----

export interface PlateInput {
  level: number
  bestCombo: number
  gatesCleared: number
  jobs: Set<string>
}

export interface Plate {
  id: string
  name: string
  unlock: string
  earned: (i: PlateInput) => boolean
}

export const PLATES: Plate[] = [
  { id: 'plain', name: 'Plain', unlock: 'Starting plate', earned: () => true },
  { id: 'glow', name: 'System Glow', unlock: 'Reach level 5', earned: i => i.level >= 5 },
  { id: 'neon', name: 'Neon Pulse', unlock: 'A 7-day combo', earned: i => i.bestCombo >= 7 },
  { id: 'gold', name: 'Gilded', unlock: 'Reach level 15', earned: i => i.level >= 15 },
  { id: 'glitch', name: 'Glitch', unlock: 'Clear 3 Red Gates', earned: i => i.gatesCleared >= 3 },
  { id: 'shadow', name: 'Shadow Aura', unlock: 'Become a Shadowcaller', earned: i => i.jobs.has('shadowcaller') },
  { id: 'aurora', name: 'Aurora', unlock: 'Reach level 30', earned: i => i.level >= 30 },
  { id: 'sovereign', name: 'Sovereign Flame', unlock: 'Become a Night Sovereign', earned: i => i.jobs.has('night-sovereign') },
]

// ---- Companion ----

export interface CompanionStage {
  id: string
  name: string
  /** Best combo needed. */
  combo: number
}

export const COMPANION_STAGES: CompanionStage[] = [
  { id: 'egg', name: 'Egg', combo: 0 },
  { id: 'hatchling', name: 'Hatchling', combo: 1 },
  { id: 'sprite', name: 'Sprite', combo: 3 },
  { id: 'wisp', name: 'Wisp', combo: 7 },
  { id: 'drake', name: 'Drake', combo: 14 },
  { id: 'elder', name: 'Elder', combo: 30 },
]

export type CompanionMood = 'happy' | 'calm' | 'sulky'

export function companionState(bestCombo: number, doneToday: number, dailiesToday: number, missedYesterday: number) {
  const stage = [...COMPANION_STAGES].reverse().find(s => bestCombo >= s.combo)!
  const next = COMPANION_STAGES.find(s => s.combo > bestCombo) ?? null
  const mood: CompanionMood = dailiesToday > 0 && doneToday >= dailiesToday ? 'happy' : missedYesterday > 0 && doneToday === 0 ? 'sulky' : doneToday > 0 ? 'happy' : 'calm'
  return { stage, next, mood }
}

// ---- Job Changes and the Shadow Legion ----

export interface JobInput {
  level: number
  perfectDays: number
  sideClears: number
  bestCombo: number
  soldiers: number
  bossesDefeated: number
  mainsCleared: number
}

export interface Job {
  id: string
  title: string
  level: number
  xp: number
  blurb: string
  trial: { label: string; done: (i: JobInput) => boolean }[]
}

export const JOBS: Job[] = [
  {
    id: 'shadowcaller',
    title: 'Shadowcaller',
    level: 10,
    xp: 100,
    blurb: 'Your first Job Change. You learn to raise shadows: every quest you clear from now on feeds your Shadow Legion.',
    trial: [
      { label: 'Reach level 10', done: i => i.level >= 10 },
      { label: '3 perfect days', done: i => i.perfectDays >= 3 },
      { label: 'Clear 5 side quests', done: i => i.sideClears >= 5 },
    ],
  },
  {
    id: 'legion-captain',
    title: 'Legion Captain',
    level: 25,
    xp: 200,
    blurb: 'Your shadows answer to a rank now. Every fourth soldier you raise is a veteran.',
    trial: [
      { label: 'Reach level 25', done: i => i.level >= 25 },
      { label: 'A 7-day combo', done: i => i.bestCombo >= 7 },
      { label: 'Raise 20 soldiers', done: i => i.soldiers >= 20 },
    ],
  },
  {
    id: 'night-sovereign',
    title: 'Night Sovereign',
    level: 40,
    xp: 300,
    blurb: 'The final Job Change. Your Legion marches under a crown of night.',
    trial: [
      { label: 'Reach level 40', done: i => i.level >= 40 },
      { label: 'A 14-day combo', done: i => i.bestCombo >= 14 },
      { label: 'Defeat 3 bosses or clear 2 main quests', done: i => i.bossesDefeated >= 3 || i.mainsCleared >= 2 },
      { label: 'Raise 60 soldiers', done: i => i.soldiers >= 60 },
    ],
  },
]
export const jobById = (id: string) => JOBS.find(j => j.id === id)

/** Quests cleared per new soldier. */
export const QUESTS_PER_SOLDIER = 5
const SOLDIER_KINDS = ['Footman', 'Archer', 'Spearman', 'Mage', 'Hound', 'Rider'] as const
export type SoldierKind = (typeof SOLDIER_KINDS)[number] | 'Knight' | 'Elite'

export interface Soldier {
  id: string
  kind: SoldierKind
  name: string
  veteran: boolean
  /** When they joined. */
  at: number
}

const SHADE_NAMES = ['Ash', 'Brakk', 'Cinder', 'Dusk', 'Ember', 'Fen', 'Grim', 'Hollow', 'Iro', 'Jett', 'Kael', 'Lux', 'Murk', 'Nox', 'Onyx', 'Pyre', 'Quill', 'Rook', 'Sable', 'Thorn', 'Umbra', 'Vex', 'Wraith', 'Yoru', 'Zane']

/**
 * The Shadow Legion, from your first Job Change on: a soldier for every 5 quests
 * cleared, a Knight for every main quest cleared, an Elite for every boss.
 */
export function shadowLegion(seed: string, since: number | null, captainSince: number | null, completions: Completion[], bosses: Boss[], mainsClearedAt: number[]): { soldiers: Soldier[]; nextIn: number } {
  if (since === null) return { soldiers: [], nextIn: QUESTS_PER_SOLDIER }
  const cleared = completions.filter(c => c.createdAt >= since).sort((a, b) => a.createdAt - b.createdAt)
  const soldiers: Soldier[] = []
  for (let n = 1; n * QUESTS_PER_SOLDIER <= cleared.length; n++) {
    const at = cleared[n * QUESTS_PER_SOLDIER - 1].createdAt
    const kind = SOLDIER_KINDS[hash(`${seed}:soldier:${n}`) % SOLDIER_KINDS.length]
    const veteran = captainSince !== null && at >= captainSince && n % 4 === 0
    soldiers.push({ id: `s${n}`, kind, name: `${SHADE_NAMES[hash(`${seed}:shade:${n}`) % SHADE_NAMES.length]} the ${kind}`, veteran, at })
  }
  for (const b of bosses.filter(b => b.defeatedAt)) soldiers.push({ id: `boss-${b.id}`, kind: 'Elite', name: `Shade of ${b.name}`, veteran: true, at: b.defeatedAt! })
  mainsClearedAt.forEach((at, i) => soldiers.push({ id: `main-${i}`, kind: 'Knight', name: `${SHADE_NAMES[hash(`${seed}:knight:${i}`) % SHADE_NAMES.length]} the Knight`, veteran: true, at }))
  soldiers.sort((a, b) => a.at - b.at)
  return { soldiers, nextIn: QUESTS_PER_SOLDIER - (cleared.length % QUESTS_PER_SOLDIER) }
}

// ---- Hidden achievements ----

export const HIDDEN_XP = 30

export interface HiddenInput {
  completions: Completion[]
  dailyIds: Set<string>
  perfectDays: string[]
  /** Days you cleared at least one daily. */
  activeDays: Set<string>
  startDay: string
  gatesCleared: number
  goldenCleared: number
  rolls: number[]
  loot: LootDrop[]
  soldiers: number
  couponsUsed: number
}

export interface Hidden {
  id: string
  title: string
  description: string
  earned: (i: HiddenInput) => boolean
}

/** Cleared between these hours after the start of its game day's date (24+ = past midnight). */
const within = (c: Completion, fromHour: number, toHour: number) => {
  const start = startOfDay(c.day)
  return c.createdAt >= start + fromHour * 3600_000 && c.createdAt < start + toHour * 3600_000
}

export const HIDDEN: Hidden[] = [
  { id: 'early-bird', title: 'Early Bird', description: 'Cleared a quest between 4 and 6 a.m.', earned: i => i.completions.some(c => within(c, 4, 6)) },
  { id: 'night-owl', title: 'Night Owl', description: 'Cleared a quest between midnight and 3 a.m. (still counting for the day before)', earned: i => i.completions.some(c => within(c, 24, 27)) },
  {
    id: 'clean-sweep', title: 'Clean Sweep', description: 'A perfect day, all done before noon',
    earned: i => i.perfectDays.some(day => {
      const done = i.completions.filter(c => c.day === day && i.dailyIds.has(c.questId))
      return done.length > 0 && done.every(c => within(c, 0, 12))
    }),
  },
  { id: 'comeback', title: 'The Comeback', description: 'A perfect day right after a day with nothing done', earned: i => i.perfectDays.some(d => addDays(d, -1) >= i.startDay && !i.activeDays.has(addDays(d, -1))) },
  { id: 'gatecrasher', title: 'Gatecrasher', description: 'Closed your first Red Gate', earned: i => i.gatesCleared >= 1 },
  { id: 'golden-touch', title: 'Golden Touch', description: 'Cleared 5 Golden Quests', earned: i => i.goldenCleared >= 5 },
  { id: 'natural-20', title: 'Natural 20', description: 'Rolled a 20', earned: i => i.rolls.includes(20) },
  { id: 'snake-eyes', title: 'Cursed but Unbroken', description: 'Rolled a 1', earned: i => i.rolls.includes(1) },
  { id: 'shiny', title: 'Shiny Hunter', description: 'Found a foil card', earned: i => i.loot.some(d => d.foil) },
  { id: 'collector', title: 'Collector', description: 'Own 30 different cards', earned: i => new Set(i.loot.map(d => d.cardId)).size >= 30 },
  { id: 'grinder', title: 'The Grinder', description: 'Clear 100 quests', earned: i => i.completions.length >= 100 },
  { id: 'warlord', title: 'Warlord', description: 'Raise 25 shadow soldiers', earned: i => i.soldiers >= 25 },
  { id: 'treat-yourself', title: 'Treat Yourself', description: 'Redeemed 5 treat coupons', earned: i => i.couponsUsed >= 5 },
]

export const earnedHidden = (i: HiddenInput) => HIDDEN.filter(h => h.earned(i))

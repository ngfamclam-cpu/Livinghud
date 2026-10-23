// Badges, titles and loot, all worked out from your history (nothing stored).
// - Streak titles: a 30-day streak on any daily of a stat earns that stat's
//   title for good, and +10% XP on that stat's quests while a 30-day streak holds.
// - Milestone titles: levels, bosses, focus hours, journal entries, hangouts.
// - Loot: HUD colour themes that drop at levels and milestones. Cosmetic only.

import type { StatKey } from './types'

export const STREAK_DAYS = 30
export const STREAK_BONUS = 0.1

export const STREAK_TITLES: Record<StatKey, string> = {
  STR: 'Iron Will',
  VIT: 'Unbreakable',
  INT: 'Seeker',
  CHA: 'Bond Keeper',
  AGI: 'Clockwork',
  WLT: 'Gold Hunter',
}

export interface Badge {
  id: string
  title: string
  description: string
}

export interface BadgeInput {
  level: number
  /** Longest streak ever, and the current one, per stat (best daily of that stat). */
  bestStreak: Partial<Record<StatKey, number>>
  currentStreak: Partial<Record<StatKey, number>>
  bossesDefeated: number
  focusMinutes: number
  journalEntries: number
  hangouts: number
  /** Life log: distinct places, cities and countries visited. */
  places?: number
  cities?: number
  countries?: number
}

interface Milestone extends Badge {
  earned: (i: BadgeInput) => boolean
}

const MILESTONES: Milestone[] = [
  { id: 'steady', title: 'Steady', description: 'A 7-day streak on any daily', earned: i => Object.values(i.bestStreak).some(s => (s ?? 0) >= 7) },
  { id: 'lv5', title: 'Awakened', description: 'Reach level 5', earned: i => i.level >= 5 },
  { id: 'lv10', title: 'Hunter', description: 'Reach level 10', earned: i => i.level >= 10 },
  { id: 'lv20', title: 'Veteran', description: 'Reach level 20', earned: i => i.level >= 20 },
  { id: 'lv35', title: 'Elite', description: 'Reach level 35', earned: i => i.level >= 35 },
  { id: 'lv50', title: 'Sovereign', description: 'Reach level 50', earned: i => i.level >= 50 },
  { id: 'slayer', title: 'Slayer', description: 'Defeat your first boss', earned: i => i.bossesDefeated >= 1 },
  { id: 'dread-breaker', title: 'Dread Breaker', description: 'Defeat 5 bosses', earned: i => i.bossesDefeated >= 5 },
  { id: 'deep-diver', title: 'Deep Diver', description: '10 hours in focus dungeons', earned: i => i.focusMinutes >= 600 },
  { id: 'unshakable', title: 'Unshakable', description: '50 hours in focus dungeons', earned: i => i.focusMinutes >= 3000 },
  { id: 'chronicler', title: 'Chronicler', description: '30 journal entries', earned: i => i.journalEntries >= 30 },
  { id: 'socialite', title: 'Socialite', description: '10 hangouts logged', earned: i => i.hangouts >= 10 },
  ...TRAVEL_TITLES(),
]

/** Travel titles pay XP once (never dollars), on top of the title. */
export const TRAVEL_XP = 50

function TRAVEL_TITLES(): Milestone[] {
  return [
    { id: 'explorer', title: 'Explorer', description: '10 places in the Life log', earned: i => (i.places ?? 0) >= 10 },
    { id: 'wanderer', title: 'Wanderer', description: '25 places in the Life log', earned: i => (i.places ?? 0) >= 25 },
    { id: 'pathfinder', title: 'Pathfinder', description: '50 places in the Life log', earned: i => (i.places ?? 0) >= 50 },
    { id: 'cartographer', title: 'Cartographer', description: '100 places in the Life log', earned: i => (i.places ?? 0) >= 100 },
    { id: 'city-hopper', title: 'City Hopper', description: 'Memories in 5 cities', earned: i => (i.cities ?? 0) >= 5 },
    { id: 'globetrotter', title: 'Globetrotter', description: 'Memories in a second country', earned: i => (i.countries ?? 0) >= 2 },
  ]
}

export const TRAVEL_IDS = new Set(TRAVEL_TITLES().map(t => t.id))

/** Every badge, earned or not, so the Settings screen can show what's still locked. */
export function allBadges(): Badge[] {
  const streak = (Object.keys(STREAK_TITLES) as StatKey[]).map(stat => ({
    id: `streak-${stat}`,
    title: STREAK_TITLES[stat],
    description: `A ${STREAK_DAYS}-day streak on a ${stat} daily (+10% ${stat} XP while it holds)`,
  }))
  return [...streak, ...MILESTONES.map(({ id, title, description }) => ({ id, title, description }))]
}

export function earnedBadges(i: BadgeInput): Badge[] {
  const streak = (Object.keys(STREAK_TITLES) as StatKey[])
    .filter(stat => (i.bestStreak[stat] ?? 0) >= STREAK_DAYS)
    .map(stat => allBadges().find(b => b.id === `streak-${stat}`)!)
  return [...streak, ...MILESTONES.filter(m => m.earned(i)).map(({ id, title, description }) => ({ id, title, description }))]
}

/** Stats whose quests get +10% XP right now: a 30-day streak is holding. */
export function streakBonuses(i: BadgeInput): Set<StatKey> {
  return new Set((Object.keys(i.currentStreak) as StatKey[]).filter(stat => (i.currentStreak[stat] ?? 0) >= STREAK_DAYS))
}

// ---- Loot: HUD themes ----

export interface Theme {
  id: string
  name: string
  /** How it drops. */
  unlock: string
  earned: (i: BadgeInput) => boolean
}

export const THEMES: Theme[] = [
  { id: 'system', name: 'System Blue', unlock: 'Starting theme', earned: () => true },
  { id: 'crimson', name: 'Crimson Gate', unlock: 'Reach level 3', earned: i => i.level >= 3 },
  { id: 'violet', name: 'Violet Shade', unlock: 'Reach level 5', earned: i => i.level >= 5 },
  { id: 'ember', name: 'Ember', unlock: 'Defeat a boss', earned: i => i.bossesDefeated >= 1 },
  { id: 'gold', name: 'Gold Rank', unlock: 'Reach level 10', earned: i => i.level >= 10 },
  { id: 'jade', name: 'Jade', unlock: '30 journal entries', earned: i => i.journalEntries >= 30 },
  { id: 'abyss', name: 'Abyss', unlock: 'Reach level 20', earned: i => i.level >= 20 },
]

export const unlockedThemes = (i: BadgeInput) => THEMES.filter(t => t.earned(i)).map(t => t.id)

/** Longest run of days in a set, letting rest days pass without breaking it. */
export function longestStreak(days: Set<string>, restDays: Set<string>, addDays: (d: string, n: number) => string): number {
  let best = 0
  for (const day of days) {
    // Only start counting at the first day of a run.
    let prev = addDays(day, -1)
    while (restDays.has(prev)) prev = addDays(prev, -1)
    if (days.has(prev)) continue
    let length = 0
    let d = day
    for (let guard = 0; guard < 3650; guard++) {
      if (days.has(d)) length++
      else if (!restDays.has(d)) break
      d = addDays(d, 1)
    }
    best = Math.max(best, length)
  }
  return best
}

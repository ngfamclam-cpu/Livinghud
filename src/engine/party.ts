// The Party list: the people in your life and how long since you were in touch.
// After a person's bond window (21 days by default) the System warns that the
// bond is weakening. Logging contact earns CHA XP and clears CHA quests.

import { daysBetween } from './time'
import type { Circle, Contact, ContactKind, FeatureKey, Person } from './types'

export const CONTACT_XP: Record<ContactKind, number> = { message: 5, call: 15, hangout: 30, date: 40 }

export const CONTACT_NAMES: Record<ContactKind, string> = { message: 'Message', call: 'Call', hangout: 'Hangout', date: 'Date' }

export const CIRCLE_NAMES: Record<Circle, string> = { friend: 'Friend', family: 'Family', dating: 'Dating', work: 'Work' }

export const DEFAULT_BOND_DAYS = 21

export interface Bond {
  person: Person
  /** Last contact day, or null if never. */
  lastDay: string | null
  /** Days since last contact, or since they were added if never contacted. */
  daysSince: number
  weakening: boolean
  hangouts: number
}

/** Everyone active in the Party, most overdue first. */
export function partyBonds(people: Person[], contacts: Contact[], today: string, firstDayOf: (createdAt: number) => string): Bond[] {
  return people
    .filter(p => p.active)
    .map(person => {
      const mine = contacts.filter(c => c.personId === person.id)
      const lastDay = mine.reduce<string | null>((last, c) => (last === null || c.day > last ? c.day : last), null)
      const daysSince = Math.max(0, daysBetween(lastDay ?? firstDayOf(person.createdAt), today))
      return {
        person,
        lastDay,
        daysSince,
        weakening: daysSince >= person.bondDays,
        hangouts: mine.filter(c => c.kind === 'hangout').length,
      }
    })
    .sort((a, b) => b.daysSince / b.person.bondDays - a.daysSince / a.person.bondDays)
}

// ---- Feature switches ----

export interface FeatureInfo {
  key: FeatureKey
  name: string
  description: string
}

/** Optional features, all on by default. Switching one off hides it; its records stay. */
export const FEATURES: FeatureInfo[] = [
  { key: 'party', name: 'Party list', description: 'Your people, days since contact, bond warnings, hangouts and dates.' },
  { key: 'focus', name: 'Focus dungeons', description: 'Timed work sessions that earn XP per minute and clear linked quests.' },
  { key: 'bosses', name: 'Dreaded-task bosses', description: 'Turn a task you keep avoiding into a boss; focus minutes do damage.' },
  { key: 'badges', name: 'Titles and streak bonuses', description: 'Earn titles from streaks and milestones; a 30-day streak adds 10% XP for that stat.' },
  { key: 'loot', name: 'Loot themes', description: 'HUD colour themes that drop at levels and milestones.' },
  { key: 'penalties', name: 'Penalty modes', description: 'Casual pauses streaks; Normal costs 5 XP per missed daily; Hardcore uses HP and can cost wallet money.' },
  { key: 'briefing', name: 'Morning briefing', description: 'A System message the first time you open the app each day.' },
  { key: 'report', name: 'Weekly report card', description: 'A grade, stat changes and one suggestion for each week, shown on Mondays.' },
  { key: 'journal', name: 'Reflection journal', description: 'Three prompts a day, mood and energy, and the patterns over time.' },
]

export const featureOn = (player: { features?: Partial<Record<FeatureKey, boolean>> }, key: FeatureKey) => player.features?.[key] !== false

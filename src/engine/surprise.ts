// Surprise challenges ("instant dungeons"): once a day a small quest appears at a
// random moment between an hour after waking and two hours before bed, and stays
// open for an hour. The pick and time come from the day itself, so every device
// agrees without storing anything until it's cleared.

import type { StatKey } from './types'

export const SURPRISE_XP = 30
export const SURPRISE_OPEN_MIN = 60

export interface Challenge {
  id: string
  stat: StatKey
  text: string
}

export const CHALLENGES: Challenge[] = [
  { id: 'squats-20', stat: 'STR', text: '20 squats, right now' },
  { id: 'plank-60', stat: 'STR', text: 'Hold a 60-second plank' },
  { id: 'walk-10', stat: 'STR', text: 'A brisk 10-minute walk' },
  { id: 'water', stat: 'VIT', text: 'Drink a full glass of water' },
  { id: 'fruit', stat: 'VIT', text: 'Eat a piece of fruit or some veg' },
  { id: 'breathe', stat: 'VIT', text: '2 minutes of slow breathing, eyes closed' },
  { id: 'read-5', stat: 'INT', text: 'Read 5 pages of a book' },
  { id: 'learn-1', stat: 'INT', text: 'Look up one thing you’ve been curious about and write a line on it' },
  { id: 'voice-note', stat: 'CHA', text: 'Send a voice note to a friend' },
  { id: 'compliment', stat: 'CHA', text: 'Give someone a genuine compliment' },
  { id: 'surface', stat: 'AGI', text: 'Clear one surface in 5 minutes' },
  { id: 'two-min', stat: 'AGI', text: 'Do one task that takes under 2 minutes, that you’ve been putting off' },
  { id: 'ideas-3', stat: 'WLT', text: 'Write down 3 side-income ideas' },
  { id: 'subscription', stat: 'WLT', text: 'Check your subscriptions and cancel one you don’t use' },
  { id: 'posture', stat: 'STR', text: 'Posture reset: 10 chin tucks and 10 wall slides' },
]

/** A small, well-mixed hash so each day gets a stable random pick. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return (h ^ (h >>> 15)) >>> 0
}

const minutesOf = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export interface Surprise {
  challenge: Challenge
  /** When it appears and stops accepting, in milliseconds. */
  opensAt: number
  closesAt: number
}

/** Today's surprise for a player, or null if they have no stat with challenges. */
export function dailySurprise(day: string, seed: string, stats: StatKey[], wakeTime: string, bedTime: string): Surprise | null {
  const pool = CHALLENGES.filter(c => stats.includes(c.stat))
  if (pool.length === 0) return null
  const h = hash(`${seed}:${day}`)
  const challenge = pool[h % pool.length]

  const wake = minutesOf(wakeTime)
  let bed = minutesOf(bedTime)
  if (bed <= wake) bed += 24 * 60
  const from = wake + 60
  const to = Math.max(from + 30, bed - 120)
  const at = from + (Math.floor(h / pool.length) % (to - from))

  const [y, m, d] = day.split('-').map(Number)
  const opensAt = new Date(y, m - 1, d, 0, at).getTime()
  return { challenge, opensAt, closesAt: opensAt + SURPRISE_OPEN_MIN * 60_000 }
}

export type SurpriseState = 'upcoming' | 'open' | 'cleared' | 'missed'

export function surpriseState(s: Surprise, cleared: boolean, now: number): SurpriseState {
  if (cleared) return 'cleared'
  if (now < s.opensAt) return 'upcoming'
  return now < s.closesAt ? 'open' : 'missed'
}

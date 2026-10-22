// Local-first storage in the browser (IndexedDB via Dexie).
// Phase 5 adds Supabase sync on top; records already carry userId + timestamps.

import Dexie, { type EntityTable } from 'dexie'
import type { Boss, Completion, Contact, ExerciseSet, FocusRun, Person, Player, PostureScan, Purchase, Quest, Reward, SavingsEntry } from '../engine'

export const LOCAL_USER = 'local'

export const db = new Dexie('livinghud') as Dexie & {
  players: EntityTable<Player, 'id'>
  quests: EntityTable<Quest, 'id'>
  completions: EntityTable<Completion, 'id'>
  rewards: EntityTable<Reward, 'id'>
  purchases: EntityTable<Purchase, 'id'>
  savings: EntityTable<SavingsEntry, 'id'>
  sets: EntityTable<ExerciseSet, 'id'>
  scans: EntityTable<PostureScan, 'id'>
  people: EntityTable<Person, 'id'>
  contacts: EntityTable<Contact, 'id'>
  focusRuns: EntityTable<FocusRun, 'id'>
  bosses: EntityTable<Boss, 'id'>
}

db.version(1).stores({
  players: 'id, userId',
  quests: 'id, userId, kind, stat',
  completions: 'id, userId, questId, day, [questId+day]',
})

// Phase 2: the reward shop and the savings gate. Existing data is untouched.
db.version(2).stores({
  rewards: 'id, userId',
  purchases: 'id, userId, rewardId, day',
  savings: 'id, userId, day',
})

export const newId = () => crypto.randomUUID()

// Strength routine sets, logged by the rep counter or by hand.
db.version(3).stores({
  sets: 'id, userId, day',
})

// Side-on camera posture scans (head angle, walking hip extension).
db.version(4).stores({
  scans: 'id, userId, day',
})

// The Party list: people and logged contact with them.
db.version(5).stores({
  people: 'id, userId',
  contacts: 'id, userId, personId, day',
})

// Focus dungeons and dreaded-task bosses.
db.version(6).stores({
  focusRuns: 'id, userId, day, bossId, questId',
  bosses: 'id, userId',
})

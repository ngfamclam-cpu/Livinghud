// Local-first storage in the browser (IndexedDB via Dexie).
// Phase 5 adds Supabase sync on top; records already carry userId + timestamps.

import Dexie, { type EntityTable } from 'dexie'
import type { Completion, Player, Quest } from '../engine'

export const LOCAL_USER = 'local'

export const db = new Dexie('livinghud') as Dexie & {
  players: EntityTable<Player, 'id'>
  quests: EntityTable<Quest, 'id'>
  completions: EntityTable<Completion, 'id'>
}

db.version(1).stores({
  players: 'id, userId',
  quests: 'id, userId, kind, stat',
  completions: 'id, userId, questId, day, [questId+day]',
})

export const newId = () => crypto.randomUUID()

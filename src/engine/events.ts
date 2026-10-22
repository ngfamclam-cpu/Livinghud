// Every game action is announced as an event. Screens, notifications and
// (later) the glasses and AI System only listen; none of them own the rules.

import type { Completion, ExerciseKey, Purchase, StatKey } from './types'

export type GameEvent =
  | { type: 'quest.completed'; completion: Completion; questTitle: string; via?: 'automation' }
  | { type: 'quest.undone'; questId: string; questTitle: string }
  | { type: 'level.up'; level: number }
  | { type: 'wallet.full'; month: string; budget: number }
  | { type: 'player.awakened'; name: string; stats: StatKey[] }
  | { type: 'mainQuest.cleared'; questId: string; questTitle: string }
  | { type: 'reward.purchased'; purchase: Purchase }
  | { type: 'reward.refunded'; purchase: Purchase }
  | { type: 'recovery.granted'; day: string }
  | { type: 'savings.logged'; kind: 'saved' | 'income'; amount: number }
  | { type: 'savings.goalMet'; month: string; target: number }
  /** Live from a camera while you train; nothing is saved until the set is logged. */
  | { type: 'workout.rep'; exercise: ExerciseKey; count: number }
  | { type: 'workout.set'; exercise: ExerciseKey; name: string; amount: number; total: number; target: number }
  | { type: 'routine.raised' }

type Listener = (event: GameEvent) => void

const listeners = new Set<Listener>()

export function onGameEvent(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function emit(event: GameEvent): void {
  for (const listener of listeners) listener(event)
}

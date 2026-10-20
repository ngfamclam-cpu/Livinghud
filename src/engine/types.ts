// Core game types. The engine never imports React or the database,
// so web, native, glasses and AI clients can all share it.

export type StatKey = 'STR' | 'VIT' | 'INT' | 'CHA' | 'AGI' | 'WLT'

export type Difficulty = 'casual' | 'normal' | 'hardcore'

export type QuestKind = 'daily' | 'side' | 'main'

/** Which version of a quest was done: the full quest or the bad-day minimum. */
export type CompletionVersion = 'full' | 'min'

export interface FitnessBaseline {
  pushups: number
  squats: number
  plankSeconds: number
  pullups: number
  gluteBridges: number
}

export interface SavingsGoal {
  type: 'fixed' | 'percent' | 'off'
  /** Dollars per month for 'fixed', percent of income for 'percent'. */
  amount: number
}

export interface PlayerSettings {
  /** Monthly real-reward budget in dollars. */
  monthlyBudget: number
  savingsGoal: SavingsGoal
  difficulty: Difficulty
  /** Hour of the day (0-23) when dailies reset. 4 means a 1am finish still counts for "yesterday". */
  resetHour: number
  wakeTime: string
  bedTime: string
}

export interface Player {
  id: string
  /** Every record carries a userId so cloud sync (Phase 5) needs no migration. */
  userId: string
  name: string
  stats: StatKey[]
  fitness: FitnessBaseline | null
  settings: PlayerSettings
  createdAt: number
  updatedAt: number
}

export interface Quest {
  id: string
  userId: string
  kind: QuestKind
  stat: StatKey
  title: string
  description: string
  minVersion: string
  active: boolean
  templateId: string | null
  createdAt: number
  updatedAt: number
}

export interface Completion {
  id: string
  userId: string
  questId: string
  stat: StatKey
  /** Game day this counts for, as YYYY-MM-DD (see dayKey). */
  day: string
  version: CompletionVersion
  xp: number
  dollars: number
  createdAt: number
}

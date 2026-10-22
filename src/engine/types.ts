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
  /** Secret in this player's auto-complete links (see api/trigger.ts). */
  triggerToken?: string
}

export interface Player {
  id: string
  /** Every record carries a userId so cloud sync (Phase 5) needs no migration. */
  userId: string
  name: string
  stats: StatKey[]
  /** The Awakening fitness test, kept as the starting point. */
  fitness: FitnessBaseline | null
  /** The strength routine as edited by the player; until then it comes from the fitness test. */
  routine?: RoutineExercise[]
  /** Game day the player last accepted or declined raising the routine's targets. */
  routineReviewedOn?: string
  settings: PlayerSettings
  createdAt: number
  updatedAt: number
}

/** One step of a main quest. Stages are cleared in order. */
export interface QuestStage {
  id: string
  title: string
  description: string
  xp: number
  /** Dollars this stage pays at the default $150 budget; scaled to the player's budget. */
  basePay: number
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
  /** Main quests only: the stages, in order. */
  stages?: QuestStage[]
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
  /** Main quests only: which stage this clears. */
  stageId?: string
  xp: number
  dollars: number
  createdAt: number
}

/** Ranked E-S by price; see rewardRank. */
export type RewardRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'

/**
 * Special reward rules. A date costs money and also earns CHA XP; a big night
 * out (a rave, a night of drinking) grants a Recovery Day token for the next day.
 */
export type RewardSpecial = 'none' | 'date' | 'bigNight'

export interface Reward {
  id: string
  userId: string
  title: string
  /** Real price in dollars. The rank and minimum level come from this. */
  price: number
  category: string
  special: RewardSpecial
  /** Optional extra gate, e.g. new running shoes need STR 40. */
  statGate: { stat: StatKey; min: number } | null
  active: boolean
  templateId: string | null
  createdAt: number
  updatedAt: number
}

/** A reward bought with real money. Copies the reward so history survives edits. */
export interface Purchase {
  id: string
  userId: string
  rewardId: string
  title: string
  price: number
  rank: RewardRank
  special: RewardSpecial
  /** Game day of the purchase, YYYY-MM-DD. */
  day: string
  fromWallet: number
  fromVault: number
  /** XP the purchase grants (dates earn CHA XP). */
  xp: number
  stat: StatKey | null
  createdAt: number
}

/** A savings or income entry for the monthly savings gate. */
export interface SavingsEntry {
  id: string
  userId: string
  kind: 'saved' | 'income'
  amount: number
  /** Game day logged, YYYY-MM-DD. Counts toward that day's month. */
  day: string
  createdAt: number
}

/**
 * An exercise id. The camera-tracked ones match the fitness test (pushups,
 * squats, plankSeconds, pullups, gluteBridges); players can add their own.
 */
export type ExerciseKey = string

export type ExerciseUnit = 'reps' | 'seconds' | 'minutes'

/** One exercise in the player's strength routine, with today's target. */
export interface RoutineExercise {
  key: ExerciseKey
  name: string
  unit: ExerciseUnit
  target: number
}

/** A set of the strength routine. Today's progress is the sum of today's sets. */
export interface ExerciseSet {
  id: string
  userId: string
  exercise: ExerciseKey
  /** Reps, seconds or minutes. Negative for a correction that lowers the count. */
  amount: number
  /** Game day, YYYY-MM-DD. */
  day: string
  /** 'correction' sets today's total by hand when the camera got it wrong. */
  source: 'camera' | 'manual' | 'correction'
  createdAt: number
}

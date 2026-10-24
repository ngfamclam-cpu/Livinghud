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
  /** The training plan as edited by the player; until then a Push/Pull/Legs plan built from the fitness test. */
  plan?: TrainingPlan
  /** A single every-day routine saved before training plans existed; used only when there is no plan. */
  routine?: RoutineExercise[]
  /** Game day the player last accepted or declined raising the routine's targets. */
  routineReviewedOn?: string
  /** One-off System notices the player has answered, so they don't show again. */
  dismissedNotices?: string[]
  /** Optional features switched off in Settings. Missing means on. */
  features?: Partial<Record<FeatureKey, boolean>>
  /** The Life log switch paused the photo quest (so switching it back on resumes it). */
  memoryQuestPaused?: boolean
  /** Reward ideas starred in the Shop to work toward. */
  favoriteRewards?: string[]
  /** The title shown under the player's name, chosen from earned badges. */
  title?: string | null
  /** The HUD colour theme, chosen from unlocked loot. */
  theme?: string
  /** Game day penalties started counting (set when they're switched on). */
  penaltiesSince?: string
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
  /** For tickets booked ahead: the event day (a big night's Recovery Day is the day after it). */
  forDay?: string
  /** Set when this is a booked part of a plan. */
  planId?: string
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

/** A training day. 'full' is a single every-day workout (the older, non-split routine). */
export type WorkoutKind = 'push' | 'pull' | 'legs' | 'full'
export type DayKind = WorkoutKind | 'rest'

/**
 * The strength plan: a repeating cycle of workout days, the exercises for each,
 * and a posture routine done every day, rest days included.
 * The cycle moves on when a day is trained (or when a rest day passes), not by the calendar.
 */
export interface TrainingPlan {
  cycle: DayKind[]
  workouts: Partial<Record<WorkoutKind, RoutineExercise[]>>
  posture: RoutineExercise[]
  /** Game day the cycle was last set, starting at cycle[startIndex]. */
  startedOn: string
  startIndex: number
}

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
  source: 'camera' | 'manual' | 'correction' | 'link'
  createdAt: number
}

/** A side-on camera posture measurement, kept to show the trend over time. */
export interface PostureScan {
  id: string
  userId: string
  kind: 'head' | 'walk'
  /** Degrees: head angle for 'head', peak hip extension for 'walk'. */
  value: number
  /** Game day, YYYY-MM-DD. */
  day: string
  createdAt: number
}

/** Optional parts of the game the player can switch off in Settings. */
export type FeatureKey = 'plans' | 'party' | 'focus' | 'bosses' | 'journal' | 'badges' | 'penalties' | 'briefing' | 'report' | 'loot' | 'surprises' | 'memories'

export type Circle = 'friend' | 'family' | 'dating' | 'work'

/** Someone in the Party list. */
export interface Person {
  id: string
  userId: string
  name: string
  circle: Circle
  /** Days without contact before the System warns the bond is weakening. */
  bondDays: number
  note: string
  active: boolean
  createdAt: number
  updatedAt: number
}

export type ContactKind = 'message' | 'call' | 'hangout' | 'date'

/** A logged contact with someone in the Party list. */
export interface Contact {
  id: string
  userId: string
  personId: string
  kind: ContactKind
  note: string
  /** Game day, YYYY-MM-DD. */
  day: string
  /** CHA XP this contact earned. */
  xp: number
  createdAt: number
}

/** A focus "dungeon": a timed work session. */
export interface FocusRun {
  id: string
  userId: string
  label: string
  stat: StatKey
  /** The quest this session counts toward, if any. */
  questId: string | null
  /** The boss (dreaded task) this session damages, if any. */
  bossId: string | null
  plannedMin: number
  /** Minutes actually focused. */
  minutes: number
  /** Ran the full planned time (or ended on purpose after it). */
  cleared: boolean
  /** Logged by hand ("I did 15 minutes") rather than timed. */
  manual: boolean
  /** Game day, YYYY-MM-DD. */
  day: string
  xp: number
  startedAt: number
  createdAt: number
}

/** A dreaded task as a boss. Each HP is 15 minutes of work on it. */
export interface Boss {
  id: string
  userId: string
  name: string
  stat: StatKey
  hp: number
  active: boolean
  defeatedAt: number | null
  createdAt: number
  updatedAt: number
}

/** One day's reflection journal entry. */
export interface JournalEntry {
  id: string
  userId: string
  /** Game day, YYYY-MM-DD. One entry per day. */
  day: string
  wentWell: string
  drained: string
  adjust: string
  /** 1 (rough) to 5 (great). */
  mood: number
  /** 1 (empty) to 5 (charged). */
  energy: number
  /** The day's random question and your answer. */
  prompt?: string
  promptAnswer?: string
  /** Things you started tracking from this reflection. */
  tracked?: TrackedFromReflection[]
  createdAt: number
  updatedAt: number
}

export interface TrackedFromReflection {
  kind: 'daily' | 'side' | 'goal'
  title: string
  stat: StatKey | null
}

/** A cleared surprise challenge. */
export interface SurpriseClear {
  id: string
  userId: string
  /** Game day, YYYY-MM-DD. */
  day: string
  challengeId: string
  xp: number
  createdAt: number
}

export type PlanKind = 'rave' | 'festival' | 'trip'
export type PlanItemKind = 'ticket' | 'travel' | 'stay' | 'food' | 'gear' | 'other'

/** One cost in a plan: a ticket, flights, a place to stay... */
export interface PlanItem {
  id: string
  label: string
  kind: PlanItemKind
  cost: number
  /** The purchase made when it was booked, if it has been. */
  purchaseId: string | null
}

/** A rave, festival or trip you're saving for and booking piece by piece. */
export interface Plan {
  id: string
  userId: string
  name: string
  kind: PlanKind
  /** Event or departure day, YYYY-MM-DD, or '' if not set yet. */
  date: string
  items: PlanItem[]
  /** The Expedition main quest made for this plan, if any. */
  questId: string | null
  status: 'active' | 'done' | 'cancelled'
  createdAt: number
  updatedAt: number
}

/** Money moved from the Vault into a plan (or back, when negative). */
export interface PlanFund {
  id: string
  userId: string
  planId: string
  amount: number
  /** Game day, YYYY-MM-DD. */
  day: string
  createdAt: number
}

/** A place you've been, named by OpenStreetMap or by you. */
export interface Place {
  id: string
  userId: string
  /** The name shown: OpenStreetMap's, or yours once you rename it. */
  name: string
  /** True once you've named it yourself, so a lookup never overwrites it. */
  custom: boolean
  lat: number
  lon: number
  city: string
  country: string
  /** ISO 3166-1 alpha-2, lower case (e.g. 'jp'); '' if unknown. */
  countryCode: string
  createdAt: number
  updatedAt: number
}

export interface MemoryPhoto {
  /** Also the photo's file name in the cloud and the local cache key. */
  id: string
  width: number
  height: number
  bytes: number
}

/** A Life log entry: a note, photos and where you were, at a moment of a game day. */
export interface Memory {
  id: string
  userId: string
  /** Game day, YYYY-MM-DD. */
  day: string
  /** When it happened (ms). */
  at: number
  note: string
  photos: MemoryPhoto[]
  placeId: string | null
  createdAt: number
  updatedAt: number
}

export interface GoalItem {
  text: string
  done: boolean
  /** When it was ticked off (ms). */
  doneAt: number | null
}

/** "Tomorrow's top 3": the goals set for one game day. */
export interface DayGoals {
  id: string
  userId: string
  /** The game day the goals are for, YYYY-MM-DD. */
  day: string
  /** The game day they were written. */
  plannedOn: string
  items: GoalItem[]
  createdAt: number
  updatedAt: number
}

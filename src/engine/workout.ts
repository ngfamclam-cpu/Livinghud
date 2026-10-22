// The strength routine: daily targets, progress from logged sets, and the
// rep counter that turns body positions (from any camera: phone today,
// glasses later) into reps. Pure math, no camera or screen code.

import { addDays, daysBetween } from './time'
import type { DayKind, ExerciseKey, ExerciseSet, ExerciseUnit, FitnessBaseline, Player, RoutineExercise, TrainingPlan, WorkoutKind } from './types'

export type ExerciseGroup = 'push' | 'pull' | 'legs' | 'posture'

export interface ExerciseInfo {
  key: ExerciseKey
  name: string
  unit: ExerciseUnit
  /** How the camera tracks it; 'manual' means type the number in (or use the timer for holds). */
  tracking: 'reps' | 'hold' | 'manual'
  group: ExerciseGroup
  tip: string
}

/**
 * Exercises the System knows, with how to do them. The camera follows pushups,
 * squats, plank and glute bridges; the rest are counted by hand or timed.
 * Posture moves target forward head posture (deep neck flexors, shoulder-blade
 * muscles, chest and neck stretches) and anterior pelvic tilt (hip flexor
 * stretch with the pelvis tucked, glutes, anti-arching core).
 */
export const EXERCISES: ExerciseInfo[] = [
  // Push
  { key: 'pushups', name: 'Pushups', unit: 'reps', tracking: 'reps', group: 'push', tip: 'Put the phone on the floor about 2 m away, side-on, so your whole body is in view. Ribs down, body in one line.' },
  { key: 'pikePushups', name: 'Pike pushups', unit: 'reps', tracking: 'manual', group: 'push', tip: 'Hips high in an upside-down V, lower the top of your head toward the floor between your hands. Works the shoulders.' },
  { key: 'dips', name: 'Chair dips', unit: 'reps', tracking: 'manual', group: 'push', tip: 'Hands on a sturdy chair behind you, lower until elbows reach 90°, press back up. Keep shoulders down, away from your ears.' },
  { key: 'plankSeconds', name: 'Plank', unit: 'seconds', tracking: 'hold', group: 'push', tip: 'Phone on the floor, side-on. Tuck your pelvis slightly and squeeze glutes. The timer only runs while your body is straight.' },
  // Pull
  { key: 'pullups', name: 'Pull-ups', unit: 'reps', tracking: 'manual', group: 'pull', tip: 'Full hang to chin over the bar. Start each rep by pulling your shoulder blades down.' },
  { key: 'pullupNegatives', name: 'Pull-up negatives', unit: 'reps', tracking: 'manual', group: 'pull', tip: 'Jump or step to the top, then lower yourself as slowly as you can (3–5 s). Builds toward your first pull-ups.' },
  { key: 'invertedRows', name: 'Inverted rows', unit: 'reps', tracking: 'manual', group: 'pull', tip: 'Lie under a sturdy table or low bar, body straight, and pull your chest to it. Squeeze shoulder blades together at the top.' },
  { key: 'proneT', name: 'Prone T raises', unit: 'reps', tracking: 'manual', group: 'pull', tip: 'Face down, arms out to the sides, thumbs up. Lift your arms by squeezing your shoulder blades together. Hold 2 s.' },
  { key: 'deadHang', name: 'Dead hang', unit: 'seconds', tracking: 'manual', group: 'pull', tip: 'Hang from a bar with straight arms and relaxed shoulders. Decompresses the spine and opens the chest.' },
  // Legs
  { key: 'squats', name: 'Squats', unit: 'reps', tracking: 'reps', group: 'legs', tip: 'Stand side-on to the phone, about 2–3 m away, with your whole body in view. Chest up, knees track over toes.' },
  { key: 'reverseLunges', name: 'Reverse lunges', unit: 'reps', tracking: 'manual', group: 'legs', tip: 'Step back and lower until both knees are near 90°. Count both legs together (10 per leg = 20).' },
  { key: 'singleLegRdl', name: 'Single-leg RDL', unit: 'reps', tracking: 'manual', group: 'legs', tip: 'Hinge at the hip on one leg, back flat, other leg reaching back. Strengthens the hamstrings that help tuck the pelvis. Both legs together.' },
  { key: 'calfRaises', name: 'Calf raises', unit: 'reps', tracking: 'manual', group: 'legs', tip: 'Rise onto your toes slowly, pause at the top, lower all the way down. Use a step for more range.' },
  // Posture (every day)
  { key: 'chinTucks', name: 'Chin tucks', unit: 'reps', tracking: 'manual', group: 'posture', tip: 'Sit or stand tall and glide your chin straight back, making a double chin, without tipping your head down. Hold each for 5 s. Trains the deep neck flexors.' },
  { key: 'wallSlides', name: 'Wall slides', unit: 'reps', tracking: 'manual', group: 'posture', tip: 'Back, head and arms against a wall, elbows at 90°. Slide your arms up and down while keeping contact, ribs down.' },
  { key: 'proneY', name: 'Prone Y raises', unit: 'reps', tracking: 'manual', group: 'posture', tip: 'Face down, arms in a Y, thumbs up. Lift your arms by pulling your shoulder blades down and back. Hold 2 s. Trains the lower trapezius.' },
  { key: 'pecStretch', name: 'Doorway chest stretch', unit: 'seconds', tracking: 'manual', group: 'posture', tip: 'Forearms on a door frame at shoulder height, step through until you feel a stretch across the chest. Two rounds of 30 s.' },
  { key: 'neckStretch', name: 'Back-of-neck stretch', unit: 'seconds', tracking: 'manual', group: 'posture', tip: 'Do a chin tuck, then gently nod your chin toward your chest; a hand on the back of your head adds a light pull.' },
  { key: 'hipFlexorStretch', name: 'Hip flexor stretch', unit: 'seconds', tracking: 'manual', group: 'posture', tip: 'Half-kneeling. First tuck your pelvis under and squeeze the back glute, then shift forward a little. The tuck matters more than going deep. 60 s per side.' },
  { key: 'gluteBridges', name: 'Glute bridges', unit: 'reps', tracking: 'reps', group: 'posture', tip: 'Lie side-on to the phone with shoulders, hips and knees in view. Squeeze glutes to lift, ribs down, no lower-back arch.' },
  { key: 'deadBugs', name: 'Dead bugs', unit: 'reps', tracking: 'manual', group: 'posture', tip: 'On your back, press your lower back into the floor and keep it there while you slowly lower the opposite arm and leg. Both sides together.' },
]

export const exerciseInfo = (key: ExerciseKey): ExerciseInfo | undefined => EXERCISES.find(e => e.key === key)

const move = (key: ExerciseKey, target: number): RoutineExercise => {
  const info = exerciseInfo(key)!
  return { key, name: info.name, unit: info.unit, target }
}

export const DAY_NAMES: Record<DayKind, string> = { push: 'Push', pull: 'Pull', legs: 'Legs', full: 'Full body', rest: 'Rest' }

/** Push, Pull, Legs, Push, Pull, Rest: legs and rest take turns, so legs never come two days running. */
export const DEFAULT_CYCLE: DayKind[] = ['push', 'pull', 'legs', 'push', 'pull', 'rest']

/** About 10 minutes for forward head posture and anterior pelvic tilt, every day. */
export function defaultPosture(fitness: FitnessBaseline | null): RoutineExercise[] {
  return [
    move('chinTucks', 10),
    move('wallSlides', 10),
    move('proneY', 10),
    move('pecStretch', 60),
    move('neckStretch', 30),
    move('hipFlexorStretch', 120),
    move('gluteBridges', Math.max(10, fitness?.gluteBridges ?? 0)),
    move('deadBugs', 10),
  ]
}

/** A Push/Pull/Legs plan sized from the fitness test. */
export function defaultPlan(fitness: FitnessBaseline | null, startedOn: string): TrainingPlan {
  const f = fitness ?? { pushups: 10, squats: 20, plankSeconds: 30, pullups: 0, gluteBridges: 10 }
  return {
    cycle: [...DEFAULT_CYCLE],
    workouts: {
      push: [move('pushups', Math.max(5, f.pushups)), move('pikePushups', 8), move('dips', 10), move('plankSeconds', Math.max(20, f.plankSeconds))],
      pull: [
        f.pullups > 0 ? move('pullups', f.pullups) : move('pullupNegatives', 3),
        move('invertedRows', 10),
        move('proneT', 10),
        move('deadHang', 30),
      ],
      legs: [move('squats', Math.max(10, f.squats)), move('reverseLunges', 20), move('singleLegRdl', 20), move('calfRaises', 20)],
    },
    posture: defaultPosture(fitness),
    startedOn,
    startIndex: 0,
  }
}

/**
 * The player's plan: the one they saved; an older single routine as one every-day
 * workout; or a Push/Pull/Legs plan from the fitness test, counted from the first day.
 */
export function playerPlan(player: Pick<Player, 'plan' | 'routine' | 'fitness'>, firstDay: string): TrainingPlan {
  if (player.plan) return player.plan
  if (player.routine) return { cycle: ['full'], workouts: { full: player.routine }, posture: [], startedOn: firstDay, startIndex: 0 }
  return defaultPlan(player.fitness, firstDay)
}

/**
 * Where today falls in the cycle. Walks from the day the cycle was set: a trained
 * day moves it on, a rest day moves on by itself, and a missed workout waits for
 * you, so nothing gets skipped. Returns today's day and the next few after it.
 */
export function planDay(plan: TrainingPlan, trainedDays: Set<string>, today: string): { kind: DayKind; index: number; upcoming: DayKind[] } {
  const n = plan.cycle.length
  if (n === 0) return { kind: 'rest', index: 0, upcoming: [] }
  let index = plan.startIndex % n
  const days = Math.max(0, daysBetween(plan.startedOn, today))
  for (let i = 0; i < days; i++) {
    const day = addDays(plan.startedOn, i)
    if (plan.cycle[index] === 'rest' || trainedDays.has(day)) index = (index + 1) % n
  }
  return { kind: plan.cycle[index], index, upcoming: [1, 2, 3].map(k => plan.cycle[(index + k) % n]) }
}

/** Today's exercises: the day's workout, then the posture routine (skipping any already in the workout). */
export function dayExercises(plan: TrainingPlan, kind: DayKind): (RoutineExercise & { part: 'workout' | 'posture' })[] {
  const workout = kind === 'rest' ? [] : (plan.workouts[kind] ?? [])
  const keys = new Set(workout.map(e => e.key))
  return [
    ...workout.map(e => ({ ...e, part: 'workout' as const })),
    ...plan.posture.filter(e => !keys.has(e.key)).map(e => ({ ...e, part: 'posture' as const })),
  ]
}

export type RoutineTargets = Record<ExerciseKey, number>

export function routineTargets(exercises: RoutineExercise[]): RoutineTargets {
  const targets: RoutineTargets = {}
  for (const e of exercises) if (e.target > 0) targets[e.key] = e.target
  return targets
}

/** Amount logged per exercise on one game day. Sets can be split across the day; corrections can lower it. */
export function routineDone(sets: ExerciseSet[], day: string): RoutineTargets {
  const done: RoutineTargets = {}
  for (const s of sets) if (s.day === day) done[s.exercise] = (done[s.exercise] ?? 0) + s.amount
  for (const k of Object.keys(done)) done[k] = Math.max(0, done[k])
  return done
}

/** 'full' when every target is hit, 'min' when every exercise is at least half way ("half the reps"). */
export function routineLevel(targets: RoutineTargets, done: RoutineTargets): 'full' | 'min' | null {
  const keys = Object.keys(targets)
  if (keys.length === 0) return null
  if (keys.every(k => (done[k] ?? 0) >= targets[k])) return 'full'
  if (keys.every(k => (done[k] ?? 0) >= Math.ceil(targets[k] / 2))) return 'min'
  return null
}

const UNIT_SHORT: Record<ExerciseUnit, string> = { reps: '', seconds: 's', minutes: ' min' }

/** e.g. "Pushups 20" or "Plank 60s". */
export const formatAmount = (e: Pick<RoutineExercise, 'unit'>, n: number) => `${n}${UNIT_SHORT[e.unit]}`

/** The strength quest's description for a plan. */
export function planDescription(plan: TrainingPlan): string {
  const cycle = plan.cycle.map(d => DAY_NAMES[d]).join(' → ')
  const posture = plan.posture.length > 0 ? ', plus the posture routine every day' : ''
  return `${cycle}${posture}. Today's exercises are on the Workout screen; reps can be split across the day.`
}

// ---- Progression: numbers go up after 3 consistent weeks, never after one good day ----

export const PROGRESSION_DAYS = 21

/** About 25% more, rounded to a sensible step: 20 → 25, 40 → 50, 10 → 12, 60s → 75s. */
export function nextTarget(target: number, unit: ExerciseUnit): number {
  if (unit === 'seconds') return Math.max(target + 5, Math.round((target * 1.25) / 5) * 5)
  return Math.max(target + 1, Math.floor(target * 1.25))
}

/**
 * True after 21 days in a row of the full routine (Recovery Days neither break
 * nor count toward the run). Days on or before `reviewedOn` (the last accept or
 * decline) don't count, so "Not now" waits another 3 weeks.
 */
export function progressionDue(fullDays: Set<string>, restDays: Set<string>, today: string, reviewedOn?: string): boolean {
  let clean = 0
  for (let day = addDays(today, -1); clean < PROGRESSION_DAYS; day = addDays(day, -1)) {
    if (reviewedOn && day <= reviewedOn) return false
    if (fullDays.has(day)) clean++
    else if (!restDays.has(day)) return false
  }
  return true
}

/** The same plan with every target raised one step. */
export function raisePlan(plan: TrainingPlan): TrainingPlan {
  const raise = (list: RoutineExercise[]) => list.map(e => ({ ...e, target: nextTarget(e.target, e.unit) }))
  const workouts: TrainingPlan['workouts'] = {}
  for (const [kind, list] of Object.entries(plan.workouts) as [WorkoutKind, RoutineExercise[]][]) workouts[kind] = raise(list)
  return { ...plan, workouts, posture: raise(plan.posture) }
}

// ---- Rep counter ----

/** A body point in image coordinates (0-1). visibility is the camera's confidence it sees the point. */
export interface BodyPoint {
  x: number
  y: number
  visibility?: number
}

/** Standard 33-point body pose indices (left side; the right side is the next index). */
const SHOULDER = 11
const ELBOW = 13
const WRIST = 15
const HIP = 23
const KNEE = 25
const ANKLE = 27

interface Movement {
  joint: [number, number, number]
  /** Bent below this angle. */
  low: number
  /** Straight above this angle. A rep is counted when a bend is followed by straightening. */
  high: number
  /** Body orientation required, so waving your arms doesn't count as pushups. */
  posture?: 'horizontal' | 'upright'
}

const MOVEMENTS: Partial<Record<ExerciseKey, Movement>> = {
  pushups: { joint: [SHOULDER, ELBOW, WRIST], low: 95, high: 150, posture: 'horizontal' },
  squats: { joint: [HIP, KNEE, ANKLE], low: 105, high: 160, posture: 'upright' },
  gluteBridges: { joint: [SHOULDER, HIP, KNEE], low: 145, high: 168 },
}

/** Plank: shoulders, hips and ankles in a straight, roughly horizontal line. */
const PLANK = { joint: [SHOULDER, HIP, ANKLE] as [number, number, number], min: 155 }

const MIN_VISIBILITY = 0.5
/** Smoothing for the joint angle; lower is smoother but slower. */
const SMOOTHING = 0.45
/** Ignore gaps longer than this when timing a plank (e.g. the camera lost you). */
const MAX_FRAME_GAP_MS = 500

export interface CounterState {
  count: number
  /** Plank time held, in milliseconds. */
  heldMs: number
  phase: 'low' | 'high' | null
  angle: number | null
  lastT: number | null
  /** Whether the body is in view and in position on the latest frame. */
  tracking: boolean
  side: 'left' | 'right' | null
}

export const newCounter = (): CounterState => ({ count: 0, heldMs: 0, phase: null, angle: null, lastT: null, tracking: false, side: null })

/** Angle at b, in degrees, between the lines b→a and b→c. */
export function angleAt(a: BodyPoint, b: BodyPoint, c: BodyPoint): number {
  const ab = Math.atan2(a.y - b.y, a.x - b.x)
  const cb = Math.atan2(c.y - b.y, c.x - b.x)
  let deg = Math.abs(((ab - cb) * 180) / Math.PI)
  if (deg > 180) deg = 360 - deg
  return deg
}

/** Feeds one camera frame into the counter. points is null when no body was found. t is in milliseconds. */
export function countFrame(exercise: ExerciseKey, prev: CounterState, points: BodyPoint[] | null, t: number): CounterState {
  const gap = prev.lastT === null ? 0 : t - prev.lastT
  const state: CounterState = { ...prev, lastT: t, tracking: false }
  if (!points) return state

  if (exercise === 'plankSeconds') {
    const side = pickSide(points, PLANK.joint)
    if (!side) return state
    const [a, b, c] = side.points
    const straight = angleAt(a, b, c) >= PLANK.min && isHorizontal(a, b)
    state.side = side.name
    state.tracking = straight
    if (straight && prev.tracking && gap <= MAX_FRAME_GAP_MS) state.heldMs = prev.heldMs + gap
    return state
  }

  const move = MOVEMENTS[exercise]
  if (!move) return state
  const side = pickSide(points, move.joint)
  if (!side) return state
  const [a, b, c] = side.points
  if (move.posture === 'horizontal' && !isHorizontal(points[SHOULDER + side.offset], points[HIP + side.offset])) return state
  if (move.posture === 'upright' && isHorizontal(points[SHOULDER + side.offset], points[HIP + side.offset])) return state

  const raw = angleAt(a, b, c)
  const angle = prev.angle === null || prev.side !== side.name ? raw : prev.angle + SMOOTHING * (raw - prev.angle)
  state.angle = angle
  state.side = side.name
  state.tracking = true
  if (angle <= move.low) state.phase = 'low'
  else if (angle >= move.high) {
    if (prev.phase === 'low') state.count = prev.count + 1
    state.phase = 'high'
  }
  return state
}

/** Uses whichever side of the body the camera sees best. */
function pickSide(points: BodyPoint[], joint: [number, number, number]) {
  const sides = [
    { name: 'left' as const, offset: 0 },
    { name: 'right' as const, offset: 1 },
  ].map(s => {
    const pts = joint.map(i => points[i + s.offset])
    const seen = pts.every(Boolean) ? Math.min(...pts.map(p => p.visibility ?? 1)) : 0
    return { ...s, points: pts as [BodyPoint, BodyPoint, BodyPoint], seen }
  })
  const best = sides[0].seen >= sides[1].seen ? sides[0] : sides[1]
  return best.seen >= MIN_VISIBILITY ? best : null
}

function isHorizontal(shoulder?: BodyPoint, hip?: BodyPoint): boolean {
  if (!shoulder || !hip) return false
  return Math.abs(shoulder.x - hip.x) > Math.abs(shoulder.y - hip.y)
}

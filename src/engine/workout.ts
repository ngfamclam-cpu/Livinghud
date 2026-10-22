// The strength routine: daily targets, progress from logged sets, and the
// rep counter that turns body positions (from any camera: phone today,
// glasses later) into reps. Pure math, no camera or screen code.

import { addDays } from './time'
import type { ExerciseKey, ExerciseSet, ExerciseUnit, FitnessBaseline, Player, RoutineExercise } from './types'

export interface ExerciseInfo {
  key: ExerciseKey
  name: string
  unit: ExerciseUnit
  /** How the camera tracks it; 'manual' means type the number in. */
  tracking: 'reps' | 'hold' | 'manual'
  tip: string
}

/** Exercises the System knows. The camera can follow all but pull-ups; player-added ones are counted by hand. */
export const EXERCISES: ExerciseInfo[] = [
  { key: 'pushups', name: 'Pushups', unit: 'reps', tracking: 'reps', tip: 'Put the phone on the floor about 2 m away, side-on, so your whole body is in view.' },
  { key: 'squats', name: 'Squats', unit: 'reps', tracking: 'reps', tip: 'Stand side-on to the phone, about 2–3 m away, with your whole body in view.' },
  { key: 'plankSeconds', name: 'Plank', unit: 'seconds', tracking: 'hold', tip: 'Phone on the floor, side-on. The timer only runs while your body is straight.' },
  { key: 'pullups', name: 'Pull-ups', unit: 'reps', tracking: 'manual', tip: 'Count them yourself and enter the number.' },
  { key: 'gluteBridges', name: 'Glute bridges', unit: 'reps', tracking: 'reps', tip: 'Lie side-on to the phone with your shoulders, hips and knees in view.' },
]

export const exerciseInfo = (key: ExerciseKey): ExerciseInfo | undefined => EXERCISES.find(e => e.key === key)

export type RoutineTargets = Record<ExerciseKey, number>

/** The routine before the player edits it: the fitness test numbers. Exercises at 0 (e.g. no pull-ups yet) are left out. */
export function defaultRoutine(fitness: FitnessBaseline): RoutineExercise[] {
  return EXERCISES.filter(e => fitness[e.key as keyof FitnessBaseline] > 0).map(e => ({
    key: e.key,
    name: e.name,
    unit: e.unit,
    target: fitness[e.key as keyof FitnessBaseline],
  }))
}

/** The player's routine: their edited one, or the fitness test numbers. Null without either. */
export function playerRoutine(player: Pick<Player, 'routine' | 'fitness'>): RoutineExercise[] | null {
  if (player.routine) return player.routine
  return player.fitness ? defaultRoutine(player.fitness) : null
}

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

/** The strength quest's description for a routine. */
export function routineDescription(exercises: RoutineExercise[]): string {
  return exercises.map(e => `${e.name} ${formatAmount(e, e.target)}`).join(' · ') + '. Reps can be split across the day.'
}

// ---- Progression: numbers go up after 3 consistent weeks, never after one good day ----

export const PROGRESSION_DAYS = 21

/** About 25% more, rounded to a sensible step: 20 → 25, 40 → 50, 10 → 12, 60s → 75s. */
export function nextTarget(target: number, unit: ExerciseUnit): number {
  if (unit === 'seconds') return Math.max(target + 5, Math.round((target * 1.25) / 5) * 5)
  return Math.max(target + 1, Math.floor(target * 1.25))
}

/**
 * After 21 days in a row of the full routine (Recovery Days don't break the run),
 * the System offers harder targets. Returns the raised routine, or null if not yet.
 * Days on or before `reviewedOn` (the last accept or decline) don't count, so
 * "Not now" waits another 3 weeks.
 */
export function progressionOffer(
  exercises: RoutineExercise[],
  fullDays: Set<string>,
  restDays: Set<string>,
  today: string,
  reviewedOn?: string,
): RoutineExercise[] | null {
  let clean = 0
  for (let day = addDays(today, -1); clean < PROGRESSION_DAYS; day = addDays(day, -1)) {
    if (reviewedOn && day <= reviewedOn) return null
    if (fullDays.has(day)) clean++
    else if (!restDays.has(day)) return null
  }
  return exercises.map(e => ({ ...e, target: nextTarget(e.target, e.unit) }))
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

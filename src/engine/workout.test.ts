import { describe, expect, it } from 'vitest'
import { addDays, angleAt, countFrame, dayExercises, defaultPlan, newCounter, nextTarget, planDay, playerPlan, progressionDue, raisePlan, routineDone, routineLevel, routineTargets, type BodyPoint, type ExerciseKey, type ExerciseSet, type RoutineExercise } from './index'

// Synthetic camera frames: 33 body points, only the left side visible.
const blank = (): BodyPoint[] => Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }))
const at = (x: number, y: number): BodyPoint => ({ x, y, visibility: 0.9 })
/** A point at distance r from b, making angle deg with the upward direction from b. */
const bent = (b: BodyPoint, deg: number, r = 0.15) => at(b.x + r * Math.sin((deg * Math.PI) / 180), b.y - r * Math.cos((deg * Math.PI) / 180))

function pushupFrame(elbowDeg: number) {
  const p = blank()
  p[11] = at(0.3, 0.5) // shoulder
  p[23] = at(0.6, 0.52) // hip, level with the shoulder: lying down
  p[13] = at(0.3, 0.65) // elbow below the shoulder
  p[15] = bent(p[13], elbowDeg)
  return p
}

function squatFrame(kneeDeg: number) {
  const p = blank()
  p[11] = at(0.5, 0.2) // shoulder above the hip: standing
  p[23] = at(0.5, 0.5)
  p[25] = at(0.5, 0.65)
  p[27] = bent(p[25], kneeDeg)
  return p
}

function plankFrame(straight: boolean) {
  const p = blank()
  p[11] = at(0.2, 0.5)
  p[23] = at(0.5, straight ? 0.5 : 0.3)
  p[27] = at(0.8, 0.5)
  return p
}

/** Moves smoothly between angles, one frame every 33 ms. */
function sweep(path: number[], step = 8): number[] {
  const out: number[] = []
  for (let i = 1; i < path.length; i++) {
    const [a, b] = [path[i - 1], path[i]]
    for (let v = a; a < b ? v < b : v > b; v += a < b ? step : -step) out.push(v)
  }
  out.push(path[path.length - 1])
  return out
}

function run(exercise: ExerciseKey, frames: (BodyPoint[] | null)[], dt = 33) {
  let s = newCounter()
  frames.forEach((f, i) => (s = countFrame(exercise, s, f, i * dt)))
  return s
}

describe('rep counter', () => {
  it('measures joint angles', () => {
    expect(angleAt(at(0, 0), at(1, 0), at(1, 1))).toBeCloseTo(90)
    expect(angleAt(at(0, 0), at(1, 0), at(2, 0))).toBeCloseTo(180)
  })

  it('counts full pushups', () => {
    const angles = sweep([170, 70, 170, 70, 170, 70, 170])
    expect(run('pushups', angles.map(pushupFrame)).count).toBe(3)
  })

  it('does not count half pushups', () => {
    const angles = sweep([170, 120, 170, 120, 170])
    expect(run('pushups', angles.map(pushupFrame)).count).toBe(0)
  })

  it('does not count pushup arm movements while standing', () => {
    const standing = sweep([170, 70, 170]).map(a => {
      const p = pushupFrame(a)
      p[23] = at(0.3, 0.9) // hip below the shoulder
      return p
    })
    expect(run('pushups', standing).count).toBe(0)
  })

  it('counts squats', () => {
    expect(run('squats', sweep([175, 80, 175, 80, 175]).map(squatFrame)).count).toBe(2)
  })

  it('ignores frames where the body is out of view', () => {
    const angles = sweep([170, 70, 170])
    const frames = angles.map(pushupFrame) as (BodyPoint[] | null)[]
    frames.splice(5, 0, null, null)
    expect(run('pushups', frames).count).toBe(1)
  })

  it('uses the right side when it is the one in view', () => {
    const frames = sweep([170, 70, 170]).map(a => {
      const left = pushupFrame(a)
      const p = blank()
      for (const i of [11, 13, 15, 23]) p[i + 1] = left[i]
      return p
    })
    const s = run('pushups', frames)
    expect(s.count).toBe(1)
    expect(s.side).toBe('right')
  })

  it('times a plank only while the body is straight', () => {
    const frames = [...Array(31).fill(plankFrame(true)), ...Array(10).fill(plankFrame(false)), ...Array(31).fill(plankFrame(true))]
    const s = run('plankSeconds', frames, 100)
    expect(s.heldMs).toBe(6000)
  })
})

describe('routine', () => {
  const fitness = { pushups: 20, squats: 40, plankSeconds: 60, pullups: 0, gluteBridges: 12 }
  const set = (exercise: ExerciseKey, amount: number, day = '2026-10-21'): ExerciseSet => ({
    id: `${exercise}-${amount}-${day}`, userId: 'local', exercise, amount, day, source: 'manual', createdAt: 0,
  })
  const r = (key: string, target: number): RoutineExercise => ({ key, name: key, unit: 'reps', target })

  it('builds Push/Pull/Legs from the fitness test, with posture every day', () => {
    const plan = defaultPlan(fitness, '2026-10-01')
    expect(plan.cycle).toEqual(['push', 'pull', 'legs', 'push', 'pull', 'rest'])
    expect(plan.workouts.push?.find(e => e.key === 'pushups')?.target).toBe(20)
    expect(plan.workouts.legs?.find(e => e.key === 'squats')?.target).toBe(40)
    // No pull-ups yet: negatives build toward the first one.
    expect(plan.workouts.pull?.[0].key).toBe('pullupNegatives')
    expect(plan.posture.map(e => e.key)).toContain('chinTucks')
    expect(plan.posture.map(e => e.key)).toContain('hipFlexorStretch')
  })

  it('shows the workout and the posture routine, posture alone on rest days', () => {
    const plan = defaultPlan(fitness, '2026-10-01')
    const pull = dayExercises(plan, 'pull')
    expect(pull.filter(e => e.part === 'workout').map(e => e.key)).toEqual(['pullupNegatives', 'invertedRows', 'proneT', 'deadHang'])
    expect(pull.filter(e => e.part === 'posture').length).toBe(plan.posture.length)
    expect(dayExercises(plan, 'rest').every(e => e.part === 'posture')).toBe(true)
  })

  it('does not repeat an exercise that is in both the workout and posture', () => {
    const plan = { ...defaultPlan(fitness, '2026-10-01'), workouts: { push: [r('gluteBridges', 20)] } }
    expect(dayExercises(plan, 'push').filter(e => e.key === 'gluteBridges')).toEqual([{ ...r('gluteBridges', 20), part: 'workout' }])
  })

  it('keeps an older single routine as one every-day workout', () => {
    const routine = [r('lunges', 20)]
    const plan = playerPlan({ fitness, routine }, '2026-10-01')
    expect(plan.cycle).toEqual(['full'])
    expect(dayExercises(plan, 'full').map(e => e.key)).toEqual(['lunges'])
    expect(playerPlan({ fitness, routine, plan: defaultPlan(fitness, 'x') }, '2026-10-01').cycle[0]).toBe('push')
  })

  it('lets a correction lower the count, never below zero', () => {
    const corrected = { ...set('pushups', -5), source: 'correction' as const }
    expect(routineDone([set('pushups', 20), corrected], '2026-10-21')).toEqual({ pushups: 15 })
    expect(routineDone([set('pushups', 3), { ...corrected, amount: -9 }], '2026-10-21')).toEqual({ pushups: 0 })
  })

  it('adds up sets split across the day', () => {
    expect(routineDone([set('pushups', 12), set('pushups', 8), set('pushups', 5, '2026-10-20')], '2026-10-21')).toEqual({ pushups: 20 })
  })

  it('is full when every target is hit and minimum at half of each', () => {
    const targets = routineTargets([r('pushups', 20), r('squats', 40), r('gluteBridges', 12)])
    expect(routineLevel(targets, { pushups: 20, squats: 40 })).toBe(null)
    expect(routineLevel(targets, { pushups: 10, squats: 20, gluteBridges: 6 })).toBe('min')
    expect(routineLevel(targets, { pushups: 25, squats: 40, gluteBridges: 12 })).toBe('full')
  })
})

describe('training cycle', () => {
  const plan = defaultPlan(null, '2026-10-01') // push, pull, legs, push, pull, rest
  const trained = (...days: string[]) => new Set(days)

  it('starts at the first day', () => {
    expect(planDay(plan, trained(), '2026-10-01')).toMatchObject({ kind: 'push', index: 0, upcoming: ['pull', 'legs', 'push'] })
  })

  it('moves on when a day is trained', () => {
    expect(planDay(plan, trained('2026-10-01'), '2026-10-02').kind).toBe('pull')
    expect(planDay(plan, trained('2026-10-01', '2026-10-02'), '2026-10-03').kind).toBe('legs')
  })

  it('waits on a missed workout instead of skipping it', () => {
    expect(planDay(plan, trained('2026-10-01'), '2026-10-04').kind).toBe('pull')
  })

  it('passes a rest day by itself, and legs never come two days running', () => {
    const days = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05']
    expect(planDay(plan, trained(...days), '2026-10-06').kind).toBe('rest')
    expect(planDay(plan, trained(...days), '2026-10-07').kind).toBe('push')
  })

  it('counts from the day the player set as today', () => {
    const moved = { ...plan, startedOn: '2026-10-10', startIndex: 2 }
    expect(planDay(moved, trained('2026-10-01', '2026-10-02'), '2026-10-10').kind).toBe('legs')
  })
})

describe('progression', () => {
  const plan = defaultPlan({ pushups: 20, squats: 40, plankSeconds: 60, pullups: 10, gluteBridges: 12 }, '2026-10-01')
  const today = '2026-11-30'
  const daysBack = (n: number, from = today) => Array.from({ length: n }, (_, i) => addDays(from, -(i + 1)))

  it('raises targets about 25% in sensible steps, like the design doc', () => {
    expect([20, 40, 10, 12].map(n => nextTarget(n, 'reps'))).toEqual([25, 50, 12, 15])
    expect(nextTarget(60, 'seconds')).toBe(75)
    expect(nextTarget(1, 'reps')).toBe(2)
    expect(nextTarget(5, 'minutes')).toBe(6)
  })

  it('raises every day of the plan, posture included', () => {
    const raised = raisePlan(plan)
    expect(raised.workouts.push?.find(e => e.key === 'pushups')?.target).toBe(25)
    expect(raised.workouts.legs?.find(e => e.key === 'squats')?.target).toBe(50)
    expect(raised.posture.find(e => e.key === 'chinTucks')?.target).toBe(12)
    expect(raised.cycle).toEqual(plan.cycle)
  })

  it('is due after 21 full days in a row', () => {
    expect(progressionDue(new Set(daysBack(20)), new Set(), today)).toBe(false)
    expect(progressionDue(new Set(daysBack(21)), new Set(), today)).toBe(true)
  })

  it('does not count today, which may not be done yet', () => {
    expect(progressionDue(new Set([today, ...daysBack(20)]), new Set(), today)).toBe(false)
  })

  it('lets Recovery Days pass without breaking or adding to the run', () => {
    const full = daysBack(22).filter(d => d !== addDays(today, -5))
    expect(progressionDue(new Set(full), new Set([addDays(today, -5)]), today)).toBe(true)
    expect(progressionDue(new Set(full), new Set(), today)).toBe(false)
  })

  it('waits another 3 weeks after an accept or "Not now"', () => {
    const full = new Set(daysBack(40))
    expect(progressionDue(full, new Set(), today, addDays(today, -10))).toBe(false)
    expect(progressionDue(full, new Set(), today, addDays(today, -22))).toBe(true)
  })
})

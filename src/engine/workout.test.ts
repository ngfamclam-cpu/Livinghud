import { describe, expect, it } from 'vitest'
import { angleAt, countFrame, newCounter, routineDone, routineLevel, routineTargets, type BodyPoint, type ExerciseKey, type ExerciseSet } from './index'

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

  it('skips exercises with no target', () => {
    expect(routineTargets(fitness)).toEqual({ pushups: 20, squats: 40, plankSeconds: 60, gluteBridges: 12 })
  })

  it('adds up sets split across the day', () => {
    expect(routineDone([set('pushups', 12), set('pushups', 8), set('pushups', 5, '2026-10-20')], '2026-10-21')).toEqual({ pushups: 20 })
  })

  it('is full when every target is hit and minimum at half of each', () => {
    const targets = routineTargets(fitness)
    expect(routineLevel(targets, { pushups: 20, squats: 40, plankSeconds: 60 })).toBe(null)
    expect(routineLevel(targets, { pushups: 10, squats: 20, plankSeconds: 30, gluteBridges: 6 })).toBe('min')
    expect(routineLevel(targets, { pushups: 25, squats: 40, plankSeconds: 60, gluteBridges: 12 })).toBe('full')
  })
})

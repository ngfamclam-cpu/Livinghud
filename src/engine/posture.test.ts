import { describe, expect, it } from 'vitest'
import { headAngle, hipExtension, median, robustPeak, type BodyPoint } from './index'

const blank = (): BodyPoint[] => Array.from({ length: 33 }, () => ({ x: 0, y: 0, visibility: 0 }))
const at = (x: number, y: number): BodyPoint => ({ x, y, visibility: 0.95 })

describe('head angle', () => {
  it('is 90° with the ear straight above the shoulder, lower as the head comes forward', () => {
    const p = blank()
    p[11] = at(0.5, 0.5)
    p[7] = at(0.5, 0.3)
    expect(headAngle(p)).toBeCloseTo(90)
    p[7] = at(0.7, 0.3) // ear as far forward as it is high
    expect(headAngle(p)).toBeCloseTo(45)
  })

  it('needs the ear and shoulder in view', () => {
    const p = blank()
    p[11] = at(0.5, 0.5)
    expect(headAngle(p)).toBe(null)
    expect(headAngle(null)).toBe(null)
  })
})

describe('hip extension', () => {
  /** Someone walking to the right, thigh at `deg` from the trunk line (positive = behind them). */
  function walker(deg: number, facing: 1 | -1 = 1) {
    const p = blank()
    p[11] = at(0.5, 0.3) // shoulder
    p[23] = at(0.5, 0.6) // hip straight below
    const r = (deg * Math.PI) / 180
    p[25] = at(0.5 - facing * 0.25 * Math.sin(r), 0.6 + 0.25 * Math.cos(r)) // knee
    p[7] = at(0.5, 0.2) // ear
    p[0] = at(0.5 + facing * 0.05, 0.2) // nose points the way they walk
    return p
  }

  it('is positive when the thigh is behind the body', () => {
    expect(hipExtension(walker(15))).toBeCloseTo(15)
    expect(hipExtension(walker(-20))).toBeCloseTo(-20)
  })

  it('works whichever way you walk past the phone', () => {
    expect(hipExtension(walker(12, -1))).toBeCloseTo(12)
    expect(hipExtension(walker(-12, -1))).toBeCloseTo(-12)
  })
})

describe('scan summaries', () => {
  it('uses the median for a still pose and a glitch-proof peak for walking', () => {
    expect(median([50, 52, 51, 90, 49])).toBe(51)
    const frames = [...Array(18).fill(5), 14, 40] // one bad frame at 40
    expect(robustPeak(frames)).toBe(14)
  })
})

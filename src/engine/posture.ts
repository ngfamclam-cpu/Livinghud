// Posture scans from a side-on camera. These are phone-camera stand-ins for
// clinic measurements, so they are best for tracking your own trend, not for
// comparing with study numbers:
// - Head angle: like the craniovertebral angle, but measured from the shoulder
//   (a camera can't find the C7 vertebra). Higher means the head sits further back.
// - Hip extension: how far the thigh swings behind the body while walking. Low hip
//   extension during walking is often made up for by tipping the pelvis forward.

import type { BodyPoint } from './workout'

const NOSE = 0
const EAR = 7
const SHOULDER = 11
const HIP = 23
const KNEE = 25
const MIN_VISIBILITY = 0.6

const seen = (p?: BodyPoint) => !!p && (p.visibility ?? 1) >= MIN_VISIBILITY

/** The side of the body (0 left, 1 right) the camera sees best for these points, if any. */
function bestSide(points: BodyPoint[], indices: number[]): 0 | 1 | null {
  const score = (offset: number) => Math.min(...indices.map(i => (seen(points[i + offset]) ? points[i + offset].visibility ?? 1 : 0)))
  const [left, right] = [score(0), score(1)]
  if (Math.max(left, right) < MIN_VISIBILITY) return null
  return left >= right ? 0 : 1
}

/** Degrees above horizontal of the line from shoulder to ear. 90 = ear straight above the shoulder. */
export function headAngle(points: BodyPoint[] | null): number | null {
  if (!points) return null
  const side = bestSide(points, [EAR, SHOULDER])
  if (side === null) return null
  const ear = points[EAR + side]
  const shoulder = points[SHOULDER + side]
  const rise = shoulder.y - ear.y
  if (rise <= 0) return null
  return (Math.atan2(rise, Math.abs(ear.x - shoulder.x)) * 180) / Math.PI
}

/**
 * Hip angle in degrees between the trunk and the thigh, seen from the side:
 * positive when the thigh is behind the body (extension), negative in front (flexion).
 * Which way is "behind" comes from the direction the nose points.
 */
export function hipExtension(points: BodyPoint[] | null): number | null {
  if (!points) return null
  const side = bestSide(points, [SHOULDER, HIP, KNEE])
  if (side === null || !seen(points[NOSE]) || !seen(points[EAR + side])) return null
  const facing = Math.sign(points[NOSE].x - points[EAR + side].x)
  if (facing === 0) return null
  const shoulder = points[SHOULDER + side]
  const hip = points[HIP + side]
  const knee = points[KNEE + side]
  const trunk = { x: hip.x - shoulder.x, y: hip.y - shoulder.y }
  const thigh = { x: knee.x - hip.x, y: knee.y - hip.y }
  const dot = trunk.x * thigh.x + trunk.y * thigh.y
  const cross = trunk.x * thigh.y - trunk.y * thigh.x
  const angle = (Math.atan2(Math.abs(cross), dot) * 180) / Math.PI
  // With y pointing down, a thigh behind someone facing right gives a positive cross product.
  return Math.sign(cross) * facing >= 0 ? angle : -angle
}

/** The middle value: steady against a few bad camera frames. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/** A high value that ignores the top 10% of frames, so one glitch can't set the peak. */
export function robustPeak(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.9))]
}

/** Frames needed for a scan to count: about 2 seconds at typical phone frame rates. */
export const MIN_SCAN_FRAMES = 45

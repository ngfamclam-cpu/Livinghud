// Finds the person in a still photo for card cropping. Same on-device Google
// MediaPipe pose model as the rep counter, in still-image mode (it doesn't
// track between frames, so photos don't influence each other).

import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import type { PoseHint, Rect } from '../engine'

const MODEL_URL = '/models/pose_landmarker_lite.task'

let loading: Promise<PoseLandmarker> | null = null

function loadPhotoTracker(): Promise<PoseLandmarker> {
  loading ??= (async () => {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const files = { wasmLoaderPath, wasmBinaryPath }
    const create = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'IMAGE',
        numPoses: 1,
      })
    return create('GPU').catch(() => create('CPU'))
  })()
  loading.catch(() => (loading = null))
  return loading
}

/** Indexes of body points the model reports (MediaPipe pose order). */
const NOSE = 0
const L_SHOULDER = 11
const R_SHOULDER = 12
const L_WRIST = 15
const R_WRIST = 16
const L_ANKLE = 27
const R_ANKLE = 28

/**
 * The person's box in pixels of the given canvas, plus a few pose hints for the
 * flavour text. Null if no one is found (or the model can't load).
 */
export async function findPerson(canvas: HTMLCanvasElement): Promise<{ box: Rect; pose: PoseHint } | null> {
  let tracker: PoseLandmarker
  try {
    tracker = await loadPhotoTracker()
  } catch {
    return null
  }
  const points = tracker.detect(canvas).landmarks[0]
  if (!points) return null
  const seen = points.filter(p => (p.visibility ?? 1) > 0.5 && p.x > -0.05 && p.x < 1.05 && p.y > -0.05 && p.y < 1.05)
  if (seen.length < 5) return null
  const xs = seen.map(p => Math.max(0, Math.min(1, p.x)))
  const ys = seen.map(p => Math.max(0, Math.min(1, p.y)))
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  // The model's points stop at the face, so add a little headroom above the top point.
  const minY = Math.max(0, Math.min(...ys) - 0.06)
  const maxY = Math.max(...ys)
  const W = canvas.width
  const H = canvas.height
  const vis = (i: number) => (points[i]?.visibility ?? 0) > 0.5
  const pose: PoseHint = {
    armsUp: vis(L_WRIST) && vis(R_WRIST) && vis(NOSE) && points[L_WRIST].y < points[NOSE].y && points[R_WRIST].y < points[NOSE].y,
    leaning: vis(L_SHOULDER) && vis(R_SHOULDER) && Math.abs(points[L_SHOULDER].y - points[R_SHOULDER].y) > 0.06,
    closeUp: !vis(L_ANKLE) && !vis(R_ANKLE) && maxY - minY > 0.75,
    fullBody: vis(L_ANKLE) || vis(R_ANKLE),
  }
  return { box: { x: minX * W, y: minY * H, w: (maxX - minX) * W, h: (maxY - minY) * H }, pose }
}

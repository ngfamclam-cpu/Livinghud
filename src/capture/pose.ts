// Phone-camera body tracking. Runs entirely on the device with Google's free
// MediaPipe pose model: no video leaves the phone and nothing is paid for.
// It only reports body points; the engine decides what counts as a rep, so
// smart-glasses cameras can feed the same counter later.

import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import wasmLoaderPath from '@mediapipe/tasks-vision/vision_wasm_internal.js?url'
import wasmBinaryPath from '@mediapipe/tasks-vision/vision_wasm_internal.wasm?url'
import type { BodyPoint } from '../engine'

// Everything is served from this app (no outside downloads), and cached after the first workout.
// The model is Google's "pose landmarker lite" (Apache 2.0), saved in public/models.
const MODEL_URL = '/models/pose_landmarker_lite.task'

let loading: Promise<PoseLandmarker> | null = null

/** Loads the pose model once (a few MB, cached after the first workout). */
export function loadPoseTracker(): Promise<PoseLandmarker> {
  loading ??= (async () => {
    const { PoseLandmarker } = await import('@mediapipe/tasks-vision')
    const files = { wasmLoaderPath, wasmBinaryPath }
    const create = (delegate: 'GPU' | 'CPU') =>
      PoseLandmarker.createFromOptions(files, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: 'VIDEO',
        numPoses: 1,
      })
    // The graphics chip is faster; some phones only manage the CPU.
    return create('GPU').catch(() => create('CPU'))
  })()
  loading.catch(() => (loading = null))
  return loading
}

export async function openCamera(video: HTMLVideoElement, facing: 'user' | 'environment'): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 480 } },
    audio: false,
  })
  video.srcObject = stream
  await video.play()
  return stream
}

export function closeCamera(stream: MediaStream | null): void {
  stream?.getTracks().forEach(t => t.stop())
}

/** Body points in the current video frame, or null if no one is in view. */
export function detectBody(tracker: PoseLandmarker, video: HTMLVideoElement, t: number): BodyPoint[] | null {
  const result = tracker.detectForVideo(video, t)
  return result.landmarks[0] ?? null
}

/** Pairs of body points joined when drawing the stick figure over the video. */
export const BONES: [number, number][] = [
  [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
  [11, 23], [12, 24], [23, 24], [23, 25], [25, 27], [24, 26], [26, 28],
]

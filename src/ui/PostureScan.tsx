import { useEffect, useRef, useState } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { MIN_SCAN_FRAMES, headAngle, hipExtension, median, robustPeak, type PostureScan as Scan } from '../engine'
import { deleteScan, saveScan } from '../db/actions'
import { closeCamera, detectBody, drawBody, loadPoseTracker, openCamera, trueProportions } from '../capture/pose'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

type Kind = Scan['kind']
type Phase = 'idle' | 'starting' | 'countdown' | 'scanning' | 'done' | 'error'

const WALK_SECONDS = 10
/** Time to put the phone down and get into place. */
const COUNTDOWN_SECONDS = 5

const INFO: Record<Kind, { title: string; how: string; unit: string; meaning: string }> = {
  head: {
    title: 'Head scan',
    how: 'Prop the phone at chest height about 2 m away and stand side-on to it, relaxed, the way you normally stand. Don’t correct yourself; the point is to measure your usual posture. Hold still for a few seconds.',
    unit: 'head angle',
    meaning: 'How high your ear sits above your shoulder: higher means your head sits further back. It’s a phone-camera version of the angle posture studies use, so compare it with your own earlier scans rather than with study numbers.',
  },
  walk: {
    title: 'Walking scan',
    how: `Put the phone on a shelf or chair at hip height, 3–4 m from where you’ll walk. After the countdown, walk past it side-on at your normal pace, turn, and walk back for ${WALK_SECONDS} seconds.`,
    unit: 'hip extension',
    meaning: 'How far your back leg swings behind your body as you walk. When the hip doesn’t extend, the pelvis often tips forward to make up for it, so a rising number is a good sign.',
  },
}

export function PostureScan({ scans, onClose }: { scans: Scan[]; onClose: () => void }) {
  const [kind, setKind] = useState<Kind>('head')
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  const [countdown, setCountdown] = useState(0)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('environment')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const info = INFO[kind]

  const stop = () => {
    closeCamera(streamRef.current)
    streamRef.current = null
  }
  useEffect(() => stop, [])

  // The measuring loop: collects one value per camera frame while scanning.
  useEffect(() => {
    if (phase !== 'scanning') return
    let frame = 0
    let tracker: PoseLandmarker | null = null
    let lastTime = -1
    const values: number[] = []
    const started = performance.now()
    loadPoseTracker().then(t => (tracker = t))

    const finish = () => {
      stop()
      const value = kind === 'head' ? median(values) : robustPeak(values)
      say(values.length < MIN_SCAN_FRAMES ? 'Scan failed' : 'Scan complete')
      if (value === null || values.length < MIN_SCAN_FRAMES) {
        setError(kind === 'head' ? 'Couldn’t see your ear and shoulder clearly. Stand side-on, a bit further away, in good light.' : 'Couldn’t follow your walk. Move the phone further back so your whole body stays in view.')
        setPhase('error')
      } else {
        setResult(value)
        setPhase('done')
      }
    }

    const tick = () => {
      frame = requestAnimationFrame(tick)
      const video = videoRef.current
      if (!tracker || !video || video.readyState < 2 || video.currentTime === lastTime) return
      lastTime = video.currentTime
      const raw = detectBody(tracker, video, performance.now())
      drawBody(canvasRef.current, video, raw)
      const points = trueProportions(raw, video)
      const value = kind === 'head' ? headAngle(points) : hipExtension(points)
      if (value !== null) values.push(value)
      const elapsed = (performance.now() - started) / 1000
      if (kind === 'head') {
        setProgress(Math.min(1, values.length / (MIN_SCAN_FRAMES * 2)))
        if (values.length >= MIN_SCAN_FRAMES * 2 || elapsed > 15) finish()
      } else {
        setProgress(Math.min(1, elapsed / WALK_SECONDS))
        if (elapsed >= WALK_SECONDS) finish()
      }
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [phase, kind])

  // Walking scans start after a countdown so there is time to get into place.
  useEffect(() => {
    if (phase !== 'countdown') return
    if (countdown <= 0) {
      say(kind === 'head' ? 'Hold still' : 'Start walking')
      setPhase('scanning')
      return
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [phase, countdown, kind])

  const start = async () => {
    setError('')
    setResult(null)
    setProgress(0)
    setPhase('starting')
    try {
      stop()
      const [, stream] = await Promise.all([loadPoseTracker(), openCamera(videoRef.current!, facing)])
      streamRef.current = stream
      setCountdown(COUNTDOWN_SECONDS)
      setPhase('countdown')
    } catch (e) {
      stop()
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setError(denied ? 'Camera access is blocked. In Chrome, tap the icon left of the address, allow Camera, then try again.' : 'Couldn’t start the camera.')
      setPhase('error')
    }
  }

  const save = async () => {
    if (result === null) return
    await saveScan(kind, result)
    setPhase('idle')
    setResult(null)
  }

  const switchKind = (k: Kind) => {
    stop()
    setKind(k)
    setPhase('idle')
    setResult(null)
    setError('')
  }

  const history = scans.filter(s => s.kind === kind).sort((a, b) => b.createdAt - a.createdAt)
  const first = history[history.length - 1]
  const cameraOn = phase === 'countdown' || phase === 'scanning'

  return (
    <main className="hud">
      <SystemWindow title="Posture scan">
        <div className="tabs-inline">
          {(['head', 'walk'] as Kind[]).map(k => (
            <button key={k} className={`chip ${kind === k ? 'picked' : ''}`} onClick={() => switchKind(k)}>{INFO[k].title}</button>
          ))}
        </div>
        <p>{info.how}</p>

        <div className={`camera ${cameraOn ? 'on' : ''} ${facing === 'user' ? 'mirrored' : ''}`}>
          <video ref={videoRef} playsInline muted />
          <canvas ref={canvasRef} />
          {phase === 'countdown' && <span className="countdown">{countdown}</span>}
        </div>
        {phase === 'countdown' && <p className="muted">Get into place. The phone will say when to {kind === 'head' ? 'hold still' : 'start walking'}.</p>}
        {phase === 'scanning' && <Bar value={progress} max={1} label={kind === 'head' ? 'Hold still…' : 'Keep walking…'} />}

        {phase === 'done' && result !== null && (
          <div className="scan-result">
            <span className="live-number">{Math.round(result)}°</span>
            <span className="muted"> {info.unit}</span>
            {first && <p className="muted">First scan: {Math.round(first.value)}° on {first.day} ({signed(result - first.value)}°)</p>}
            <div className="row">
              <button onClick={save}>Save scan</button>
              <button className="ghost" onClick={start}>Retake</button>
            </div>
          </div>
        )}
        {error && <p className="error">{error}</p>}

        {(phase === 'idle' || phase === 'error') && (
          <div className="row">
            <button onClick={start}>Start {info.title.toLowerCase()}</button>
            <button className="ghost small" onClick={() => setFacing(f => (f === 'user' ? 'environment' : 'user'))}>
              {facing === 'user' ? 'Use back camera' : 'Use front camera'}
            </button>
          </div>
        )}
        {phase === 'starting' && <p className="muted">Starting camera…</p>}
        <p className="muted">{info.meaning}</p>
      </SystemWindow>

      <SystemWindow title={`${info.title} history`}>
        {history.length === 0 ? (
          <p className="muted">No scans yet. One a week is enough to see a trend.</p>
        ) : (
          <ul className="board-list compact scan-history">
            {history.map(s => (
              <li key={s.id}>
                <span className="quest-title">{s.day}</span>
                <Bar value={s.value} max={kind === 'head' ? 90 : 30} thin />
                <span className="routine-count">{Math.round(s.value)}°</span>
                <button className="ghost small icon" aria-label="Delete scan" title="Delete" onClick={() => deleteScan(s.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>

      <button className="ghost settings-button" onClick={() => { stop(); onClose() }}>Back</button>
    </main>
  )
}

function say(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

const signed = (n: number) => `${n >= 0 ? '+' : ''}${Math.round(n)}`

import { useEffect, useRef, useState } from 'react'
import type { PoseLandmarker } from '@mediapipe/tasks-vision'
import { PROGRESSION_DAYS, countFrame, emit, exerciseInfo, formatAmount, newCounter, routineLevel, type BodyPoint, type CounterState, type ExerciseKey, type ExerciseSet, type Summary } from '../engine'
import { correctTotal, deleteSet, logSet } from '../db/actions'
import { RoutineEditor } from './RoutineEditor'
import { BONES, closeCamera, detectBody, loadPoseTracker, openCamera } from '../capture/pose'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

type CameraState = 'off' | 'loading' | 'on' | 'error'

export function Workout({ summary, sets, onClose }: { summary: Summary; sets: ExerciseSet[]; onClose: () => void }) {
  const routine = summary.routine
  const exercises = routine?.exercises ?? []
  const firstOpen = exercises.find(e => (routine?.done[e.key] ?? 0) < e.target)
  const [picked, setExercise] = useState<ExerciseKey>((firstOpen ?? exercises[0])?.key ?? 'pushups')
  // After an edit removes the picked exercise, fall back to the first one.
  const current = exercises.find(e => e.key === picked) ?? exercises[0]
  const exercise = current?.key ?? picked
  const [editing, setEditing] = useState(false)
  const [fixing, setFixing] = useState(false)
  const [fixValue, setFixValue] = useState('')
  const [camera, setCamera] = useState<CameraState>('off')
  const [error, setError] = useState('')
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [speak, setSpeak] = useState(true)
  const [live, setLive] = useState(0)
  const [tracking, setTracking] = useState(false)
  const [manual, setManual] = useState('')

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const counterRef = useRef<CounterState>(newCounter())
  /** Of the live amount, how much is already logged as sets. */
  const savedRef = useRef(0)
  const doneRef = useRef(0)
  const speakRef = useRef(speak)
  // The camera can follow the System's built-in exercises; player-added ones are counted by hand.
  const known = exerciseInfo(exercise)
  const info = {
    name: current?.name ?? known?.name ?? exercise,
    unit: current?.unit ?? known?.unit ?? 'reps',
    tracking: known?.tracking ?? 'manual',
    tip: known?.tip ?? 'Count them yourself and enter the number.',
  }
  const target = routine?.targets[exercise] ?? 0
  const done = routine?.done[exercise] ?? 0
  doneRef.current = done
  speakRef.current = speak

  const amountOf = (c: CounterState) => (info.tracking === 'hold' ? Math.floor(c.heldMs / 1000) : c.count)

  /** Logs whatever the camera counted that isn't saved yet. */
  const flush = () => {
    const amount = amountOf(counterRef.current) - savedRef.current
    if (amount > 0) {
      savedRef.current += amount
      void logSet(exercise, amount, 'camera')
    }
  }

  // The camera loop: runs while the camera is on, restarts when the exercise changes.
  useEffect(() => {
    if (camera !== 'on') return
    let frame = 0
    let lastVideoTime = -1
    let shown = -1
    let tracker: PoseLandmarker | null = null
    let reachedTarget = doneRef.current >= target
    counterRef.current = newCounter()
    savedRef.current = 0
    setLive(0)
    loadPoseTracker().then(t => (tracker = t))

    const tick = () => {
      frame = requestAnimationFrame(tick)
      const video = videoRef.current
      if (!tracker || !video || video.readyState < 2 || video.currentTime === lastVideoTime) return
      lastVideoTime = video.currentTime
      const t = performance.now()
      const points = detectBody(tracker, video, t)
      const next = countFrame(exercise, counterRef.current, points, t)
      counterRef.current = next
      draw(canvasRef.current, video, points)
      setTracking(next.tracking)

      const amount = amountOf(next)
      if (amount === shown) return
      shown = amount
      setLive(amount)
      if (info.unit === 'reps') {
        emit({ type: 'workout.rep', exercise, count: amount })
        if (speakRef.current) say(String(amount))
      } else if (speakRef.current && amount > 0 && amount % 10 === 0) say(`${amount} seconds`)

      const total = doneRef.current + amount - savedRef.current
      if (!reachedTarget && total >= target) {
        reachedTarget = true
        if (speakRef.current) say(`${info.name} complete`)
        flush()
      }
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      flush()
    }
    // flush and amountOf only read refs and the exercise this effect was made for.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camera, exercise])

  // Keep the screen awake and save the set if the app goes to the background.
  useEffect(() => {
    if (camera !== 'on') return
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock?.request('screen').then(l => (lock = l)).catch(() => {})
    const onHide = () => document.visibilityState === 'hidden' && stopCamera()
    document.addEventListener('visibilitychange', onHide)
    return () => {
      lock?.release().catch(() => {})
      document.removeEventListener('visibilitychange', onHide)
    }
  }, [camera])

  useEffect(() => () => closeCamera(streamRef.current), [])

  const startCamera = async (face = facing) => {
    setError('')
    setCamera('loading')
    try {
      closeCamera(streamRef.current)
      const [, stream] = await Promise.all([loadPoseTracker(), openCamera(videoRef.current!, face)])
      streamRef.current = stream
      setCamera('on')
    } catch (e) {
      closeCamera(streamRef.current)
      streamRef.current = null
      setCamera('error')
      const denied = e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'SecurityError')
      setError(
        denied
          ? 'Camera access is blocked. In Chrome, tap the icon left of the address, allow Camera, then try again.'
          : 'Couldn’t start body tracking. It needs an internet connection the first time. You can still enter reps by hand below.',
      )
    }
  }

  function stopCamera() {
    closeCamera(streamRef.current)
    streamRef.current = null
    setCamera('off')
  }

  const flip = () => {
    const face = facing === 'user' ? 'environment' : 'user'
    setFacing(face)
    if (camera === 'on') void startCamera(face)
  }

  const addManual = async () => {
    await logSet(exercise, Number(manual), 'manual')
    setManual('')
  }

  if (editing || !routine || exercises.length === 0) {
    return <RoutineEditor exercises={exercises} onDone={() => (routine && exercises.length > 0 ? setEditing(false) : onClose())} />
  }

  const saveFix = async () => {
    stopCamera()
    await correctTotal(exercise, Number(fixValue))
    setFixing(false)
    setFixValue('')
  }

  const level = routineLevel(routine.targets, routine.done)
  const pending = camera === 'on' ? live - savedRef.current : 0
  const shownTotal = done + Math.max(0, pending)
  const todaySets = sets.filter(s => s.day === summary.today && s.exercise === exercise).sort((a, b) => b.createdAt - a.createdAt)

  return (
    <main className="hud workout">
      <SystemWindow title="Strength routine">
        <ul className="routine-list">
          {exercises.map(e => {
            const d = routine.done[e.key] ?? 0
            const t = e.target
            return (
              <li key={e.key}>
                <button className={`routine-item ${e.key === exercise ? 'picked' : ''} ${d >= t ? 'done' : ''}`} onClick={() => setExercise(e.key)}>
                  <span className="quest-title">{e.name}</span>
                  <span className="routine-count">{Math.min(d, t)}/{formatAmount(e, t)}</span>
                  <Bar value={d} max={t} thin />
                </button>
              </li>
            )
          })}
        </ul>
        {level === 'full' && <p className="system-line clear">Routine complete. Quest cleared.</p>}
        {level === 'min' && <p className="muted">Half of every target done: you can claim the minimum version on the HUD, or keep going.</p>}
        <p className="muted">
          Targets start from your fitness test and are yours to change. After {PROGRESSION_DAYS} days in a row of the full routine, the System offers to raise them.
        </p>
        <button className="ghost small" onClick={() => { stopCamera(); setEditing(true) }}>Edit routine</button>
      </SystemWindow>

      <SystemWindow title={info.name}>
        <div className="live-count">
          <span className="live-number">{shownTotal}</span>
          <span className="muted"> / {target} {info.unit}</span>
        </div>
        <Bar value={shownTotal} max={target} />

        {info.tracking !== 'manual' && (
          <>
            <div className={`camera ${camera === 'on' ? 'on' : ''} ${facing === 'user' ? 'mirrored' : ''}`}>
              <video ref={videoRef} playsInline muted />
              <canvas ref={canvasRef} />
              {camera === 'on' && (
                <span className={`tracking-badge ${tracking ? 'ok' : ''}`}>
                  {tracking ? (info.tracking === 'hold' ? 'Holding' : 'Tracking') : info.tracking === 'hold' ? 'Get into position' : 'Get your whole body in view'}
                </span>
              )}
            </div>
            <p className="muted">{info.tip}</p>
            {error && <p className="error">{error}</p>}
            <div className="row">
              {camera === 'on' ? (
                <button onClick={stopCamera}>Stop and save</button>
              ) : (
                <button disabled={camera === 'loading'} onClick={() => startCamera()}>{camera === 'loading' ? 'Starting camera…' : 'Start camera'}</button>
              )}
              <button className="ghost small" onClick={flip}>{facing === 'user' ? 'Use back camera' : 'Use front camera'}</button>
              <label className="check">
                <input type="checkbox" checked={speak} onChange={e => setSpeak(e.target.checked)} /> Count out loud
              </label>
            </div>
          </>
        )}

        <div className="inline-form manual">
          <input type="number" min={1} inputMode="numeric" placeholder={`Add ${info.unit} by hand`} value={manual} onChange={e => setManual(e.target.value)} />
          <button className="small ghost" disabled={!(Number(manual) > 0)} onClick={addManual}>Add</button>
        </div>
        {fixing ? (
          <div className="fix-count">
            <p className="muted">Camera got it wrong? Enter today's real total for {info.name.toLowerCase()}. This replaces the count, on your honour.</p>
            <div className="inline-form">
              <input type="number" min={0} inputMode="numeric" placeholder={`Today's total ${info.unit}`} value={fixValue} onChange={e => setFixValue(e.target.value)} autoFocus />
              <button className="small" disabled={fixValue === '' || Number(fixValue) < 0} onClick={saveFix}>Set total</button>
              <button className="small ghost" onClick={() => setFixing(false)}>Cancel</button>
            </div>
          </div>
        ) : (
          <button className="ghost small" onClick={() => { setFixValue(String(shownTotal)); setFixing(true) }}>Fix today's count</button>
        )}
        {todaySets.length > 0 && (
          <ul className="board-list compact">
            {todaySets.map(s => (
              <li key={s.id}>
                <span className="quest-title">
                  {s.amount > 0 ? '+' : ''}{s.amount} {info.unit}{' '}
                  <small className="muted">{SOURCE_LABEL[s.source]} · {new Date(s.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</small>
                </span>
                <button className="ghost small icon" aria-label="Delete set" title="Delete" onClick={() => deleteSet(s.id)}>×</button>
              </li>
            ))}
          </ul>
        )}
      </SystemWindow>

      <button className="ghost settings-button" onClick={() => { stopCamera(); onClose() }}>Back to HUD</button>
    </main>
  )
}

const SOURCE_LABEL: Record<ExerciseSet['source'], string> = { camera: 'camera', manual: 'by hand', correction: 'correction' }

function say(text: string) {
  if (!('speechSynthesis' in window)) return
  speechSynthesis.cancel()
  speechSynthesis.speak(new SpeechSynthesisUtterance(text))
}

/** Draws the tracked body as a glowing stick figure over the video. */
function draw(canvas: HTMLCanvasElement | null, video: HTMLVideoElement, points: BodyPoint[] | null) {
  if (!canvas) return
  if (canvas.width !== video.videoWidth) {
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  if (!points) return
  ctx.strokeStyle = '#5fd0ff'
  ctx.fillStyle = '#ffcf5c'
  ctx.lineWidth = 4
  ctx.shadowColor = 'rgba(47, 143, 255, 0.9)'
  ctx.shadowBlur = 8
  for (const [a, b] of BONES) {
    const p = points[a]
    const q = points[b]
    if (!p || !q || (p.visibility ?? 1) < 0.4 || (q.visibility ?? 1) < 0.4) continue
    ctx.beginPath()
    ctx.moveTo(p.x * canvas.width, p.y * canvas.height)
    ctx.lineTo(q.x * canvas.width, q.y * canvas.height)
    ctx.stroke()
  }
  for (const i of [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28]) {
    const p = points[i]
    if (!p || (p.visibility ?? 1) < 0.4) continue
    ctx.beginPath()
    ctx.arc(p.x * canvas.width, p.y * canvas.height, 5, 0, Math.PI * 2)
    ctx.fill()
  }
}

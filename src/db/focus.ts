// The focus session in progress, kept in this device's storage so it survives
// the app being closed or the phone locking. Finished sessions go to the
// database through saveFocusRun.

import { STRICT_GRACE_MS, type StatKey } from '../engine'
import { saveFocusRun } from './actions'

const KEY = 'livinghud-focus'

export interface ActiveFocus {
  label: string
  stat: StatKey
  questId: string | null
  bossId: string | null
  plannedMin: number
  strict: boolean
  startedAt: number
  /** Strict sessions: when the app was last left. */
  leftAt: number | null
}

export function activeFocus(): ActiveFocus | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as ActiveFocus) : null
  } catch {
    return null
  }
}

function store(run: ActiveFocus | null) {
  try {
    if (run) localStorage.setItem(KEY, JSON.stringify(run))
    else localStorage.removeItem(KEY)
  } catch {
    /* storage blocked: the session just won't survive a reload */
  }
}

export function startFocus(run: Omit<ActiveFocus, 'startedAt' | 'leftAt'>): ActiveFocus {
  const active = { ...run, startedAt: Date.now(), leftAt: null }
  store(active)
  return active
}

/** Minutes focused so far (until leaving, for a broken strict session). */
export const focusedMinutes = (run: ActiveFocus, until = Date.now()) => Math.max(0, (until - run.startedAt) / 60_000)

/** Ends the session and saves it. `cleared` when it ran the whole planned time. */
export async function endFocus(run: ActiveFocus, cleared: boolean, until = Date.now()): Promise<void> {
  // The countdown and the "came back to the app" check can both try to end it: only the first one saves.
  if (activeFocus()?.startedAt !== run.startedAt) return
  store(null)
  const minutes = cleared ? run.plannedMin : focusedMinutes(run, until)
  await saveFocusRun({ ...run, minutes, cleared })
}

export function abandonFocus(): void {
  store(null)
}

/**
 * Checks the session when the app opens or comes back: finishes it if time ran
 * out while away, or breaks a strict one if the app was left too long.
 * Returns what happened, for the screen to show.
 */
export async function checkFocus(now = Date.now()): Promise<'running' | 'cleared' | 'broken' | null> {
  const run = activeFocus()
  if (!run) return null
  if (run.strict && run.leftAt && now - run.leftAt > STRICT_GRACE_MS) {
    await endFocus(run, false, run.leftAt)
    return 'broken'
  }
  if (focusedMinutes(run, now) >= run.plannedMin) {
    await endFocus(run, true)
    return 'cleared'
  }
  if (run.leftAt) store({ ...run, leftAt: null })
  return 'running'
}

/** Strict sessions note when the app is left; coming back in time clears it. */
export function noteLeft(now = Date.now()): void {
  const run = activeFocus()
  if (run?.strict && !run.leftAt) store({ ...run, leftAt: now })
}

/** App-wide: strict sessions note when the app is left, and are checked when it comes back. */
export function startFocusWatch(): void {
  void checkFocus()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') noteLeft()
    else void checkFocus()
  })
}

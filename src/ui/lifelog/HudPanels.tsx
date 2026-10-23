import { useEffect, useState } from 'react'
import { photoOfDay, type Memory, type Summary } from '../../engine'
import { isNewArea, locate, locationAllowed } from '../../db/memories'
import { SystemWindow } from '../SystemWindow'
import { Photo } from './Photo'

/** Today's page on the HUD: the photo of the day (or a nudge), the reflection, and a way in. */
export function TodayPage({
  summary,
  memories,
  journaledToday,
  showJournal,
  onLifeLog,
  onJournal,
}: {
  summary: Summary
  memories: Memory[]
  journaledToday: boolean
  showJournal: boolean
  onLifeLog: (camera?: boolean) => void
  onJournal: () => void
}) {
  const today = memories.filter(m => m.day === summary.today)
  const hero = photoOfDay(today)
  return (
    <SystemWindow title="Today's page" className="today-page">
      <div className="today-row">
        {hero ? (
          <Photo id={hero.photoId} alt="Today's photo" className="today-thumb" onClick={() => onLifeLog()} />
        ) : (
          <button className="today-thumb empty" onClick={() => onLifeLog(true)} aria-label="Take today's photo">📷</button>
        )}
        <div className="grow">
          <p className={hero ? 'system-line' : ''}>
            {hero ? 'Photo of the day captured.' : today.length ? 'A note is logged. Add a photo to fully clear "Photo of the day".' : 'No memory yet today.'}
          </p>
          <p className="muted">
            {today.length} memor{today.length === 1 ? 'y' : 'ies'} today
            {showJournal ? ` · reflection ${journaledToday ? 'saved' : 'not written'}` : ''}
          </p>
        </div>
      </div>
      <div className="row end">
        {showJournal && <button className="ghost small" onClick={onJournal}>{journaledToday ? 'Edit reflection' : 'Reflect'}</button>}
        <button className="ghost small" onClick={() => onLifeLog()}>Life log</button>
        <button className="small" onClick={() => onLifeLog(true)}>📷 Photo now</button>
      </div>
    </SystemWindow>
  )
}

const DISMISSED = 'livinghud-new-area'
const CHECK_EVERY_MS = 10 * 60_000
let lastCheck = 0

/**
 * "New area discovered" when the app opens somewhere you haven't logged. Only
 * checks if location is already allowed, so it never pops up a permission prompt.
 */
export function NewAreaBanner({ onSnap }: { onSnap: () => void }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    let live = true
    const check = async () => {
      if (document.visibilityState !== 'visible' || Date.now() - lastCheck < CHECK_EVERY_MS) return
      lastCheck = Date.now()
      if (!(await locationAllowed())) return
      const pos = await locate(15_000)
      if (!pos || pos.accuracy > 500 || !live) return
      // Dismissing hides it until you're somewhere else.
      const spot = `${pos.lat.toFixed(3)},${pos.lon.toFixed(3)}`
      try {
        if (localStorage.getItem(DISMISSED) === spot) return
      } catch {
        // ignore
      }
      if (live && (await isNewArea(pos))) setShow(true)
      try {
        sessionStorage.setItem(`${DISMISSED}-spot`, spot)
      } catch {
        // ignore
      }
    }
    void check()
    document.addEventListener('visibilitychange', check)
    return () => {
      live = false
      document.removeEventListener('visibilitychange', check)
    }
  }, [])

  if (!show) return null
  const dismiss = () => {
    setShow(false)
    try {
      const spot = sessionStorage.getItem(`${DISMISSED}-spot`)
      if (spot) localStorage.setItem(DISMISSED, spot)
    } catch {
      // ignore
    }
  }
  return (
    <SystemWindow title="New area discovered" className="new-area">
      <p className="system-line">You haven't logged this place before. Snap a memory?</p>
      <div className="row end">
        <button className="ghost small" onClick={dismiss}>Not now</button>
        <button className="small" onClick={() => { setShow(false); onSnap() }}>📷 Snap a memory</button>
      </div>
    </SystemWindow>
  )
}

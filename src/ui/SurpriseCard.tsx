import { useEffect } from 'react'
import { SURPRISE_XP, dailySurprise, emit, surpriseState, type Player, type Summary, type SurpriseClear } from '../engine'
import { clearSurprise, surpriseSeed } from '../db/actions'
import { SystemWindow } from './SystemWindow'

const ANNOUNCED = 'livinghud-surprise-announced'

/** Today's surprise challenge on the HUD, once it has appeared. Hidden until then. */
export function SurpriseCard({ player, summary, cleared, now }: { player: Player; summary: Summary; cleared: SurpriseClear[]; now: Date }) {
  const s = dailySurprise(summary.today, surpriseSeed(player), player.stats, player.settings.wakeTime, player.settings.bedTime)
  const done = cleared.some(c => c.day === summary.today)
  const state = s ? surpriseState(s, done, now.getTime()) : 'upcoming'

  // Announce it once, the first time it's seen open on this device.
  useEffect(() => {
    if (state !== 'open' || !s) return
    try {
      if (localStorage.getItem(ANNOUNCED) === summary.today) return
      localStorage.setItem(ANNOUNCED, summary.today)
    } catch {
      return
    }
    emit({ type: 'surprise.appeared', text: s.challenge.text })
    if ('speechSynthesis' in window) speechSynthesis.speak(new SpeechSynthesisUtterance('Surprise quest'))
  }, [state, s, summary.today])

  if (!s || state === 'upcoming') return null
  if (state === 'missed') return <p className="muted surprise-missed">Today's surprise quest slipped away. Tomorrow brings another.</p>

  const minutesLeft = Math.max(0, Math.ceil((s.closesAt - now.getTime()) / 60_000))
  return (
    <SystemWindow title="Surprise quest" className={`surprise ${state}`}>
      <p className="system-line">{s.challenge.text}</p>
      {state === 'open' ? (
        <div className="row">
          <span className="muted grow">{s.challenge.stat} · +{SURPRISE_XP} XP · {minutesLeft} min left</span>
          <button className="small" onClick={() => clearSurprise()}>Done</button>
        </div>
      ) : (
        <p className="cleared">CLEAR +{SURPRISE_XP} XP</p>
      )}
    </SystemWindow>
  )
}

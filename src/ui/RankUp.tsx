import { useEffect, useState } from 'react'
import { onGameEvent } from '../engine'

/** Full-screen Hunter rank-up: the new rank letter bursts in with a shockwave. */
export function RankUp({ rank }: { rank: string }) {
  const [shown, setShown] = useState<{ rank: string; title: string; level: number } | null>(null)
  // Your Hunter rank tints every window's frame (CSS reads data-hunter).
  useEffect(() => {
    document.documentElement.dataset.hunter = rank
  }, [rank])
  useEffect(() => onGameEvent(e => {
    if (e.type === 'hunter.rankup') setShown({ rank: e.rank, title: e.title, level: e.level })
  }), [])
  if (!shown) return null
  return (
    <div className={`overlay rank-up hunter-${shown.rank}`} role="dialog" aria-label={`Rank up: ${shown.title}`} onClick={() => setShown(null)}>
      <p className="rank-up-kicker">[SYSTEM] RANK UP</p>
      <div className="rank-up-letter" aria-hidden="true">
        <span className="rank-up-wave" />
        <span className="rank-up-wave w2" />
        {shown.rank}
      </div>
      <p className="rank-up-title">{shown.title}</p>
      <p className="muted">Level {shown.level}. Your Hunter frame and aura changed, and your avatar is getting stronger.</p>
      <button className="arise" onClick={() => setShown(null)}>Arise</button>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { onGameEvent, type GameEvent } from '../engine'

interface Toast {
  id: number
  text: string
  big?: boolean
}

let nextId = 1
const MAX_VISIBLE = 2

function toastFor(event: GameEvent): Toast | null {
  switch (event.type) {
    case 'quest.completed':
      return { id: nextId++, text: `Quest cleared: ${event.questTitle}  +${event.completion.xp} XP  +$${event.completion.dollars.toFixed(2)}` }
    case 'level.up':
      return { id: nextId++, text: `LEVEL UP! You are now level ${event.level}.`, big: true }
    case 'wallet.full':
      return { id: nextId++, text: `Reward Wallet full: $${event.budget} earned this month. Extra earnings go to the Vault.`, big: true }
    case 'player.awakened':
      return { id: nextId++, text: `Welcome, ${event.name}. Your daily quests have arrived.`, big: true }
    default:
      return null
  }
}

/** Listens on the event bus. The glasses client (Phase 8) will listen the same way. */
export function SystemToasts() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(
    () =>
      onGameEvent(event => {
        const toast = toastFor(event)
        if (!toast) return
        // Keep it glanceable: only the newest few pop-ups stay on screen.
        setToasts(t => [...t, toast].slice(-MAX_VISIBLE))
        setTimeout(() => setToasts(t => t.filter(x => x.id !== toast.id)), toast.big ? 4000 : 2500)
      }),
    [],
  )

  return (
    <div className="toasts" aria-live="polite">
      {toasts.map(t => (
        <div key={t.id} className={`toast ${t.big ? 'big' : ''}`}>
          <span className="toast-tag">[SYSTEM]</span> {t.text}
        </div>
      ))}
    </div>
  )
}

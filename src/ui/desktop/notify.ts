import { RARITY_NAMES, cardById, onGameEvent, type GameEvent, type Summary } from '../../engine'
import { getPrefs, setPref } from './prefs'

// Desktop notifications: browser pop-ups while LivingHUD is open in a tab
// (even a background one). Closing the browser stops them; there's no push
// server, so nothing about you leaves the device.

export const notifySupported = () => typeof window !== 'undefined' && 'Notification' in window

export async function enableNotifications(): Promise<boolean> {
  if (!notifySupported()) return false
  const result = Notification.permission === 'granted' ? 'granted' : await Notification.requestPermission()
  setPref('notify', result === 'granted')
  if (result === 'granted') show('Notifications on', 'The System will call you here when something needs you.')
  return result === 'granted'
}

function show(title: string, body: string, tag?: string): void {
  if (!notifySupported() || Notification.permission !== 'granted') return
  const options = { body, tag, icon: '/icon-192.png', badge: '/icon-192.png' }
  try {
    new Notification(title, options)
  } catch {
    // Some browsers (Android Chrome) only allow notifications from the service worker.
    void navigator.serviceWorker?.ready.then(r => r.showNotification(title, options)).catch(() => {})
  }
}

function textFor(event: GameEvent): [string, string] | null {
  switch (event.type) {
    case 'surprise.appeared':
      return ['Surprise quest', `${event.text}. One hour, +30 XP.`]
    case 'focus.ended':
      return [event.cleared ? 'Dungeon cleared' : 'Focus ended', `${event.label}: ${event.minutes} min, +${event.xp} XP`]
    case 'level.up':
      return ['Level up', `You are now level ${event.level}.`]
    case 'boss.defeated':
      return ['Boss defeated', `${event.name}  +${event.xp} XP`]
    case 'badge.earned':
      return ['Title earned', event.title]
    case 'loot.card': {
      const c = cardById(event.cardId)
      return c ? [`${RARITY_NAMES[c.rarity]} loot drop`, c.name] : null
    }
    case 'quest.completed':
      return event.via === 'automation' ? ['Auto-cleared', event.questTitle] : null
    default:
      return null
  }
}

/** Pop-ups for big moments, only when the tab isn't in front (the toasts cover that). */
export function startDesktopNotify(): () => void {
  return onGameEvent(event => {
    if (!getPrefs().notify || document.visibilityState === 'visible') return
    const text = textFor(event)
    if (text) show(text[0], text[1])
  })
}

const SENT = 'livinghud-notified'

/** Once-a-day reminders, checked as the dashboard re-renders each minute. */
export function dailyReminders(summary: Summary, dailiesLeft: number, bedTime: string, now: Date): void {
  if (!getPrefs().notify) return
  let sent: Record<string, string> = {}
  try {
    sent = JSON.parse(localStorage.getItem(SENT) ?? '{}')
  } catch {
    // ignore
  }
  const once = (key: string, title: string, body: string) => {
    if (sent[key] === summary.today) return
    sent[key] = summary.today
    try {
      localStorage.setItem(SENT, JSON.stringify(sent))
    } catch {
      // ignore
    }
    show(title, body, key)
  }

  // Streaks at risk: three hours before bed with dailies still open.
  const [h, m] = bedTime.split(':').map(Number)
  const bed = new Date(now)
  bed.setHours(h, m, 0, 0)
  if (bed.getTime() < now.getTime() - 12 * 3_600_000) bed.setDate(bed.getDate() + 1)
  const atRisk = [...summary.streaks.values()].some(s => s > 0)
  if (dailiesLeft > 0 && !summary.recoveryToday && bed.getTime() - now.getTime() < 3 * 3_600_000 && bed.getTime() > now.getTime()) {
    once('streak', atRisk ? 'Streaks at risk' : 'Dailies left', `${dailiesLeft} daily quest${dailiesLeft === 1 ? '' : 's'} still open tonight.`)
  }
  const weak = summary.party.filter(b => b.weakening)
  if (weak.length > 0) once('bond', 'Bond weakening', `${weak.map(b => b.person.name).slice(0, 3).join(', ')}: time to reach out.`)
}

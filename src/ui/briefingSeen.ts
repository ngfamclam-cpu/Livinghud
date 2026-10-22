// Whether this device has shown today's morning briefing.

const KEY = 'livinghud-briefing'

/** Whether today's briefing has been seen on this device. */
export function briefingSeen(today: string): boolean {
  try {
    return localStorage.getItem(KEY) === today
  } catch {
    return true
  }
}

export function markSeen(today: string) {
  try {
    localStorage.setItem(KEY, today)
  } catch {
    /* storage blocked: it just shows again next time */
  }
}

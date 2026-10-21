// Collects quest completions sent by auto-complete links (api/trigger.ts)
// while the app was closed, and applies them. Checks when the app opens,
// comes back to the front or reconnects, and every 2 minutes while open.

import { completeFromTrigger } from './actions'
import { db, LOCAL_USER } from './db'

const ENDPOINT = '/api/trigger'
const EVERY_MS = 2 * 60_000

interface InboxItem {
  id: string
  questId: string
  version: 'full' | 'min'
  at: number
}

let started = false
let running = false

export function startTriggers(): void {
  if (started) return
  started = true
  void check()
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && void check())
  window.addEventListener('online', () => void check())
  setInterval(() => document.visibilityState === 'visible' && void check(), EVERY_MS)
}

/** Fetches waiting completions, applies them in the order they happened, then clears them. */
export async function check(): Promise<void> {
  if (running) return
  running = true
  try {
    const token = (await db.players.get(LOCAL_USER))?.settings.triggerToken
    if (!token) return
    const res = await fetch(`${ENDPOINT}?t=${encodeURIComponent(token)}&inbox=1`, { cache: 'no-store' })
    if (!res.ok || !res.headers.get('content-type')?.includes('application/json')) return
    const { items } = (await res.json()) as { items: InboxItem[] }
    if (!items?.length) return
    for (const item of [...items].sort((a, b) => a.at - b.at)) {
      await completeFromTrigger(item.questId, item.version === 'min' ? 'min' : 'full', item.at)
    }
    await fetch(`${ENDPOINT}?t=${encodeURIComponent(token)}&ack=1`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ids: items.map(i => i.id) }),
    })
  } catch {
    // Offline or not set up yet: try again next time.
  } finally {
    running = false
  }
}

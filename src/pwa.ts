// Keeps the installed app up to date. The app saves a copy of itself for speed
// and offline use; without this, a new version would only show on the second
// launch after it went live. Now the app checks for a new version whenever it
// opens or comes back to the front, and reloads itself as soon as one is ready.

import { registerSW } from 'virtual:pwa-register'

export function startUpdates(): void {
  registerSW({
    immediate: true,
    onRegisteredSW(_url, registration) {
      if (!registration) return
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') registration.update().catch(() => {})
      })
    },
  })
}

/** The deployed version: the start of the git commit Vercel built, and when. */
export const APP_VERSION = `${__APP_COMMIT__.slice(0, 7)} · ${new Date(__APP_BUILT_AT__).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`

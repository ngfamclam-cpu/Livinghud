import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSync } from './db/sync'
import { startTriggers } from './db/triggers'
import { startUpdates } from './pwa'
import { startFocusWatch } from './db/focus'
import { ensurePenaltyStart } from './db/actions'
import { startDesktopNotify } from './ui/desktop/notify'

// Ask the browser to keep LivingHUD's data instead of clearing it to free space
// or after a week away (Safari). Installed home-screen apps are usually granted this.
navigator.storage?.persist?.().catch(() => {})
startSync()
startTriggers()
startUpdates()
startFocusWatch()
void ensurePenaltyStart()
startDesktopNotify()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

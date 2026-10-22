import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startSync } from './db/sync'
import { startTriggers } from './db/triggers'
import { startUpdates } from './pwa'

// Ask the browser to keep LivingHUD's data instead of clearing it to free space
// or after a week away (Safari). Installed home-screen apps are usually granted this.
navigator.storage?.persist?.().catch(() => {})
startSync()
startTriggers()
startUpdates()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

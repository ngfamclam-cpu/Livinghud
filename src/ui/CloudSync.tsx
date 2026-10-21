import { useState, useSyncExternalStore } from 'react'
import { getSyncStatus, linkDevice, subscribeSync, type SyncState } from '../db/sync'
import { SystemWindow } from './SystemWindow'

const STATE_TEXT: Record<SyncState, string> = {
  off: 'Starts as soon as you have a character.',
  syncing: 'Syncing…',
  synced: 'Saved to the cloud.',
  offline: 'Offline. Your progress is safe on this device and will upload when you’re back online.',
  'not-configured': 'Cloud storage isn’t connected yet. In Vercel, open this project, go to Storage, and create a Blob store.',
  unavailable: 'Cloud sync only runs on the live site, not in local test mode.',
}

function useSyncStatus() {
  return useSyncExternalStore(subscribeSync, getSyncStatus)
}

/** Settings panel: shows this save's sync code and links to a different one. */
export function SyncPanel() {
  const status = useSyncStatus()
  const [copied, setCopied] = useState(false)
  const [showLink, setShowLink] = useState(false)

  const copy = async () => {
    if (!status.code) return
    try {
      await navigator.clipboard.writeText(status.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* clipboard blocked: the code is on screen to copy by hand */
    }
  }

  return (
    <SystemWindow title="Cloud sync">
      <p className={`sync-state sync-${status.state}`}>{STATE_TEXT[status.state]}</p>
      {status.code && (
        <>
          <p>Your sync code. Enter it on another phone or computer to load this character there. Keep it private, like a password.</p>
          <div className="sync-code">
            <code>{status.code}</code>
            <button className="ghost small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
        </>
      )}
      {showLink ? (
        <LinkForm
          warning="This replaces the character on this device with the one saved under that code."
          onCancel={() => setShowLink(false)}
          onDone={() => setShowLink(false)}
        />
      ) : (
        <button className="ghost small" onClick={() => setShowLink(true)}>Use a different sync code</button>
      )}
    </SystemWindow>
  )
}

/** Enter a sync code to load a character saved on another device. */
export function LinkForm({ warning, onCancel, onDone }: { warning?: string; onCancel?: () => void; onDone?: () => void }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (warning && !confirm(warning)) return
    setBusy(true)
    setError('')
    try {
      await linkDevice(code)
      onDone?.()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load that save.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="form">
      <label>
        Sync code
        <input value={code} onChange={e => setCode(e.target.value)} placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="row end">
        {onCancel && <button className="ghost" onClick={onCancel}>Cancel</button>}
        <button disabled={busy || code.replace(/[^a-z0-9]/gi, '').length < 25} onClick={submit}>{busy ? 'Loading…' : 'Load my character'}</button>
      </div>
    </div>
  )
}

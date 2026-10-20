import { useRef, useState } from 'react'
import type { Player } from '../engine'
import { exportSave, importSave, resetEverything } from '../db/actions'
import { SystemWindow } from './SystemWindow'

export function Settings({ player, onClose }: { player: Player; onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')

  const download = async () => {
    const blob = new Blob([await exportSave()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `livinghud-save-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    setMessage('Save file downloaded.')
  }

  const upload = async (file: File) => {
    try {
      await importSave(await file.text())
      setMessage('Save file loaded.')
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not read that file.')
    }
  }

  const reset = async () => {
    if (!confirm('Delete all progress on this device and start a new Awakening? Download a save file first if you want to keep it.')) return
    await resetEverything()
  }

  return (
    <main className="hud">
      <SystemWindow title="Settings">
        <p>Your progress lives only in this browser for now. Download a save file regularly so clearing your browser never wipes your character.</p>
        <div className="row">
          <button onClick={download}>Download save file</button>
          <button className="ghost" onClick={() => fileInput.current?.click()}>Load save file</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        {message && <p className="system-line">{message}</p>}
        <dl className="status-list">
          <dt>Player</dt><dd>{player.name}</dd>
          <dt>Reward budget</dt><dd>${player.settings.monthlyBudget}/month</dd>
          <dt>Difficulty</dt><dd>{player.settings.difficulty}</dd>
        </dl>
        <div className="row end">
          <button className="ghost danger" onClick={reset}>Reset everything</button>
          <button onClick={onClose}>Back to HUD</button>
        </div>
      </SystemWindow>
    </main>
  )
}

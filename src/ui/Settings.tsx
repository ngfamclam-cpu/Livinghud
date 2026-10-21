import { useRef, useState } from 'react'
import type { Difficulty, Player, SavingsGoal } from '../engine'
import { exportSave, importSave, resetEverything, updateSettings } from '../db/actions'
import { forgetSync } from '../db/sync'
import { SystemWindow } from './SystemWindow'
import { SyncPanel } from './CloudSync'

export function Settings({ player, onClose }: { player: Player; onClose: () => void }) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [message, setMessage] = useState('')
  const [budget, setBudget] = useState(String(player.settings.monthlyBudget))
  const [goal, setGoal] = useState<SavingsGoal>(player.settings.savingsGoal)
  const [difficulty, setDifficulty] = useState<Difficulty>(player.settings.difficulty)
  const [saved, setSaved] = useState('')

  const saveSettings = async () => {
    await updateSettings({ monthlyBudget: Math.max(0, Number(budget) || 0), savingsGoal: goal, difficulty })
    setSaved('Settings saved.')
  }

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
    if (!confirm('Delete all progress on this device and start a new Awakening? The cloud copy stays, and your old sync code can still load it.')) return
    forgetSync()
    await resetEverything()
  }

  return (
    <main className="hud">
      <SystemWindow title="Settings">
        <label>
          Monthly reward budget ($)
          <input type="number" min={0} inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} />
        </label>
        <p className="muted">Changing the budget changes what quests pay from now on and how big every month's wallet is.</p>
        <label>
          Savings gate
          <select value={goal.type} onChange={e => setGoal(g => ({ ...g, type: e.target.value as SavingsGoal['type'] }))}>
            <option value="fixed">Save a fixed amount each month</option>
            <option value="percent">Save a % of income</option>
            <option value="off">Off</option>
          </select>
        </label>
        {goal.type !== 'off' && (
          <label>
            {goal.type === 'fixed' ? 'Save each month ($)' : 'Save this % of income'}
            <input type="number" min={0} inputMode="decimal" value={goal.amount} onChange={e => setGoal(g => ({ ...g, amount: Math.max(0, Number(e.target.value) || 0) }))} />
          </label>
        )}
        <label>
          Difficulty
          <select value={difficulty} onChange={e => setDifficulty(e.target.value as Difficulty)}>
            <option value="casual">Casual</option>
            <option value="normal">Normal</option>
            <option value="hardcore">Hardcore</option>
          </select>
        </label>
        <p className="muted">Penalty modes take effect in a later update.</p>
        <div className="row end">
          <button onClick={saveSettings}>Save settings</button>
        </div>
        {saved && <p className="system-line">{saved}</p>}
      </SystemWindow>

      <SyncPanel />

      <SystemWindow title="Save file">
        <p className="muted">Optional: cloud sync already keeps your progress safe. A save file is an extra copy you keep yourself.</p>
        <div className="row">
          <button onClick={download}>Download save file</button>
          <button className="ghost" onClick={() => fileInput.current?.click()}>Load save file</button>
          <input ref={fileInput} type="file" accept="application/json,.json" hidden onChange={e => e.target.files?.[0] && upload(e.target.files[0])} />
        </div>
        {message && <p className="system-line">{message}</p>}
        <div className="row end">
          <button className="ghost danger" onClick={reset}>Reset everything</button>
          <button onClick={onClose}>Back to HUD</button>
        </div>
      </SystemWindow>
    </main>
  )
}

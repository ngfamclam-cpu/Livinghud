import { useState } from 'react'
import { COMBO_MAX, COMBO_STEP, DEFAULT_PENALTY_MENU, PACK_MILESTONES, PERFECT_DAY_XP, SECRET_UNLOCKS, defaultIncentives, type Player } from '../engine'
import { ensureTriggerToken, saveIncentiveSettings } from '../db/actions'
import { SystemWindow } from './SystemWindow'

/** Settings: tune the Penalty Quest, edit your penalty list, and set up the phone game lock. */
export function IncentiveSettingsPanel({ player }: { player: Player }) {
  const current = player.incentives ?? defaultIncentives('')
  const [threshold, setThreshold] = useState(current.threshold)
  const [lockShop, setLockShop] = useState(current.lockShop)
  const [menu, setMenu] = useState<string[]>(current.menu)
  const [newItem, setNewItem] = useState('')
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState(false)
  const token = player.settings.triggerToken
  const statusLink = token ? `${location.origin}/api/trigger?t=${token}&status=1` : ''

  const save = async () => {
    await saveIncentiveSettings({ threshold, lockShop, menu })
    setSaved(true)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(statusLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      prompt('Copy this link:', statusLink)
    }
  }

  return (
    <SystemWindow title="Incentives & penalties">
      <h3>Rewards</h3>
      <ul className="plain-list">
        <li><b>Combo meter:</b> every perfect day in a row adds ×{COMBO_STEP.toFixed(1)} to quest XP, up to ×{COMBO_MAX}. Missing a day resets it; Recovery Days pause it.</li>
        <li><b>Perfect-day chest:</b> clear every daily for a Rare-or-better card and +{PERFECT_DAY_XP} XP.</li>
        <li><b>Card packs:</b> 3 cards (one Epic or better) when your combo reaches {PACK_MILESTONES.join(', ')} days.</li>
        <li><b>Secret series:</b> {SECRET_UNLOCKS.map(s => `${s.series[0].toUpperCase()}${s.series.slice(1)} at a ${s.combo}-day combo`).join(', ')}.</li>
        <li><b>Shields:</b> one for every perfect week (Monday to Sunday). Spend it to cancel a Penalty Quest.</li>
      </ul>

      <h3>Penalty Quest</h3>
      <label>
        Trigger after missing this many dailies in a day: <b>{threshold}</b>
        <input type="range" min={1} max={5} step={1} value={threshold} onChange={e => { setThreshold(Number(e.target.value)); setSaved(false) }} />
      </label>
      <label className="toggle-line">
        <input type="checkbox" checked={lockShop} onChange={e => { setLockShop(e.target.checked); setSaved(false) }} />
        <span>Lock the Shop and plan bookings until the Penalty Quest is done</span>
      </label>
      <p className="muted">Your penalty list: the things you least want to do. One is picked each time. Recovery Days never trigger a penalty.</p>
      <ul className="board-list compact">
        {menu.map((m, i) => (
          <li key={`${i}-${m}`}>
            <span className="quest-title">{m}</span>
            <button className="ghost small icon" aria-label={`Remove ${m}`} onClick={() => { setMenu(list => list.filter((_, j) => j !== i)); setSaved(false) }}>×</button>
          </li>
        ))}
      </ul>
      <div className="inline-form">
        <input value={newItem} maxLength={80} onChange={e => setNewItem(e.target.value)} placeholder="e.g. Clean the oven" />
        <button className="small" disabled={!newItem.trim()} onClick={() => { setMenu(list => [...list, newItem.trim()]); setNewItem(''); setSaved(false) }}>Add</button>
      </div>
      <div className="row">
        <button className="ghost small" onClick={() => { setMenu(DEFAULT_PENALTY_MENU); setSaved(false) }}>Reset to suggestions</button>
        <span className="grow" />
        {saved && <span className="cleared">Saved</span>}
        <button className="small" onClick={save}>Save</button>
      </div>

      <h3>Phone game lock (MacroDroid)</h3>
      {!token ? (
        <button className="small" onClick={() => ensureTriggerToken()}>Set up phone links</button>
      ) : (
        <>
          <p className="muted">While a Penalty Quest is open, your phone can refuse to open games or social apps. It unlocks by itself once you clear it.</p>
          <div className="row">
            <code className="grow link-code">{statusLink}</code>
            <button className="ghost small" onClick={copy}>{copied ? 'Copied' : 'Copy'}</button>
          </div>
          <details className="howto">
            <summary>How to set it up</summary>
            <ol>
              <li>In MacroDroid tap <b>Add Macro</b>.</li>
              <li><b>Trigger:</b> Applications → <b>Application Launched/Closed</b> → Launched → pick your games and social apps.</li>
              <li><b>Action 1:</b> Connectivity → <b>HTTP Request</b> → GET, paste the link above, and turn on <b>Save response to variable</b> (make a new text variable, e.g. <code>hud</code>).</li>
              <li><b>Action 2:</b> Conditions/Loops → <b>If</b> → Variable <code>hud</code> <b>contains</b> <code>"locked":true</code>.</li>
              <li>Inside the If: Applications → <b>Launch Home Screen</b>, then Notification → <b>Display Notification</b>: "Penalty Zone: clear your quest first."</li>
              <li>Add <b>End If</b>, name the macro "Penalty lock" and save. Open a game to test it.</li>
            </ol>
            <p className="muted">It only checks when you open one of those apps, and the app only updates the link when a penalty opens or clears, so it stays well inside the free storage limits.</p>
          </details>
        </>
      )}
    </SystemWindow>
  )
}

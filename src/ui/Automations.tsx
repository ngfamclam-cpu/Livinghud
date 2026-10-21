import { useState } from 'react'
import type { Player, Quest } from '../engine'
import { ensureTriggerToken, resetTriggerToken } from '../db/actions'
import { SystemWindow } from './SystemWindow'

/** Settings panel: a private link per quest for phone automations, NFC tags and bookmarks. */
export function Automations({ player, quests }: { player: Player; quests: Quest[] }) {
  const token = player.settings.triggerToken
  const [copied, setCopied] = useState('')
  const active = quests.filter(q => q.active).sort((a, b) => kindOrder(a) - kindOrder(b) || a.createdAt - b.createdAt)

  const link = (q: Quest, min = false) => `${location.origin}/api/trigger?t=${token}&q=${q.id}${min ? '&v=min' : ''}`
  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(id)
      setTimeout(() => setCopied(c => (c === id ? '' : c)), 2000)
    } catch {
      prompt('Copy this link:', text)
    }
  }
  const reset = async () => {
    if (confirm('Make new links? Every link you already set up stops working and has to be copied again.')) await resetTriggerToken()
  }

  return (
    <SystemWindow title="Auto-complete">
      <p>Let your phone clear quests for you. Each quest has a private link; when your phone opens it, the quest is cleared, even if LivingHUD is closed. It counts for the moment the link was opened.</p>
      {!token ? (
        <button onClick={() => ensureTriggerToken()}>Set up auto-complete links</button>
      ) : (
        <>
          <details className="howto">
            <summary>How to set it up on Android (MacroDroid)</summary>
            <ol>
              <li>Install <b>MacroDroid</b> from the Play Store (free for up to 5 automations).</li>
              <li>Tap <b>Add Macro</b>, then add a <b>trigger</b>: what should clear the quest. Good ones:
                <ul>
                  <li><b>NFC tag</b>: tap your phone on a sticker on your vitamins, bed or desk.</li>
                  <li><b>Location</b>: arriving at the gym.</li>
                  <li><b>Wi-Fi connected</b>: getting home, or to the office.</li>
                  <li><b>Day/time</b>: a fixed time each day.</li>
                </ul>
              </li>
              <li>Add an <b>action</b>: search for <b>HTTP Request</b>, choose GET, and paste the quest's link from below.</li>
              <li>Save the macro. Test it once: the quest shows as cleared the next time you open LivingHUD.</li>
            </ol>
            <p className="muted">Keep these links private: anyone with one can clear that quest for you. Cloud storage must be set up in Vercel for links to work.</p>
          </details>
          <ul className="board-list automations">
            {active.map(q => (
              <li key={q.id}>
                <span className="stat-key">{q.stat}</span>
                <span className="quest-title">
                  {q.title} <small className="muted">{q.kind === 'main' ? 'clears the next stage' : q.kind === 'side' ? 'weekly' : 'daily'}</small>
                </span>
                <span className="link-buttons">
                  <button className="ghost small" onClick={() => copy(link(q), q.id)}>{copied === q.id ? 'Copied' : 'Copy link'}</button>
                  {q.kind !== 'main' && (
                    <button className="ghost small" onClick={() => copy(link(q, true), `${q.id}-min`)}>{copied === `${q.id}-min` ? 'Copied' : 'Minimum'}</button>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <button className="ghost small danger" onClick={reset}>Make new links</button>
        </>
      )}
    </SystemWindow>
  )
}

function kindOrder(q: Quest): number {
  return q.kind === 'daily' ? 0 : q.kind === 'side' ? 1 : 2
}

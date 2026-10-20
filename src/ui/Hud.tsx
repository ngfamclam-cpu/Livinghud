import { useState } from 'react'
import { STATS, type Completion, type Player, type Quest, type Summary } from '../engine'
import { completeQuest, undoQuest } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Settings } from './Settings'

const money = (n: number) => `$${n.toFixed(2)}`

export function Hud({ player, quests, summary }: { player: Player; quests: Quest[]; summary: Summary }) {
  const [showSettings, setShowSettings] = useState(false)
  const dailies = quests.filter(q => q.kind === 'daily' && q.active).sort((a, b) => a.createdAt - b.createdAt)
  const doneCount = dailies.filter(q => summary.todayDone.has(q.id)).length
  const { level, wallet } = summary
  const weakest = player.stats.reduce((a, b) => ((summary.stats[b] ?? 0) < (summary.stats[a] ?? 0) ? b : a), player.stats[0])

  if (showSettings) return <Settings player={player} onClose={() => setShowSettings(false)} />

  return (
    <main className="hud">
      <SystemWindow title="Status" className="status">
        <div className="player-line">
          <div>
            <div className="player-name">{player.name}</div>
            <div className="muted">Rank {summary.rank} · {Math.round(summary.completionRate * 100)}% over 30 days</div>
          </div>
          <div className="level">
            <small>LV.</small>
            {level.level}
          </div>
        </div>
        <Bar value={level.xpIntoLevel} max={level.xpForNext} label={`${level.xpIntoLevel} / ${level.xpForNext} XP`} />

        <div className="wallet">
          <div>
            <div className="muted">Reward Wallet · {monthName(wallet.month)}</div>
            <div className="big">{money(wallet.earned)} <small>/ {money(wallet.budget)}</small></div>
          </div>
          <div className="vault">
            <div className="muted">Vault</div>
            <div className="big">{money(wallet.vault)}</div>
          </div>
        </div>
        <Bar value={wallet.earned} max={wallet.budget} variant="gold" />
      </SystemWindow>

      <SystemWindow title="Stats">
        <ul className="stats">
          {player.stats.map(key => (
            <li key={key} className={key === weakest && dailies.length > 0 ? 'weakest' : ''}>
              <span className="stat-key">{key}</span>
              <span className="stat-name">{STATS.find(s => s.key === key)?.name}</span>
              <Bar value={summary.stats[key] ?? 0} max={100} thin />
              <span className="stat-value">{summary.stats[key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </SystemWindow>

      <SystemWindow title={`Daily Quest · ${doneCount}/${dailies.length}`}>
        {doneCount === dailies.length && dailies.length > 0 && (
          <p className="system-line clear">All daily quests cleared. Rest well, Player.</p>
        )}
        <ul className="quests">
          {dailies.map(q => (
            <QuestRow key={q.id} quest={q} done={summary.todayDone.get(q.id)} streak={summary.streaks.get(q.id) ?? 0} />
          ))}
        </ul>
      </SystemWindow>

      <button className="ghost settings-button" onClick={() => setShowSettings(true)}>Settings &amp; save file</button>
    </main>
  )
}

function QuestRow({ quest, done, streak }: { quest: Quest; done?: Completion; streak: number }) {
  const [open, setOpen] = useState(false)
  return (
    <li className={`quest ${done ? 'done' : ''}`}>
      <button className="quest-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="stat-key">{quest.stat}</span>
        <span className="quest-title">{quest.title}</span>
        {streak > 0 && <span className="streak" title={`${streak}-day streak`}>{streak}d</span>}
      </button>
      {open && (
        <div className="quest-detail">
          {quest.description && <p>{quest.description}</p>}
          <p className="muted">Minimum version: {quest.minVersion}</p>
        </div>
      )}
      <div className="quest-actions">
        {done ? (
          <>
            <span className="cleared">{done.version === 'full' ? 'CLEAR' : 'MIN CLEAR'} +{done.xp} XP · +{money(done.dollars)}</span>
            <button className="ghost small" onClick={() => undoQuest(quest)}>Undo</button>
          </>
        ) : (
          <>
            <button className="ghost small" onClick={() => completeQuest(quest, 'min')}>Minimum</button>
            <button className="small" onClick={() => completeQuest(quest, 'full')}>Complete</button>
          </>
        )}
      </div>
    </li>
  )
}

function Bar({ value, max, label, variant, thin }: { value: number; max: number; label?: string; variant?: 'gold'; thin?: boolean }) {
  const pct = max > 0 ? Math.min(100, (100 * value) / max) : 0
  return (
    <div className={`bar ${variant ?? ''} ${thin ? 'thin' : ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={max}>
      <div className="fill" style={{ width: `${pct}%` }} />
      {label && <span className="bar-label">{label}</span>}
    </div>
  )
}

function monthName(month: string): string {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleString(undefined, { month: 'long' })
}

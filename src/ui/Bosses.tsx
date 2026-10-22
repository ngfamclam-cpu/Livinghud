import { useState } from 'react'
import { BOSS_XP, MINUTES_PER_HIT, type Player, type StatKey, type Summary } from '../engine'
import { addBoss, hitBoss, removeBoss } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

const SIZES = [
  { hours: 0.5, label: '30 min' },
  { hours: 1, label: '1 hour' },
  { hours: 2, label: '2 hours' },
  { hours: 4, label: 'Half a day' },
  { hours: 8, label: 'A full day' },
]

/** Dreaded tasks as bosses: each HP is 15 minutes of work on it. */
export function Bosses({ player, summary, onFight }: { player: Player; summary: Summary; onFight: (bossId: string) => void }) {
  const [name, setName] = useState('')
  const [hours, setHours] = useState(1)
  const [stat, setStat] = useState<StatKey>(player.stats.includes('AGI') ? 'AGI' : player.stats[0])

  const add = async () => {
    const value = name
    setName('')
    await addBoss({ name: value, stat, hours })
  }

  return (
    <SystemWindow title="Bosses">
      <p className="muted">
        Name a task you keep avoiding and it becomes a boss. Every {MINUTES_PER_HIT} minutes you spend on it is a hit; defeat it for +{BOSS_XP} XP. The first hit
        counts as the minimum for "One dreaded task", and defeating a boss clears it.
      </p>
      <ul className="party-list">
        {summary.bosses.map(({ boss, hpLeft, minutes }) => (
          <li key={boss.id} className={`person boss ${boss.defeatedAt ? 'defeated' : ''}`}>
            <div className="quest-main">
              <span className="stat-key">{boss.stat}</span>
              <span className="quest-title">{boss.name}</span>
              <span className="routine-count">{boss.defeatedAt ? 'DEFEATED' : `${hpLeft}/${boss.hp} HP`}</span>
            </div>
            <Bar value={hpLeft} max={boss.hp} thin variant="gold" />
            <div className="quest-actions">
              <small className="muted">{minutes} min fought</small>
              {!boss.defeatedAt && (
                <>
                  <button className="ghost small" onClick={() => hitBoss(boss.id)} title={`Log ${MINUTES_PER_HIT} minutes done without the timer`}>Hit ({MINUTES_PER_HIT} min)</button>
                  <button className="small" onClick={() => onFight(boss.id)}>Fight</button>
                </>
              )}
              <button className="ghost small icon" aria-label={`Remove ${boss.name}`} title="Remove" onClick={() => confirm(`Remove ${boss.name}? XP earned stays.`) && removeBoss(boss.id)}>×</button>
            </div>
          </li>
        ))}
      </ul>
      <div className="form">
        <label>New boss<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Do my taxes" maxLength={60} /></label>
        <p className="muted">How long will it really take?</p>
        <div className="row">
          {SIZES.map(s => (
            <button key={s.hours} className={`chip ${hours === s.hours ? 'picked' : ''}`} onClick={() => setHours(s.hours)}>{s.label}</button>
          ))}
        </div>
        <div className="row">
          <select value={stat} onChange={e => setStat(e.target.value as StatKey)} aria-label="Stat">
            {player.stats.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <button className="small" disabled={!name.trim()} onClick={add}>Summon boss</button>
        </div>
      </div>
    </SystemWindow>
  )
}

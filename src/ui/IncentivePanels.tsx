import { useEffect } from 'react'
import { COMBO_MAX, PACK_MILESTONES, SECRET_UNLOCKS, featureOn, type Player, type Summary } from '../engine'
import { clearPenaltyQuest, spendShield } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

/** The Penalty Zone: today's mandatory quest. The HUD turns red until it's done. */
export function PenaltyZone({ player, summary }: { player: Player; summary: Summary }) {
  const p = featureOn(player, 'penaltyQuest') ? summary.incentives?.penalty : null
  const shields = summary.incentives?.shields ?? 0

  // Tint the whole HUD red while a Penalty Quest is open.
  useEffect(() => {
    document.documentElement.dataset.penalty = p ? 'on' : 'off'
    return () => {
      document.documentElement.dataset.penalty = 'off'
    }
  }, [p])

  if (!p) return null
  const done = () => {
    if (confirm(`Honour system: did you really do it?\n\n“${p.task}”`)) void clearPenaltyQuest(p.day, p.task)
  }
  return (
    <SystemWindow title="Penalty Zone" className="penalty-zone">
      <p className="system-line danger-line">
        You missed {p.missed} dail{p.missed === 1 ? 'y' : 'ies'}{p.daysOpen > 0 ? ` and this has been open ${p.daysOpen} day${p.daysOpen === 1 ? '' : 's'}` : ''}. Mandatory quest:
      </p>
      <p className="penalty-task">{p.task}</p>
      <p className="muted">
        {player.incentives?.lockShop !== false ? 'The Shop and plan bookings are locked until it’s done. ' : ''}
        If you set up the phone game lock, your games are blocked too.
      </p>
      <div className="row end">
        {shields > 0 && <button className="ghost small" onClick={() => spendShield(p.day, p.task)}>Use a Shield ({shields})</button>}
        <button className="small danger-button" onClick={done}>I did it</button>
      </div>
    </SystemWindow>
  )
}

/** Combo meter, the perfect-day chest status, shields and what's next to unlock. */
export function ComboPanel({ summary, dailiesLeft }: { summary: Summary; dailiesLeft: number }) {
  const s = summary.incentives
  if (!s) return null
  const nextPack = PACK_MILESTONES.find(m => m > s.combo)
  const nextSecret = SECRET_UNLOCKS.find(x => s.bestCombo < x.combo)
  return (
    <SystemWindow title={`Combo · ${s.combo} day${s.combo === 1 ? '' : 's'}`} className="combo-panel">
      <div className="combo-row">
        <span className="combo-mult">×{s.multiplier.toFixed(1)}</span>
        <div className="grow">
          <Bar value={s.multiplier - 1} max={COMBO_MAX - 1} variant="gold" thin />
          <small className="muted">quest XP multiplier (max ×{COMBO_MAX})</small>
        </div>
      </div>
      <p className={s.perfectToday ? 'system-line' : 'muted'}>
        {s.perfectToday ? 'Perfect day! Chest opened.' : dailiesLeft > 0 ? `${dailiesLeft} dail${dailiesLeft === 1 ? 'y' : 'ies'} left to open today's chest and keep the combo.` : 'Clear your dailies to open the chest.'}
      </p>
      <p className="muted">
        {nextPack ? `Card pack at ${nextPack} days (${nextPack - s.combo} to go)` : 'Every pack collected this run.'}
        {nextSecret ? ` · secret series at a ${nextSecret.combo}-day combo (best: ${s.bestCombo})` : ' · all secret series unlocked'}
        {` · 🛡 ${s.shields} shield${s.shields === 1 ? '' : 's'}`}
      </p>
    </SystemWindow>
  )
}

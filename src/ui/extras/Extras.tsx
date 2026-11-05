import { useState } from 'react'
import { COMPANION_STAGES, EXTRA_PAY, HIDDEN, JOBS, scalePay, PLATES, featureOn, type Player, type Quest, type Summary } from '../../engine'
import { redeemCoupon, rollTheDice, setPlate, takeJobChange, playWildcard } from '../../db/extras'
import { SystemWindow } from '../SystemWindow'
import { LegionView } from './Legion'

const minutesLeft = (until: number, now: number) => Math.max(0, Math.ceil((until - now) / 60_000))

/** Red Gate (while open), the Lucky Roll after a perfect day, and wildcard offers. Shown on top of the HUD. */
export function ExtrasAlerts({ summary, quests, now }: { summary: Summary; quests: Quest[]; now: Date }) {
  const x = summary.extras
  const [rolling, setRolling] = useState(false)
  const pay = (amount: number) => `$${scalePay(amount, summary.wallet.budget).toFixed(2)}`
  if (!x.on) return null
  const t = now.getTime()
  const gate = x.gate && t >= x.gate.opensAt && (t < x.gate.closesAt || x.gate.cleared) ? x.gate : null
  const roll = async () => {
    setRolling(true)
    await new Promise(r => setTimeout(r, 900))
    await rollTheDice()
    setRolling(false)
  }
  return (
    <>
      {gate && !gate.cleared && (
        <SystemWindow title="Red Gate" className="red-gate">
          <p className="system-line danger-line">A Red Gate has opened. Clear {gate.needed} dailies in the next {minutesLeft(gate.closesAt, t)} minutes to close it.</p>
          <div className="gate-pips" aria-label={`${gate.count} of ${gate.needed}`}>
            {Array.from({ length: gate.needed }, (_, i) => <span key={i} className={i < gate.count ? 'on' : ''} />)}
          </div>
          <p className="muted">Reward: +40 XP, {pay(EXTRA_PAY.gate)}, a Rare-or-better card, maybe a coupon or a wildcard. Miss it and nothing is lost.</p>
        </SystemWindow>
      )}
      {gate?.cleared && t < gate.closesAt && <p className="system-line gate-closed">Red Gate closed. Well fought.</p>}
      {x.rollDay && (
        <SystemWindow title="Lucky Roll" className="lucky-roll">
          <p className="system-line">Perfect day{x.rollDay !== summary.today ? ' yesterday' : ''}! Roll the d20 for a bonus.</p>
          <div className="row">
            <span className={`d20 ${rolling ? 'rolling' : ''}`} aria-hidden="true">{rolling ? '?' : '20'}</span>
            <p className="muted grow">2–9: +10 XP, {pay(0.5)} · 10–15: +25 XP, {pay(1)} · 16–17: +40 XP, {pay(2)} and a coupon · 18–19: {pay(3)}, Rare card and a wildcard · 20: {pay(5)} and a Legendary card. A 1 curses you for the day.</p>
          </div>
          <div className="row end"><button disabled={rolling} onClick={roll}>{rolling ? 'Rolling…' : 'Roll the d20'}</button></div>
        </SystemWindow>
      )}
      {x.wildcards > 0 && x.wildcardOffers.length > 0 && (
        <SystemWindow title="Wildcard" className="wildcard-offer">
          {x.wildcardOffers.map(o => (
            <div key={o.questId} className="row">
              <span className="grow">You missed <b>{quests.find(q => q.id === o.questId)?.title ?? 'a daily'}</b> yesterday. Save its {o.streak}-day streak?</span>
              <button className="small" onClick={() => void playWildcard(o.questId, o.day)}>Use a wildcard ({x.wildcards})</button>
            </div>
          ))}
        </SystemWindow>
      )}
    </>
  )
}

/** A small HUD panel: coupons, wildcards, the Legion and the next Job Change. */
export function RewardsPanel({ summary, onOpen }: { summary: Summary; onOpen: () => void }) {
  const x = summary.extras
  return (
    <SystemWindow title="Rewards & Legion">
      <p className="muted">
        {x.job ? `Class: ${x.job.title}` : 'Class: Awakened'}
        {x.legion.length > 0 ? ` · Legion ${x.legion.length}` : ''}
        {` · 🎟 ${x.coupons.length} coupon${x.coupons.length === 1 ? '' : 's'} · 🃏 ${x.wildcards} wildcard${x.wildcards === 1 ? '' : 's'} · ${x.hidden.length}/${HIDDEN.length} secrets`}
      </p>
      {x.nextJob?.ready && <p className="system-line">Job Change ready: {x.nextJob.job.title}!</p>}
      <div className="row end"><button className="small" onClick={onOpen}>Open</button></div>
    </SystemWindow>
  )
}


/** The Rewards screen: Job Changes and the Shadow Legion, coupons, hidden achievements, name plates. */
export function RewardsScreen({ player, summary, quests = [], onClose }: { player: Player; summary: Summary; quests?: Quest[]; onClose?: () => void }) {
  const x = summary.extras
  const legionOn = featureOn(player, 'legion')
  const [confirming, setConfirming] = useState<string | null>(null)
  const plate = player.plate && x.plates.includes(player.plate) ? player.plate : 'plain'

  return (
    <main className="hud rewards-screen">
      {onClose && <div className="row end"><button className="ghost small" onClick={onClose}>Back</button></div>}

      {legionOn && (
        <SystemWindow title={`Job Change · ${x.job?.title ?? 'Awakened'}`} className="job-panel">
          {x.nextJob ? (
            <>
              <p className="system-line">Next: <b>{x.nextJob.job.title}</b> (from level {x.nextJob.job.level})</p>
              <p className="muted">{x.nextJob.job.blurb}</p>
              <ul className="trial-list">
                {x.nextJob.checks.map(c => <li key={c.label} className={c.done ? 'done' : ''}>{c.done ? '✔' : '◇'} {c.label}</li>)}
              </ul>
              <div className="row end">
                <button disabled={!x.nextJob.ready} onClick={() => void takeJobChange()}>{x.nextJob.ready ? `Become a ${x.nextJob.job.title} (+${x.nextJob.job.xp} XP, +$${scalePay(EXTRA_PAY.job[x.nextJob.job.id] ?? 0, summary.wallet.budget).toFixed(2)})` : 'Trial not complete'}</button>
              </div>
            </>
          ) : (
            <p className="system-line">Every Job Change complete. You are a {JOBS[JOBS.length - 1].title}.</p>
          )}
        </SystemWindow>
      )}

      {legionOn && <LegionView summary={summary} quests={quests} />}

      {x.on && (
        <SystemWindow title={`Treat coupons · ${x.coupons.length}`} className="coupon-panel">
          <p className="muted">Real-life rewards, honour system. Earned from Red Gates, Golden Quests, perfect days and lucky rolls. Wildcards: {x.wildcards} (they appear on the HUD when a streak needs saving).</p>
          {x.coupons.length === 0 ? (
            <p className="muted">No coupons yet.</p>
          ) : (
            <ul className="coupon-list">
              {x.coupons.map(({ record, coupon }) => (
                <li key={record.id} className="coupon">
                  <span className="grow">🎟 {coupon.name}<small className="muted"> · from {record.day}</small></span>
                  {confirming === record.id ? (
                    <>
                      <button className="small" onClick={() => { void redeemCoupon(record.id); setConfirming(null) }}>Redeem now</button>
                      <button className="ghost small" onClick={() => setConfirming(null)}>Keep</button>
                    </>
                  ) : (
                    <button className="ghost small" onClick={() => setConfirming(record.id)}>Use</button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <p className="muted">{x.couponsUsed} redeemed so far.</p>
        </SystemWindow>
      )}

      {x.on && (
        <SystemWindow title={`Hidden achievements · ${x.hidden.length}/${HIDDEN.length}`}>
          <ul className="hidden-list">
            {HIDDEN.map(h => {
              const got = x.hidden.some(e => e.id === h.id)
              return <li key={h.id} className={got ? 'got' : ''}>{got ? <><b>{h.title}</b> <small className="muted">{h.description}</small></> : <span className="muted">??? · keep playing</span>}</li>
            })}
          </ul>
        </SystemWindow>
      )}

      {x.on && (
        <SystemWindow title="Name plate">
          <p className={`plate-preview player-name plate-${plate}`}>{player.name}</p>
          <div className="plate-grid">
            {PLATES.map(p => {
              const got = x.plates.includes(p.id)
              return (
                <button key={p.id} className={`chip ${plate === p.id ? 'picked' : ''}`} disabled={!got} aria-pressed={plate === p.id} onClick={() => void setPlate(p.id)} title={got ? p.name : `Locked: ${p.unlock}`}>
                  {got ? p.name : `🔒 ${p.unlock}`}
                </button>
              )
            })}
          </div>
        </SystemWindow>
      )}

      {x.companion && (
        <SystemWindow title="Companion stages">
          <p className="muted">{COMPANION_STAGES.map(s => `${s.name}${s.combo ? ` (${s.combo}-day combo)` : ''}`).join(' → ')}</p>
        </SystemWindow>
      )}
    </main>
  )
}

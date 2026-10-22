import { useState } from 'react'
import {
  ITEM_KIND_NAMES,
  PLAN_KIND_NAMES,
  PLAN_TEMPLATES,
  bookingBlock,
  rewardRank,
  type PlanItem,
  type PlanItemKind,
  type PlanStatus,
  type Summary,
} from '../engine'
import { bookPlanItem, closePlan, createPlan, fundPlan, unbookPlanItem, updatePlan } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'
import { money } from './format'

/** Raves, festivals and trips: save from the Vault, book piece by piece. */
export function Plans({ summary, openId, onClose }: { summary: Summary; openId: string | null; onClose: () => void }) {
  const [open, setOpen] = useState<string | null>(openId)
  const current = summary.plans.find(p => p.plan.id === open)

  return (
    <main className="hud">
      {current ? (
        <PlanDetail status={current} summary={summary} onBack={() => setOpen(null)} />
      ) : (
        <>
          <SystemWindow title="Plans">
            <p className="muted">
              Save for big experiences from your Vault and book them piece by piece. The money is the gate: any part can be booked as soon as the plan has
              enough saved for it and this month's savings goal is met.
            </p>
            <p>
              Vault free: <b>{money(summary.wallet.vault)}</b> · in plans: <b>{money(summary.wallet.inPlans)}</b>
              {summary.wallet.perMonth !== null && <> · growing about <b>{money(summary.wallet.perMonth)}</b>/month</>}
            </p>
            {summary.plans.length === 0 && <p className="muted">No plans yet.</p>}
            <ul className="party-list">
              {summary.plans.map(s => (
                <li key={s.plan.id} className="person plan-card">
                  <button className="quest-main" onClick={() => setOpen(s.plan.id)}>
                    <span className="quest-title">{s.plan.name} <small className="muted">{PLAN_KIND_NAMES[s.plan.kind]}</small></span>
                    <span className="routine-count">{countdown(s)}</span>
                  </button>
                  <Bar value={s.progress} max={1} variant="gold" label={`${money(s.total - s.remaining)} of ${money(s.total)}`} />
                </li>
              ))}
            </ul>
          </SystemWindow>
          <NewPlan onCreated={setOpen} />
        </>
      )}
      <button className="ghost settings-button" onClick={onClose}>Back</button>
    </main>
  )
}

function countdown(s: PlanStatus): string {
  if (s.daysLeft === null) return 'no date'
  if (s.daysLeft < 0) return 'past'
  return s.daysLeft === 0 ? 'today' : `${s.daysLeft}d`
}

function NewPlan({ onCreated }: { onCreated: (id: string) => void }) {
  const [templateId, setTemplateId] = useState('asia')
  const [name, setName] = useState('Asia trip')
  const [date, setDate] = useState('')
  const [withQuest, setWithQuest] = useState(true)
  const pick = (id: string) => {
    setTemplateId(id)
    setName(PLAN_TEMPLATES.find(t => t.id === id)?.name ?? '')
  }
  const create = async () => onCreated(await createPlan({ templateId, name, date, withQuest }))
  const template = PLAN_TEMPLATES.find(t => t.id === templateId)
  const total = template?.items.reduce((s, i) => s + i.cost, 0) ?? 0

  return (
    <SystemWindow title="New plan">
      <div className="tabs-inline">
        {PLAN_TEMPLATES.map(t => (
          <button key={t.id} className={`chip ${templateId === t.id ? 'picked' : ''}`} onClick={() => pick(t.id)}>{t.name}</button>
        ))}
      </div>
      <p className="muted">Starts with {template?.items.length} typical costs (about {money(total)}, {rewardRank(total)}-rank). Edit every line to your real numbers.</p>
      <div className="grid2">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={60} placeholder="e.g. Tokyo and Seoul" /></label>
        <label>Date (event or departure)<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      </div>
      <label className="check">
        <input type="checkbox" checked={withQuest} onChange={e => setWithQuest(e.target.checked)} />
        <span>Make it an Expedition main quest (saving milestones clear themselves and pay into the Vault)</span>
      </label>
      <div className="row end">
        <button disabled={!name.trim()} onClick={create}>Create plan</button>
      </div>
    </SystemWindow>
  )
}

function PlanDetail({ status, summary, onBack }: { status: PlanStatus; summary: Summary; onBack: () => void }) {
  const { plan } = status
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)

  const move = async (sign: 1 | -1) => {
    const reason = await fundPlan(plan.id, sign * Number(amount))
    setMessage(reason ?? '')
    if (!reason) setAmount('')
  }
  const book = async (item: PlanItem) => {
    if (!confirm(`Book "${item.label}" for ${money(item.cost)} from this plan's savings? Then book it for real.`)) return
    setMessage((await bookPlanItem(plan.id, item.id)) ?? '')
  }

  return (
    <>
      <SystemWindow title={plan.name} className="plan-detail">
        <p className="muted">
          {PLAN_KIND_NAMES[plan.kind]} · {rewardRank(status.total)}-rank · {plan.date ? `${plan.date} (${countdown(status)})` : 'no date yet'}
        </p>
        <Bar value={status.progress} max={1} variant="gold" label={`${Math.round(status.progress * 100)}% saved or booked`} />
        <dl className="status-list report-list">
          <dt>Total</dt><dd>{money(status.total)}</dd>
          <dt>Booked</dt><dd>{money(status.booked)}</dd>
          <dt>Saved, not yet booked</dt><dd>{money(status.fund)}</dd>
          <dt>Still to save</dt><dd>{money(status.remaining)}</dd>
        </dl>
        <Pace status={status} perMonth={summary.wallet.perMonth} />

        <div className="inline-form">
          <input type="number" min={0} inputMode="decimal" placeholder={`Amount (Vault has ${money(summary.wallet.vault)} free)`} value={amount} onChange={e => setAmount(e.target.value)} />
          <button className="small" disabled={!(Number(amount) > 0)} onClick={() => move(1)}>Save into plan</button>
        </div>
        <div className="row">
          <button className="ghost small" onClick={() => setAmount(String(Math.min(summary.wallet.vault, status.remaining)))}>Fill from Vault</button>
          {status.fund > 0 && <button className="ghost small" disabled={!(Number(amount) > 0)} onClick={() => move(-1)}>Return to Vault</button>}
        </div>
        {message && <p className="system-line">{message}</p>}
      </SystemWindow>

      <SystemWindow title="Costs">
        {!summary.savings.met && <p className="muted">Booking opens once this month's savings goal is met (Shop → Savings gate).</p>}
        <ul className="rewards">
          {plan.items.map(item => {
            const block = item.purchaseId ? null : bookingBlock(item.cost, status.fund, summary.savings.met)
            return (
              <li key={item.id} className={item.purchaseId ? 'booked' : block ? 'locked' : ''}>
                <div className="reward-info">
                  <b>{item.label}</b>
                  <small className="muted">{ITEM_KIND_NAMES[item.kind]}{item.purchaseId && ' · booked'}</small>
                </div>
                <span className="price">{money(item.cost)}</span>
                <div className="reward-actions">
                  {item.purchaseId ? (
                    <button className="ghost small" onClick={() => confirm('Un-book this? The money goes back into the plan.') && unbookPlanItem(plan.id, item.id)}>Un-book</button>
                  ) : block ? (
                    <span className="lock-reason">{block}</span>
                  ) : (
                    <button className="small" onClick={() => book(item)}>Book</button>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
        {editing ? <EditCosts status={status} onDone={() => setEditing(false)} /> : <button className="ghost small" onClick={() => setEditing(true)}>Edit plan and costs</button>}
      </SystemWindow>

      <div className="row end">
        <button className="ghost small danger" onClick={async () => { if (confirm('Cancel this plan? Unspent savings go back to the Vault; bookings stay.')) { await closePlan(plan.id, 'cancelled'); onBack() } }}>Cancel plan</button>
        {status.daysLeft !== null && status.daysLeft <= 0 && (
          <button className="small" onClick={async () => { await closePlan(plan.id, 'done'); onBack() }}>Mark as done</button>
        )}
        <button className="ghost small" onClick={onBack}>All plans</button>
      </div>
    </>
  )
}

function Pace({ status, perMonth }: { status: PlanStatus; perMonth: number | null }) {
  if (status.remaining === 0) return <p className="system-line">Fully funded. Book the rest whenever you're ready.</p>
  const lines: string[] = []
  if (status.perMonthNeeded !== null) lines.push(`To be ready by the date: about ${money(status.perMonthNeeded)} a month into this plan.`)
  if (perMonth === null) lines.push('A pace estimate appears once your first full month has passed.')
  else if (perMonth <= 0) lines.push('Your Vault hasn’t been growing lately. Side quests and main quest stages are what fill it.')
  else if (status.readyBy) {
    const late = status.plan.date && status.readyBy > status.plan.date
    lines.push(`At your recent Vault pace (${money(perMonth)}/month) it's fully funded around ${status.readyBy}${late ? ', after the date. Add side quests or trim costs.' : '.'}`)
  }
  return <>{lines.map(l => <p key={l} className="muted">{l}</p>)}</>
}

function EditCosts({ status, onDone }: { status: PlanStatus; onDone: () => void }) {
  const { plan } = status
  const [name, setName] = useState(plan.name)
  const [date, setDate] = useState(plan.date)
  const [items, setItems] = useState(plan.items)
  const [label, setLabel] = useState('')
  const [cost, setCost] = useState('')
  const [kind, setKind] = useState<PlanItemKind>('other')
  const patch = (id: string, p: Partial<PlanItem>) => setItems(list => list.map(i => (i.id === id ? { ...i, ...p } : i)))
  const save = async () => {
    await updatePlan(plan.id, { name: name.trim() || plan.name, date, items: items.filter(i => i.label.trim()) })
    onDone()
  }
  return (
    <div className="form">
      <div className="grid2">
        <label>Name<input value={name} onChange={e => setName(e.target.value)} maxLength={60} /></label>
        <label>Date<input type="date" value={date} onChange={e => setDate(e.target.value)} /></label>
      </div>
      <ul className="routine-edit">
        {items.map(i => (
          <li key={i.id}>
            <input className="name-input" value={i.label} disabled={!!i.purchaseId} onChange={e => patch(i.id, { label: e.target.value })} aria-label="Cost name" />
            <input className="target-input" type="number" min={0} inputMode="decimal" value={i.cost} disabled={!!i.purchaseId} onChange={e => patch(i.id, { cost: Math.max(0, Number(e.target.value) || 0) })} aria-label={`${i.label} cost`} />
            <span className="muted unit">$</span>
            {!i.purchaseId && <button className="ghost small icon" aria-label={`Remove ${i.label}`} onClick={() => setItems(list => list.filter(x => x.id !== i.id))}>×</button>}
          </li>
        ))}
      </ul>
      <div className="grid2">
        <label>Add a cost<input value={label} onChange={e => setLabel(e.target.value)} placeholder="e.g. Rail pass" maxLength={50} /></label>
        <label>Amount ($)<input type="number" min={0} inputMode="decimal" value={cost} onChange={e => setCost(e.target.value)} /></label>
      </div>
      <div className="row">
        <select value={kind} onChange={e => setKind(e.target.value as PlanItemKind)} aria-label="Kind">
          {(Object.keys(ITEM_KIND_NAMES) as PlanItemKind[]).map(k => <option key={k} value={k}>{ITEM_KIND_NAMES[k]}</option>)}
        </select>
        <button className="ghost small" disabled={!label.trim() || !(Number(cost) > 0)} onClick={() => { setItems(list => [...list, { id: crypto.randomUUID(), label: label.trim(), kind, cost: Number(cost), purchaseId: null }]); setLabel(''); setCost('') }}>Add</button>
      </div>
      <p className="muted">Booked costs are locked; un-book them first to change them.</p>
      <div className="row end">
        <button className="ghost small" onClick={onDone}>Cancel</button>
        <button className="small" onClick={save}>Save</button>
      </div>
    </div>
  )
}

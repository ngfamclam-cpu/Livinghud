import { useState } from 'react'
import {
  DAYS_PER_MONTH,
  DEFAULT_WEEKEND_PLAN,
  PURCHASE_SIZES,
  TARGET_COMPLETION,
  WEEKEND_ITEMS,
  planCost,
  weekendPrice,
  weekendSpend,
  type Player,
  type Purchase,
  type Summary,
  type WeekendPlan,
} from '../engine'
import { buyWeekend, resetMoney, saveWeekendPrefs, updateSettings } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { money } from './format'

const whole = (n: number) => `$${Math.round(n)}`

/** What a perfect day of dailies earns at this budget. */
const perfectDayPay = (budget: number) => budget / (DAYS_PER_MONTH * TARGET_COMPLETION)

/** The weekend menu: real things at real prices, bought with quest money. */
export function WeekendMenu({ player, purchases, summary }: { player: Player; purchases: Purchase[]; summary: Summary }) {
  const [drinks, setDrinks] = useState(1)
  const [label, setLabel] = useState('')
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState(false)
  const prices = player.weekendPrices
  const spendable = summary.wallet.available + summary.wallet.vault
  const spend = weekendSpend(purchases, summary.today)
  const drink = WEEKEND_ITEMS[0]
  const drinkPrice = weekendPrice(drink, prices)
  const day = perfectDayPay(summary.wallet.budget)

  const buy = async (id: string, title: string, price: number, count = 1, custom?: number) => {
    if (!confirm(`${title} for ${money(price)}?\n\nPaid from your wallet first, then the Vault. Go enjoy it for real.`)) return
    const reason = await buyWeekend(id, count, custom, label)
    setMessage(reason ? `Can't buy it yet: ${reason}.` : `Bought: ${title}. Enjoy!`)
    if (!reason) {
      setDrinks(1)
      setLabel('')
    }
  }

  return (
    <SystemWindow title="Weekend menu" className="weekend-menu">
      <p className="muted">
        Real prices for the things you actually do. A perfect day of dailies earns about <b>{money(day)}</b> ≈ {(day / drinkPrice).toFixed(1)} drinks. You can spend <b>{money(spendable)}</b> right now
        {spendable >= drinkPrice ? ` (${Math.floor(spendable / drinkPrice)} drinks' worth)` : ''}.
      </p>
      {spend.count > 0 && <p className="system-line">This weekend so far: {money(spend.total)} on {spend.count} thing{spend.count === 1 ? '' : 's'}.</p>}
      {message && <p className="system-line">{message}</p>}

      <div className="weekend-grid">
        <div className="weekend-item">
          <span className="weekend-emoji" aria-hidden="true">{drink.emoji}</span>
          <b>Drinks</b>
          <small className="muted">{whole(drinkPrice)} each</small>
          <div className="stepper">
            <button className="ghost small" aria-label="One fewer drink" onClick={() => setDrinks(d => Math.max(1, d - 1))}>−</button>
            <span>{drinks}</span>
            <button className="ghost small" aria-label="One more drink" onClick={() => setDrinks(d => Math.min(20, d + 1))}>+</button>
          </div>
          <button className="small" onClick={() => buy('drink', drinks > 1 ? `${drinks} drinks` : 'A drink', drinkPrice * drinks, drinks)}>Buy {money(drinkPrice * drinks)}</button>
        </div>
        {WEEKEND_ITEMS.slice(1).map(item => {
          const price = weekendPrice(item, prices)
          return (
            <div key={item.id} className="weekend-item">
              <span className="weekend-emoji" aria-hidden="true">{item.emoji}</span>
              <b>{item.title}</b>
              <small className="muted">{item.special === 'date' ? '+ Charisma XP' : ' '}</small>
              <button className="small" onClick={() => buy(item.id, item.title, price)}>Buy {whole(price)}</button>
            </div>
          )
        })}
      </div>

      <div className="weekend-purchase">
        <b>🛍️ Purchase</b>
        <input value={label} onChange={e => setLabel(e.target.value)} placeholder="What is it? (optional)" maxLength={40} aria-label="What the purchase is" />
        <div className="row">
          {PURCHASE_SIZES.map(size => (
            <button key={size} className="small" onClick={() => buy('purchase', label.trim() || `Purchase ${whole(size)}`, size, 1, size)}>{whole(size)}</button>
          ))}
        </div>
      </div>

      <p className="muted small-print">No level needed here: your money is the gate. {summary.savings.target > 0 && !summary.savings.met && 'Your savings goal still has to be met first. '}Bought by mistake? Refund it today under Purchases.</p>
      <button className="ghost small" onClick={() => setEditing(e => !e)}>{editing ? 'Done' : 'Change prices'}</button>
      {editing && <PriceEditor player={player} />}
    </SystemWindow>
  )
}

function PriceEditor({ player }: { player: Player }) {
  const [draft, setDraft] = useState<Record<string, string>>(() => Object.fromEntries(WEEKEND_ITEMS.map(i => [i.id, String(weekendPrice(i, player.weekendPrices))])))
  const save = () => {
    const prices: Record<string, number> = {}
    for (const i of WEEKEND_ITEMS) {
      const v = Number(draft[i.id])
      if (v > 0 && v !== i.price) prices[i.id] = Math.round(v * 100) / 100
    }
    void saveWeekendPrefs({ weekendPrices: prices })
  }
  return (
    <div className="form">
      <div className="grid2">
        {WEEKEND_ITEMS.map(i => (
          <label key={i.id}>
            {i.title} ($)
            <input type="number" min={1} inputMode="decimal" value={draft[i.id]} onChange={e => setDraft(d => ({ ...d, [i.id]: e.target.value }))} />
          </label>
        ))}
      </div>
      <div className="row end">
        <button className="small ghost" onClick={() => setDraft(Object.fromEntries(WEEKEND_ITEMS.map(i => [i.id, String(i.price)])))}>Reset</button>
        <button className="small" onClick={save}>Save prices</button>
      </div>
    </div>
  )
}

const PLAN_FIELDS: { key: keyof WeekendPlan; label: string; per: string; step: number }[] = [
  { key: 'drinks', label: 'Drinks', per: 'per weekend', step: 1 },
  { key: 'foodLow', label: 'Cheap eats', per: 'per weekend', step: 1 },
  { key: 'foodHigh', label: 'Nice meals', per: 'per weekend', step: 1 },
  { key: 'tickets', label: 'Event tickets', per: 'per month', step: 1 },
  { key: 'dates', label: 'Date nights', per: 'per month', step: 1 },
  { key: 'purchases', label: 'Other purchases ($)', per: 'per month', step: 25 },
]

/**
 * Budget from real life: describe a typical month of weekends and it suggests
 * the monthly budget. Saving it recalibrates what every quest pays, including
 * what you've already earned this month.
 */
export function BudgetHelper({ player }: { player: Player }) {
  const [plan, setPlan] = useState<WeekendPlan>(player.weekendPlan ?? DEFAULT_WEEKEND_PLAN)
  const [budget, setBudget] = useState(String(player.settings.monthlyBudget))
  const [saved, setSaved] = useState('')
  const cost = planCost(plan, player.weekendPrices)
  const value = Math.max(0, Number(budget) || 0)
  const current = player.settings.monthlyBudget

  const apply = async (amount: number) => {
    await saveWeekendPrefs({ weekendPlan: plan })
    await updateSettings({ monthlyBudget: amount })
    setBudget(String(amount))
    setSaved(`Budget set to ${whole(amount)} a month. Quests pay the new rate from now on; your wallet and Vault didn't change.`)
  }

  return (
    <SystemWindow title="Budget">
      <p className="muted">Your dailies earn your monthly budget when you hit about 80% of them. Set it to what your weekends really cost and quest money becomes real weekend money.</p>
      <label>
        Monthly budget ($)
        <input type="number" min={0} inputMode="decimal" value={budget} onChange={e => setBudget(e.target.value)} />
      </label>
      <p className="muted">
        At {whole(value)}: a perfect day ≈ {money(perfectDayPay(value))}, a perfect week ≈ {money(perfectDayPay(value) * 7)}.
        {value !== current && ' Changing it only affects what you earn from now on: your wallet and Vault stay exactly as they are.'}
      </p>
      <div className="row end">
        <button className="small" disabled={value === current} onClick={() => apply(value)}>Save budget</button>
      </div>

      <details className="budget-planner">
        <summary>Work it out from my weekends</summary>
        <div className="grid2">
          {PLAN_FIELDS.map(f => (
            <label key={f.key}>
              {f.label} <small className="muted">{f.per}</small>
              <input type="number" min={0} step={f.step} inputMode="numeric" value={plan[f.key]} onChange={e => setPlan(p => ({ ...p, [f.key]: Math.max(0, Number(e.target.value) || 0) }))} />
            </label>
          ))}
        </div>
        <p>
          A typical weekend costs <b>{money(cost.perWeekend)}</b> before tickets and dates; a month of it is about <b>{whole(cost.perMonth)}</b>.
        </p>
        <div className="row end">
          <button className="small" disabled={cost.perMonth === current} onClick={() => apply(cost.perMonth)}>Use {whole(cost.perMonth)} as my budget</button>
        </div>
      </details>
      {saved && <p className="system-line">{saved}</p>}
      <details className="budget-planner">
        <summary>Start my money from $0</summary>
        <p className="muted">Sets your wallet and Vault to $0 and counts only what you earn and spend from now on. Your quests, XP and purchase history are kept.</p>
        <div className="row end">
          <button className="small danger" onClick={() => { if (confirm('Set your wallet and Vault to $0 and start counting from now?')) void resetMoney().then(() => setSaved('Wallet and Vault start from $0 now.')) }}>Reset wallet and Vault to $0</button>
        </div>
      </details>
    </SystemWindow>
  )
}

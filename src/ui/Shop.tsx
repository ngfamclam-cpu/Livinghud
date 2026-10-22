import { useState } from 'react'
import {
  RANK_MIN_LEVEL,
  REWARD_RANKS,
  REWARD_TEMPLATES,
  checkPurchase,
  monthOf,
  rewardRank,
  vaultOnly,
  type Player,
  type Purchase,
  type Reward,
  type RewardSpecial,
  type SavingsEntry,
  type StatKey,
  type Summary,
} from '../engine'
import { addReward, addSuggestedRewards, buyReward, deleteSavings, logSavings, refundPurchase, removeReward } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { EditReward, OneOffPurchase, RewardIdeas } from './ShopExtras'
import { money, monthName, SPECIAL_LABEL } from './format'

interface Props {
  player: Player
  rewards: Reward[]
  purchases: Purchase[]
  savings: SavingsEntry[]
  summary: Summary
}

export function Shop({ player, rewards, purchases, savings, summary }: Props) {
  const [message, setMessage] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const active = rewards.filter(r => r.active).sort((a, b) => a.price - b.price)
  const { wallet } = summary
  const ctx = {
    level: summary.level.level,
    stats: summary.stats,
    wallet: wallet.available,
    vault: wallet.vault,
    savingsMet: summary.savings.met,
    mainQuestsCleared: summary.mainQuestsCleared,
  }
  const owned = new Set(active.map(r => r.templateId))
  const missingSuggested = REWARD_TEMPLATES.filter(t => !owned.has(t.id)).map(t => t.id)

  const buy = async (r: Reward) => {
    const check = checkPurchase(r, ctx)
    if (!check.ok) return
    const from = [check.fromWallet > 0 && `${money(check.fromWallet)} from the wallet`, check.fromVault > 0 && `${money(check.fromVault)} from the Vault`]
      .filter(Boolean)
      .join(' and ')
    if (!confirm(`Buy "${r.title}" for ${money(r.price)}?\n\nThis spends ${from || 'nothing'}. Then go enjoy it for real.`)) return
    const reason = await buyReward(r)
    setMessage(reason ? `Could not buy: ${reason}.` : '')
  }

  const remove = (r: Reward) => {
    if (confirm(`Remove "${r.title}" from the shop?`)) removeReward(r)
  }

  const history = [...purchases].sort((a, b) => b.createdAt - a.createdAt).slice(0, 15)

  return (
    <main className="hud">
      <SystemWindow title="Reward shop">
        <div className="wallet">
          <div>
            <div className="muted">Wallet · {monthName(wallet.month)}</div>
            <div className="big">{money(wallet.available)}</div>
            <div className="muted">for ranks E–B</div>
          </div>
          <div className="vault">
            <div className="muted">Vault</div>
            <div className="big">{money(wallet.vault)}</div>
            <div className="muted">the only way to buy A and S</div>
          </div>
        </div>
        <p className="muted">
          E–B rewards spend the wallet first, then the Vault if the wallet is short. Wallet money left at the end of the month rolls into the Vault.
        </p>
        {message && <p className="system-line">{message}</p>}
      </SystemWindow>

      <SavingsGate player={player} savings={savings} summary={summary} />

      {REWARD_RANKS.map(rank => {
        const list = active.filter(r => rewardRank(r.price) === rank)
        if (list.length === 0) return null
        const minLevel = RANK_MIN_LEVEL[rank]
        const levelLocked = summary.level.level < minLevel
        return (
          <SystemWindow key={rank} title={`${rank}-rank`} className={`rank-window rank-${rank} ${levelLocked ? 'locked' : ''}`}>
            <p className="muted">
              {rankRange(rank)} · {minLevel > 1 ? `Level ${minLevel}+` : 'Any level'}
              {vaultOnly(rank) && ' · Vault only'}
              {rank === 'S' && ' · after clearing a main quest'}
            </p>
            <ul className="rewards">
              {list.map(r => {
                const check = checkPurchase(r, ctx)
                return (
                  <li key={r.id} className={check.ok ? '' : 'locked'}>
                    <div className="reward-info">
                      <b>{r.title}</b>
                      <small className="muted">
                        {r.category}
                        {r.special !== 'none' && ` · ${SPECIAL_LABEL[r.special]}`}
                        {r.statGate && ` · needs ${r.statGate.stat} ${r.statGate.min}`}
                      </small>
                    </div>
                    <span className="price">{money(r.price)}</span>
                    <div className="reward-actions">
                      {check.ok ? <button className="small" onClick={() => buy(r)}>Buy</button> : <span className="lock-reason">{check.reason}</span>}
                      <button className="ghost small" onClick={() => setEditing(e => (e === r.id ? null : r.id))}>Edit</button>
                      <button className="ghost small icon" aria-label={`Remove ${r.title}`} title="Remove" onClick={() => remove(r)}>×</button>
                    </div>
                    {editing === r.id && <EditReward reward={r} onDone={() => setEditing(null)} />}
                  </li>
                )
              })}
            </ul>
          </SystemWindow>
        )
      })}

      <OneOffPurchase />

      <RewardIdeas stats={player.stats} owned={owned} />

      <SystemWindow title="Add a reward">
        {active.length === 0 && <p>Your shop is empty. Start with the suggested list, or add your own rewards below.</p>}
        {missingSuggested.length > 0 && (
          <button className="ghost small" onClick={() => addSuggestedRewards(missingSuggested)}>
            Add {missingSuggested.length} suggested reward{missingSuggested.length === 1 ? '' : 's'}
          </button>
        )}
        <RewardForm stats={player.stats} />
      </SystemWindow>

      {history.length > 0 && (
        <SystemWindow title="Purchases">
          <ul className="board-list">
            {history.map(p => (
              <li key={p.id}>
                <span className="stat-key">{p.rank}</span>
                <span className="quest-title">
                  {p.title} <small className="muted">{p.day} · {money(p.price)}{p.xp > 0 && ` · +${p.xp} ${p.stat} XP`}</small>
                </span>
                {p.day === summary.today && <button className="ghost small" onClick={() => refundPurchase(p)}>Refund</button>}
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}
    </main>
  )
}

function SavingsGate({ player, savings, summary }: { player: Player; savings: SavingsEntry[]; summary: Summary }) {
  const goal = player.settings.savingsGoal
  const [amount, setAmount] = useState('')
  const [income, setIncome] = useState('')
  const status = summary.savings
  const month = monthOf(summary.today)
  const entries = savings.filter(e => monthOf(e.day) === month).sort((a, b) => b.createdAt - a.createdAt)

  if (goal.type === 'off') {
    return (
      <SystemWindow title="Savings gate">
        <p className="muted">The savings gate is off. You can turn it on in Settings.</p>
      </SystemWindow>
    )
  }

  const submit = async (kind: 'saved' | 'income', value: string, clear: (v: string) => void) => {
    await logSavings(kind, Number(value))
    clear('')
  }

  return (
    <SystemWindow title="Savings gate" className={status.met ? 'gate-met' : 'gate-locked'}>
      <p className={status.met ? 'system-line' : ''}>
        {status.met
          ? `Goal met for ${monthName(month)}. The shop is open.`
          : goal.type === 'percent' && status.income === 0
            ? `Pay yourself first: log this month's income, then save ${goal.amount}% of it to open the shop.`
            : `Pay yourself first: save ${money(status.target)} this month to open the shop.`}
      </p>
      <p className="muted">
        Saved {money(status.saved)} of {money(status.target)}
        {goal.type === 'percent' && ` (${goal.amount}% of ${money(status.income)} income)`}
      </p>
      <div className="inline-form">
        <input type="number" min={0} inputMode="decimal" placeholder="Amount saved ($)" value={amount} onChange={e => setAmount(e.target.value)} />
        <button className="small" disabled={!(Number(amount) > 0)} onClick={() => submit('saved', amount, setAmount)}>Log savings</button>
      </div>
      {goal.type === 'percent' && (
        <div className="inline-form">
          <input type="number" min={0} inputMode="decimal" placeholder="Income received ($)" value={income} onChange={e => setIncome(e.target.value)} />
          <button className="small ghost" disabled={!(Number(income) > 0)} onClick={() => submit('income', income, setIncome)}>Log income</button>
        </div>
      )}
      {entries.length > 0 && (
        <ul className="board-list compact">
          {entries.map(e => (
            <li key={e.id}>
              <span className="quest-title">{e.kind === 'saved' ? 'Saved' : 'Income'} {money(e.amount)} <small className="muted">{e.day}</small></span>
              <button className="ghost small icon" aria-label="Delete entry" title="Delete" onClick={() => deleteSavings(e.id)}>×</button>
            </li>
          ))}
        </ul>
      )}
    </SystemWindow>
  )
}

function RewardForm({ stats }: { stats: StatKey[] }) {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [category, setCategory] = useState('')
  const [special, setSpecial] = useState<RewardSpecial>('none')
  const [gateStat, setGateStat] = useState<StatKey | ''>('')
  const [gateMin, setGateMin] = useState('40')
  const value = Number(price)
  const valid = title.trim().length > 0 && value > 0

  const save = async () => {
    await addReward({
      title,
      price: value,
      category,
      special,
      statGate: gateStat ? { stat: gateStat, min: Math.min(100, Math.max(0, Number(gateMin) || 0)) } : null,
    })
    setTitle('')
    setPrice('')
    setSpecial('none')
    setGateStat('')
  }

  return (
    <div className="form">
      <label>Reward<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. New headphones" maxLength={60} /></label>
      <div className="grid2">
        <label>
          Real price ($)
          <input type="number" min={0} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} />
        </label>
        <label>Category<input value={category} onChange={e => setCategory(e.target.value)} placeholder="e.g. Gear" maxLength={30} /></label>
      </div>
      {value > 0 && (
        <p className="muted">
          This is a <b>{rewardRank(value)}-rank</b> reward: level {RANK_MIN_LEVEL[rewardRank(value)]}+{vaultOnly(rewardRank(value)) && ', paid from the Vault'}.
        </p>
      )}
      <label>
        Type
        <select value={special} onChange={e => setSpecial(e.target.value as RewardSpecial)}>
          {(Object.keys(SPECIAL_LABEL) as RewardSpecial[]).map(k => <option key={k} value={k}>{SPECIAL_LABEL[k]}</option>)}
        </select>
      </label>
      <div className="grid2">
        <label>
          Stat needed (optional)
          <select value={gateStat} onChange={e => setGateStat(e.target.value as StatKey | '')}>
            <option value="">None</option>
            {stats.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        {gateStat && (
          <label>Minimum {gateStat}<input type="number" min={0} max={100} value={gateMin} onChange={e => setGateMin(e.target.value)} /></label>
        )}
      </div>
      <div className="row end">
        <button disabled={!valid} onClick={save}>Add reward</button>
      </div>
    </div>
  )
}

function rankRange(rank: string): string {
  return { E: 'Under $10', D: '$10–30', C: '$30–75', B: '$75–200', A: '$200–500', S: '$500+' }[rank] ?? ''
}

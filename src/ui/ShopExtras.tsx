import { useState } from 'react'
import { RANK_MIN_LEVEL, REWARD_IDEAS, rewardRank, vaultOnly, type Reward, type RewardSpecial, type StatKey } from '../engine'
import { addSuggestedRewards, buyOneOff, updateReward } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { money, SPECIAL_LABEL } from './format'

/** One-tap reward ideas that fit the rest of the game; ideas for your stats come first. */
export function RewardIdeas({ stats, owned }: { stats: StatKey[]; owned: Set<string | null> }) {
  const ideas = REWARD_IDEAS.filter(i => !owned.has(i.id)).sort(
    (a, b) => Number(!a.stat || !stats.includes(a.stat)) - Number(!b.stat || !stats.includes(b.stat)),
  )
  const categories = [...new Set(ideas.map(i => i.category))]
  const [category, setCategory] = useState<string | null>(null)
  if (ideas.length === 0) return null
  const shown = ideas.filter(i => !category || i.category === category)

  return (
    <SystemWindow title="Ideas for you">
      <p className="muted">Picked to go with your training, posture work, automations, side income and social life. Prices are typical; edit them after adding.</p>
      <div className="tabs-inline">
        <button className={`chip ${category === null ? 'picked' : ''}`} onClick={() => setCategory(null)}>All</button>
        {categories.map(c => (
          <button key={c} className={`chip ${category === c ? 'picked' : ''}`} onClick={() => setCategory(c)}>{c}</button>
        ))}
      </div>
      <ul className="rewards ideas">
        {shown.map(i => {
          const rank = rewardRank(i.price)
          return (
            <li key={i.id}>
              <div className="reward-info">
                <b>{i.title}</b>
                <small className="muted">
                  {rank}-rank{RANK_MIN_LEVEL[rank] > 1 ? ` · level ${RANK_MIN_LEVEL[rank]}+` : ''}{vaultOnly(rank) ? ' · Vault' : ''}
                  {i.statGate && ` · needs ${i.statGate.stat} ${i.statGate.min}`}
                </small>
                {i.why && <small>{i.why}</small>}
              </div>
              <span className="price">{money(i.price)}</span>
              <div className="reward-actions">
                <button className="small" onClick={() => addSuggestedRewards([i.id])}>+ Add</button>
              </div>
            </li>
          )
        })}
      </ul>
    </SystemWindow>
  )
}

/** Inline editor for a reward's name, price, category and type. */
export function EditReward({ reward, onDone }: { reward: Reward; onDone: () => void }) {
  const [title, setTitle] = useState(reward.title)
  const [price, setPrice] = useState(String(reward.price))
  const [category, setCategory] = useState(reward.category)
  const [special, setSpecial] = useState<RewardSpecial>(reward.special)
  const value = Number(price)
  const save = async () => {
    await updateReward(reward.id, { title, price: value, category, special })
    onDone()
  }
  return (
    <div className="form edit-reward">
      <label>Name<input value={title} onChange={e => setTitle(e.target.value)} maxLength={60} /></label>
      <div className="grid2">
        <label>Price ($)<input type="number" min={0} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label>Category<input value={category} onChange={e => setCategory(e.target.value)} maxLength={30} /></label>
      </div>
      <label>
        Type
        <select value={special} onChange={e => setSpecial(e.target.value as RewardSpecial)}>
          {(Object.keys(SPECIAL_LABEL) as RewardSpecial[]).map(k => <option key={k} value={k}>{SPECIAL_LABEL[k]}</option>)}
        </select>
      </label>
      {value > 0 && <p className="muted">Becomes {rewardRank(value)}-rank.</p>}
      <div className="row end">
        <button className="ghost small" onClick={onDone}>Cancel</button>
        <button className="small" disabled={!title.trim() || !(value > 0)} onClick={save}>Save</button>
      </div>
    </div>
  )
}

/** Buy something that isn't on your list, as needed, through the same gates. */
export function OneOffPurchase() {
  const [title, setTitle] = useState('')
  const [price, setPrice] = useState('')
  const [special, setSpecial] = useState<RewardSpecial>('none')
  const [keep, setKeep] = useState(false)
  const [message, setMessage] = useState('')
  const value = Number(price)

  const buy = async () => {
    if (!confirm(`Buy "${title.trim()}" for ${money(value)}? Then go enjoy it for real.`)) return
    const reason = await buyOneOff({ title, price: value, category: 'One-off', special }, keep)
    if (reason) setMessage(`Can't buy it yet: ${reason}.`)
    else {
      setMessage(`Bought: ${title.trim()}.`)
      setTitle('')
      setPrice('')
      setSpecial('none')
    }
  }

  return (
    <SystemWindow title="Buy something else">
      <p className="muted">Something that isn't on your list? Buy it here. The same rules apply: savings goal, level for its rank, and wallet or Vault.</p>
      <label>What is it?<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Concert tickets with Sam" maxLength={60} /></label>
      <div className="grid2">
        <label>Price ($)<input type="number" min={0} inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} /></label>
        <label>
          Type
          <select value={special} onChange={e => setSpecial(e.target.value as RewardSpecial)}>
            {(Object.keys(SPECIAL_LABEL) as RewardSpecial[]).map(k => <option key={k} value={k}>{SPECIAL_LABEL[k]}</option>)}
          </select>
        </label>
      </div>
      {value > 0 && <p className="muted">{rewardRank(value)}-rank: level {RANK_MIN_LEVEL[rewardRank(value)]}+{vaultOnly(rewardRank(value)) ? ', paid from the Vault' : ''}.</p>}
      <label className="check">
        <input type="checkbox" checked={keep} onChange={e => setKeep(e.target.checked)} /> Also keep it in my shop for next time
      </label>
      {message && <p className="system-line">{message}</p>}
      <div className="row end">
        <button disabled={!title.trim() || !(value > 0)} onClick={buy}>Buy</button>
      </div>
    </SystemWindow>
  )
}

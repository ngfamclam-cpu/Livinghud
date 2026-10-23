import { useState } from 'react'
import { RANK_MIN_LEVEL, REWARD_IDEAS, addDays, dayKey, daysBetween, goalProgress, rewardOffers, rewardRank, vaultOnly, type GoalProgress, type Player, type Reward, type RewardSpecial, type RewardTemplate, type Summary } from '../engine'
import { Bar } from './Bar'
import { addSuggestedRewards, buyOneOff, surpriseSeed, toggleFavoriteReward, updateReward } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { money, SPECIAL_LABEL } from './format'

/**
 * "Ideas for you": a fresh set every 3 days (same window as side quest offers),
 * plus the ideas you starred, pinned on top with how close you are to each.
 */
export function RewardIdeas({ player, summary, rewards }: { player: Player; summary: Summary; rewards: Reward[] }) {
  const [browse, setBrowse] = useState(false)
  const resetHour = player.settings.resetHour
  const owned = new Map<string, string>()
  for (const r of rewards) if (r.active && r.templateId) owned.set(r.templateId, dayKey(new Date(r.createdAt), resetHour))
  const favorites = (player.favoriteRewards ?? []).map(id => REWARD_IDEAS.find(i => i.id === id)).filter((i): i is RewardTemplate => !!i)
  const startDay = dayKey(new Date(player.createdAt), resetHour)
  const set = rewardOffers(
    { seed: surpriseSeed(player), daysSinceStart: daysBetween(startDay, summary.today), stats: player.stats, owned, favorites: favorites.map(f => f.id) },
    addDays,
    summary.today,
  )
  const ctx = {
    level: summary.level.level,
    stats: summary.stats,
    wallet: summary.wallet.available,
    vault: summary.wallet.vault,
    savingsMet: summary.savings.met,
    mainQuestsCleared: summary.mainQuestsCleared,
  }
  const left = daysBetween(summary.today, set.nextOn)
  const all = REWARD_IDEAS.filter(i => !favorites.includes(i))

  return (
    <SystemWindow title="Ideas for you" className="reward-ideas">
      {favorites.length > 0 && (
        <>
          <h3>★ Working toward</h3>
          <ul className="rewards ideas favorites">
            {favorites.map(i => <IdeaRow key={i.id} idea={i} inShop={owned.has(i.id)} favorite progress={goalProgress(i, ctx)} />)}
          </ul>
        </>
      )}
      <h3>New picks</h3>
      <p className="muted">
        A fresh set every 3 days, picked for your training, posture, raves, the Asia trip and side income. Next set {left <= 1 ? 'tomorrow' : `in ${left} days`}. Star one to keep it here and track it. Prices are typical; edit them after adding.
      </p>
      <ul className="rewards ideas">
        {set.offers.map(i => <IdeaRow key={i.id} idea={i} inShop={owned.has(i.id)} favorite={false} />)}
      </ul>
      <div className="row end">
        <button className="ghost small" onClick={() => setBrowse(b => !b)}>{browse ? 'Hide the full list' : `Browse all ${REWARD_IDEAS.length} ideas`}</button>
      </div>
      {browse && (
        <ul className="rewards ideas">
          {all.map(i => <IdeaRow key={i.id} idea={i} inShop={owned.has(i.id)} favorite={false} />)}
        </ul>
      )}
    </SystemWindow>
  )
}

function IdeaRow({ idea: i, inShop, favorite, progress }: { idea: RewardTemplate; inShop: boolean; favorite: boolean; progress?: GoalProgress }) {
  const rank = rewardRank(i.price)
  return (
    <li className={favorite ? 'favorite' : ''}>
      <div className="reward-info">
        <b>{i.title}</b>
        <small className="muted">
          {rank}-rank{RANK_MIN_LEVEL[rank] > 1 ? ` · level ${RANK_MIN_LEVEL[rank]}+` : ''}{vaultOnly(rank) ? ' · Vault' : ''}
          {i.statGate && ` · needs ${i.statGate.stat} ${i.statGate.min}`}
          {` · ${i.category}`}
        </small>
        {i.why && <small>{i.why}</small>}
        {progress && (
          <div className="goal">
            <Bar value={progress.have} max={i.price} variant="gold" thin label={`${money(Math.min(progress.have, i.price))} of ${money(i.price)}`} />
            <small className={progress.blockers.length ? 'muted' : 'system-line'}>
              {progress.blockers.length ? `To go: ${progress.blockers.join(' · ')}` : inShop ? 'Ready: buy it in the shop above.' : 'Ready: add it to the shop and buy it.'}
            </small>
          </div>
        )}
      </div>
      <span className="price">{money(i.price)}</span>
      <div className="reward-actions">
        <button
          className={`ghost small icon star ${favorite ? 'on' : ''}`}
          aria-pressed={favorite}
          aria-label={favorite ? `Unstar ${i.title}` : `Star ${i.title} to work toward it`}
          title={favorite ? 'Stop tracking' : 'Work toward this'}
          onClick={() => toggleFavoriteReward(i.id)}
        >
          {favorite ? '★' : '☆'}
        </button>
        {inShop ? <span className="cleared">IN SHOP</span> : <button className="small" onClick={() => addSuggestedRewards([i.id])}>+ Add</button>}
      </div>
    </li>
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

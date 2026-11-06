import { useState } from 'react'
import { HUMAN_COMPANIONS, RANK_MIN_LEVEL, rewardRank, vaultOnly, type Summary } from '../../engine'
import { buyCompanion } from '../../db/companions'
import { SystemWindow } from '../SystemWindow'
import { money } from '../format'
import { HumanPortrait } from './HumanPortrait'

/** Human companions for sale. Bought like any reward (rank, level, wallet/Vault, savings goal). */
export function CompanionShop({ summary }: { summary: Summary }) {
  const [message, setMessage] = useState('')
  const owned = new Set(summary.extras.pets?.owned.map(p => p.def.id) ?? [])
  const buy = async (id: string, name: string) => {
    if (!confirm(`Bring ${name} home? This spends reward money like any purchase.`)) return
    const why = await buyCompanion(id)
    setMessage(why ? `Could not: ${why}` : `${name} is now your companion. Say hi on the Today screen.`)
  }
  return (
    <SystemWindow title="Companions" className="companion-shop">
      <p className="muted">Fictional companions with their own personality, flirty talk and an affection level. Spend time with her (clear quests while she's active, go on her date nights) to unlock new outfits. Each portrait is made for you with your free image allowance.</p>
      <ul className="companion-list">
        {HUMAN_COMPANIONS.map(h => {
          const rank = rewardRank(h.price)
          const have = owned.has(h.id)
          const outfit = summary.extras.portraits[`${h.id}:${h.outfits[0].id}`]
          return (
            <li key={h.id} className={`companion-offer p-${h.personality}`}>
              <HumanPortrait human={h} photoId={outfit} size={84} />
              <div className="grow">
                <b>{h.name}</b> <span className="stat-key">{rank}-rank</span>
                <p className="muted">{h.tagline}</p>
                <small className="muted">{h.style === 'real' ? 'Photo-real' : 'Anime'} · {h.outfits.length} outfits · {money(h.price)}{vaultOnly(rank) ? ' · Vault only' : ''} · level {RANK_MIN_LEVEL[rank]}+</small>
              </div>
              {have ? <span className="cleared">With you</span> : <button className="small" onClick={() => void buy(h.id, h.name)}>Buy</button>}
            </li>
          )
        })}
      </ul>
      {message && <p className="system-line">{message}</p>}
    </SystemWindow>
  )
}

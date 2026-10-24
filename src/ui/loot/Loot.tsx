import { useEffect, useMemo, useState } from 'react'
import {
  CARDS,
  RARITY_NAMES,
  SERIES,
  STAR_COPIES,
  STAR_UP_XP,
  cardById,
  collection,
  featuredSeries,
  monthOf,
  onGameEvent,
  type Card,
  type CardKind,
  type LootDrop,
  type Player,
  type Summary,
} from '../../engine'
import { surpriseSeed } from '../../db/actions'
import { SystemWindow } from '../SystemWindow'
import { CardArt } from './CardArt'

interface Reveal {
  card: Card
  copies: number
  starUp: boolean
}

/** The drop reveal: a card flips in when loot drops. Queues if several drop at once. */
export function LootReveal() {
  const [queue, setQueue] = useState<Reveal[]>([])
  useEffect(
    () =>
      onGameEvent(e => {
        if (e.type !== 'loot.card') return
        const card = cardById(e.cardId)
        if (card) setQueue(q => [...q, { card, copies: e.copies, starUp: e.starUp }])
      }),
    [],
  )
  const current = queue[0]
  if (!current) return null
  const starsNow = STAR_COPIES.filter(n => current.copies >= n).length
  const close = () => setQueue(q => q.slice(1))
  return (
    <div className="overlay loot-reveal" role="dialog" aria-label={`Loot drop: ${current.card.name}`} onClick={close}>
      <p className={`drop-title r-${current.card.rarity}`}>{RARITY_NAMES[current.card.rarity].toUpperCase()} DROP</p>
      <div className="flip-in">
        <CardArt card={current.card} stars={starsNow} />
      </div>
      <p className="drop-text">{current.card.text}</p>
      <p className="system-line">
        {current.copies === 1 ? 'New card for your collection!' : current.starUp ? `Powered up to ${'★'.repeat(starsNow)}! +${STAR_UP_XP} XP` : `Duplicate ×${current.copies}. ${nextStar(current.copies)}`}
      </p>
      <button className="arise" onClick={close}>Collect</button>
    </div>
  )
}

const nextStar = (copies: number) => {
  const next = STAR_COPIES.find(n => n > copies)
  return next ? `${next - copies} more for the next star.` : 'Maxed out.'
}

const FILTERS: { key: CardKind | 'all'; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'idol', label: 'Idols' },
  { key: 'relic', label: 'Relics' },
  { key: 'playing', label: 'Deck' },
]

/** The binder: every card, collected or not, with copies and power-up stars. */
export function Collection({ player, summary, loot, onClose }: { player: Player; summary: Summary; loot: LootDrop[]; onClose?: () => void }) {
  const [filter, setFilter] = useState<CardKind | 'all'>('all')
  const [open, setOpen] = useState<Card | null>(null)
  const owned = useMemo(() => collection(loot), [loot])
  const featured = featuredSeries(monthOf(summary.today), surpriseSeed(player))
  const shown = CARDS.filter(c => filter === 'all' || c.kind === filter)
  const ownedShown = shown.filter(c => owned.has(c.id)).length
  const recent = [...loot].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const entry = open ? owned.get(open.id) : undefined

  return (
    <main className="hud collection">
      <SystemWindow title={`Collection · ${owned.size}/${CARDS.length}`}>
        <p className="system-line">Featured this month: {SERIES[featured]}. Its cards drop twice as often.</p>
        <p className="muted">
          Bosses, main quest stages and the strength routine always drop a card; other quests have a 1-in-4 chance. Duplicates power a card up (★★ at {STAR_COPIES[1]} copies, ★★★ at {STAR_COPIES[2]}), +{STAR_UP_XP} XP each time.
        </p>
        <div className="tabs-inline">
          {FILTERS.map(f => (
            <button key={f.key} className={`chip ${filter === f.key ? 'picked' : ''}`} aria-pressed={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</button>
          ))}
          {onClose && <button className="ghost small" onClick={onClose}>Back</button>}
        </div>
        <p className="muted">{ownedShown}/{shown.length} collected</p>
      </SystemWindow>

      {recent.length > 0 && (
        <SystemWindow title="Latest drops">
          <div className="card-row">
            {recent.map(d => {
              const c = cardById(d.cardId)
              return c ? <button key={d.id} className="card-button" onClick={() => setOpen(c)}><CardArt card={c} stars={owned.get(c.id)?.stars ?? 1} /></button> : null
            })}
          </div>
        </SystemWindow>
      )}

      <SystemWindow title="Binder">
        <div className="binder">
          {shown.map(c => {
            const e = owned.get(c.id)
            return (
              <button key={c.id} className="card-button" disabled={!e} onClick={() => setOpen(c)}>
                <CardArt card={c} stars={e?.stars ?? 0} locked={!e} />
                {e && e.copies > 1 && <span className="copies">×{e.copies}</span>}
              </button>
            )
          })}
        </div>
      </SystemWindow>

      {open && entry && (
        <div className="overlay loot-reveal" role="dialog" aria-label={open.name} onClick={() => setOpen(null)}>
          <p className={`drop-title r-${open.rarity}`}>{RARITY_NAMES[open.rarity].toUpperCase()} · {SERIES[open.series]}</p>
          <CardArt card={open} stars={entry.stars} />
          <p className="drop-text">{open.text}</p>
          <p className="muted">
            ×{entry.copies} · {'★'.repeat(entry.stars)} · first found {new Date(entry.firstAt).toLocaleDateString()}
            {open.kind === 'idol' && ` · signature move: ${open.move}`}
          </p>
          <button className="ghost" onClick={() => setOpen(null)}>Close</button>
        </div>
      )}
    </main>
  )
}

/** A small HUD panel: progress and the latest drop. */
export function CollectionPanel({ loot, onOpen }: { loot: LootDrop[]; onOpen: () => void }) {
  const owned = useMemo(() => collection(loot), [loot])
  const latest = [...loot].sort((a, b) => b.createdAt - a.createdAt).slice(0, 3).map(d => cardById(d.cardId)).filter((c): c is Card => !!c)
  return (
    <SystemWindow title={`Collection · ${owned.size}/${CARDS.length}`} className="collection-panel">
      {latest.length ? (
        <div className="card-row small">
          {latest.map((c, i) => <CardArt key={`${c.id}-${i}`} card={c} stars={owned.get(c.id)?.stars ?? 1} />)}
        </div>
      ) : (
        <p className="muted">Clear quests to find cards: fictional idols, odd relics and a full deck. Bosses and the strength routine always drop one.</p>
      )}
      <div className="row end">
        <button className="small" onClick={onOpen}>Open binder</button>
      </div>
    </SystemWindow>
  )
}

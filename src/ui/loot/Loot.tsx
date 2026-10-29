import { useEffect, useMemo, useRef, useState } from 'react'
import {
  allCards,
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
  type CustomCard,
  type Rarity,
  RARITIES,
  type LootDrop,
  type Player,
  type Summary,
} from '../../engine'
import { addCustomCard, deleteCustomCard, surpriseSeed } from '../../db/actions'
import { addPhoto, deletePhotos } from '../../db/photos'
import { Photo } from '../lifelog/Photo'
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

const FILTERS: { key: string; label: string; test: (c: Card) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  { key: 'idol', label: 'Idols', test: c => c.kind === 'idol' && c.series !== 'custom' },
  { key: 'rizz', label: 'Rizz', test: c => c.series === 'rizz' },
  { key: 'relic', label: 'Relics', test: c => c.kind === 'relic' && c.series !== 'rizz' },
  { key: 'custom', label: 'My cards', test: c => c.series === 'custom' },
]

/** The binder: every card, collected or not, with copies and power-up stars. */
export function Collection({ player, summary, loot, custom, onClose }: { player: Player; summary: Summary; loot: LootDrop[]; custom: CustomCard[]; onClose?: () => void }) {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<Card | null>(null)
  const owned = useMemo(() => collection(loot), [loot])
  const featured = featuredSeries(monthOf(summary.today), surpriseSeed(player))
  const cards = allCards()
  const shown = cards.filter(FILTERS.find(f => f.key === filter)!.test)
  const ownedShown = shown.filter(c => owned.has(c.id)).length
  const recent = [...loot].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const entry = open ? owned.get(open.id) : undefined

  return (
    <main className="hud collection">
      <SystemWindow title={`Collection · ${owned.size}/${cards.length}`}>
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

      {filter === 'custom' && <CardMaker custom={custom} />}

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
    <SystemWindow title={`Collection · ${owned.size}/${allCards().length}`} className="collection-panel">
      {latest.length ? (
        <div className="card-row small">
          {latest.map((c, i) => <CardArt key={`${c.id}-${i}`} card={c} stars={owned.get(c.id)?.stars ?? 1} />)}
        </div>
      ) : (
        <p className="muted">Clear quests to find cards: idols, Rizz & Romance loot, odd relics, and cards you make yourself. Bosses and the strength routine always drop one.</p>
      )}
      <div className="row end">
        <button className="small" onClick={onOpen}>Open binder</button>
      </div>
    </SystemWindow>
  )
}

/** Make your own cards from images you pick: they drop like the rest. */
function CardMaker({ custom }: { custom: CustomCard[] }) {
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [rarity, setRarity] = useState<Rarity>('rare')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)

  const pick = async (files: FileList | null) => {
    const file = files?.[0]
    if (!file) return
    setBusy(true)
    setError('')
    try {
      if (photoId) void deletePhotos([photoId])
      setPhotoId((await addPhoto(file)).id)
    } catch {
      setError('That image could not be read.')
    } finally {
      setBusy(false)
    }
  }
  const save = async () => {
    if (!photoId) return
    await addCustomCard({ name, rarity, text, photoId })
    setPhotoId(null)
    setName('')
    setText('')
  }
  const remove = (c: CustomCard) => {
    if (confirm(`Delete "${c.name}" and any copies you've collected?`)) void deleteCustomCard(c.id)
  }

  return (
    <SystemWindow title="Make a card">
      <p className="muted">
        Turn any image into a card, for example ones you make in an AI image app. It joins the drops straight away. Your cards are private, stored like your Life log photos. Fictional or AI-generated people only, adults only, never real people.
      </p>
      <div className="maker">
        <button className="maker-photo" onClick={() => input.current?.click()} disabled={busy}>
          {photoId ? <Photo id={photoId} alt="Card image" /> : <span>{busy ? 'Loading…' : '+ Choose image'}</span>}
        </button>
        <input ref={input} type="file" accept="image/*" hidden onChange={e => { void pick(e.target.files); e.target.value = '' }} />
        <div className="grow">
          <label>Name<input value={name} maxLength={40} onChange={e => setName(e.target.value)} placeholder="e.g. Neon Seoul Night" /></label>
          <label>
            Rarity
            <select value={rarity} onChange={e => setRarity(e.target.value as Rarity)}>
              {RARITIES.map(r => <option key={r} value={r}>{RARITY_NAMES[r]}</option>)}
            </select>
          </label>
          <label>Flavour text<input value={text} maxLength={140} onChange={e => setText(e.target.value)} placeholder="Optional" /></label>
        </div>
      </div>
      {error && <p className="muted error">{error}</p>}
      <div className="row end">
        <button disabled={!photoId || busy} onClick={save}>Add card</button>
      </div>
      {custom.length > 0 && (
        <ul className="board-list compact">
          {custom.map(c => (
            <li key={c.id}>
              <span className="quest-title">{c.name} <small className="muted">{RARITY_NAMES[c.rarity]}</small></span>
              <button className="ghost small" onClick={() => remove(c)}>Delete</button>
            </li>
          ))}
        </ul>
      )}
    </SystemWindow>
  )
}

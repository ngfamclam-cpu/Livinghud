import { useEffect, useMemo, useRef, useState } from 'react'
import {
  allCards,
  RARITY_NAMES,
  STAR_COPIES,
  STAR_UP_XP,
  cardById,
  collection,
  onGameEvent,
  type Card,
  type CustomCard,
  type Rarity,
  RARITIES,
  type LootDrop,
  type Player,
  type Summary,
} from '../../engine'
import { addCustomCard, deleteCustomCard } from '../../db/actions'
import { addPhoto, deletePhotos } from '../../db/photos'
import { Photo } from '../lifelog/Photo'
import { SystemWindow } from '../SystemWindow'
import { CardArt } from './CardArt'
import { BulkImport } from './BulkImport'
import { forgePack, lastPack, remakeCard, type ForgeOutcome } from '../../db/forge'

interface Reveal {
  card: Card
  copies: number
  starUp: boolean
  foil?: boolean
}

interface PackItem extends Reveal {
  girl: boolean
}

type Queued = ({ kind: 'card' } & Reveal) | { kind: 'pack'; items: PackItem[] }

/** The drop reveal: a single card flips in, or a card pack tears open. Queues if several drop at once. */
export function LootReveal() {
  const [queue, setQueue] = useState<Queued[]>([])
  useEffect(
    () =>
      onGameEvent(e => {
        if (e.type === 'loot.card') {
          const card = cardById(e.cardId)
          if (card) setQueue(q => [...q, { kind: 'card', card, copies: e.copies, starUp: e.starUp, foil: e.foil }])
        }
        if (e.type === 'loot.pack') {
          const items = e.cards.flatMap(c => {
            const card = cardById(c.cardId)
            return card ? [{ card, copies: c.copies, starUp: c.starUp, foil: c.foil, girl: c.girl }] : []
          })
          if (items.length) setQueue(q => [...q, { kind: 'pack', items }])
        }
      }),
    [],
  )
  const current = queue[0]
  if (!current) return null
  const close = () => setQueue(q => q.slice(1))
  if (current.kind === 'pack') return <PackOpening key={queue.length} items={current.items} onClose={close} />
  const starsNow = STAR_COPIES.filter(n => current.copies >= n).length
  return (
    <div className="overlay loot-reveal" role="dialog" aria-label={`Loot drop: ${current.card.name}`} onClick={close}>
      <p className={`drop-title r-${current.card.rarity}`}>{current.foil ? '✦ FOIL ' : ''}{RARITY_NAMES[current.card.rarity].toUpperCase()} DROP</p>
      <div className="flip-in">
        <CardArt card={current.card} stars={starsNow} foil={current.foil} />
      </div>
      <p className="drop-text">{current.card.text}</p>
      <p className="system-line">
        {current.foil ? 'Holographic! Counts as two copies. ' : ''}{current.copies <= (current.foil ? 2 : 1) ? 'New card for your collection!' : current.starUp ? `Powered up to ${'★'.repeat(starsNow)}! +${STAR_UP_XP} XP` : `Duplicate ×${current.copies}. ${nextStar(current.copies)}`}
      </p>
      <button className="arise" onClick={close}>Collect</button>
    </div>
  )
}

/** A sealed pack: tap to tear it open, the cards fan out (funny ones first, the girl cards last and bigger). */
function PackOpening({ items, onClose }: { items: PackItem[]; onClose: () => void }) {
  const [open, setOpen] = useState(false)
  const [zoom, setZoom] = useState<PackItem | null>(null)
  const best = items.reduce((r, i) => (RARITIES.indexOf(i.card.rarity) > RARITIES.indexOf(r) ? i.card.rarity : r), 'common' as Rarity)
  const girls = items.filter(i => i.girl).length
  const ups = items.filter(i => i.starUp).length
  if (!open) {
    return (
      <div className="overlay loot-reveal pack-reveal" role="dialog" aria-label="A card pack dropped">
        <p className={`drop-title r-${best}`}>CARD PACK</p>
        <button className={`sealed-pack r-${best}`} onClick={() => setOpen(true)} aria-label="Open the pack">
          <span className="pack-shine" aria-hidden="true" />
          <span className="pack-label">LIVING<b>HUD</b></span>
          <small>{items.length} cards · {girls} special</small>
        </button>
        <p className="muted">Tap to tear it open</p>
      </div>
    )
  }
  if (zoom) {
    const starsNow = STAR_COPIES.filter(n => zoom.copies >= n).length
    return (
      <div className="overlay loot-reveal" role="dialog" aria-label={zoom.card.name} onClick={() => setZoom(null)}>
        <div className="flip-in"><CardArt card={zoom.card} stars={starsNow} foil={zoom.foil} /></div>
        <p className="drop-text">{zoom.card.text}</p>
        <button className="ghost" onClick={() => setZoom(null)}>Back to the pack</button>
      </div>
    )
  }
  return (
    <div className="overlay loot-reveal pack-reveal opened" role="dialog" aria-label="Card pack opened">
      <p className={`drop-title r-${best}`}>PACK OPENED</p>
      <div className="pack-spread">
        {items.map((it, i) => {
          const starsNow = STAR_COPIES.filter(n => it.copies >= n).length
          const isNew = it.copies <= (it.foil ? 2 : 1)
          return (
            <button key={i} className={`pack-slot ${it.girl ? 'girl' : ''}`} style={{ animationDelay: `${0.15 + i * (it.girl ? 0.5 : 0.18)}s` }} onClick={() => setZoom(it)} aria-label={`${it.card.name}, tap to look closer`}>
              <CardArt card={it.card} stars={starsNow} foil={it.foil} />
              <small className={`pack-tag ${isNew ? 'new' : it.starUp ? 'up' : ''}`}>{isNew ? 'NEW' : it.starUp ? `★ UP` : `×${it.copies}`}</small>
            </button>
          )
        })}
      </div>
      <p className="system-line">{ups > 0 ? `${ups} card${ups === 1 ? '' : 's'} powered up! +${ups * STAR_UP_XP} XP. ` : ''}Tap a card to look closer.</p>
      <button className="arise" onClick={onClose}>Collect all</button>
    </div>
  )
}

const nextStar = (copies: number) => {
  const next = STAR_COPIES.find(n => n > copies)
  return next ? `${next - copies} more for the next star.` : 'Maxed out.'
}

const RARITY_FILTERS: { key: string; label: string; test: (c: Card) => boolean }[] = [
  { key: 'all', label: 'All', test: () => true },
  ...RARITIES.map(r => ({ key: r, label: RARITY_NAMES[r], test: (c: Card) => c.rarity === r })),
]

/** The binder: every card, collected or not, with copies and power-up stars. */
export function Collection({ loot, custom, onClose }: { player?: Player; summary?: Summary; loot: LootDrop[]; custom: CustomCard[]; onClose?: () => void }) {
  const [filter, setFilter] = useState('all')
  const [open, setOpen] = useState<Card | null>(null)
  const owned = useMemo(() => collection(loot), [loot])
  const cards = allCards()
  const shown = cards.filter(RARITY_FILTERS.find(f => f.key === filter)!.test).sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity))
  const ownedShown = shown.filter(c => owned.has(c.id)).length
  const recent = [...loot].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5)
  const entry = open ? owned.get(open.id) : undefined
  const mineOpen = open?.series === 'custom' ? custom.find(c => `custom-${c.id}` === open.id) : undefined

  return (
    <main className="hud collection">
      <SystemWindow title={`Collection · ${owned.size}/${cards.length}`}>
        <p className="muted">
          Rewards come as card packs: 5 funny cards plus 1 brand-new girl card, or 2 for bosses, main quest stages, the strength routine, perfect days, Golden Quests, Red Gates and lucky rolls (and 1 in 5 other packs). Bosses and those big moments always drop a pack; other quests have a 1-in-4 chance. Funny cards repeat, and copies power a card up (★★ at {STAR_COPIES[1]} copies, ★★★ at {STAR_COPIES[2]}), +{STAR_UP_XP} XP each time. If a new card can’t be made right then, you get a copy of one you own.
        </p>
        <div className="tabs-inline">
          {RARITY_FILTERS.map(f => (
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

      <ForgePanel />

      <SystemWindow title="Binder">
        <div className="binder">
          {shown.map(c => {
            const e = owned.get(c.id)
            return (
              <button key={c.id} className="card-button" disabled={!e} onClick={() => setOpen(c)}>
                <CardArt card={c} stars={e?.stars ?? 0} locked={!e} foil={e?.foil} />
                {e && e.copies > 1 && <span className="copies">×{e.copies}</span>}
              </button>
            )
          })}
        </div>
      </SystemWindow>

      <CardMaker custom={custom} />

      {open && entry && (
        <div className="overlay loot-reveal" role="dialog" aria-label={open.name} onClick={() => setOpen(null)}>
          <p className={`drop-title r-${open.rarity}`}>{RARITY_NAMES[open.rarity].toUpperCase()}</p>
          <CardArt card={cardById(open.id) ?? open} stars={entry.stars} foil={entry.foil} />
          <p className="drop-text">{open.text}</p>
          <p className="muted">
            ×{entry.copies} · {'★'.repeat(entry.stars)} · first found {new Date(entry.firstAt).toLocaleDateString()}
            {open.kind === 'idol' && ` · signature move: ${open.move}`}
          </p>
          {mineOpen && <CardActions mine={mineOpen} onDone={() => setOpen(null)} />}
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
        <p className="muted">Clear quests to earn brand-new forged cards. Bosses, main stages, the strength routine and perfect days always drop one; combo milestones open packs.</p>
      )}
      <div className="row end">
        <button className="small" onClick={onOpen}>Open binder</button>
      </div>
    </SystemWindow>
  )
}

/** Remake (forged cards) or delete one of your cards, from its big view. */
function CardActions({ mine, onDone }: { mine: CustomCard; onDone: () => void }) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const remake = async () => {
    setBusy(true)
    setNote('Drawing a new image…')
    const r = await remakeCard(mine.id)
    setBusy(false)
    setNote(r.ok ? 'New image in.' : r.reason === 'limit' ? 'Today’s free allowance is used up.' : r.reason === 'declined' ? 'Cloudflare refused it. Try again or delete it.' : `Couldn’t remake it${r.message ? `: ${r.message}` : '.'}`)
  }
  const remove = async () => {
    if (!confirm(`Delete "${mine.name}"? Its image and copies go, and the forge can make it again in a later pack.`)) return
    await deleteCustomCard(mine.id)
    onDone()
  }
  return (
    <div className="card-actions" onClick={e => e.stopPropagation()}>
      {note && <p className="muted">{note}</p>}
      <div className="row center">
        {mine.forge && <button className="small" disabled={busy} onClick={remake}>{busy ? 'Remaking…' : 'Remake image'}</button>}
        <button className="ghost small danger-text" disabled={busy} onClick={remove}>Delete card</button>
      </div>
    </div>
  )
}

/** Make your own cards from images you pick: they drop like the rest. */
const FORGE_FAIL: Record<Exclude<ForgeOutcome, { ok: true }>['reason'], string> = {
  'no-sync': 'Turn on cloud sync first (More → Settings → Sync). The forge only works for a save that is in the cloud.',
  'not-configured': 'Cloudflare isn’t connected. Check CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN in Vercel, then redeploy.',
  limit: 'Today’s free Cloudflare allowance is used up. It resets every day; try again tomorrow.',
  failed: 'The image service didn’t answer. Try again in a minute.',
}

/** Pack Forge: Cloudflare's free image model makes a 6-card pack from one series. */
function ForgePanel() {
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<ForgeOutcome | null>(null)
  const canRepeat = !progress && !!lastPack()
  const run = async (again = false) => {
    setResult(null)
    setProgress({ done: 0, total: 6 })
    try {
      setResult(await forgePack((done, total) => setProgress({ done, total }), { again }))
    } catch (e) {
      setResult({ ok: false, reason: 'failed', made: 0, series: '', skipped: 0, message: e instanceof Error ? e.message : String(e) })
    } finally {
      setProgress(null)
    }
  }
  return (
    <SystemWindow title="Pack Forge">
      <p className="muted">
        Six new cards (2 Common, 2 Rare, 1 Epic, 1 Legendary) mixed from eight sultry series, photo-real and anime at every rarity, each with its own look. Made by Cloudflare’s free image model in about a minute. “Same prompts again” remakes your last pack with identical prompts, for a second take. Fictional adults only, private to you.
      </p>
      {progress && <p className="system-line">Forging {progress.done}/{progress.total}…</p>}
      {result?.ok && <p className="system-line">{result.series}: {result.made} card{result.made === 1 ? '' : 's'} forged and added to your binder.</p>}
      {result && result.skipped > 0 && <p className="muted">Cloudflare’s filter refused {result.skipped} card{result.skipped === 1 ? '' : 's'}, so {result.skipped === 1 ? 'it was' : 'they were'} swapped for other cards of the same rarity.</p>}
      {result && !result.ok && (
        <p className="muted error">
          {result.made > 0 ? `${result.made} card${result.made === 1 ? '' : 's'} made, then: ` : ''}{FORGE_FAIL[result.reason]}
          {result.message ? ` (${result.message})` : ''}
        </p>
      )}
      <div className="row end">
        <button className="ghost small" disabled={!canRepeat} onClick={() => run(true)} title="Remake your last pack with the exact same prompts">Same prompts again</button>
        <button className="small" disabled={!!progress} onClick={() => run()}>{progress ? 'Forging…' : 'Forge a new pack'}</button>
      </div>
    </SystemWindow>
  )
}

function CardMaker({ custom }: { custom: CustomCard[] }) {
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [text, setText] = useState('')
  const [rarity, setRarity] = useState<Rarity>('rare')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [bulk, setBulk] = useState(false)
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

  if (bulk) return <BulkImport onClose={() => setBulk(false)} />

  return (
    <SystemWindow title="Make a card">
      <div className="row">
        <span className="muted grow">Have a lot of images? Import up to 50 at once: auto-cropped, with rarity and names filled in for you to review.</span>
        <button className="small" onClick={() => setBulk(true)}>Bulk import</button>
      </div>
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

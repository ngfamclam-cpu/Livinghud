import { useEffect, useRef, useState } from 'react'
import { RARITIES, RARITY_NAMES, adjustCrop, autoCaption, rarityByRank, type Rarity } from '../../engine'
import { addCustomCard } from '../../db/actions'
import { addPhoto } from '../../db/photos'
import { SystemWindow } from '../SystemWindow'
import { MAX_BATCH, aiCaption, analyse, renderCard, type Draft } from './bulkImport'

const AI_PREF = 'livinghud-ai-captions'
const readAiPref = () => {
  try {
    return localStorage.getItem(AI_PREF) === '1'
  } catch {
    return false
  }
}

/**
 * Bulk import: pick up to 50 images; each is auto-cropped around the person,
 * scored for rarity across the batch and given a name and flavour line. Review
 * and fix anything, then save them all as cards.
 */
export function BulkImport({ onClose }: { onClose: () => void }) {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [progress, setProgress] = useState<{ label: string; done: number; total: number } | null>(null)
  const [useAi, setUseAi] = useState(readAiPref)
  const [notice, setNotice] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach(u => URL.revokeObjectURL(u)), [])

  const toggleAi = (on: boolean) => {
    setUseAi(on)
    try {
      localStorage.setItem(AI_PREF, on ? '1' : '0')
    } catch {
      // ignore
    }
  }

  const pick = async (files: FileList | null) => {
    if (!files?.length) return
    const list = [...files].filter(f => f.type.startsWith('image/')).slice(0, MAX_BATCH)
    setNotice(files.length > MAX_BATCH ? `Only the first ${MAX_BATCH} images were taken.` : '')
    const made: Omit<Draft, 'rarity'>[] = []
    for (let i = 0; i < list.length; i++) {
      setProgress({ label: 'Cropping and scoring', done: i, total: list.length })
      try {
        const d = await analyse(list[i], drafts.length + i)
        urls.current.push(d.url)
        made.push(d)
      } catch {
        // An unreadable file is skipped.
      }
    }
    // Rarity is spread across everything in the review, old and new.
    const all = [...drafts, ...made]
    const rarities = rarityByRank(all.map(d => d.score))
    let next: Draft[] = all.map((d, i) => ({ ...d, rarity: rarities[i] }))
    setDrafts(next)

    if (useAi && made.length) {
      for (let i = 0; i < made.length; i++) {
        setProgress({ label: 'Writing names with AI', done: i, total: made.length })
        const target = next[drafts.length + i]
        const r = await aiCaption(target)
        if (r === 'not-configured') {
          setNotice('AI captions aren’t set up (no Anthropic API key in Vercel), so the free on-device names were kept.')
          break
        }
        if (typeof r === 'object') {
          next = next.map(d => (d.key === target.key ? { ...d, name: r.name, text: r.text, captionBy: 'ai' } : d))
          setDrafts(next)
        }
      }
    }
    setProgress(null)
  }

  const update = (key: string, patch: Partial<Draft>) => setDrafts(list => list.map(d => (d.key === key ? { ...d, ...patch } : d)))
  const remove = (key: string) => setDrafts(list => list.filter(d => d.key !== key))
  const reroll = (d: Draft) => {
    const c = autoCaption(d.stats, d.pose, `${d.key}:${Math.random()}`)
    update(d.key, { name: c.name, text: c.text, captionBy: 'auto' })
  }

  const saveAll = async () => {
    const list = drafts
    for (let i = 0; i < list.length; i++) {
      setProgress({ label: 'Saving cards', done: i, total: list.length })
      const d = list[i]
      const photo = await addPhoto(await renderCard(d))
      await addCustomCard({ name: d.name, rarity: d.rarity, text: d.text, photoId: photo.id })
    }
    setProgress(null)
    setDrafts([])
    onClose()
  }

  const counts = RARITIES.map(r => `${drafts.filter(d => d.rarity === r).length} ${RARITY_NAMES[r]}`).join(' · ')

  return (
    <SystemWindow title={drafts.length ? `Bulk import · ${drafts.length} cards` : 'Bulk import'} className="bulk-import">
      <p className="muted">
        Pick up to {MAX_BATCH} images. Each is cropped around the person (zooming in only as far as it can without losing the scene), the best-looking get the
        higher rarities, and each gets a name and flavour line. Fix anything below, then save. Fictional or AI-generated adults only, never real people.
      </p>
      <label className="toggle-line">
        <input type="checkbox" checked={useAi} onChange={e => toggleAi(e.target.checked)} />
        <span>Write names and text with AI (needs an Anthropic API key in Vercel; costs about a cent per image; images are sent to the AI)</span>
      </label>
      <div className="row">
        <button className="small" disabled={!!progress || drafts.length >= MAX_BATCH} onClick={() => input.current?.click()}>
          {drafts.length ? '+ Add more images' : 'Choose images'}
        </button>
        <input ref={input} type="file" accept="image/*" multiple hidden onChange={e => { void pick(e.target.files); e.target.value = '' }} />
        <span className="grow" />
        <button className="ghost small" disabled={!!progress} onClick={onClose}>Cancel</button>
      </div>
      {progress && (
        <p className="system-line">{progress.label}… {progress.done + 1}/{progress.total}</p>
      )}
      {notice && <p className="muted">{notice}</p>}
      {drafts.length > 0 && <p className="muted">{counts}</p>}

      <div className="draft-grid">
        {drafts.map(d => (
          <DraftCard key={d.key} d={d} onChange={patch => update(d.key, patch)} onRemove={() => remove(d.key)} onReroll={() => reroll(d)} />
        ))}
      </div>

      {drafts.length > 0 && (
        <div className="row end">
          <button disabled={!!progress} onClick={saveAll}>Save {drafts.length} card{drafts.length === 1 ? '' : 's'}</button>
        </div>
      )}
    </SystemWindow>
  )
}

function DraftCard({ d, onChange, onRemove, onReroll }: { d: Draft; onChange: (p: Partial<Draft>) => void; onRemove: () => void; onReroll: () => void }) {
  const frame = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; pan: { x: number; y: number } } | null>(null)

  const apply = (zoom: number, pan: { x: number; y: number }) => {
    const crop = adjustCrop(d.autoCrop, d.width, d.height, zoom, pan.x, pan.y)
    onChange({ zoom, pan, crop })
  }

  const onDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, pan: d.pan }
  }
  const onMove = (e: React.PointerEvent) => {
    if (!drag.current || !frame.current) return
    // Dragging the picture moves the crop the other way, in image pixels.
    const scale = d.crop.w / frame.current.clientWidth
    apply(d.zoom, { x: drag.current.pan.x - (e.clientX - drag.current.x) * scale, y: drag.current.pan.y - (e.clientY - drag.current.y) * scale })
  }
  const onUp = () => (drag.current = null)

  return (
    <div className={`draft r-${d.rarity}`}>
      <div
        ref={frame}
        className={`draft-frame loot-card r-${d.rarity}`}
        onPointerDown={onDown}
        onPointerMove={onMove}
        onPointerUp={onUp}
        onPointerCancel={onUp}
        title="Drag to move the crop"
      >
        <img
          src={d.url}
          alt={d.fileName}
          draggable={false}
          style={{
            width: `${(d.width / d.crop.w) * 100}%`,
            left: `${(-d.crop.x / d.crop.w) * 100}%`,
            top: `${(-d.crop.y / d.crop.h) * 100}%`,
          }}
        />
        <span className="draft-tag">{d.person ? 'person found' : 'centre crop'}</span>
        <button className="ghost small icon draft-remove" aria-label={`Remove ${d.fileName}`} onClick={onRemove} onPointerDown={e => e.stopPropagation()}>×</button>
      </div>
      <label className="draft-zoom">
        Zoom
        <input type="range" min={0.6} max={2.5} step={0.05} value={d.zoom} onChange={e => apply(Number(e.target.value), d.pan)} />
      </label>
      <select value={d.rarity} onChange={e => onChange({ rarity: e.target.value as Rarity })} aria-label="Rarity">
        {RARITIES.map(r => <option key={r} value={r}>{RARITY_NAMES[r]}</option>)}
      </select>
      <input value={d.name} maxLength={40} onChange={e => onChange({ name: e.target.value })} aria-label="Card name" />
      <textarea rows={2} value={d.text} maxLength={140} onChange={e => onChange({ text: e.target.value })} aria-label="Flavour text" />
      <div className="row">
        <small className="muted grow">{d.captionBy === 'ai' ? 'Named by AI' : 'Auto name'} · score {Math.round(d.score * 100)}</small>
        <button className="ghost small" onClick={onReroll}>New name</button>
      </div>
    </div>
  )
}

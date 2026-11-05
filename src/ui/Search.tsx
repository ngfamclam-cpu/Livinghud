import { Fragment, useMemo, useState, type ReactNode } from 'react'
import { SEARCH_KIND_NAMES, buildSearchDocs, searchDocs, type SearchData, type SearchHit, type SearchKind, type SearchTarget } from '../engine'
import { SystemWindow } from './SystemWindow'

const GROUPS: { key: string; label: string; kinds: SearchKind[] }[] = [
  { key: 'all', label: 'All', kinds: [] },
  { key: 'journal', label: 'Journal', kinds: ['journal'] },
  { key: 'log', label: 'Life log', kinds: ['memory', 'place'] },
  { key: 'goals', label: 'Top 3', kinds: ['goal'] },
  { key: 'quests', label: 'Quests', kinds: ['quest', 'boss', 'focus'] },
  { key: 'money', label: 'Money', kinds: ['money', 'bill'] },
  { key: 'people', label: 'People', kinds: ['person', 'contact'] },
  { key: 'stuff', label: 'Shop & loot', kinds: ['reward', 'purchase', 'plan', 'card', 'coupon'] },
]

const OPEN_LABEL: Record<SearchTarget, string> = {
  journal: 'Open journal', lifelog: 'Open Life log', goals: 'Open goals', quests: 'Open quests', finance: 'Open finances', party: 'Open Party',
  shop: 'Open Shop', plans: 'Open plan', focus: 'Open focus', collection: 'Open binder', rewards: 'Open rewards',
}

/** Wraps every query word in <mark>. */
function highlight(text: string, terms: string[]): ReactNode {
  if (!terms.length || !text) return text
  const escaped = terms.map(t => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
  const parts = text.split(new RegExp(`(${escaped.join('|')})`, 'gi'))
  return parts.map((p, i) => (i % 2 === 1 ? <mark key={i}>{p}</mark> : <Fragment key={i}>{p}</Fragment>))
}

const dayLabel = (day: string) => {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })
}

/** Search across everything in the app. */
export function Search({ data, onOpen, onClose }: { data: SearchData; onOpen: (target: SearchTarget, planId?: string) => void; onClose?: () => void }) {
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [open, setOpen] = useState<string | null>(null)
  const docs = useMemo(() => buildSearchDocs(data), [data])
  const kinds = useMemo(() => new Set(GROUPS.find(g => g.key === group)!.kinds), [group])
  const hits: SearchHit[] = useMemo(() => searchDocs(docs, query, { kinds, limit: 150 }), [docs, query, kinds])

  return (
    <main className="hud search-screen">
      {onClose && <div className="row end"><button className="ghost small" onClick={onClose}>Back</button></div>}
      <SystemWindow title="Search">
        <input
          type="search"
          className="search-input"
          value={query}
          onChange={e => { setQuery(e.target.value); setOpen(null) }}
          placeholder="Search journal, reflections, notes, goals, money, people…"
          aria-label="Search everything"
          autoFocus
        />
        <div className="tabs-inline">
          {GROUPS.map(g => (
            <button key={g.key} className={`chip ${group === g.key ? 'picked' : ''}`} aria-pressed={group === g.key} onClick={() => setGroup(g.key)}>{g.label}</button>
          ))}
        </div>
        <p className="muted">
          {query.trim()
            ? `${hits.length}${hits.length === 150 ? '+' : ''} result${hits.length === 1 ? '' : 's'}`
            : `Searching ${docs.length} entries. Every word must match. Dates work too: try "november", "monday" or "2026-11".`}
        </p>
      </SystemWindow>

      {hits.length > 0 && (
        <ul className="search-results">
          {hits.map(h => {
            const expanded = open === h.doc.id
            return (
              <li key={h.doc.id} className={`search-hit kind-${h.doc.kind}`}>
                <button className="search-hit-main" onClick={() => setOpen(expanded ? null : h.doc.id)} aria-expanded={expanded}>
                  <span className="search-kind">{SEARCH_KIND_NAMES[h.doc.kind]}</span>
                  <span className="search-title">{highlight(h.doc.title, h.terms)}</span>
                  {h.doc.day && <small className="muted search-day">{dayLabel(h.doc.day)}</small>}
                </button>
                {h.doc.text && (expanded ? <p className="search-text full">{highlight(h.doc.text, h.terms)}</p> : <p className="search-text">{highlight(h.snippet, h.terms)}</p>)}
                {expanded && (
                  <div className="row end">
                    <button className="small" onClick={() => onOpen(h.doc.open, h.doc.planId)}>{OPEN_LABEL[h.doc.open]}</button>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {query.trim() && hits.length === 0 && <p className="muted center-text">Nothing matches every word. Try fewer words or another filter.</p>}
    </main>
  )
}

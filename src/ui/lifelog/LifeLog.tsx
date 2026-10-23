import { Suspense, lazy, useMemo, useState } from 'react'
import {
  activityFeed,
  addDays,
  dayKey,
  exerciseInfo,
  photoOfDay,
  placeVisits,
  searchMemories,
  type Memory,
  type Place,
  type Summary,
} from '../../engine'
import { deleteMemory, renamePlace } from '../../db/memories'
import { SystemWindow } from '../SystemWindow'
import type { DashData } from '../desktop/Desktop'
import { Composer } from './Composer'
import { Photo, PhotoViewer } from './Photo'

const MapView = lazy(() => import('./MapView'))

type View = 'day' | 'calendar' | 'photos' | 'places' | 'search'
const VIEWS: { key: View; label: string }[] = [
  { key: 'day', label: 'Day' },
  { key: 'calendar', label: 'Calendar' },
  { key: 'photos', label: 'Photos' },
  { key: 'places', label: 'Places' },
  { key: 'search', label: 'Search' },
]

const MOODS = ['Rough', 'Low', 'Okay', 'Good', 'Great']

function longDay(day: string): string {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
const time = (at: number) => new Date(at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

/** The Life log: one page per day, plus a calendar, a photo wall, places with a map, and search. */
export function LifeLog({
  data,
  summary,
  startCamera,
  onJournal,
  onClose,
}: {
  data: DashData
  summary: Summary
  startCamera?: boolean
  onJournal: () => void
  onClose: () => void
}) {
  const [view, setView] = useState<View>('day')
  const [day, setDay] = useState(summary.today)
  const [composing, setComposing] = useState<{ editing?: Memory; camera?: boolean } | null>(startCamera ? { camera: true } : null)
  const [viewing, setViewing] = useState<{ id: string; caption: string } | null>(null)
  const placeById = useMemo(() => new Map(data.places.map(p => [p.id, p])), [data.places])
  const openDay = (d: string) => {
    setDay(d)
    setView('day')
  }
  const caption = (m: Memory) => [longDay(m.day), placeById.get(m.placeId ?? '')?.name, m.note].filter(Boolean).join(' · ')

  return (
    <main className="hud lifelog">
      <SystemWindow title="Life log">
        <div className="tabs-inline">
          {VIEWS.map(v => (
            <button key={v.key} className={`chip ${view === v.key ? 'picked' : ''}`} aria-pressed={view === v.key} onClick={() => setView(v.key)}>{v.label}</button>
          ))}
        </div>
        <p className="muted">
          {data.memories.length} memor{data.memories.length === 1 ? 'y' : 'ies'} · {summary.travel.places} place{summary.travel.places === 1 ? '' : 's'} · {summary.travel.cities} cit{summary.travel.cities === 1 ? 'y' : 'ies'} · {summary.travel.countries} countr{summary.travel.countries === 1 ? 'y' : 'ies'}
        </p>
        {!composing && (
          <div className="row">
            <button className="small" onClick={() => setComposing({ camera: true })}>📷 Photo now</button>
            <button className="ghost small" onClick={() => setComposing({})}>Add a memory</button>
            <span className="grow" />
            <button className="ghost small" onClick={onClose}>Back</button>
          </div>
        )}
      </SystemWindow>

      {composing && (
        <Composer
          places={data.places}
          editing={composing.editing}
          startWithCamera={composing.camera}
          onDone={() => {
            setComposing(null)
            if (!composing.editing) openDay(summary.today)
          }}
        />
      )}

      {view === 'day' && (
        <DayPage
          data={data}
          summary={summary}
          day={day}
          placeById={placeById}
          onDay={setDay}
          onEdit={m => setComposing({ editing: m })}
          onView={m => (id: string) => setViewing({ id, caption: caption(m) })}
          onJournal={onJournal}
        />
      )}
      {view === 'calendar' && <MonthCalendar memories={data.memories} summary={summary} onDay={openDay} />}
      {view === 'photos' && <PhotoWall memories={data.memories} onView={(m, id) => setViewing({ id, caption: caption(m) })} />}
      {view === 'places' && <Places memories={data.memories} places={data.places} onDay={openDay} onView={(m, id) => setViewing({ id, caption: caption(m) })} />}
      {view === 'search' && <Search memories={data.memories} places={data.places} placeById={placeById} onDay={openDay} />}

      {viewing && <PhotoViewer id={viewing.id} caption={viewing.caption} onClose={() => setViewing(null)} />}
    </main>
  )
}

function DayPage({
  data,
  summary,
  day,
  placeById,
  onDay,
  onEdit,
  onView,
  onJournal,
}: {
  data: DashData
  summary: Summary
  day: string
  placeById: Map<string, Place>
  onDay: (d: string) => void
  onEdit: (m: Memory) => void
  onView: (m: Memory) => (id: string) => void
  onJournal: () => void
}) {
  const entries = data.memories.filter(m => m.day === day).sort((a, b) => a.at - b.at)
  const hero = photoOfDay(entries)
  const reflection = data.journal.find(j => j.day === day)
  const isToday = day === summary.today
  const resetHour = data.player.settings.resetHour
  const happened = useMemo(
    () =>
      activityFeed(
        { ...data, planNames: new Map(data.plans.map(p => [p.id, p.name])), exerciseName: k => exerciseInfo(k)?.name ?? k },
        2000,
      )
        .filter(e => e.kind !== 'journal' && e.kind !== 'memory' && dayKey(new Date(e.at), resetHour) === day)
        .reverse(),
    [data, day, resetHour],
  )

  const remove = (m: Memory) => {
    if (confirm(`Delete this memory${m.photos.length ? ` and its ${m.photos.length} photo${m.photos.length === 1 ? '' : 's'}` : ''}? This can't be undone.`)) void deleteMemory(m.id)
  }

  return (
    <>
      <SystemWindow title={isToday ? 'Today' : longDay(day)} className="day-page">
        <div className="day-nav">
          <button className="ghost small" aria-label="Previous day" onClick={() => onDay(addDays(day, -1))}>◀</button>
          <input type="date" value={day} max={summary.today} onChange={e => e.target.value && onDay(e.target.value)} aria-label="Pick a day" />
          <button className="ghost small" aria-label="Next day" disabled={day >= summary.today} onClick={() => onDay(addDays(day, 1))}>▶</button>
          {!isToday && <button className="ghost small" onClick={() => onDay(summary.today)}>Today</button>}
        </div>
        {hero ? (
          <div className="hero-photo">
            <Photo id={hero.photoId} alt={`Photo of the day, ${day}`} onClick={() => onView(hero.memory)(hero.photoId)} />
            <span className="hero-tag">Photo of the day</span>
          </div>
        ) : (
          <p className="muted">{isToday ? 'No photo yet today. One photo clears "Photo of the day".' : 'No photo this day.'}</p>
        )}
      </SystemWindow>

      <SystemWindow title={`Memories · ${entries.length}`}>
        {entries.length === 0 && <p className="muted">Nothing logged this day.</p>}
        <ol className="memory-list">
          {entries.map(m => {
            const place = placeById.get(m.placeId ?? '')
            return (
              <li key={m.id} className="memory">
                <div className="memory-head">
                  <time className="memory-time">{time(m.at)}</time>
                  {place && <span className="memory-place">📍 {place.name}</span>}
                  <span className="grow" />
                  <button className="ghost small" onClick={() => onEdit(m)}>Edit</button>
                  <button className="ghost small icon" aria-label="Delete memory" title="Delete" onClick={() => remove(m)}>×</button>
                </div>
                {m.note && <p className="memory-note">{m.note}</p>}
                {m.photos.length > 0 && (
                  <div className="memory-photos">
                    {m.photos.map(p => <Photo key={p.id} id={p.id} alt={m.note || 'Memory photo'} onClick={() => onView(m)(p.id)} />)}
                  </div>
                )}
              </li>
            )
          })}
        </ol>
      </SystemWindow>

      <SystemWindow title="Reflection">
        {reflection ? (
          <dl className="reflection">
            {reflection.wentWell && <><dt>Went well</dt><dd>{reflection.wentWell}</dd></>}
            {reflection.drained && <><dt>Drained me</dt><dd>{reflection.drained}</dd></>}
            {reflection.adjust && <><dt>Adjust tomorrow</dt><dd>{reflection.adjust}</dd></>}
            <dt>Mood · energy</dt>
            <dd>{MOODS[reflection.mood - 1]} · {reflection.energy}/5</dd>
          </dl>
        ) : (
          <p className="muted">{isToday ? 'No reflection yet today.' : 'No reflection this day.'}</p>
        )}
        {isToday && (
          <div className="row end">
            <button className="small" onClick={onJournal}>{reflection ? 'Edit reflection' : 'Write reflection'}</button>
          </div>
        )}
      </SystemWindow>

      <SystemWindow title="What else happened">
        {happened.length === 0 ? (
          <p className="muted">No quests, training or other activity logged.</p>
        ) : (
          <ol className="log">
            {happened.map(e => (
              <li key={e.id} className={`log-${e.kind}`}>
                <time className="log-time">{time(e.at)}</time>
                <span className="stat-key">{e.stat ?? 'SYS'}</span>
                <span className="log-text">{e.text}</span>
                {e.gain && <span className="log-gain">{e.gain}</span>}
              </li>
            ))}
          </ol>
        )}
      </SystemWindow>
    </>
  )
}

function MonthCalendar({ memories, summary, onDay }: { memories: Memory[]; summary: Summary; onDay: (d: string) => void }) {
  const [month, setMonth] = useState(summary.today.slice(0, 7))
  const [y, m] = month.split('-').map(Number)
  const first = `${month}-01`
  const lead = (new Date(y, m - 1, 1).getDay() + 6) % 7
  const length = new Date(y, m, 0).getDate()
  const byDay = useMemo(() => {
    const map = new Map<string, Memory[]>()
    for (const x of memories) map.set(x.day, [...(map.get(x.day) ?? []), x])
    return map
  }, [memories])
  const shift = (n: number) => {
    const d = new Date(y, m - 1 + n, 1)
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
  }
  const title = new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
  return (
    <SystemWindow title={title}>
      <div className="day-nav">
        <button className="ghost small" aria-label="Previous month" onClick={() => shift(-1)}>◀</button>
        <span className="grow" />
        <button className="ghost small" aria-label="Next month" disabled={month >= summary.today.slice(0, 7)} onClick={() => shift(1)}>▶</button>
      </div>
      <div className="month-grid">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d} className="month-head">{d}</span>)}
        {Array.from({ length: lead }, (_, i) => <span key={`x${i}`} />)}
        {Array.from({ length }, (_, i) => {
          const day = addDays(first, i)
          const list = byDay.get(day) ?? []
          const hero = photoOfDay(list)
          const future = day > summary.today
          return (
            <button key={day} className={`month-day ${day === summary.today ? 'today' : ''} ${list.length ? 'has' : ''}`} disabled={future} onClick={() => onDay(day)} aria-label={`${day}: ${list.length} memories`}>
              {hero && <Photo id={hero.photoId} alt="" className="month-thumb" />}
              <span className="month-num">{i + 1}</span>
              {!hero && list.length > 0 && <span className="month-dot" aria-hidden>●</span>}
            </button>
          )
        })}
      </div>
    </SystemWindow>
  )
}

function PhotoWall({ memories, onView }: { memories: Memory[]; onView: (m: Memory, id: string) => void }) {
  const [shown, setShown] = useState(60)
  const all = useMemo(() => [...memories].sort((a, b) => b.at - a.at).flatMap(m => m.photos.map(p => ({ m, id: p.id }))), [memories])
  return (
    <SystemWindow title={`Photos · ${all.length}`}>
      {all.length === 0 && <p className="muted">No photos yet.</p>}
      <div className="photo-wall">
        {all.slice(0, shown).map(({ m, id }) => <Photo key={id} id={id} alt={m.note || m.day} onClick={() => onView(m, id)} />)}
      </div>
      {all.length > shown && (
        <div className="row end">
          <button className="ghost small" onClick={() => setShown(s => s + 60)}>Show more</button>
        </div>
      )}
    </SystemWindow>
  )
}

function Places({ memories, places, onDay, onView }: { memories: Memory[]; places: Place[]; onDay: (d: string) => void; onView: (m: Memory, id: string) => void }) {
  const visits = useMemo(() => placeVisits(memories, places), [memories, places])
  const [picked, setPicked] = useState<string | null>(null)
  const [renaming, setRenaming] = useState('')
  const current = visits.find(v => v.place.id === picked)
  const here = current ? memories.filter(m => m.placeId === current.place.id).sort((a, b) => b.at - a.at) : []

  return (
    <>
      <SystemWindow title={`Map · ${visits.length} places`}>
        {visits.length === 0 ? (
          <p className="muted">Places appear here once you save memories with a location.</p>
        ) : (
          <Suspense fallback={<div className="map-box" />}>
            <MapView visits={visits} onPick={id => { setPicked(id); setRenaming('') }} />
          </Suspense>
        )}
      </SystemWindow>

      {current && (
        <SystemWindow title={current.place.name} className="place-detail">
          <p className="muted">
            {[current.place.city, current.place.country].filter(Boolean).join(', ')} · {current.visits} memor{current.visits === 1 ? 'y' : 'ies'} on {current.days} day{current.days === 1 ? '' : 's'}
          </p>
          <div className="inline-form">
            <input value={renaming} onChange={e => setRenaming(e.target.value)} placeholder="Rename (e.g. Home, Gym)" maxLength={60} />
            <button className="small" disabled={!renaming.trim()} onClick={() => { void renamePlace(current.place.id, renaming); setRenaming('') }}>Rename</button>
          </div>
          {current.photoIds.length > 0 && (
            <div className="photo-wall">
              {here.flatMap(m => m.photos.map(p => <Photo key={p.id} id={p.id} alt={m.note || m.day} onClick={() => onView(m, p.id)} />))}
            </div>
          )}
          <ul className="board-list">
            {[...new Set(here.map(m => m.day))].map(d => (
              <li key={d}>
                <button className="ghost small" onClick={() => onDay(d)}>{longDay(d)}</button>
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}

      {visits.length > 0 && (
        <SystemWindow title="All places">
          <ul className="board-list place-list">
            {visits.map(v => (
              <li key={v.place.id}>
                <button className={`place-row ${picked === v.place.id ? 'on' : ''}`} onClick={() => setPicked(v.place.id)}>
                  <span className="quest-title">{v.place.name} <small className="muted">{v.place.city}</small></span>
                  <span className="streak">{v.visits}</span>
                </button>
              </li>
            ))}
          </ul>
        </SystemWindow>
      )}
    </>
  )
}

function Search({ memories, places, placeById, onDay }: { memories: Memory[]; places: Place[]; placeById: Map<string, Place>; onDay: (d: string) => void }) {
  const [q, setQ] = useState('')
  const results = useMemo(() => searchMemories(memories, places, q).slice(0, 100), [memories, places, q])
  return (
    <SystemWindow title="Search">
      <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="A word, a person, a place, or a date like 2026-10" autoFocus />
      {q.trim() && <p className="muted">{results.length} result{results.length === 1 ? '' : 's'}</p>}
      <ul className="search-results">
        {results.map(m => (
          <li key={m.id}>
            <button className="search-hit" onClick={() => onDay(m.day)}>
              {m.photos[0] ? <Photo id={m.photos[0].id} alt="" className="search-thumb" /> : <span className="search-thumb" />}
              <span>
                <b>{longDay(m.day)}</b>
                <small className="muted"> {placeById.get(m.placeId ?? '')?.name ?? ''}</small>
                <br />
                <span className="search-note">{m.note || (m.photos.length ? `${m.photos.length} photo${m.photos.length === 1 ? '' : 's'}` : '')}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </SystemWindow>
  )
}

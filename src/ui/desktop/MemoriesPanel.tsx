import { photoOfDay, type Summary } from '../../engine'
import { SystemWindow } from '../SystemWindow'
import { Photo } from '../lifelog/Photo'
import type { DashData } from './Desktop'

/** Recent photos of the day on the PC dashboard. */
export function MemoriesPanel({ data, summary, onOpen, onCamera }: { data: DashData; summary: Summary; onOpen: () => void; onCamera: () => void }) {
  const days = [...new Set(data.memories.map(m => m.day))].sort().reverse()
  const heroes = days
    .map(day => ({ day, hero: photoOfDay(data.memories.filter(m => m.day === day)) }))
    .filter(d => d.hero)
    .slice(0, 8)
  const today = data.memories.filter(m => m.day === summary.today)
  return (
    <SystemWindow title="Memories">
      <p className="muted">
        {today.length ? `${today.length} today` : 'Nothing logged today yet'} · {summary.travel.places} places · {summary.travel.countries} countr{summary.travel.countries === 1 ? 'y' : 'ies'}
      </p>
      {heroes.length > 0 ? (
        <div className="memory-strip">
          {heroes.map(({ day, hero }) => <Photo key={day} id={hero!.photoId} alt={day} onClick={onOpen} />)}
        </div>
      ) : (
        <p className="muted">Your photos of the day will line up here.</p>
      )}
      <div className="row end">
        <button className="ghost small" onClick={onOpen}>Life log</button>
        <button className="small" onClick={onCamera}>Add a memory</button>
      </div>
    </SystemWindow>
  )
}

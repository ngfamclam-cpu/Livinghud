import { useState } from 'react'
import { EXERCISES, exerciseInfo, type ExerciseUnit, type RoutineExercise } from '../engine'
import { customExerciseKey, saveRoutine } from '../db/actions'
import { SystemWindow } from './SystemWindow'

const UNITS: { key: ExerciseUnit; label: string }[] = [
  { key: 'reps', label: 'reps' },
  { key: 'seconds', label: 'seconds' },
  { key: 'minutes', label: 'minutes' },
]

/** Change targets, remove exercises, or add the System's or your own. */
export function RoutineEditor({ exercises, onDone }: { exercises: RoutineExercise[]; onDone: () => void }) {
  const [rows, setRows] = useState<RoutineExercise[]>(exercises)
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<ExerciseUnit>('reps')
  const [target, setTarget] = useState('')
  const [saving, setSaving] = useState(false)

  const patch = (key: string, p: Partial<RoutineExercise>) => setRows(r => r.map(e => (e.key === key ? { ...e, ...p } : e)))
  const remove = (key: string) => setRows(r => r.filter(e => e.key !== key))
  const missing = EXERCISES.filter(e => !rows.some(r => r.key === e.key))
  const valid = rows.length > 0 && rows.every(r => r.name.trim() && r.target >= 1)

  const addCustom = () => {
    setRows(r => [...r, { key: customExerciseKey(), name: name.trim(), unit, target: Math.max(1, Math.round(Number(target))) }])
    setName('')
    setTarget('')
  }

  const save = async () => {
    setSaving(true)
    await saveRoutine(rows)
    onDone()
  }

  return (
    <main className="hud">
      <SystemWindow title="Edit routine">
        <p className="muted">Set each day's target. Changes apply from today, and the quest clears when every target is hit.</p>
        <ul className="routine-edit">
          {rows.map(e => {
            const tracked = exerciseInfo(e.key)
            return (
              <li key={e.key}>
                {tracked ? (
                  <span className="quest-title">
                    {e.name}
                    <small className="muted"> {tracked.tracking === 'manual' ? 'by hand' : 'camera'}</small>
                  </span>
                ) : (
                  <input className="name-input" value={e.name} onChange={ev => patch(e.key, { name: ev.target.value })} aria-label="Exercise name" maxLength={40} />
                )}
                <input
                  className="target-input"
                  type="number"
                  min={1}
                  inputMode="numeric"
                  value={e.target || ''}
                  onChange={ev => patch(e.key, { target: Math.max(0, Math.round(Number(ev.target.value) || 0)) })}
                  aria-label={`${e.name} target`}
                />
                <span className="muted unit">{e.unit}</span>
                <button className="ghost small icon" aria-label={`Remove ${e.name}`} title="Remove" onClick={() => remove(e.key)}>×</button>
              </li>
            )
          })}
        </ul>
        {rows.length === 0 && <p className="error">Keep at least one exercise.</p>}

        {missing.length > 0 && (
          <div className="row">
            {missing.map(e => (
              <button key={e.key} className="chip" onClick={() => setRows(r => [...r, { key: e.key, name: e.name, unit: e.unit, target: e.unit === 'seconds' ? 30 : 10 }])}>
                + {e.name}
              </button>
            ))}
          </div>
        )}

        <h3>Add your own</h3>
        <div className="grid2">
          <label>Exercise<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Lunges" maxLength={40} /></label>
          <label>Daily target<input type="number" min={1} inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} /></label>
        </div>
        <div className="row">
          {UNITS.map(u => (
            <button key={u.key} className={`chip ${unit === u.key ? 'picked' : ''}`} onClick={() => setUnit(u.key)}>{u.label}</button>
          ))}
          <button className="small ghost" disabled={!name.trim() || !(Number(target) >= 1)} onClick={addCustom}>Add</button>
        </div>
        <p className="muted">Your own exercises are counted by hand; the camera follows the System's ones.</p>

        <div className="row end">
          <button className="ghost" onClick={onDone}>Cancel</button>
          <button disabled={!valid || saving} onClick={save}>Save routine</button>
        </div>
      </SystemWindow>
    </main>
  )
}

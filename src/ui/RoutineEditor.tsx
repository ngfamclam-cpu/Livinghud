import { useState } from 'react'
import {
  DAY_NAMES,
  DEFAULT_CYCLE,
  EXERCISES,
  defaultPlan,
  exerciseInfo,
  type DayKind,
  type ExerciseUnit,
  type FitnessBaseline,
  type RoutineExercise,
  type TrainingPlan,
  type WorkoutKind,
} from '../engine'
import { customExerciseKey, savePlan } from '../db/actions'
import { SystemWindow } from './SystemWindow'

const UNITS: ExerciseUnit[] = ['reps', 'seconds', 'minutes']
type Tab = 'cycle' | WorkoutKind | 'posture'

interface Props {
  plan: TrainingPlan
  /** Where today is in the plan's cycle right now. */
  index: number
  today: string
  fitness: FitnessBaseline | null
  onDone: () => void
}

/** Edit the training cycle, each day's exercises and targets, and the daily posture routine. */
export function RoutineEditor({ plan, index, today, fitness, onDone }: Props) {
  const [draft, setDraft] = useState<TrainingPlan>(plan)
  const [todayIndex, setTodayIndex] = useState(index)
  const [tab, setTab] = useState<Tab>('cycle')
  const [saving, setSaving] = useState(false)

  const legacy = draft.cycle.includes('full')
  const kinds = (['push', 'pull', 'legs', 'full'] as WorkoutKind[]).filter(k => k !== 'full' || legacy)
  const tabs: Tab[] = ['cycle', ...kinds, 'posture']
  const list = tab === 'cycle' ? [] : tab === 'posture' ? draft.posture : (draft.workouts[tab] ?? [])
  const setList = (next: RoutineExercise[]) =>
    setDraft(d => (tab === 'posture' ? { ...d, posture: next } : { ...d, workouts: { ...d.workouts, [tab]: next } }))

  const setCycle = (cycle: DayKind[]) => {
    setDraft(d => ({ ...d, cycle }))
    setTodayIndex(i => Math.min(i, Math.max(0, cycle.length - 1)))
  }
  const switchToSplit = () => {
    setDraft(defaultPlan(fitness, today))
    setTodayIndex(0)
  }

  const emptyDay = draft.cycle.find(k => k !== 'rest' && (draft.workouts[k]?.length ?? 0) === 0)
  const valid = draft.cycle.length > 0 && !emptyDay

  const save = async () => {
    setSaving(true)
    // Changing the cycle or today's position restarts the count from today.
    const moved = todayIndex !== index || draft.cycle.join() !== plan.cycle.join()
    await savePlan(moved ? { ...draft, startedOn: today, startIndex: todayIndex } : draft)
    onDone()
  }

  return (
    <main className="hud">
      <SystemWindow title="Training plan">
        {legacy && (
          <div className="banner">
            <p>You're on a single every-day routine. Switch to Push / Pull / Legs with a daily posture routine for forward head posture and anterior pelvic tilt?</p>
            <button className="small" onClick={switchToSplit}>Switch to Push / Pull / Legs</button>
          </div>
        )}
        <div className="tabs-inline" role="tablist">
          {tabs.map(t => (
            <button key={t} role="tab" aria-selected={tab === t} className={`chip ${tab === t ? 'picked' : ''}`} onClick={() => setTab(t)}>
              {t === 'cycle' ? 'Cycle' : t === 'posture' ? 'Posture' : DAY_NAMES[t]}
            </button>
          ))}
        </div>

        {tab === 'cycle' ? (
          <CycleEditor cycle={draft.cycle} todayIndex={todayIndex} legacy={legacy} onCycle={setCycle} onToday={setTodayIndex} />
        ) : (
          <ExerciseList key={tab} group={tab} list={list} onChange={setList} />
        )}

        {emptyDay && <p className="error">{DAY_NAMES[emptyDay]} day has no exercises. Add some or take it out of the cycle.</p>}
        <div className="row end">
          <button className="ghost" onClick={onDone}>Cancel</button>
          <button disabled={!valid || saving} onClick={save}>Save plan</button>
        </div>
      </SystemWindow>
    </main>
  )
}

function CycleEditor({ cycle, todayIndex, legacy, onCycle, onToday }: {
  cycle: DayKind[]
  todayIndex: number
  legacy: boolean
  onCycle: (c: DayKind[]) => void
  onToday: (i: number) => void
}) {
  const addable: DayKind[] = legacy ? ['full', 'push', 'pull', 'legs', 'rest'] : ['push', 'pull', 'legs', 'rest']
  return (
    <>
      <p className="muted">
        The days repeat in this order. The cycle moves on when you finish a day's workout or a rest day passes. Miss a workout and it waits for you,
        so nothing is skipped. The posture routine is part of every day, rest days included.
      </p>
      <ol className="cycle-list">
        {cycle.map((k, i) => (
          <li key={i} className={i === todayIndex ? 'today' : ''}>
            <button className="cycle-day" onClick={() => onToday(i)} aria-pressed={i === todayIndex} title="Set as today">
              <span>{i + 1}. {DAY_NAMES[k]}</span>
              {i === todayIndex && <small>today</small>}
            </button>
            <button className="ghost small icon" aria-label={`Remove day ${i + 1}`} onClick={() => onCycle(cycle.filter((_, j) => j !== i))}>×</button>
          </li>
        ))}
      </ol>
      <p className="muted">Tap a day to make it today.</p>
      <div className="row">
        {addable.map(k => (
          <button key={k} className="chip" onClick={() => onCycle([...cycle, k])}>+ {DAY_NAMES[k]}</button>
        ))}
        <button className="ghost small" onClick={() => onCycle([...DEFAULT_CYCLE])}>Reset to Push, Pull, Legs, Push, Pull, Rest</button>
      </div>
    </>
  )
}

function ExerciseList({ group, list, onChange }: { group: WorkoutKind | 'posture'; list: RoutineExercise[]; onChange: (l: RoutineExercise[]) => void }) {
  const [name, setName] = useState('')
  const [unit, setUnit] = useState<ExerciseUnit>('reps')
  const [target, setTarget] = useState('')
  const [open, setOpen] = useState<string | null>(null)

  const patch = (key: string, p: Partial<RoutineExercise>) => onChange(list.map(e => (e.key === key ? { ...e, ...p } : e)))
  const suggestions = EXERCISES.filter(e => (group === 'full' || e.group === group) && !list.some(r => r.key === e.key))

  const addCustom = () => {
    onChange([...list, { key: customExerciseKey(), name: name.trim(), unit, target: Math.max(1, Math.round(Number(target))) }])
    setName('')
    setTarget('')
  }

  return (
    <>
      {group === 'posture' && (
        <p className="muted">
          Every day: chin tucks, wall slides and Y raises strengthen the muscles that hold your head and shoulders back; the chest and neck stretches
          loosen what pulls them forward; the hip flexor stretch (pelvis tucked), glute bridges and dead bugs work against anterior pelvic tilt. Tap a
          name for how to do it.
        </p>
      )}
      <ul className="routine-edit">
        {list.map(e => {
          const info = exerciseInfo(e.key)
          return (
            <li key={e.key}>
              {info ? (
                <button className="link-like quest-title" onClick={() => setOpen(o => (o === e.key ? null : e.key))} aria-expanded={open === e.key}>
                  {e.name} <small className="muted">{info.tracking === 'manual' ? (e.unit === 'reps' ? 'by hand' : 'timer') : 'camera'}</small>
                </button>
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
              <button className="ghost small icon" aria-label={`Remove ${e.name}`} title="Remove" onClick={() => onChange(list.filter(x => x.key !== e.key))}>×</button>
              {open === e.key && info && <p className="muted how">{info.tip}</p>}
            </li>
          )
        })}
      </ul>
      {list.length === 0 && <p className="muted">No exercises yet.</p>}

      {suggestions.length > 0 && (
        <div className="row">
          {suggestions.map(e => (
            <button key={e.key} className="chip" onClick={() => onChange([...list, { key: e.key, name: e.name, unit: e.unit, target: e.unit === 'seconds' ? 30 : 10 }])}>
              + {e.name}
            </button>
          ))}
        </div>
      )}

      <h3>Add your own</h3>
      <div className="grid2">
        <label>Exercise<input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Face pulls" maxLength={40} /></label>
        <label>Daily target<input type="number" min={1} inputMode="numeric" value={target} onChange={e => setTarget(e.target.value)} /></label>
      </div>
      <div className="row">
        {UNITS.map(u => (
          <button key={u} className={`chip ${unit === u ? 'picked' : ''}`} onClick={() => setUnit(u)}>{u}</button>
        ))}
        <button className="small ghost" disabled={!name.trim() || !(Number(target) >= 1)} onClick={addCustom}>Add</button>
      </div>
    </>
  )
}

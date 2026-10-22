import { useState } from 'react'
import { WEEKDAYS, journalPatterns, type Completion, type JournalEntry, type Quest, type Summary } from '../engine'
import { saveJournal } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { Bar } from './Bar'

const MOODS = ['Rough', 'Low', 'Okay', 'Good', 'Great']
const ENERGY = ['Empty', 'Low', 'Okay', 'Good', 'Charged']

interface Props {
  summary: Summary
  entries: JournalEntry[]
  completions: Completion[]
  quests: Quest[]
  onClose: () => void
}

export function Journal({ summary, entries, completions, quests, onClose }: Props) {
  const todays = entries.find(e => e.day === summary.today)
  const [wentWell, setWentWell] = useState(todays?.wentWell ?? '')
  const [drained, setDrained] = useState(todays?.drained ?? '')
  const [adjust, setAdjust] = useState(todays?.adjust ?? '')
  const [mood, setMood] = useState(todays?.mood ?? 3)
  const [energy, setEnergy] = useState(todays?.energy ?? 3)
  const [saved, setSaved] = useState(false)

  const dailies = quests.filter(q => q.kind === 'daily' && q.active).map(q => q.id)
  const dailyDone = completions.filter(c => dailies.includes(c.questId))
  const patterns = journalPatterns(entries, dailyDone, dailies.length, summary.today)
  const past = [...entries].filter(e => e.day !== summary.today).sort((a, b) => b.day.localeCompare(a.day)).slice(0, 14)

  const save = async () => {
    await saveJournal({ wentWell, drained, adjust, mood, energy })
    setSaved(true)
  }

  return (
    <main className="hud">
      <SystemWindow title={`Journal · ${summary.today}`}>
        <label>What went well?<textarea rows={2} value={wentWell} onChange={e => { setWentWell(e.target.value); setSaved(false) }} /></label>
        <label>What drained me?<textarea rows={2} value={drained} onChange={e => { setDrained(e.target.value); setSaved(false) }} /></label>
        <label>One thing to adjust tomorrow<textarea rows={2} value={adjust} onChange={e => { setAdjust(e.target.value); setSaved(false) }} /></label>
        <Rating label="Mood" names={MOODS} value={mood} onChange={v => { setMood(v); setSaved(false) }} />
        <Rating label="Energy" names={ENERGY} value={energy} onChange={v => { setEnergy(v); setSaved(false) }} />
        <p className="muted">All three prompts clears the journal daily; one line counts as the minimum. You can come back and edit today's entry.</p>
        <div className="row end">
          {saved && <span className="cleared">Saved</span>}
          <button disabled={!(wentWell.trim() || drained.trim() || adjust.trim())} onClick={save}>{todays ? 'Update entry' : 'Save entry'}</button>
        </div>
      </SystemWindow>

      <SystemWindow title="Patterns">
        {patterns.entries < 5 ? (
          <p className="muted">Patterns appear after about a week of entries. {patterns.entries} so far.</p>
        ) : (
          <>
            <p>
              <b>{patterns.streak}</b>-day journal streak · {patterns.entries} entries
            </p>
            <ul className="stats weekday-moods">
              {WEEKDAYS.map((name, i) => (
                <li key={name}>
                  <span className="stat-key">{name.slice(0, 3)}</span>
                  <Bar value={patterns.moodByWeekday[i] ?? 0} max={5} thin />
                  <span className="stat-value">{patterns.moodByWeekday[i]?.toFixed(1) ?? '–'}</span>
                </li>
              ))}
            </ul>
            {patterns.bestDay && <p className="muted">Best mood on {patterns.bestDay}s, lowest on {patterns.worstDay}s.</p>}
            {patterns.drains.length > 0 && (
              <p className="muted">What keeps draining you (last 30 days): {patterns.drains.map(d => `${d.word} (${d.count})`).join(', ')}.</p>
            )}
            {patterns.moodWhenProductive !== null && patterns.moodOtherwise !== null && (
              <p className="muted">
                On days you clear most of your dailies your mood averages {patterns.moodWhenProductive.toFixed(1)}, versus {patterns.moodOtherwise.toFixed(1)} on other days.
              </p>
            )}
          </>
        )}
      </SystemWindow>

      {past.length > 0 && (
        <SystemWindow title="Past entries">
          <ul className="journal-list">
            {past.map(e => <PastEntry key={e.id} entry={e} />)}
          </ul>
        </SystemWindow>
      )}
      <button className="ghost settings-button" onClick={onClose}>Back</button>
    </main>
  )
}

function Rating({ label, names, value, onChange }: { label: string; names: string[]; value: number; onChange: (v: number) => void }) {
  return (
    <div className="rating">
      <span className="muted">{label}</span>
      <div className="row">
        {names.map((n, i) => (
          <button key={n} className={`chip ${value === i + 1 ? 'picked' : ''}`} onClick={() => onChange(i + 1)} aria-pressed={value === i + 1}>{n}</button>
        ))}
      </div>
    </div>
  )
}

function PastEntry({ entry }: { entry: JournalEntry }) {
  const [open, setOpen] = useState(false)
  return (
    <li>
      <button className="quest-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="quest-title">{entry.day}</span>
        <small className="muted">mood {MOODS[entry.mood - 1]} · energy {ENERGY[entry.energy - 1]}</small>
      </button>
      {open && (
        <div className="quest-detail">
          {entry.wentWell && <p><b>Went well:</b> {entry.wentWell}</p>}
          {entry.drained && <p><b>Drained me:</b> {entry.drained}</p>}
          {entry.adjust && <p><b>Adjust:</b> {entry.adjust}</p>}
        </div>
      )}
    </li>
  )
}

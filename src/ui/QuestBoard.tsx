import { useState } from 'react'
import { MAIN_TEMPLATES, SIDE_TEMPLATES, SIDE_XP, SIDE_PAY_SHARE, type Player, type Quest, type StatKey, type Summary } from '../engine'
import { addCustomMain, addMainFromTemplate, addSideFromTemplate, addSideQuest, archiveQuest } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { money } from './format'

export function QuestBoard({ player, quests, summary }: { player: Player; quests: Quest[]; summary: Summary }) {
  const active = quests.filter(q => q.active)
  const activeTemplates = new Set(active.map(q => q.templateId))
  const sides = active.filter(q => q.kind === 'side')
  const mains = active.filter(q => q.kind === 'main')
  const sidePay = money(summary.wallet.budget * SIDE_PAY_SHARE)

  const remove = (q: Quest) => {
    if (confirm(`Remove "${q.title}" from your quest board? XP and money you already earned from it stay.`)) archiveQuest(q)
  }

  return (
    <main className="hud">
      <SystemWindow title="Quest board">
        <p>
          Side quests reset every Monday and pay {SIDE_XP} XP and {sidePay} each (half for the minimum version).
          Main quests are long goals cleared stage by stage, and each stage pays more.
          Side and main quest money comes on top of your dailies, so it usually lands in the Vault.
        </p>
      </SystemWindow>

      <SystemWindow title={`Your side quests · ${sides.length}`}>
        {sides.length === 0 && <p className="muted">None yet. Pick a few below.</p>}
        <ul className="board-list">
          {sides.map(q => (
            <li key={q.id}>
              <span className="stat-key">{q.stat}</span>
              <span className="quest-title">{q.title}</span>
              <button className="ghost small" onClick={() => remove(q)}>Remove</button>
            </li>
          ))}
        </ul>
        <h3>Add from the library</h3>
        <div className="choices">
          {SIDE_TEMPLATES.filter(t => player.stats.includes(t.stat) && !activeTemplates.has(t.id)).map(t => (
            <button key={t.id} className="choice" onClick={() => addSideFromTemplate(t.id)}>
              <span className="stat-key">{t.stat}</span>
              <span><b>{t.title}</b><br /><small>Minimum: {t.minVersion}</small></span>
              <span className="add">+</span>
            </button>
          ))}
        </div>
        <CustomSide stats={player.stats} />
      </SystemWindow>

      <SystemWindow title={`Your main quests · ${mains.length}`}>
        {mains.length === 0 && <p className="muted">None yet. Your first suggested main quest is Side income.</p>}
        <ul className="board-list">
          {mains.map(q => {
            const p = summary.mainProgress.get(q.id)
            return (
              <li key={q.id}>
                <span className="stat-key">{q.stat}</span>
                <span className="quest-title">{q.title} <small className="muted">{p?.cleared ?? 0}/{q.stages?.length ?? 0} stages</small></span>
                <button className="ghost small" onClick={() => remove(q)}>Remove</button>
              </li>
            )
          })}
        </ul>
        <h3>Add from the library</h3>
        <div className="choices">
          {MAIN_TEMPLATES.filter(t => player.stats.includes(t.stat) && !activeTemplates.has(t.id)).map(t => (
            <button key={t.id} className="choice" onClick={() => addMainFromTemplate(t.id)}>
              <span className="stat-key">{t.stat}</span>
              <span><b>{t.title}</b><br /><small>{t.stages.length} stages: {t.stages.map(s => s.title).join(' → ')}</small></span>
              <span className="add">+</span>
            </button>
          ))}
        </div>
        <CustomMain stats={player.stats} />
      </SystemWindow>
    </main>
  )
}

function StatSelect({ stats, value, onChange }: { stats: StatKey[]; value: StatKey; onChange: (s: StatKey) => void }) {
  return (
    <label>
      Stat
      <select value={value} onChange={e => onChange(e.target.value as StatKey)}>
        {stats.map(s => <option key={s} value={s}>{s}</option>)}
      </select>
    </label>
  )
}

function CustomSide({ stats }: { stats: StatKey[] }) {
  const [open, setOpen] = useState(false)
  const [stat, setStat] = useState<StatKey>(stats[0])
  const [title, setTitle] = useState('')
  const [minVersion, setMinVersion] = useState('')

  if (!open) return <button className="ghost small" onClick={() => setOpen(true)}>Write your own side quest</button>
  const save = async () => {
    await addSideQuest({ stat, title, description: '', minVersion })
    setTitle('')
    setMinVersion('')
    setOpen(false)
  }
  return (
    <div className="form">
      <StatSelect stats={stats} value={stat} onChange={setStat} />
      <label>Quest<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Go for a long hike" maxLength={60} /></label>
      <label>Minimum version for a bad week<input value={minVersion} onChange={e => setMinVersion(e.target.value)} placeholder="e.g. A 30-minute walk" maxLength={60} /></label>
      <div className="row end">
        <button className="ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button disabled={!title.trim()} onClick={save}>Add side quest</button>
      </div>
    </div>
  )
}

function CustomMain({ stats }: { stats: StatKey[] }) {
  const [open, setOpen] = useState(false)
  const [stat, setStat] = useState<StatKey>(stats[0])
  const [title, setTitle] = useState('')
  const [stages, setStages] = useState('')
  const stageTitles = stages.split('\n').map(s => s.trim()).filter(Boolean)

  if (!open) return <button className="ghost small" onClick={() => setOpen(true)}>Write your own main quest</button>
  const save = async () => {
    await addCustomMain({ stat, title, description: '', stageTitles })
    setTitle('')
    setStages('')
    setOpen(false)
  }
  return (
    <div className="form">
      <StatSelect stats={stats} value={stat} onChange={setStat} />
      <label>Main quest<input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Run a 10K" maxLength={60} /></label>
      <label>
        Stages, one per line, in order
        <textarea rows={4} value={stages} onChange={e => setStages(e.target.value)} placeholder={'Run 3K without stopping\nRun 5K\nRun 10K'} />
      </label>
      <div className="row end">
        <button className="ghost" onClick={() => setOpen(false)}>Cancel</button>
        <button disabled={!title.trim() || stageTitles.length === 0} onClick={save}>Add main quest</button>
      </div>
    </div>
  )
}

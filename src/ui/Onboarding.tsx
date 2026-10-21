import { useState } from 'react'
import {
  DAILY_TEMPLATES,
  DEFAULT_FITNESS,
  MAIN_TEMPLATES,
  MAX_STARTER_DAILIES,
  RANK_MIN_LEVEL,
  REWARD_TEMPLATES,
  SUGGESTED_MAIN,
  rewardRank,
  STATS,
  SUGGESTED_STARTERS,
  dailyPay,
  type Difficulty,
  type FitnessBaseline,
  type PlayerSettings,
  type StatKey,
} from '../engine'
import { awaken } from '../db/actions'
import { SystemWindow } from './SystemWindow'

const MIN_STATS = 3
const MIN_DAILIES = 3

const DIFFICULTIES: { key: Difficulty; name: string; text: string }[] = [
  { key: 'casual', name: 'Casual', text: 'Missed dailies pause your streak. Nothing is lost.' },
  { key: 'normal', name: 'Normal', text: 'Missed dailies break streaks and your stats slip.' },
  { key: 'hardcore', name: 'Hardcore', text: 'Missed dailies cost HP. At 0 HP you lose wallet money or a level.' },
]

type Step = 'welcome' | 'stats' | 'fitness' | 'dailies' | 'main' | 'budget' | 'rewards' | 'difficulty' | 'day' | 'status'

export function Onboarding() {
  const [step, setStep] = useState<Step>('welcome')
  const [name, setName] = useState('')
  const [stats, setStats] = useState<StatKey[]>(['STR', 'VIT', 'CHA', 'WLT'])
  const [fitness, setFitness] = useState<FitnessBaseline>(DEFAULT_FITNESS)
  const [dailyIds, setDailyIds] = useState<string[]>([])
  const [mainIds, setMainIds] = useState<string[]>([SUGGESTED_MAIN])
  const [rewardIds, setRewardIds] = useState<string[]>(REWARD_TEMPLATES.map(t => t.id))
  const [settings, setSettings] = useState<PlayerSettings>({
    monthlyBudget: 150,
    savingsGoal: { type: 'fixed', amount: 200 },
    difficulty: 'normal',
    resetHour: 4,
    wakeTime: '07:00',
    bedTime: '23:00',
  })
  const [saving, setSaving] = useState(false)

  const hasStr = stats.includes('STR')
  const order: Step[] = ['welcome', 'stats', ...(hasStr ? (['fitness'] as Step[]) : []), 'dailies', 'main', 'budget', 'rewards', 'difficulty', 'day', 'status']
  const index = order.indexOf(step)
  const next = () => {
    const to = order[index + 1]
    if (to === 'dailies' && dailyIds.length === 0) setDailyIds(suggestedFor(stats))
    setStep(to)
  }
  const back = () => setStep(order[index - 1])
  const patch = (p: Partial<PlayerSettings>) => setSettings(s => ({ ...s, ...p }))

  const toggleStat = (key: StatKey) => {
    const nextStats = stats.includes(key) ? stats.filter(k => k !== key) : [...stats, key]
    setStats(nextStats)
    setDailyIds([])
    setMainIds(ids => ids.filter(id => nextStats.includes(MAIN_TEMPLATES.find(t => t.id === id)!.stat)))
  }
  const toggle = (id: string, set: (f: (ids: string[]) => string[]) => void) =>
    set(ids => (ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id]))
  const toggleDaily = (id: string) =>
    setDailyIds(ids =>
      ids.includes(id) ? ids.filter(i => i !== id) : ids.length < MAX_STARTER_DAILIES ? [...ids, id] : ids,
    )

  const finish = async () => {
    setSaving(true)
    await awaken({
      name: name.trim() || 'Player',
      stats,
      fitness: hasStr ? fitness : null,
      dailyTemplateIds: dailyIds,
      mainTemplateIds: mainIds,
      rewardTemplateIds: rewardIds,
      settings,
    })
  }

  const progress = (
    <div className="steps" aria-label={`Step ${index + 1} of ${order.length}`}>
      {order.map((s, i) => <span key={s} className={i <= index ? 'on' : ''} />)}
    </div>
  )

  const nav = (canNext: boolean, label = 'Next') => (
    <div className="row end">
      {index > 0 && <button className="ghost" onClick={back}>Back</button>}
      <button disabled={!canNext} onClick={next}>{label}</button>
    </div>
  )

  return (
    <main className="onboarding">
      {progress}

      {step === 'welcome' && (
        <SystemWindow title="Notification">
          <p className="system-line">You have acquired the qualifications to be a <b>Player</b>.</p>
          <p>LivingHUD turns your real life into quests. Answer a few questions and the System will build your character.</p>
          <label>
            What should the System call you?
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Player name" autoFocus maxLength={24} />
          </label>
          {nav(name.trim().length > 0, 'Accept')}
        </SystemWindow>
      )}

      {step === 'stats' && (
        <SystemWindow title="Choose your stats">
          <p>Which parts of your life do you want to level up? Pick at least {MIN_STATS}. Each stat scores how that area went over the last 30 days.</p>
          <div className="choices">
            {STATS.map(s => (
              <button key={s.key} className={`choice ${stats.includes(s.key) ? 'picked' : ''}`} onClick={() => toggleStat(s.key)} aria-pressed={stats.includes(s.key)}>
                <span className="stat-key">{s.key}</span>
                <span><b>{s.name}</b><br /><small>{s.area}</small></span>
              </button>
            ))}
          </div>
          {nav(stats.length >= MIN_STATS)}
        </SystemWindow>
      )}

      {step === 'fitness' && (
        <SystemWindow title="Fitness test">
          <p>How many can you do right now in one go? These set your starting strength quest. They go up as you stay consistent.</p>
          <div className="grid2">
            {([
              ['pushups', 'Pushups'],
              ['squats', 'Squats'],
              ['plankSeconds', 'Plank (seconds)'],
              ['pullups', 'Pull-ups'],
              ['gluteBridges', 'Glute bridges'],
            ] as [keyof FitnessBaseline, string][]).map(([key, label]) => (
              <label key={key}>
                {label}
                <input type="number" min={0} inputMode="numeric" value={fitness[key]} onChange={e => setFitness(f => ({ ...f, [key]: Math.max(0, Number(e.target.value) || 0) }))} />
              </label>
            ))}
          </div>
          <button className="ghost small" onClick={() => setFitness(DEFAULT_FITNESS)}>Start from zero</button>
          {nav(true)}
        </SystemWindow>
      )}

      {step === 'dailies' && (
        <SystemWindow title="Daily quests">
          <p>Pick {MIN_DAILIES}–{MAX_STARTER_DAILIES} dailies to start. Fewer is better; more unlock as you level up. Every quest has a minimum version for bad days.</p>
          <div className="choices">
            {DAILY_TEMPLATES.filter(t => stats.includes(t.stat)).map(t => (
              <button key={t.id} className={`choice ${dailyIds.includes(t.id) ? 'picked' : ''}`} onClick={() => toggleDaily(t.id)} aria-pressed={dailyIds.includes(t.id)}>
                <span className="stat-key">{t.stat}</span>
                <span><b>{t.title}</b><br /><small>Minimum: {t.minVersion}</small></span>
              </button>
            ))}
          </div>
          <p className="muted">{dailyIds.length} of {MAX_STARTER_DAILIES} picked</p>
          {nav(dailyIds.length >= MIN_DAILIES)}
        </SystemWindow>
      )}

      {step === 'main' && (
        <SystemWindow title="Main quests">
          <p>Main quests are big goals cleared in stages over weeks or months. Each stage pays more than a daily, and clearing a whole main quest unlocks S-rank rewards. Pick any you want to start with, or none for now.</p>
          <div className="choices">
            {MAIN_TEMPLATES.filter(t => stats.includes(t.stat)).map(t => (
              <button key={t.id} className={`choice ${mainIds.includes(t.id) ? 'picked' : ''}`} onClick={() => toggle(t.id, setMainIds)} aria-pressed={mainIds.includes(t.id)}>
                <span className="stat-key">{t.stat}</span>
                <span><b>{t.title}</b><br /><small>{t.stages.map(s => s.title).join(' → ')}</small></span>
              </button>
            ))}
          </div>
          <p className="muted">You can add side quests (weekly) and more main quests from the Quests screen later.</p>
          {nav(true)}
        </SystemWindow>
      )}

      {step === 'rewards' && (
        <SystemWindow title="Your reward list">
          <p>What will you spend your Reward Wallet on? Rewards are ranked E–S by price, and higher ranks need a higher level. Keep what fits your life; you can add your own in the Shop.</p>
          <div className="row">
            <button className="chip" onClick={() => setRewardIds(REWARD_TEMPLATES.map(t => t.id))}>Use suggested</button>
            <button className="chip" onClick={() => setRewardIds([])}>Clear all</button>
          </div>
          <div className="choices">
            {REWARD_TEMPLATES.map(t => {
              const rank = rewardRank(t.price)
              return (
                <button key={t.id} className={`choice ${rewardIds.includes(t.id) ? 'picked' : ''}`} onClick={() => toggle(t.id, setRewardIds)} aria-pressed={rewardIds.includes(t.id)}>
                  <span className="stat-key">{rank}</span>
                  <span><b>{t.title}</b> · ${t.price}<br /><small>{t.category}{RANK_MIN_LEVEL[rank] > 1 ? ` · level ${RANK_MIN_LEVEL[rank]}+` : ''}</small></span>
                </button>
              )
            })}
          </div>
          <p className="muted">{rewardIds.length} rewards picked</p>
          {nav(true)}
        </SystemWindow>
      )}

      {step === 'budget' && (
        <SystemWindow title="Rewards and savings">
          <p>Quests pay real dollars into your Reward Wallet. How much can you spend on rewards each month?</p>
          <label>
            Monthly reward budget ($)
            <input type="number" min={0} inputMode="decimal" value={settings.monthlyBudget} onChange={e => patch({ monthlyBudget: Math.max(0, Number(e.target.value) || 0) })} />
          </label>
          <p className="muted">
            About ${dailyPay(settings.monthlyBudget, Math.max(1, dailyIds.length)).toFixed(2)} per daily quest. Doing 80% of your dailies earns the full budget; anything extra goes to the Vault for big rewards.
          </p>
          <p>Pay yourself first: the wallet unlocks only after you hit your monthly savings goal.</p>
          <div className="row">
            {(['fixed', 'percent', 'off'] as const).map(type => (
              <button key={type} className={`chip ${settings.savingsGoal.type === type ? 'picked' : ''}`} onClick={() => patch({ savingsGoal: { ...settings.savingsGoal, type } })}>
                {type === 'fixed' ? 'Fixed amount' : type === 'percent' ? '% of income' : 'No savings gate'}
              </button>
            ))}
          </div>
          {settings.savingsGoal.type !== 'off' && (
            <label>
              {settings.savingsGoal.type === 'fixed' ? 'Save each month ($)' : 'Save this % of income'}
              <input type="number" min={0} inputMode="decimal" value={settings.savingsGoal.amount} onChange={e => patch({ savingsGoal: { ...settings.savingsGoal, amount: Math.max(0, Number(e.target.value) || 0) } })} />
            </label>
          )}
          {nav(true)}
        </SystemWindow>
      )}

      {step === 'difficulty' && (
        <SystemWindow title="Difficulty">
          <p>What happens when you skip quests? You can change this any time.</p>
          <div className="choices">
            {DIFFICULTIES.map(d => (
              <button key={d.key} className={`choice ${settings.difficulty === d.key ? 'picked' : ''}`} onClick={() => patch({ difficulty: d.key })} aria-pressed={settings.difficulty === d.key}>
                <span><b>{d.name}</b><br /><small>{d.text}</small></span>
              </button>
            ))}
          </div>
          {nav(true)}
        </SystemWindow>
      )}

      {step === 'day' && (
        <SystemWindow title="Your day">
          <div className="grid2">
            <label>Wake time<input type="time" value={settings.wakeTime} onChange={e => patch({ wakeTime: e.target.value })} /></label>
            <label>Bedtime<input type="time" value={settings.bedTime} onChange={e => patch({ bedTime: e.target.value })} /></label>
          </div>
          <label>
            Dailies reset at
            <select value={settings.resetHour} onChange={e => patch({ resetHour: Number(e.target.value) })}>
              {Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{formatHour(h)}</option>)}
            </select>
          </label>
          <p className="muted">A quest finished after midnight but before the reset still counts for the day before.</p>
          {nav(true)}
        </SystemWindow>
      )}

      {step === 'status' && (
        <SystemWindow title="Status">
          <dl className="status-list">
            <dt>Name</dt><dd>{name}</dd>
            <dt>Stats</dt><dd>{stats.join(' · ')}</dd>
            <dt>Daily quests</dt><dd>{dailyIds.map(id => DAILY_TEMPLATES.find(t => t.id === id)?.title).join(', ')}</dd>
            <dt>Main quests</dt><dd>{mainIds.map(id => MAIN_TEMPLATES.find(t => t.id === id)?.title).join(', ') || 'None yet'}</dd>
            <dt>Reward budget</dt><dd>${settings.monthlyBudget}/month</dd>
            <dt>Rewards</dt><dd>{rewardIds.length} in your shop</dd>
            <dt>Savings goal</dt><dd>{savingsText(settings)}</dd>
            <dt>Difficulty</dt><dd>{DIFFICULTIES.find(d => d.key === settings.difficulty)?.name}</dd>
            <dt>Daily reset</dt><dd>{formatHour(settings.resetHour)}</dd>
          </dl>
          <div className="row end">
            <button className="ghost" onClick={back}>Back</button>
            <button className="arise" disabled={saving} onClick={finish}>Arise</button>
          </div>
        </SystemWindow>
      )}
    </main>
  )
}

function suggestedFor(stats: StatKey[]): string[] {
  return SUGGESTED_STARTERS.filter(id => stats.includes(DAILY_TEMPLATES.find(t => t.id === id)!.stat)).slice(0, 4)
}

function formatHour(h: number): string {
  const suffix = h < 12 ? 'am' : 'pm'
  const hour = h % 12 === 0 ? 12 : h % 12
  return `${hour}${suffix}`
}

function savingsText(s: PlayerSettings): string {
  if (s.savingsGoal.type === 'off') return 'Off'
  return s.savingsGoal.type === 'fixed' ? `$${s.savingsGoal.amount}/month` : `${s.savingsGoal.amount}% of income`
}

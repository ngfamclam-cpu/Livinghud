import { useEffect, useState, useSyncExternalStore } from 'react'
import type {
  Boss,
  Completion,
  Contact,
  ExerciseSet,
  FocusRun,
  JournalEntry,
  Memory,
  Place,
  Person,
  Plan,
  PlanFund,
  Player,
  PostureScan as Scan,
  Purchase,
  Quest,
  ReportInput,
  Reward,
  SavingsEntry,
  Summary,
  SurpriseClear,
} from '../../engine'
import { featureOn } from '../../engine'
import { getSyncStatus, subscribeSync } from '../../db/sync'
import { Hud } from '../Hud'
import { QuestBoard } from '../QuestBoard'
import { Party } from '../Party'
import { Shop } from '../Shop'
import { Settings } from '../Settings'
import { Workout } from '../Workout'
import { PostureScan } from '../PostureScan'
import { Focus, type FocusPreset } from '../Focus'
import { Journal } from '../Journal'
import { Report } from '../Report'
import { Plans } from '../Plans'
import { LifeLog } from '../lifelog/LifeLog'
import { MemoriesPanel } from './MemoriesPanel'
import { MoneyPanel, ProfileCard, ReportWall, StatTrends, StreakCalendar, Timeline, TrainingPanel } from './panels'
import { setPref, usePrefs, type Look } from './prefs'
import { dailyReminders, enableNotifications, notifySupported } from './notify'
import { Bar } from '../Bar'
import { money } from '../format'

export interface DashData {
  player: Player
  quests: Quest[]
  completions: Completion[]
  rewards: Reward[]
  purchases: Purchase[]
  savings: SavingsEntry[]
  sets: ExerciseSet[]
  scans: Scan[]
  people: Person[]
  contacts: Contact[]
  focusRuns: FocusRun[]
  bosses: Boss[]
  journal: JournalEntry[]
  surprises: SurpriseClear[]
  plans: Plan[]
  planFunds: PlanFund[]
  memories: Memory[]
  places: Place[]
}

type Page = 'dashboard' | 'lifelog' | 'quests' | 'party' | 'shop' | 'plans' | 'journal' | 'report' | 'settings' | 'workout' | 'scan' | 'focus'

const NAV: { key: Page; label: string; icon: string; feature?: Parameters<typeof featureOn>[1] }[] = [
  { key: 'dashboard', label: 'Command centre', icon: '◈' },
  { key: 'quests', label: 'Quests', icon: '❖' },
  { key: 'lifelog', label: 'Life log', icon: '❂', feature: 'memories' },
  { key: 'workout', label: 'Training', icon: '⚔' },
  { key: 'focus', label: 'Focus dungeon', icon: '⧗', feature: 'focus' },
  { key: 'party', label: 'Party', icon: '✦', feature: 'party' },
  { key: 'shop', label: 'Shop', icon: '◆' },
  { key: 'plans', label: 'Plans', icon: '✈', feature: 'plans' },
  { key: 'journal', label: 'Journal', icon: '✎', feature: 'journal' },
  { key: 'report', label: 'Weekly report', icon: '▤', feature: 'report' },
  { key: 'settings', label: 'Settings', icon: '⚙' },
]

/** The PC/browser layout: a sidebar and a fixed command-centre dashboard. Same data, same sync. */
export function Desktop({ data, summary, reportInput, now }: { data: DashData; summary: Summary; reportInput: ReportInput; now: Date }) {
  const { player, quests } = data
  const [page, setPage] = useState<Page>('dashboard')
  const [planId, setPlanId] = useState<string | null>(null)
  const [focusPreset, setFocusPreset] = useState<FocusPreset>({})
  const [logCamera, setLogCamera] = useState(0)
  const prefs = usePrefs()
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus)

  const dailies = quests.filter(q => q.active && q.kind === 'daily')
  const dailiesLeft = dailies.filter(q => !summary.todayDone.has(q.id)).length
  useEffect(() => {
    dailyReminders(summary, dailiesLeft, player.settings.bedTime, now)
  }, [summary, dailiesLeft, player.settings.bedTime, now])

  const openPlans = (id: string | null = null) => {
    setPlanId(id)
    setPage('plans')
  }
  const openFocus = (preset: FocusPreset = {}) => {
    setFocusPreset(preset)
    setPage('focus')
  }
  const home = () => setPage('dashboard')
  const openLog = (camera = false) => {
    setLogCamera(n => (camera ? n + 1 : 0))
    setPage('lifelog')
  }
  const nav = NAV.filter(n => !n.feature || featureOn(player, n.feature))

  return (
    <div className="desk">
      <aside className="desk-side">
        <div className="desk-brand">
          <span className="system-icon" aria-hidden>!</span> LIVING<b>HUD</b>
        </div>
        <div className="desk-me">
          <div className="player-name">{player.name}</div>
          <div className="muted">Level {summary.level.level} · Rank {summary.rank}</div>
          <Bar value={summary.level.xpIntoLevel} max={summary.level.xpForNext} thin />
        </div>
        <nav className="desk-nav" aria-label="Screens">
          {nav.map(n => (
            <button
              key={n.key}
              className={page === n.key || (n.key === 'workout' && page === 'scan') ? 'on' : ''}
              aria-current={page === n.key ? 'page' : undefined}
              onClick={() => (n.key === 'plans' ? openPlans() : n.key === 'focus' ? openFocus() : n.key === 'lifelog' ? openLog() : setPage(n.key))}
            >
              <span className="nav-icon" aria-hidden>{n.icon}</span>
              {n.label}
              {n.key === 'quests' && dailiesLeft > 0 && <span className="nav-count">{dailiesLeft}</span>}
            </button>
          ))}
        </nav>
        <div className="desk-controls">
          <div className="look-switch" role="group" aria-label="Look">
            {(['system', 'clean'] as Look[]).map(l => (
              <button key={l} className={prefs.look === l ? 'on' : ''} aria-pressed={prefs.look === l} onClick={() => setPref('look', l)}>
                {l === 'system' ? 'System' : 'Clean'}
              </button>
            ))}
          </div>
          {notifySupported() && (
            <button className="ghost small" onClick={() => (prefs.notify ? setPref('notify', false) : void enableNotifications())}>
              {prefs.notify ? '🔔 Notifications on' : '🔕 Turn on notifications'}
            </button>
          )}
          <button className="ghost small" onClick={() => setPref('layout', 'phone')}>Phone layout</button>
          <p className={`muted sync-dot ${sync.state}`}>{sync.state === 'synced' ? 'Synced with your phone' : sync.state === 'syncing' ? 'Syncing…' : sync.state === 'offline' ? 'Offline: saved here' : 'Not synced'}</p>
        </div>
      </aside>

      <div className="desk-main">
        {page === 'dashboard' && (
          <>
            <TopStrip data={data} summary={summary} dailiesLeft={dailiesLeft} dailies={dailies.length} now={now} />
            <div className="dash-grid">
              <div className="dash-col">
                <ProfileCard data={data} summary={summary} />
                <StreakCalendar data={data} summary={summary} />
                <StatTrends data={data} summary={summary} />
              </div>
              <div className="dash-col dash-centre">
                <Hud
                  desktop
                  player={player}
                  quests={quests}
                  summary={summary}
                  onStartWorkout={() => setPage('workout')}
                  onFocus={() => openFocus()}
                  onJournal={() => setPage('journal')}
                  journaledToday={data.journal.some(e => e.day === summary.today)}
                  onReport={() => setPage('report')}
                  surprises={data.surprises}
                  now={now}
                  onPlans={openPlans}
                  memories={data.memories}
                  onLifeLog={openLog}
                />
              </div>
              <div className="dash-col">
                {featureOn(player, 'memories') && <MemoriesPanel data={data} summary={summary} onOpen={() => openLog()} onCamera={() => openLog(true)} />}
                <MoneyPanel data={data} summary={summary} onPlans={openPlans} onShop={() => setPage('shop')} />
                <TrainingPanel data={data} summary={summary} onWorkout={() => setPage('workout')} onScan={() => setPage('scan')} />
                {featureOn(player, 'report') && <ReportWall input={reportInput} summary={summary} onReport={() => setPage('report')} />}
                <Timeline data={data} />
              </div>
            </div>
          </>
        )}
        <div className="desk-page">
          {page === 'lifelog' && (
            <LifeLog key={logCamera} data={data} summary={summary} startCamera={logCamera > 0} onJournal={() => setPage('journal')} onClose={() => { setLogCamera(0); home() }} />
          )}
          {page === 'quests' && <QuestBoard player={player} quests={quests} summary={summary} onFight={bossId => openFocus({ bossId })} />}
          {page === 'party' && <Party summary={summary} contacts={data.contacts} />}
          {page === 'shop' && <Shop player={player} rewards={data.rewards} purchases={data.purchases} savings={data.savings} summary={summary} onPlans={() => openPlans()} />}
          {page === 'settings' && <Settings player={player} quests={quests} summary={summary} onClose={home} />}
          {page === 'workout' && <Workout summary={summary} sets={data.sets} player={player} onClose={home} onScan={() => setPage('scan')} />}
          {page === 'scan' && <PostureScan scans={data.scans} onClose={() => setPage('workout')} />}
          {page === 'plans' && <Plans summary={summary} openId={planId} onClose={home} />}
          {page === 'report' && <Report summary={summary} input={reportInput} onClose={home} />}
          {page === 'journal' && <Journal summary={summary} entries={data.journal} completions={data.completions} quests={quests} onClose={home} />}
          {page === 'focus' && <Focus player={player} quests={quests} summary={summary} runs={data.focusRuns} preset={focusPreset} onClose={home} />}
        </div>
      </div>
    </div>
  )
}

function TopStrip({ data, summary, dailiesLeft, dailies, now }: { data: DashData; summary: Summary; dailiesLeft: number; dailies: number; now: Date }) {
  const done = dailies - dailiesLeft
  const pct = dailies ? done / dailies : 0
  const hour = now.getHours()
  const greeting = hour < 5 ? 'Still up' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'
  const R = 26
  const C = 2 * Math.PI * R
  return (
    <header className="top-strip">
      <div className="strip-greet">
        <div className="muted">{now.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</div>
        <h1>{greeting}, {data.player.name}.</h1>
        <div className="system-line">
          {dailies === 0 ? 'No daily quests yet.' : dailiesLeft === 0 ? 'All daily quests cleared. Rest well.' : `${dailiesLeft} daily quest${dailiesLeft === 1 ? '' : 's'} remain${dailiesLeft === 1 ? 's' : ''}.`}
          {summary.recoveryToday && ' Recovery Day: streaks protected.'}
        </div>
      </div>
      <div className="strip-ring" aria-label={`${done} of ${dailies} dailies done`}>
        <svg viewBox="0 0 64 64">
          <circle className="ring-track" cx="32" cy="32" r={R} />
          <circle className="ring-fill" cx="32" cy="32" r={R} strokeDasharray={`${C * pct} ${C}`} transform="rotate(-90 32 32)" />
        </svg>
        <span>{done}/{dailies}</span>
      </div>
      <div className="strip-stat"><span className="muted">Today</span><b>{Math.round(pct * 100)}%</b></div>
      <div className="strip-stat"><span className="muted">30-day</span><b>{Math.round(summary.completionRate * 100)}%</b></div>
      <div className="strip-stat"><span className="muted">Focus today</span><b>{summary.focusToday} min</b></div>
      <div className="strip-stat"><span className="muted">Wallet</span><b>{money(summary.wallet.available)}</b></div>
      <div className="strip-clock">{now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
    </header>
  )
}

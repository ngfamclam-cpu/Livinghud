import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { summarize } from './engine'
import { db, LOCAL_USER } from './db/db'
import { Onboarding } from './ui/Onboarding'
import { Hud } from './ui/Hud'
import { QuestBoard } from './ui/QuestBoard'
import { Shop } from './ui/Shop'
import { Settings } from './ui/Settings'
import { SystemToasts } from './ui/SystemToasts'
import { Workout } from './ui/Workout'
import { PostureScan } from './ui/PostureScan'
import { Party } from './ui/Party'
import { Focus, type FocusPreset } from './ui/Focus'
import { Journal } from './ui/Journal'
import { Report } from './ui/Report'
import { Plans } from './ui/Plans'
import { Briefing } from './ui/Briefing'
import { briefingSeen } from './ui/briefingSeen'
import { dayKey, featureOn } from './engine'
import { Desktop } from './ui/desktop/Desktop'
import { setPref, usePrefs, useWide } from './ui/desktop/prefs'

type Tab = 'hud' | 'quests' | 'party' | 'shop' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'hud', label: 'Status' },
  { key: 'quests', label: 'Quests' },
  { key: 'party', label: 'Party' },
  { key: 'shop', label: 'Shop' },
  { key: 'settings', label: 'Settings' },
]

export default function App() {
  const now = useNow()
  const [tab, setTab] = useState<Tab>('hud')
  const [screen, setScreen] = useState<'workout' | 'scan' | 'focus' | 'journal' | 'report' | 'plans' | null>(null)
  const [planId, setPlanId] = useState<string | null>(null)
  const [briefingDone, setBriefingDone] = useState(false)
  const [focusPreset, setFocusPreset] = useState<FocusPreset>({})
  const wide = useWide()
  const prefs = usePrefs()
  useEffect(() => {
    document.documentElement.dataset.look = prefs.look
  }, [prefs.look])
  const data = useLiveQuery(async () => {
    const [player, quests, completions, rewards, purchases, savings, sets, scans, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds] = await Promise.all([
      db.players.get(LOCAL_USER),
      db.quests.where('userId').equals(LOCAL_USER).toArray(),
      db.completions.where('userId').equals(LOCAL_USER).toArray(),
      db.rewards.where('userId').equals(LOCAL_USER).toArray(),
      db.purchases.where('userId').equals(LOCAL_USER).toArray(),
      db.savings.where('userId').equals(LOCAL_USER).toArray(),
      db.sets.where('userId').equals(LOCAL_USER).toArray(),
      db.scans.where('userId').equals(LOCAL_USER).toArray(),
      db.people.where('userId').equals(LOCAL_USER).toArray(),
      db.contacts.where('userId').equals(LOCAL_USER).toArray(),
      db.focusRuns.where('userId').equals(LOCAL_USER).toArray(),
      db.bosses.where('userId').equals(LOCAL_USER).toArray(),
      db.journal.where('userId').equals(LOCAL_USER).toArray(),
      db.surprises.where('userId').equals(LOCAL_USER).toArray(),
      db.plans.where('userId').equals(LOCAL_USER).toArray(),
      db.planFunds.where('userId').equals(LOCAL_USER).toArray(),
    ])
    return { player, quests, completions, rewards, purchases, savings, sets, scans, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds }
  })

  if (!data) return null
  if (!data.player) {
    return (
      <>
        <Onboarding />
        <SystemToasts />
      </>
    )
  }

  const { player, quests, rewards, purchases, savings, sets, people, contacts, focusRuns, bosses } = data
  const summary = summarize(player, quests, data.completions, now, { purchases, savings, sets, people, contacts, focusRuns, bosses, journal: data.journal, surprises: data.surprises, plans: data.plans, planFunds: data.planFunds })
  const reportInput = {
    stats: player.stats,
    quests,
    completions: data.completions,
    purchases,
    contacts,
    focusRuns,
    bosses,
    journal: data.journal,
    restDays: summary.restDays,
    resetHour: player.settings.resetHour,
    weakening: summary.party.filter(b => b.weakening).map(b => b.person.name),
  }
  // Not on signup day: the Awakening already says hello.
  const signupDay = dayKey(new Date(player.createdAt), player.settings.resetHour) === summary.today
  const showBriefing = !briefingDone && !signupDay && featureOn(player, 'briefing') && !briefingSeen(summary.today)
  const openPlans = (id: string | null = null) => {
    setPlanId(id)
    setScreen('plans')
  }
  const openFocus = (preset: FocusPreset = {}) => {
    setFocusPreset(preset)
    setScreen('focus')
  }
  const theme = <ThemeApplier theme={featureOn(player, 'loot') && player.theme && summary.themes.includes(player.theme) ? player.theme : 'system'} />
  const briefing = showBriefing && (
    <Briefing player={player} quests={quests} summary={summary} onClose={() => setBriefingDone(true)} onReport={() => { setBriefingDone(true); setScreen('report') }} />
  )

  if (wide && prefs.layout !== 'phone') {
    return (
      <>
        <Desktop data={{ ...data, player }} summary={summary} reportInput={reportInput} now={now} />
        {showBriefing && <Briefing player={player} quests={quests} summary={summary} onClose={() => setBriefingDone(true)} onReport={() => setBriefingDone(true)} />}
        <SystemToasts />
        {theme}
      </>
    )
  }

  const tabs = TABS.filter(t => t.key !== 'party' || featureOn(player, 'party'))
  const current = tabs.some(t => t.key === tab) ? tab : 'hud'

  if (screen) {
    return (
      <>
        {screen === 'workout' && (
          <Workout summary={summary} sets={sets} player={player} onClose={() => setScreen(null)} onScan={() => setScreen('scan')} />
        )}
        {screen === 'scan' && <PostureScan scans={data.scans} onClose={() => setScreen('workout')} />}
        {screen === 'plans' && <Plans summary={summary} openId={planId} onClose={() => setScreen(null)} />}
        {screen === 'report' && <Report summary={summary} input={reportInput} onClose={() => setScreen(null)} />}
        {screen === 'journal' && (
          <Journal summary={summary} entries={data.journal} completions={data.completions} quests={quests} onClose={() => setScreen(null)} />
        )}
        {screen === 'focus' && (
          <Focus player={player} quests={quests} summary={summary} runs={focusRuns} preset={focusPreset} onClose={() => setScreen(null)} />
        )}
        <SystemToasts />
        {theme}
      </>
    )
  }

  return (
    <>
      <nav className="tabs" aria-label="Screens">
        {tabs.map(t => (
          <button key={t.key} className={current === t.key ? 'on' : ''} aria-current={current === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
        {wide && <button onClick={() => setPref('layout', 'auto')}>PC dashboard</button>}
      </nav>
      {current === 'party' && <Party summary={summary} contacts={contacts} />}
      {current === 'hud' && <Hud player={player} quests={quests} summary={summary} onStartWorkout={() => setScreen('workout')} onFocus={() => openFocus()} onJournal={() => setScreen('journal')} journaledToday={data.journal.some(e => e.day === summary.today)} onReport={() => setScreen('report')} surprises={data.surprises} now={now} onPlans={openPlans} />}
      {current === 'quests' && <QuestBoard player={player} quests={quests} summary={summary} onFight={bossId => openFocus({ bossId })} />}
      {current === 'shop' && <Shop player={player} rewards={rewards} purchases={purchases} savings={savings} summary={summary} onPlans={() => openPlans()} />}
      {current === 'settings' && <Settings player={player} quests={quests} summary={summary} onClose={() => setTab('hud')} />}
      {briefing}
      <SystemToasts />
      {theme}
    </>
  )
}

/** Puts the equipped loot theme on the page (CSS picks colours from data-theme). */
function ThemeApplier({ theme }: { theme: string }) {
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return null
}

/** Re-renders every minute so dailies reset at the right time without a reload. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

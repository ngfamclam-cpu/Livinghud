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
import { LifeLog } from './ui/lifelog/LifeLog'
import { GoalsView } from './ui/goals/GoalsView'
import { Finance } from './ui/finance/Finance'
import { Collection, LootReveal } from './ui/loot/Loot'
import { RankUp } from './ui/RankUp'
import { SkillsScreen } from './ui/Skills'
import { Briefing } from './ui/Briefing'
import { briefingSeen } from './ui/briefingSeen'
import { customCard, dayKey, featureOn, setCustomCards, shopLock } from './engine'
import { pushPenaltyStatus } from './db/triggers'
import { Desktop } from './ui/desktop/Desktop'
import { CustomizeHud, MoreMenu, type MoreItem } from './ui/More'
import { RewardsScreen } from './ui/extras/Extras'
import { Search } from './ui/Search'
import type { SearchTarget } from './engine'
import { setPref, usePrefs, useWide } from './ui/desktop/prefs'

type Tab = 'hud' | 'quests' | 'log' | 'shop' | 'more'

const TABS: { key: Tab; label: string }[] = [
  { key: 'hud', label: 'Today' },
  { key: 'quests', label: 'Quests' },
  { key: 'log', label: 'Log' },
  { key: 'shop', label: 'Shop' },
  { key: 'more', label: 'More' },
]

export default function App() {
  const now = useNow()
  const [tab, setTab] = useState<Tab>('hud')
  const [screen, setScreen] = useState<'skills' | 'workout' | 'scan' | 'focus' | 'journal' | 'report' | 'plans' | 'goals' | 'collection' | 'finance' | 'party' | 'settings' | 'customize' | 'rewards' | 'search' | null>(null)
  const [logCamera, setLogCamera] = useState(0)
  const [planId, setPlanId] = useState<string | null>(null)
  const [briefingDone, setBriefingDone] = useState(false)
  const [focusPreset, setFocusPreset] = useState<FocusPreset>({})
  const wide = useWide()
  const prefs = usePrefs()
  useEffect(() => {
    document.documentElement.dataset.look = prefs.look
  }, [prefs.look])
  const data = useLiveQuery(async () => {
    const [player, quests, completions, rewards, purchases, savings, sets, scans, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds, memories, places, goals, loot, customCards, transactions, bills, penaltyClears, bonuses] = await Promise.all([
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
      db.memories.where('userId').equals(LOCAL_USER).toArray(),
      db.places.where('userId').equals(LOCAL_USER).toArray(),
      db.goals.where('userId').equals(LOCAL_USER).toArray(),
      db.loot.where('userId').equals(LOCAL_USER).toArray(),
      db.customCards.where('userId').equals(LOCAL_USER).toArray(),
      db.transactions.where('userId').equals(LOCAL_USER).toArray(),
      db.bills.where('userId').equals(LOCAL_USER).toArray(),
      db.penaltyClears.where('userId').equals(LOCAL_USER).toArray(),
      db.bonuses.where('userId').equals(LOCAL_USER).toArray(),
    ])
    // Your own cards join the card set before anything reads it.
    setCustomCards(customCards.map(customCard))
    return { player, quests, completions, rewards, purchases, savings, sets, scans, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds, memories, places, goals, loot, customCards, transactions, bills, penaltyClears, bonuses }
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
  const summary = summarize(player, quests, data.completions, now, { purchases, savings, sets, people, contacts, focusRuns, bosses, journal: data.journal, surprises: data.surprises, plans: data.plans, planFunds: data.planFunds, memories: data.memories, places: data.places, loot: data.loot, transactions: data.transactions, penaltyClears: data.penaltyClears, bonuses: data.bonuses })
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
    goals: data.goals,
    transactions: data.transactions,
    finance: player.finance,
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
  const lock = shopLock(summary.incentives, player.incentives, featureOn(player, 'penaltyQuest'))
  const theme = (
    <>
      <ThemeApplier theme={featureOn(player, 'loot') && player.theme && summary.themes.includes(player.theme) ? player.theme : 'system'} />
      <PenaltyStatusSync locked={!!lock} task={lock ? (summary.incentives?.penalty?.task ?? '') : ''} />
    </>
  )
  const briefing = showBriefing && (
    <Briefing player={player} quests={quests} summary={summary} onClose={() => setBriefingDone(true)} onReport={() => { setBriefingDone(true); setScreen('report') }} />
  )

  if (wide && prefs.layout !== 'phone') {
    return (
      <>
        <Desktop data={{ ...data, player }} summary={summary} reportInput={reportInput} now={now} />
        {showBriefing && <Briefing player={player} quests={quests} summary={summary} onClose={() => setBriefingDone(true)} onReport={() => setBriefingDone(true)} />}
        <SystemToasts />
        {featureOn(player, 'cards') && <LootReveal />}
        <RankUp rank={summary.progression.hunter.rank} />
        {theme}
      </>
    )
  }

  const openLog = (camera = false) => {
    setLogCamera(n => (camera ? n + 1 : 0))
    setScreen(null)
    setTab('log')
  }
  // A search result opens the screen it came from.
  const openFromSearch = (target: SearchTarget, id?: string) => {
    const tabFor: Partial<Record<SearchTarget, Tab>> = { quests: 'quests', shop: 'shop' }
    if (target === 'lifelog') return openLog()
    if (target === 'plans') return openPlans(id ?? null)
    if (target === 'focus') return openFocus()
    if (tabFor[target]) {
      setScreen(null)
      setTab(tabFor[target]!)
      return
    }
    setScreen(target as 'journal' | 'goals' | 'finance' | 'party' | 'collection' | 'rewards')
  }
  const tabs = TABS.filter(t => t.key !== 'log' || featureOn(player, 'memories'))
  const current = tabs.some(t => t.key === tab) ? tab : 'hud'

  const moreItems: MoreItem[] = [
    { key: 'search', label: 'Search', hint: 'Everything you’ve written or logged', open: () => setScreen('search') },
    { key: 'skills', label: 'Skills & Hunter rank', hint: summary.progression.pointsLeft > 0 ? `${summary.progression.pointsLeft} skill point${summary.progression.pointsLeft === 1 ? '' : 's'} to spend` : 'Skill tree, rank, avatar', open: () => setScreen('skills') },
    featureOn(player, 'party') && { key: 'party', label: 'Party', hint: 'Friends, family, bonds', open: () => setScreen('party') },
    featureOn(player, 'finance') && { key: 'finance', label: 'Finances', hint: 'Spending, bills, reports', open: () => setScreen('finance') },
    (featureOn(player, 'extras') || featureOn(player, 'legion')) && { key: 'rewards', label: 'Rewards & Legion', hint: 'Coupons, job changes, secrets', open: () => setScreen('rewards') },
    featureOn(player, 'cards') && { key: 'collection', label: 'Card collection', hint: 'Your binder', open: () => setScreen('collection') },
    featureOn(player, 'plans') && { key: 'plans', label: 'Plans', hint: 'Raves, festivals, trips', open: () => openPlans() },
    featureOn(player, 'journal') && { key: 'journal', label: 'Journal', hint: 'Today’s reflection', open: () => setScreen('journal') },
    { key: 'goals', label: 'Top 3 history', hint: 'Goals and stats', open: () => setScreen('goals') },
    featureOn(player, 'focus') && { key: 'focus', label: 'Focus dungeon', hint: 'Timed focus, bosses', open: () => openFocus() },
    featureOn(player, 'report') && { key: 'report', label: 'Weekly report', hint: 'Your grade this week', open: () => setScreen('report') },
    { key: 'workout', label: 'Workout', hint: 'Training and posture', open: () => setScreen('workout') },
    { key: 'customize', label: 'Customize HUD', hint: 'What shows on Today', open: () => setScreen('customize') },
    { key: 'settings', label: 'Settings', hint: 'Features, sync, penalties', open: () => setScreen('settings') },
  ].filter((i): i is MoreItem => !!i)

  if (screen) {
    return (
      <>
        {screen === 'workout' && (
          <Workout summary={summary} sets={sets} player={player} onClose={() => setScreen(null)} onScan={() => setScreen('scan')} />
        )}
        {screen === 'scan' && <PostureScan scans={data.scans} onClose={() => setScreen('workout')} />}
        {screen === 'party' && (
          <>
            <div className="row end back-bar"><button className="ghost small" onClick={() => setScreen(null)}>Back</button></div>
            <Party summary={summary} contacts={contacts} />
          </>
        )}
        {screen === 'settings' && <Settings player={player} quests={quests} summary={summary} onClose={() => setScreen(null)} />}
        {screen === 'customize' && <CustomizeHud onClose={() => setScreen(null)} />}
        {screen === 'search' && <Search data={data} onOpen={openFromSearch} onClose={() => setScreen(null)} />}
        {screen === 'skills' && <SkillsScreen player={player} summary={summary} onClose={() => setScreen(null)} />}
        {screen === 'rewards' && <RewardsScreen player={player} summary={summary} quests={quests} onClose={() => setScreen(null)} />}
        {screen === 'finance' && <Finance summary={summary} finance={player.finance} transactions={data.transactions} bills={data.bills} onClose={() => setScreen(null)} />}
        {screen === 'collection' && <Collection player={player} summary={summary} loot={data.loot} custom={data.customCards} onClose={() => setScreen(null)} />}
        {screen === 'goals' && (
          <main className="hud">
            <div className="row end"><button className="ghost small" onClick={() => setScreen(null)}>Back</button></div>
            <GoalsView goals={data.goals} summary={summary} />
          </main>
        )}
        {screen === 'plans' && <Plans summary={summary} openId={planId} onClose={() => setScreen(null)} />}
        {screen === 'report' && <Report summary={summary} input={reportInput} onClose={() => setScreen(null)} />}
        {screen === 'journal' && (
          <Journal player={player} summary={summary} entries={data.journal} completions={data.completions} quests={quests} goals={data.goals} onClose={() => setScreen(null)} />
        )}
        {screen === 'focus' && (
          <Focus player={player} quests={quests} summary={summary} runs={focusRuns} preset={focusPreset} onClose={() => setScreen(null)} />
        )}
        <SystemToasts />
        {featureOn(player, 'cards') && <LootReveal />}
        <RankUp rank={summary.progression.hunter.rank} />
        {theme}
      </>
    )
  }

  return (
    <>
      <nav className="tabs" aria-label="Screens">
        {tabs.map(t => (
          <button key={t.key} className={current === t.key ? 'on' : ''} aria-current={current === t.key ? 'page' : undefined} onClick={() => { if (t.key === 'log') setLogCamera(0); setTab(t.key) }}>
            {t.label}
          </button>
        ))}
        <button className="tab-search" aria-label="Search everything" onClick={() => setScreen('search')}>🔍</button>
        {wide && <button onClick={() => setPref('layout', 'auto')}>PC dashboard</button>}
      </nav>
      {current === 'log' && (
        <LifeLog key={logCamera} data={{ ...data, player }} summary={summary} startCamera={logCamera > 0} onJournal={() => setScreen('journal')} onClose={() => { setLogCamera(0); setTab('hud') }} />
      )}
      {current === 'hud' && <Hud player={player} quests={quests} summary={summary} onStartWorkout={() => setScreen('workout')} onFocus={() => openFocus()} onJournal={() => setScreen('journal')} journaledToday={data.journal.some(e => e.day === summary.today)} onReport={() => setScreen('report')} surprises={data.surprises} now={now} onPlans={openPlans} memories={data.memories} onLifeLog={openLog} goals={data.goals} onGoals={() => setScreen('goals')} loot={data.loot} onCollection={() => setScreen('collection')} transactions={data.transactions} bills={data.bills} onFinance={() => setScreen('finance')} onCustomize={() => setScreen('customize')} onRewards={() => setScreen('rewards')} onSkills={() => setScreen('skills')} />}
      {current === 'quests' && <QuestBoard player={player} quests={quests} completions={data.completions} summary={summary} onFight={bossId => openFocus({ bossId })} />}
      {current === 'shop' && <Shop player={player} rewards={rewards} purchases={purchases} savings={savings} summary={summary} onPlans={() => openPlans()} />}
      {current === 'more' && <MoreMenu items={moreItems} />}
      {briefing}
      <SystemToasts />
      {featureOn(player, 'cards') && <LootReveal />}
        <RankUp rank={summary.progression.hunter.rank} />
      {theme}
    </>
  )
}

/** Keeps the phone game-lock link in step with the Penalty Zone (sends only on change). */
function PenaltyStatusSync({ locked, task }: { locked: boolean; task: string }) {
  useEffect(() => {
    void pushPenaltyStatus(locked, task)
  }, [locked, task])
  return null
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

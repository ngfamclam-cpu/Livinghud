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
import { featureOn } from './engine'

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
  const [screen, setScreen] = useState<'workout' | 'scan' | null>(null)
  const data = useLiveQuery(async () => {
    const [player, quests, completions, rewards, purchases, savings, sets, scans, people, contacts] = await Promise.all([
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
    ])
    return { player, quests, completions, rewards, purchases, savings, sets, scans, people, contacts }
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

  const { player, quests, rewards, purchases, savings, sets, people, contacts } = data
  const summary = summarize(player, quests, data.completions, now, { purchases, savings, sets, people, contacts })
  const tabs = TABS.filter(t => t.key !== 'party' || featureOn(player, 'party'))
  const current = tabs.some(t => t.key === tab) ? tab : 'hud'

  if (screen) {
    return (
      <>
        {screen === 'workout' ? (
          <Workout summary={summary} sets={sets} player={player} onClose={() => setScreen(null)} onScan={() => setScreen('scan')} />
        ) : (
          <PostureScan scans={data.scans} onClose={() => setScreen('workout')} />
        )}
        <SystemToasts />
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
      </nav>
      {current === 'party' && <Party summary={summary} contacts={contacts} />}
      {current === 'hud' && <Hud player={player} quests={quests} summary={summary} onStartWorkout={() => setScreen('workout')} />}
      {current === 'quests' && <QuestBoard player={player} quests={quests} summary={summary} />}
      {current === 'shop' && <Shop player={player} rewards={rewards} purchases={purchases} savings={savings} summary={summary} />}
      {current === 'settings' && <Settings player={player} quests={quests} onClose={() => setTab('hud')} />}
      <SystemToasts />
    </>
  )
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

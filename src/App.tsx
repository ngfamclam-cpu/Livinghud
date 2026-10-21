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

type Tab = 'hud' | 'quests' | 'shop' | 'settings'

const TABS: { key: Tab; label: string }[] = [
  { key: 'hud', label: 'Status' },
  { key: 'quests', label: 'Quests' },
  { key: 'shop', label: 'Shop' },
  { key: 'settings', label: 'Settings' },
]

export default function App() {
  const now = useNow()
  const [tab, setTab] = useState<Tab>('hud')
  const data = useLiveQuery(async () => {
    const [player, quests, completions, rewards, purchases, savings] = await Promise.all([
      db.players.get(LOCAL_USER),
      db.quests.where('userId').equals(LOCAL_USER).toArray(),
      db.completions.where('userId').equals(LOCAL_USER).toArray(),
      db.rewards.where('userId').equals(LOCAL_USER).toArray(),
      db.purchases.where('userId').equals(LOCAL_USER).toArray(),
      db.savings.where('userId').equals(LOCAL_USER).toArray(),
    ])
    return { player, quests, completions, rewards, purchases, savings }
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

  const { player, quests, rewards, purchases, savings } = data
  const summary = summarize(player, quests, data.completions, now, { purchases, savings })

  return (
    <>
      <nav className="tabs" aria-label="Screens">
        {TABS.map(t => (
          <button key={t.key} className={tab === t.key ? 'on' : ''} aria-current={tab === t.key ? 'page' : undefined} onClick={() => setTab(t.key)}>
            {t.label}
          </button>
        ))}
      </nav>
      {tab === 'hud' && <Hud player={player} quests={quests} summary={summary} />}
      {tab === 'quests' && <QuestBoard player={player} quests={quests} summary={summary} />}
      {tab === 'shop' && <Shop player={player} rewards={rewards} purchases={purchases} savings={savings} summary={summary} />}
      {tab === 'settings' && <Settings player={player} onClose={() => setTab('hud')} />}
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

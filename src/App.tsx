import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { summarize } from './engine'
import { db, LOCAL_USER } from './db/db'
import { Onboarding } from './ui/Onboarding'
import { Hud } from './ui/Hud'
import { SystemToasts } from './ui/SystemToasts'

export default function App() {
  const now = useNow()
  const data = useLiveQuery(async () => ({
    player: await db.players.get(LOCAL_USER),
    quests: await db.quests.where('userId').equals(LOCAL_USER).toArray(),
    completions: await db.completions.where('userId').equals(LOCAL_USER).toArray(),
  }))

  if (!data) return null

  return (
    <>
      {data.player ? (
        <Hud player={data.player} quests={data.quests} summary={summarize(data.player, data.quests, data.completions, now)} />
      ) : (
        <Onboarding />
      )}
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

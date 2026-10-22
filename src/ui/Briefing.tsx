import { DAY_NAMES, NORMAL_XP_PER_MISS, daysBetween, dayKey, featureOn, type Player, type Quest, type Summary } from '../engine'
import { SystemWindow } from './SystemWindow'

const KEY = 'livinghud-briefing'

/** Whether today's briefing has been seen on this device. */
export function briefingSeen(today: string): boolean {
  try {
    return localStorage.getItem(KEY) === today
  } catch {
    return true
  }
}

function markSeen(today: string) {
  try {
    localStorage.setItem(KEY, today)
  } catch {
    /* storage blocked: it just shows again next time */
  }
}

/** The morning briefing: what today holds, the first time the app opens each day. */
export function Briefing({ player, quests, summary, onClose, onReport }: {
  player: Player
  quests: Quest[]
  summary: Summary
  onClose: () => void
  onReport: () => void
}) {
  const day = daysBetween(dayKey(new Date(player.createdAt), player.settings.resetHour), summary.today) + 1
  const dailies = quests.filter(q => q.kind === 'daily' && q.active)
  const left = dailies.filter(q => !summary.todayDone.has(q.id))
  const sides = quests.filter(q => q.kind === 'side' && q.active && !summary.weekDone.has(q.id))
  const hasRoutine = quests.some(q => q.active && q.templateId === 'str-routine')
  const boss = featureOn(player, 'bosses') ? summary.bosses.find(b => !b.boss.defeatedAt) : undefined
  const bonds = featureOn(player, 'party') ? summary.party.filter(b => b.weakening).map(b => b.person.name) : []
  const atRisk = dailies
    .filter(q => !summary.todayDone.has(q.id) && (summary.streaks.get(q.id) ?? 0) >= 3)
    .sort((a, b) => (summary.streaks.get(b.id) ?? 0) - (summary.streaks.get(a.id) ?? 0))
    .slice(0, 2)
  const toCap = Math.max(0, summary.wallet.budget - summary.wallet.earned)
  const monday = summary.today === summary.week && featureOn(player, 'report')
  const close = () => {
    markSeen(summary.today)
    onClose()
  }

  const lines: string[] = []
  if (summary.recoveryToday) lines.push('Recovery Day: hydrate, eat well, rest. Your streaks are safe.')
  if (hasRoutine) lines.push(`Training: ${DAY_NAMES[summary.routine.kind]} day${summary.routine.kind === 'rest' ? ' (posture only)' : ''}.`)
  lines.push(left.length ? `${left.length} daily quest${left.length === 1 ? '' : 's'} today.` : 'All dailies already clear.')
  if (sides.length) lines.push(`${sides.length} side quest${sides.length === 1 ? '' : 's'} left this week.`)
  for (const q of atRisk) lines.push(`Protect your ${summary.streaks.get(q.id)}-day streak: ${q.title}.`)
  if (boss) lines.push(`Boss: ${boss.boss.name}, ${boss.hpLeft}/${boss.boss.hp} HP.`)
  if (bonds.length) lines.push(`Bond weakening: ${bonds.slice(0, 3).join(', ')}.`)
  if (summary.penalty?.hp != null) lines.push(`HP ${summary.penalty.hp}/100.`)
  const missed = summary.penalty?.missedYesterday ?? 0
  if (missed > 0 && player.settings.difficulty === 'normal') lines.push(`Yesterday's ${missed} missed dail${missed === 1 ? 'y' : 'ies'} cost ${missed * NORMAL_XP_PER_MISS} XP.`)
  if (toCap > 0) lines.push(`$${toCap.toFixed(2)} left to fill this month's wallet.`)

  return (
    <div className="overlay" role="dialog" aria-modal="true" aria-label="Morning briefing">
      <SystemWindow title="Notification" className="briefing">
        <p className="system-line">Good {greeting()}, {player.name}. Day {day} of your training.</p>
        <ul className="briefing-list">
          {lines.map(l => <li key={l}>{l}</li>)}
        </ul>
        <div className="row end">
          {monday && <button className="ghost" onClick={() => { markSeen(summary.today); onReport() }}>Weekly report</button>}
          <button className="arise" onClick={close}>Begin</button>
        </div>
      </SystemWindow>
    </div>
  )
}

function greeting(): string {
  const h = new Date().getHours()
  return h < 12 ? 'morning' : h < 18 ? 'afternoon' : 'evening'
}

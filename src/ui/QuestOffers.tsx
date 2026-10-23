import {
  OFFER_KIND_NAMES,
  SIDE_OFFER_DAYS,
  addDays,
  dayKey,
  daysBetween,
  mainOffers,
  sideOffers,
  sideWindow,
  statScores,
  type Completion,
  type OfferKind,
  type Player,
  type Quest,
  type Summary,
} from '../engine'
import { addMainFromTemplate, addSideFromTemplate, surpriseSeed } from '../db/actions'
import { SystemWindow } from './SystemWindow'

const until = (from: string, to: string) => {
  const n = daysBetween(from, to)
  return n <= 1 ? 'tomorrow' : `in ${n} days`
}

/** The System's rotating offers: new side quests every 3 days, big main quests every Monday. */
export function QuestOffers({ player, quests, completions, summary }: { player: Player; quests: Quest[]; completions: Completion[]; summary: Summary }) {
  const resetHour = player.settings.resetHour
  const startDay = dayKey(new Date(player.createdAt), resetHour)
  const dailies = quests.filter(q => q.kind === 'daily' && q.active)
  // Scores from before each window opened, so the offers don't reshuffle while you play.
  const scoresOn = (day: string) => (day < startDay ? summary.stats : statScores(player, dailies, completions, summary.restDays, day, startDay).stats)
  const owned = new Map<string, string>()
  for (const q of quests) if (q.active && q.templateId) owned.set(q.templateId, dayKey(new Date(q.createdAt), resetHour))

  const seed = surpriseSeed(player)
  const daysSinceStart = daysBetween(startDay, summary.today)
  const window = sideWindow(daysSinceStart, summary.today, addDays)
  const sides = sideOffers({ seed, daysSinceStart, stats: player.stats, scores: scoresOn(addDays(window.startedOn, -1)), owned }, addDays, summary.today)
  const mains = mainOffers({ seed, week: summary.week, stats: player.stats, scores: scoresOn(addDays(summary.week, -1)), owned }, addDays)
  const have = (id: string) => owned.has(id)

  return (
    <>
      <SystemWindow title="Side quest offers" className="offers">
        <p className="muted">
          A fresh set every {SIDE_OFFER_DAYS} days, picked for you and your weakest stats. Next set {until(summary.today, sides.nextOn)}. Add any to your side quests; they reset on Mondays like the rest.
        </p>
        <ul className="offer-list-board">
          {sides.offers.map(o => (
            <li key={o.id} className={`offer-card kind-${o.kind} ${have(o.id) ? 'added' : ''}`}>
              <div className="offer-top">
                <span className="stat-key">{o.stat}</span>
                <span className={`offer-kind ${o.kind}`}>{OFFER_KIND_NAMES[o.kind as OfferKind]}</span>
              </div>
              <b>{o.title}</b>
              <p className="muted">{o.description}</p>
              <div className="row">
                <small className="muted grow">Minimum: {o.minVersion}</small>
                {have(o.id) ? <span className="cleared">ADDED</span> : <button className="small" onClick={() => addSideFromTemplate(o.id)}>Add</button>}
              </div>
            </li>
          ))}
        </ul>
      </SystemWindow>

      <SystemWindow title="Main quest offers · this week" className="offers main-offers">
        <p className="muted">Two big quests a week. They take months, and each stage pays more than a library main quest. New offers {until(summary.today, mains.nextOn)}.</p>
        {mains.offers.length === 0 && <p className="muted">You already have every big quest for your stats.</p>}
        <ul className="offer-list-board">
          {mains.offers.map(o => (
            <li key={o.id} className={`offer-card main ${have(o.id) ? 'added' : ''}`}>
              <div className="offer-top">
                <span className="stat-key">{o.stat}</span>
                <span className="offer-kind">{o.span} · {o.stages.length} stages</span>
              </div>
              <b>{o.title}</b>
              <p className="muted">{o.description}</p>
              <ol className="stage-list">
                {o.stages.map(s => <li key={s.id}><b>{s.title}:</b> {s.description}</li>)}
              </ol>
              <div className="row end">
                {have(o.id) ? <span className="cleared">ADDED</span> : <button className="small" onClick={() => addMainFromTemplate(o.id)}>Accept quest</button>}
              </div>
            </li>
          ))}
        </ul>
      </SystemWindow>
    </>
  )
}

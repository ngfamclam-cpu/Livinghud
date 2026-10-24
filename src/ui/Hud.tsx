import { useState } from 'react'
import { DAY_NAMES, HP_PER_CLEAN_DAY, KNOCKOUT_DOLLARS, LOW_HP, MAX_HP, NORMAL_XP_PER_MISS, STATS, addDays, featureOn, dayExercises, formatAmount, questReward, dailyWeight, type Completion, type Memory, type Player, type Quest, type Summary, type SurpriseClear } from '../engine'
import { acceptRoutineOffer, completeQuest, declineRoutineOffer, undoQuest } from '../db/actions'
import { SystemWindow } from './SystemWindow'
import { SurpriseCard } from './SurpriseCard'
import { NewAreaBanner, TodayPage } from './lifelog/HudPanels'
import { activeFocus, focusedMinutes } from '../db/focus'
import { Bar } from './Bar'
import { money, monthName } from './format'

interface HudProps {
  player: Player
  quests: Quest[]
  summary: Summary
  onStartWorkout: () => void
  onFocus: () => void
  onJournal: () => void
  journaledToday: boolean
  onReport: () => void
  surprises: SurpriseClear[]
  now: Date
  onPlans: (id?: string | null) => void
  /** On the PC dashboard the status and stats live in their own panels. */
  desktop?: boolean
  memories: Memory[]
  /** Opens the Life log, optionally straight into the camera. */
  onLifeLog: (camera?: boolean) => void
}

export function Hud({ player, quests, summary, onStartWorkout, onFocus, onJournal, journaledToday, onReport, surprises, now, onPlans, desktop, memories, onLifeLog }: HudProps) {
  const active = quests.filter(q => q.active).sort((a, b) => a.createdAt - b.createdAt)
  const dailies = active.filter(q => q.kind === 'daily')
  const sides = active.filter(q => q.kind === 'side')
  const mains = active.filter(q => q.kind === 'main')
  const doneCount = dailies.filter(q => summary.todayDone.has(q.id)).length
  const shares = dailies.reduce((n, q) => n + dailyWeight(q), 0)
  const payOf = (q: Quest) => questReward(q, 'full', summary.wallet.budget, shares)
  const sideDone = sides.filter(q => summary.weekDone.has(q.id)).length
  const { level, wallet, savings } = summary
  const weakest = player.stats.reduce((a, b) => ((summary.stats[b] ?? 0) < (summary.stats[a] ?? 0) ? b : a), player.stats[0])

  return (
    <main className="hud">
      {!desktop && <SystemWindow title="Status" className="status">
        <div className="player-line">
          <div>
            <div className="player-name">{player.name}</div>
            {featureOn(player, 'badges') && player.title && summary.badges.some(b => b.title === player.title) && (
              <div className="player-title">{player.title}</div>
            )}
            {featureOn(player, 'badges') && summary.streakBonus.size > 0 && (
              <div className="muted">Streak bonus: +10% XP on {[...summary.streakBonus].join(', ')}</div>
            )}
            <div className="muted">Rank {summary.rank} · {Math.round(summary.completionRate * 100)}% over 30 days</div>
          </div>
          <div className="level">
            <small>LV.</small>
            {level.level}
          </div>
        </div>
        <Bar value={level.xpIntoLevel} max={level.xpForNext} label={`${level.xpIntoLevel} / ${level.xpForNext} XP`} />
        {summary.penalty && <PenaltyLine summary={summary} difficulty={player.settings.difficulty} />}
        {featureOn(player, 'report') && (
          <div className="row end">
            <button className="ghost small" onClick={onReport}>Weekly report</button>
          </div>
        )}

        <div className="wallet">
          <div>
            <div className="muted">Reward Wallet · {monthName(wallet.month)}</div>
            <div className="big">{money(wallet.available)} <small>to spend</small></div>
            <div className="muted">Earned {money(wallet.earned)} of {money(wallet.budget)}</div>
          </div>
          <div className="vault">
            <div className="muted">Vault</div>
            <div className="big">{money(wallet.vault)}</div>
          </div>
        </div>
        <Bar value={wallet.earned} max={wallet.budget} variant="gold" />
        {savings.target > 0 || player.settings.savingsGoal.type === 'percent' ? (
          <p className={`muted gate ${savings.met ? 'met' : ''}`}>
            {savings.met
              ? `Savings goal met: ${money(savings.saved)} saved. The shop is open.`
              : `Shop locked until you save ${money(savings.target)} this month (${money(savings.saved)} so far).`}
          </p>
        ) : null}
      </SystemWindow>}

      {featureOn(player, 'memories') && <NewAreaBanner onSnap={() => onLifeLog(true)} />}

      {featureOn(player, 'surprises') && <SurpriseCard player={player} summary={summary} cleared={surprises} now={now} />}

      {summary.recoveryToday && (
        <SystemWindow title="Recovery Day" className="recovery">
          <p className="system-line">Today's quests: hydrate, eat well, rest.</p>
          <p className="muted">Your streaks are protected and skipped dailies won't lower your stats. Dailies you still do count as normal.</p>
        </SystemWindow>
      )}

      {summary.routineOffer && (
        <SystemWindow title="Routine level up" className="offer">
          <p className="system-line">Three weeks of full routines. The System offers about 25% harder targets on every day. Today's, for example:</p>
          <ul className="offer-list">
            {summary.routine.exercises.map(e => {
              const next = dayExercises(summary.routineOffer!, summary.routine.kind).find(o => o.key === e.key)
              return (
                <li key={e.key}>
                  {e.name}: {formatAmount(e, e.target)} → <b>{next ? formatAmount(e, next.target) : formatAmount(e, e.target)}</b>
                </li>
              )
            })}
          </ul>
          <div className="row end">
            <button className="ghost" onClick={() => declineRoutineOffer()}>Not now</button>
            <button onClick={() => acceptRoutineOffer()}>Accept</button>
          </div>
        </SystemWindow>
      )}

      {featureOn(player, 'party') && summary.party.some(b => b.weakening) && (
        <SystemWindow title="Party" className="bond-warning">
          {summary.party.filter(b => b.weakening).slice(0, 3).map(b => (
            <p key={b.person.id} className="system-line">
              Bond weakening: {b.person.name} ({b.lastDay ? `${b.daysSince} days` : 'no contact yet'})
            </p>
          ))}
          <p className="muted">Reach out, then log it on the Party tab.</p>
        </SystemWindow>
      )}

      {featureOn(player, 'plans') && <AdventurePanel summary={summary} onPlans={onPlans} />}

      {featureOn(player, 'focus') && <FocusPanel summary={summary} showBoss={featureOn(player, 'bosses')} onFocus={onFocus} />}

      {featureOn(player, 'memories') && (
        <TodayPage summary={summary} memories={memories} journaledToday={journaledToday} showJournal={featureOn(player, 'journal')} onLifeLog={onLifeLog} onJournal={onJournal} />
      )}

      {featureOn(player, 'journal') && !featureOn(player, 'memories') && (
        <SystemWindow title="Journal">
          <div className="row">
            <p className="muted grow">{journaledToday ? 'Today’s entry is saved. You can still add to it.' : 'Three questions, two taps. About two minutes.'}</p>
            <button className="small" onClick={onJournal}>{journaledToday ? 'Open journal' : 'Write today’s entry'}</button>
          </div>
        </SystemWindow>
      )}

      {!desktop && <SystemWindow title="Stats">
        <ul className="stats">
          {player.stats.map(key => (
            <li key={key} className={key === weakest && dailies.length > 0 ? 'weakest' : ''}>
              <span className="stat-key">{key}</span>
              <span className="stat-name">{STATS.find(s => s.key === key)?.name}</span>
              <Bar value={summary.stats[key] ?? 0} max={100} thin />
              <span className="stat-value">{summary.stats[key] ?? 0}</span>
            </li>
          ))}
        </ul>
      </SystemWindow>}

      <SystemWindow title={`Daily Quest · ${doneCount}/${dailies.length}`}>
        {doneCount === dailies.length && dailies.length > 0 && (
          <p className="system-line clear">All daily quests cleared. Rest well, Player.</p>
        )}
        <ul className="quests">
          {dailies.map(q => (
            <QuestRow
              key={q.id}
              quest={q}
              done={summary.todayDone.get(q.id)}
              streak={summary.streaks.get(q.id) ?? 0}
              routine={q.templateId === 'str-routine' ? summary.routine : null}
              onStartWorkout={onStartWorkout}
              pay={payOf(q)}
              onPhoto={q.templateId === 'int-photo' ? () => onLifeLog(true) : undefined}
            />
          ))}
        </ul>
      </SystemWindow>

      {sides.length > 0 && (
        <SystemWindow title={`Side Quests · this week ${sideDone}/${sides.length}`}>
          <ul className="quests">
            {sides.map(q => <QuestRow key={q.id} quest={q} done={summary.weekDone.get(q.id)} />)}
          </ul>
        </SystemWindow>
      )}

      {mains.length > 0 && (
        <SystemWindow title="Main Quests">
          <ul className="quests">
            {mains.map(q => <MainQuestRow key={q.id} quest={q} summary={summary} />)}
          </ul>
        </SystemWindow>
      )}
    </main>
  )
}

interface RowProps {
  quest: Quest
  done?: Completion
  streak?: number
  routine?: Summary['routine'] | null
  onStartWorkout?: () => void
  /** "Photo of the day": cleared by adding a memory rather than ticking it off. */
  onPhoto?: () => void
  /** What the full version pays (dailies). */
  pay?: { xp: number; dollars: number }
}

function QuestRow({ quest, done, streak = 0, routine, onStartWorkout, onPhoto, pay }: RowProps) {
  const [open, setOpen] = useState(false)
  const routineParts = routine
    ? [
        `${DAY_NAMES[routine.kind]} day${routine.kind === 'rest' ? ' (posture only)' : ''}`,
        `${routine.exercises.filter(e => (routine.done[e.key] ?? 0) >= e.target).length}/${routine.exercises.length} exercises done`,
        `next: ${DAY_NAMES[routine.upcoming[0]]}`,
      ]
    : []
  return (
    <li className={`quest ${done ? 'done' : ''}`}>
      <button className="quest-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="stat-key">{quest.stat}</span>
        <span className="quest-title">{quest.title}</span>
        {pay && !done && <span className="quest-pay" title="Full version pays">{money(pay.dollars)}</span>}
        {streak > 0 && <span className="streak" title={`${streak}-day streak`}>{streak}d</span>}
      </button>
      {routineParts.length > 0 && <p className="routine-line muted">{routineParts.join(' · ')}</p>}
      {open && (
        <div className="quest-detail">
          {quest.description && <p>{quest.description}</p>}
          <p className="muted">Minimum version: {quest.minVersion}</p>
          {pay && (
            <p className="muted">
              Pays +{pay.xp} XP · {money(pay.dollars)} (minimum: half){dailyWeight(quest) > 1 ? `. Worth ${dailyWeight(quest)}× a normal daily because it takes the longest.` : ''}
            </p>
          )}
        </div>
      )}
      <div className="quest-actions">
        {routine && onStartWorkout && (
          <button className={`small ${done ? 'ghost' : ''} workout-button`} onClick={onStartWorkout}>Workout</button>
        )}
        {done ? (
          <>
            <span className="cleared">{done.version === 'full' ? 'CLEAR' : 'MIN CLEAR'} +{done.xp} XP · +{money(done.dollars)}</span>
            {onPhoto && done.version === 'min' && <button className="small" onClick={onPhoto}>📷 Add photo</button>}
            <button className="ghost small" onClick={() => undoQuest(quest)}>Undo</button>
          </>
        ) : onPhoto ? (
          <button className="small" onClick={onPhoto}>📷 Add photo</button>
        ) : (
          <>
            <button className="ghost small" onClick={() => completeQuest(quest, 'min')}>Minimum</button>
            <button className="small" onClick={() => completeQuest(quest, 'full')}>Complete</button>
          </>
        )}
      </div>
    </li>
  )
}

function MainQuestRow({ quest, summary }: { quest: Quest; summary: Summary }) {
  const [open, setOpen] = useState(false)
  const stages = quest.stages ?? []
  const progress = summary.mainProgress.get(quest.id) ?? { cleared: 0, current: null, done: false }
  const stage = stages.find(s => s.id === progress.current)
  const index = stages.findIndex(s => s.id === progress.current)

  return (
    <li className={`quest main-quest ${progress.done ? 'done' : ''}`}>
      <button className="quest-main" onClick={() => setOpen(o => !o)} aria-expanded={open}>
        <span className="stat-key">{quest.stat}</span>
        <span className="quest-title">{quest.title}</span>
        <span className="streak">{progress.cleared}/{stages.length}</span>
      </button>
      <Bar value={progress.cleared} max={stages.length} thin />
      {stage ? (
        <div className="quest-detail">
          <p><b>Stage {index + 1}: {stage.title}.</b> {stage.description}</p>
          <p className="muted">Pays +{stage.xp} XP · +{money(questReward(quest, 'full', summary.wallet.budget, 0, stage).dollars)}</p>
        </div>
      ) : (
        <p className="system-line">Main quest cleared.</p>
      )}
      {open && (
        <ol className="stage-list">
          {stages.map((s, i) => (
            <li key={s.id} className={i < index || progress.done ? 'cleared-stage' : s.id === progress.current ? 'current-stage' : ''}>
              {s.title}
            </li>
          ))}
        </ol>
      )}
      <div className="quest-actions">
        {progress.cleared > 0 && <button className="ghost small" onClick={() => undoQuest(quest)}>Undo last stage</button>}
        {stage && <button className="small" onClick={() => completeQuest(quest)}>Clear stage</button>}
      </div>
    </li>
  )
}

function FocusPanel({ summary, showBoss, onFocus }: { summary: Summary; showBoss: boolean; onFocus: () => void }) {
  const run = activeFocus()
  const boss = showBoss ? summary.bosses.find(b => !b.boss.defeatedAt) : undefined
  const left = run ? Math.max(0, Math.ceil(run.plannedMin - focusedMinutes(run))) : 0
  return (
    <SystemWindow title="Focus" className={run ? 'dungeon' : ''}>
      {run ? (
        <p className="system-line">Dungeon in progress: {run.label}, {left} min left.</p>
      ) : (
        <p className="muted">
          {summary.focusToday} min focused today.{boss && ` Boss: ${boss.boss.name} (${boss.hpLeft}/${boss.boss.hp} HP).`}
        </p>
      )}
      <div className="row end">
        <button className="small" onClick={onFocus}>{run ? 'Open dungeon' : 'Enter a focus dungeon'}</button>
      </div>
    </SystemWindow>
  )
}

function PenaltyLine({ summary, difficulty }: { summary: Summary; difficulty: Player['settings']['difficulty'] }) {
  const p = summary.penalty!
  const missed = p.missedYesterday
  if (difficulty === 'hardcore' && p.hp !== null) {
    const knockedOut = p.knockouts.find(k => k.day === addDays(summary.today, -1))
    return (
      <div className="hp">
        <Bar value={p.hp} max={MAX_HP} label={`HP ${p.hp} / ${MAX_HP}`} variant="hp" />
        {knockedOut && (
          <p className="system-line danger-line">
            HP hit 0 yesterday{knockedOut.dollars > 0 ? `: $${knockedOut.dollars.toFixed(2)} was taken from your wallet` : ', but your wallet was empty'}. HP restored to 50.
          </p>
        )}
        {!knockedOut && p.hp <= LOW_HP && <p className="system-line danger-line">HP low. Clear every daily today to recover {HP_PER_CLEAN_DAY} HP. At 0 you lose ${KNOCKOUT_DOLLARS}.</p>}
      </div>
    )
  }
  if (difficulty === 'normal' && missed > 0) {
    return <p className="muted penalty-line">Missed {missed} dail{missed === 1 ? 'y' : 'ies'} yesterday: −{missed * NORMAL_XP_PER_MISS} XP.</p>
  }
  if (difficulty === 'casual' && missed > 0) {
    return <p className="muted penalty-line">Missed {missed} yesterday. Casual mode: your streaks are paused, not broken.</p>
  }
  return null
}

function AdventurePanel({ summary, onPlans }: { summary: Summary; onPlans: (id?: string | null) => void }) {
  const next = summary.plans[0]
  if (!next) {
    return (
      <SystemWindow title="Next adventure">
        <div className="row">
          <p className="muted grow">Raves, festivals, the Asia trip: plan one and save for it from the Vault.</p>
          <button className="small" onClick={() => onPlans(null)}>Plan one</button>
        </div>
      </SystemWindow>
    )
  }
  const { plan, daysLeft, progress } = next
  return (
    <SystemWindow title="Next adventure" className="adventure">
      <button className="quest-main" onClick={() => onPlans(plan.id)}>
        <span className="quest-title">{plan.name}</span>
        <span className="routine-count">{daysLeft === null ? 'no date' : daysLeft > 0 ? `${daysLeft} days` : daysLeft === 0 ? 'today!' : 'past'}</span>
      </button>
      <Bar value={progress} max={1} variant="gold" label={`${Math.round(progress * 100)}% funded`} />
      {summary.plans.length > 1 && <p className="muted">+{summary.plans.length - 1} more plan{summary.plans.length > 2 ? 's' : ''}</p>}
    </SystemWindow>
  )
}

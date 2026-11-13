import { useState } from 'react'
import { AVATAR_LEVELS, HUNTER_RANKS, SKILLS, SKILL_BRANCHES, canLearn, type Player, type Summary } from '../engine'
import { claimRestRune, learnSkill, resetSkills } from '../db/actions'
import { avatarLook, avatarLookKey, avatarPhoto, makeLook, useAutoLooks } from '../db/looks'
import { Photo } from './lifelog/Photo'
import { SystemWindow } from './SystemWindow'

/** Your Hunter: rank by level, the evolving avatar, and the skill tree. */
export function SkillsScreen({ player, summary, onClose }: { player: Player; summary: Summary; onClose?: () => void }) {
  const p = summary.progression
  const level = summary.level.level
  const [message, setMessage] = useState('')
  const learn = async (id: string) => setMessage((await learnSkill(id)) ?? '')
  const rune = async () => setMessage((await claimRestRune()) ?? 'Lazy-day coupon added to your pouch.')
  const runeClaimed = summary.extras.coupons.some(c => c.record.sourceId === `rune-${summary.today.slice(0, 7)}`)

  return (
    <main className="hud skills-screen">
      <HunterCard summary={summary} big />

      <SystemWindow title={`Skill tree · ${p.pointsLeft} point${p.pointsLeft === 1 ? '' : 's'} to spend`}>
        <p className="muted">You earn a skill point every level. Each branch unlocks in order; higher tiers need a higher level. You can reset and choose again any time.</p>
        <div className="skill-tree">
          {SKILL_BRANCHES.map(b => (
            <div key={b.id} className={`skill-branch b-${b.id}`}>
              <h3>{b.name}</h3>
              <p className="muted small-print">{b.text}</p>
              {SKILLS.filter(s => s.branch === b.id).map(s => {
                const have = p.skills.has(s.id)
                const check = canLearn(s.id, player.skills, level)
                return (
                  <div key={s.id} className={`skill-node ${have ? 'learned' : check.ok ? 'ready' : 'locked'}`}>
                    <div className="skill-head">
                      <b>{s.name}</b>
                      <small>{s.cost} pt{s.cost === 1 ? '' : 's'} · Lv {s.minLevel}</small>
                    </div>
                    <p className="small-print">{s.text}</p>
                    {have ? <span className="cleared">Learned</span> : check.ok ? <button className="small" onClick={() => void learn(s.id)}>Learn</button> : <span className="lock-reason">{check.reason}</span>}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
        {p.effects.restRune && (
          <div className="row">
            <span className="grow">Rest Rune: one free Lazy-day coupon a month.</span>
            <button className="small" disabled={runeClaimed} onClick={() => void rune()}>{runeClaimed ? 'Claimed this month' : 'Claim'}</button>
          </div>
        )}
        {message && <p className="system-line">{message}</p>}
        <div className="row end">
          {(player.skills?.length ?? 0) > 0 && <button className="ghost small" onClick={() => { if (confirm('Give back every skill point and choose again?')) void resetSkills() }}>Reset skills</button>}
          {onClose && <button className="ghost small" onClick={onClose}>Back</button>}
        </div>
      </SystemWindow>
    </main>
  )
}

/** Your Hunter rank (by level) with the AI avatar; small on the HUD, big on the Skills screen. */
export function HunterCard({ summary, big = false, onOpen }: { summary: Summary; big?: boolean; onOpen?: () => void }) {
  const p = summary.progression
  const level = summary.level.level
  const stage = p.avatarStage
  const photo = avatarPhoto(summary.extras.portraits, stage)
  const [msg, setMsg] = useState('')
  useAutoLooks(summary, [{ key: avatarLookKey(stage), req: avatarLook(stage) }])
  const next = p.hunter.next
  const nextLook = (stage + 1) * AVATAR_LEVELS
  return (
    <SystemWindow title={p.hunter.title} className={`hunter-card hunter-${p.hunter.rank} ${big ? 'big' : ''}`}>
      <div className="hunter-row">
        <button className="hunter-avatar" onClick={onOpen} disabled={!onOpen} aria-label="Your Hunter">
          {photo ? <Photo id={photo} alt="Your Hunter" /> : <span className="hunter-silhouette" aria-hidden="true">👤</span>}
          <span className="hunter-rank-badge">{p.hunter.rank}</span>
        </button>
        <div className="grow">
          <p className="hunter-title">{p.hunter.rank}-Rank · Level {level}</p>
          <p className="muted small-print">{next ? `${next.rank}-Rank at level ${next.level}.` : 'The highest rank there is.'} {stage < 10 ? `New avatar look at level ${nextLook}.` : 'Final avatar form.'}</p>
          {p.pointsLeft > 0 && <p className="system-line small-print">{p.pointsLeft} skill point{p.pointsLeft === 1 ? '' : 's'} to spend</p>}
          {big && (
            <>
              <div className="hunter-ladder">
                {HUNTER_RANKS.map(r => <span key={r.rank} className={`${r.rank === p.hunter.rank ? 'now' : level >= r.level ? 'past' : ''}`} title={`Level ${r.level}`}>{r.rank}</span>)}
              </div>
              <button className="ghost small" onClick={() => { setMsg('Drawing a new look…'); void makeLook(avatarLookKey(stage), avatarLook(stage), !!summary.extras.portraits[avatarLookKey(stage)]).then(r => setMsg(r.ok ? '' : r.message)) }}>{summary.extras.portraits[avatarLookKey(stage)] ? 'New look' : '✦ Draw my Hunter'}</button>
              {msg && <p className="muted small-print">{msg}</p>}
            </>
          )}
        </div>
      </div>
    </SystemWindow>
  )
}

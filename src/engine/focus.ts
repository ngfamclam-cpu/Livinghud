// Focus dungeons and dreaded-task bosses. A focus session earns XP per minute
// and can count toward a quest; minutes spent on a boss do damage, one HP per
// 15 minutes. Pure rules; the timer itself lives in the screen.

import type { Boss, CompletionVersion, FocusRun } from './types'

export const FOCUS_XP_PER_MIN = 1
/** Extra XP for staying the whole planned time. */
export const FOCUS_CLEAR_BONUS = 10
export const BOSS_XP = 100
export const MINUTES_PER_HIT = 15
/** Leaving the app longer than this breaks a strict session. */
export const STRICT_GRACE_MS = 60_000
export const FOCUS_LENGTHS = [15, 25, 30, 45, 60, 90]

export function focusXp(minutes: number, cleared: boolean): number {
  return Math.max(0, Math.floor(minutes)) * FOCUS_XP_PER_MIN + (cleared ? FOCUS_CLEAR_BONUS : 0)
}

/** What a session does for a linked quest: 30+ minutes is the full quest, 10+ the minimum. */
export function focusQuestVersion(minutes: number): CompletionVersion | null {
  if (minutes >= 30) return 'full'
  if (minutes >= 10) return 'min'
  return null
}

/** Damage one session does to a boss: a hit per 15 minutes, and a by-hand hit is one. */
export const runDamage = (run: Pick<FocusRun, 'minutes' | 'manual'>) => (run.manual ? 1 : Math.floor(run.minutes / MINUTES_PER_HIT))

export interface BossStatus {
  boss: Boss
  damage: number
  hpLeft: number
  minutes: number
}

/** Active bosses (defeated ones too, until removed), with damage taken from focus sessions. */
export function bossStatus(bosses: Boss[], runs: FocusRun[]): BossStatus[] {
  return bosses
    .filter(b => b.active)
    .map(boss => {
      const mine = runs.filter(r => r.bossId === boss.id)
      const damage = mine.reduce((sum, r) => sum + runDamage(r), 0)
      return { boss, damage, hpLeft: Math.max(0, boss.hp - damage), minutes: mine.reduce((sum, r) => sum + r.minutes, 0) }
    })
    .sort((a, b) => Number(!!a.boss.defeatedAt) - Number(!!b.boss.defeatedAt) || a.boss.createdAt - b.boss.createdAt)
}

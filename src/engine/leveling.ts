// Level curve: level 1 -> 2 costs 100 XP, and each level after costs 25 more.
// With 4 full dailies a day (80 XP) that is roughly level 5 in a week,
// level 10 in three weeks and level 20 in two and a half months.

export const BASE_XP = 100
export const XP_STEP = 25

export function xpToNext(level: number): number {
  return BASE_XP + XP_STEP * (level - 1)
}

export interface LevelInfo {
  level: number
  /** XP earned inside the current level. */
  xpIntoLevel: number
  /** XP needed to finish the current level. */
  xpForNext: number
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1
  let remaining = Math.max(0, totalXp)
  while (remaining >= xpToNext(level)) {
    remaining -= xpToNext(level)
    level++
  }
  return { level, xpIntoLevel: remaining, xpForNext: xpToNext(level) }
}

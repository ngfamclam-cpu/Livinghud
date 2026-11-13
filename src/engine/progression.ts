// Reasons to level up (owner, Nov 2026: "give me reasons to level up besides
// money, packs and pets, and give them reasons to level them up"). Owner picked:
// a skill tree, Hunter rank-ups, an evolving Hunter avatar, and for pets passive
// perks, a daily ability and an evolution form at max level. Pure rules only.

import type { StatKey } from './types'

// ---- Skill tree: one skill point per level after the first ----

export type SkillBranch = 'might' | 'fortune' | 'shadow'

export interface Skill {
  id: string
  branch: SkillBranch
  tier: 1 | 2 | 3 | 4
  name: string
  text: string
  cost: number
  minLevel: number
  /** The skill before it in its branch. */
  needs: string | null
}

export const SKILL_BRANCHES: { id: SkillBranch; name: string; text: string }[] = [
  { id: 'might', name: 'Might', text: 'More XP from every quest.' },
  { id: 'fortune', name: 'Fortune', text: 'Luckier rolls, packs and Golden Quests.' },
  { id: 'shadow', name: 'Shadow', text: 'Tougher pets, rest and longer gates.' },
]

export const SKILLS: Skill[] = [
  { id: 'might-1', branch: 'might', tier: 1, name: 'Monarch’s Will', text: '+5% XP from every quest.', cost: 1, minLevel: 2, needs: null },
  { id: 'might-2', branch: 'might', tier: 2, name: 'Relentless', text: 'Another +5% quest XP (+10% total).', cost: 1, minLevel: 8, needs: 'might-1' },
  { id: 'might-3', branch: 'might', tier: 3, name: 'Sovereign Aura', text: 'Another +10% quest XP (+20% total).', cost: 2, minLevel: 15, needs: 'might-2' },
  { id: 'might-4', branch: 'might', tier: 4, name: 'Shadow Monarch', text: 'Another +10% quest XP (+30% total).', cost: 3, minLevel: 30, needs: 'might-3' },
  { id: 'fortune-1', branch: 'fortune', tier: 1, name: 'Lucky Hands', text: '+2 on every Lucky Roll.', cost: 1, minLevel: 2, needs: null },
  { id: 'fortune-2', branch: 'fortune', tier: 2, name: 'Treasure Sense', text: 'Packs hold 2 girl cards more often (20% → 35%).', cost: 1, minLevel: 8, needs: 'fortune-1' },
  { id: 'fortune-3', branch: 'fortune', tier: 3, name: 'Golden Touch', text: 'Golden Quests pay ×4 XP instead of ×3.', cost: 2, minLevel: 15, needs: 'fortune-2' },
  { id: 'fortune-4', branch: 'fortune', tier: 4, name: 'Fate Weaver', text: 'Another +2 on every Lucky Roll (+4 total).', cost: 3, minLevel: 30, needs: 'fortune-3' },
  { id: 'shadow-1', branch: 'shadow', tier: 1, name: 'Beast Tamer', text: 'Pets take 25% less damage from missed dailies.', cost: 1, minLevel: 2, needs: null },
  { id: 'shadow-2', branch: 'shadow', tier: 2, name: 'Rest Rune', text: 'Claim a free Lazy-day coupon every month.', cost: 1, minLevel: 8, needs: 'shadow-1' },
  { id: 'shadow-3', branch: 'shadow', tier: 3, name: 'Gatekeeper', text: 'Red Gates stay open 3 hours instead of 2.', cost: 2, minLevel: 15, needs: 'shadow-2' },
  { id: 'shadow-4', branch: 'shadow', tier: 4, name: 'Undying Bond', text: 'A fallen pet comes back after 5 quest clears instead of 10.', cost: 3, minLevel: 30, needs: 'shadow-3' },
]

export const skillById = (id: string) => SKILLS.find(s => s.id === id)

/** Skill points earned by a level: one per level after the first. */
export const skillPoints = (level: number) => Math.max(0, level - 1)

/** Skills that are really active: known ids, bought in order, within the points the level gives. */
export function activeSkills(chosen: string[] | undefined, level: number): Set<string> {
  const out = new Set<string>()
  let left = skillPoints(level)
  for (const id of chosen ?? []) {
    const s = skillById(id)
    if (!s || out.has(id) || level < s.minLevel || (s.needs && !out.has(s.needs)) || s.cost > left) continue
    out.add(id)
    left -= s.cost
  }
  return out
}

export function pointsLeft(chosen: string[] | undefined, level: number): number {
  const spent = [...activeSkills(chosen, level)].reduce((n, id) => n + (skillById(id)?.cost ?? 0), 0)
  return skillPoints(level) - spent
}

export type SkillCheck = { ok: true } | { ok: false; reason: string }

export function canLearn(id: string, chosen: string[] | undefined, level: number): SkillCheck {
  const s = skillById(id)
  if (!s) return { ok: false, reason: 'Unknown skill' }
  const have = activeSkills(chosen, level)
  if (have.has(id)) return { ok: false, reason: 'Learned' }
  if (level < s.minLevel) return { ok: false, reason: `Level ${s.minLevel}` }
  if (s.needs && !have.has(s.needs)) return { ok: false, reason: `Needs ${skillById(s.needs)?.name}` }
  if (pointsLeft(chosen, level) < s.cost) return { ok: false, reason: `${s.cost} point${s.cost === 1 ? '' : 's'}` }
  return { ok: true }
}

/** What the active skills do, as numbers the rest of the game reads. */
export interface SkillEffects {
  /** Multiplier on quest XP. */
  xp: number
  rollBonus: number
  /** Chance a pack holds two girl cards (when it isn't a big moment). */
  doubleGirl: number
  goldenMult: number
  /** Multiplier on pet neglect damage. */
  petDamage: number
  restRune: boolean
  gateMinutes: number
  reviveClears: number
}

export function skillEffects(active: Set<string>): SkillEffects {
  const has = (id: string) => active.has(id)
  return {
    xp: 1 + (has('might-1') ? 0.05 : 0) + (has('might-2') ? 0.05 : 0) + (has('might-3') ? 0.1 : 0) + (has('might-4') ? 0.1 : 0),
    rollBonus: (has('fortune-1') ? 2 : 0) + (has('fortune-4') ? 2 : 0),
    doubleGirl: has('fortune-2') ? 0.35 : 0.2,
    goldenMult: has('fortune-3') ? 4 : 3,
    petDamage: has('shadow-1') ? 0.75 : 1,
    restRune: has('shadow-2'),
    gateMinutes: has('shadow-3') ? 180 : 120,
    reviveClears: has('shadow-4') ? 5 : 10,
  }
}

// ---- Hunter rank by level (separate from the 30-day completion rank) ----

export type HunterRank = 'E' | 'D' | 'C' | 'B' | 'A' | 'S'
export const HUNTER_RANKS: { rank: HunterRank; level: number; title: string }[] = [
  { rank: 'E', level: 1, title: 'E-Rank Hunter' },
  { rank: 'D', level: 5, title: 'D-Rank Hunter' },
  { rank: 'C', level: 10, title: 'C-Rank Hunter' },
  { rank: 'B', level: 20, title: 'B-Rank Hunter' },
  { rank: 'A', level: 35, title: 'A-Rank Hunter' },
  { rank: 'S', level: 50, title: 'S-Rank Hunter' },
]

export function hunterRank(level: number): { rank: HunterRank; title: string; next: { rank: HunterRank; level: number } | null } {
  let i = 0
  while (i + 1 < HUNTER_RANKS.length && level >= HUNTER_RANKS[i + 1].level) i++
  const n = HUNTER_RANKS[i + 1]
  return { rank: HUNTER_RANKS[i].rank, title: HUNTER_RANKS[i].title, next: n ? { rank: n.rank, level: n.level } : null }
}

/** The Hunter avatar gets a new look every 5 levels (stage 0 at level 1-4, up to 10 at level 50+). */
export const avatarStage = (level: number) => Math.min(10, Math.floor(level / 5))
export const AVATAR_LEVELS = 5

// ---- Pet perks, daily abilities and evolution ----

export type PetPerk = { kind: 'statXp'; stat: StatKey } | { kind: 'allXp' } | { kind: 'packLuck' } | { kind: 'tamer' }

export const PET_PERKS: Record<string, PetPerk> = {
  pip: { kind: 'allXp' },
  'ember-fox': { kind: 'statXp', stat: 'STR' },
  'tide-otter': { kind: 'statXp', stat: 'VIT' },
  'leaf-stag': { kind: 'statXp', stat: 'VIT' },
  'storm-wolf': { kind: 'statXp', stat: 'STR' },
  'volt-lynx': { kind: 'statXp', stat: 'AGI' },
  'crystal-tortoise': { kind: 'tamer' },
  kitsune: { kind: 'statXp', stat: 'CHA' },
  griffin: { kind: 'packLuck' },
  leviathan: { kind: 'statXp', stat: 'WLT' },
  'frost-owl': { kind: 'statXp', stat: 'INT' },
  qilin: { kind: 'tamer' },
  'azure-dragon': { kind: 'allXp' },
  phoenix: { kind: 'allXp' },
  'lunar-moth': { kind: 'statXp', stat: 'INT' },
  'chaos-wyrm': { kind: 'packLuck' },
  thunderbird: { kind: 'statXp', stat: 'AGI' },
}

const RARITY_POWER: Record<string, number> = { common: 1, rare: 1.25, epic: 1.5, legendary: 2 }
/** Evolved pets' perks and abilities are this much stronger. */
export const EVOLVED_BOOST = 1.5

export interface PetLike {
  id: string
  rarity: string
  level: number
  evolved: boolean
}

const power = (p: PetLike) => (RARITY_POWER[p.rarity] ?? 1) * (p.evolved ? EVOLVED_BOOST : 1)

/** How strong a pet's perk is right now (a fraction: 0.1 = 10%). */
export function perkAmount(p: PetLike): number {
  const perk = PET_PERKS[p.id]
  if (!perk) return 0
  const per = perk.kind === 'statXp' ? 0.02 : perk.kind === 'allXp' ? 0.01 : perk.kind === 'packLuck' ? 0.03 : 0.05
  return Math.round(per * p.level * power(p) * 1000) / 1000
}

export function perkText(p: PetLike, statName: (k: StatKey) => string): string {
  const perk = PET_PERKS[p.id]
  if (!perk) return ''
  const pct = `${Math.round(perkAmount(p) * 100)}%`
  if (perk.kind === 'statXp') return `+${pct} XP on ${statName(perk.stat)} quests`
  if (perk.kind === 'allXp') return `+${pct} XP on every quest`
  if (perk.kind === 'packLuck') return `+${pct} chance of a second girl card in packs`
  return `Your pets take ${pct} less damage from missed dailies`
}

/** XP multiplier the active pet adds to a quest of this stat. */
export function petXpBoost(p: PetLike | null, stat: StatKey): number {
  if (!p) return 1
  const perk = PET_PERKS[p.id]
  if (perk?.kind === 'allXp' || (perk?.kind === 'statXp' && perk.stat === stat)) return 1 + perkAmount(p)
  return 1
}

export type PetAbility = 'spark' | 'fetch' | 'foresight'
/** Pets learn their daily ability at this level. */
export const ABILITY_LEVEL = 3

const ABILITY_BY_ELEMENT: Record<string, PetAbility> = {
  fire: 'spark', storm: 'spark', water: 'fetch', nature: 'fetch', crystal: 'fetch', ice: 'fetch', spirit: 'foresight', light: 'foresight', moon: 'foresight', void: 'foresight',
}

export const ABILITY_INFO: Record<PetAbility, { name: string; text: string }> = {
  spark: { name: 'Spark', text: 'A burst of bonus XP.' },
  fetch: { name: 'Fetch', text: 'Brings back a funny card for your binder.' },
  foresight: { name: 'Foresight', text: 'Reveals when today’s Red Gate opens, plus a little XP.' },
}

export function petAbility(id: string, element: string): PetAbility {
  return id === 'pip' ? 'fetch' : ABILITY_BY_ELEMENT[element] ?? 'spark'
}

/** XP an ability use gives (Spark is the big one). */
export function abilityXp(ability: PetAbility, p: PetLike): number {
  const base = ability === 'spark' ? 6 : ability === 'foresight' ? 3 : 0
  return Math.round(base * p.level * power(p))
}

export const EVOLVED_NAMES: Record<string, string> = {
  pip: 'Pip, Star Sovereign',
  'ember-fox': 'Inferno Kitsune',
  'tide-otter': 'Tsunami Otter',
  'leaf-stag': 'Worldtree Stag',
  'storm-wolf': 'Tempest Fenrir',
  'volt-lynx': 'Plasma Lynx',
  'crystal-tortoise': 'Diamond Titan',
  kitsune: 'Celestial Kyubi',
  griffin: 'Sunlord Griffin',
  leviathan: 'Abyssal Emperor',
  'frost-owl': 'Glacier Sage',
  qilin: 'Heavenly Qilin',
  'azure-dragon': 'Storm Emperor Dragon',
  phoenix: 'Eternal Phoenix',
  'lunar-moth': 'Eclipse Moth',
  'chaos-wyrm': 'Void Leviathan',
  thunderbird: 'Skyfather Thunderbird',
}

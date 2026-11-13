// Pets (owner's picks, Nov 2026): Mythic and Elemental creatures, about one
// new pet a week. They come from rare eggs (dropped by perfect days, Golden
// Quests, Red Gates, bosses and lucky rolls; an egg hatches after a few quest
// clears), from milestones, and from secret conditions. You keep one active
// pet at a time and can swap any time; each pet grows on its own, only while
// it's the active one. Pip is the starter. Cosmetic: pets pay nothing.
// The Shadow Legion may adopt shadow beasts later; not yet.

import type { Completion, StatKey } from './types'
import { ABILITY_LEVEL, EVOLVED_NAMES, PET_PERKS, perkAmount, petAbility, type PetAbility } from './progression'
import type { BonusRecord } from './extras'
import { HUMAN_COMPANIONS, type HumanCompanion } from './forge'

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type PetFamily = 'Elemental' | 'Mythic' | 'Starter' | 'Companion'
export type PetElement = 'fire' | 'water' | 'nature' | 'storm' | 'ice' | 'crystal' | 'moon' | 'light' | 'void' | 'spirit'
/** The body plan the art draws. */
export type PetBody = 'human' | 'pip' | 'fox' | 'otter' | 'stag' | 'wolf' | 'lynx' | 'tortoise' | 'kitsune' | 'griffin' | 'serpent' | 'owl' | 'dragon' | 'qilin' | 'phoenix' | 'moth' | 'wyrm' | 'thunderbird'
export type PetSource = 'starter' | 'egg' | 'milestone' | 'secret' | 'shop'

export interface PetDef {
  id: string
  name: string
  family: PetFamily
  element: PetElement
  rarity: PetRarity
  body: PetBody
  /** Body top, body bottom, accent. */
  colors: [string, string, string]
  source: PetSource
  /** How it's unlocked (milestones and secrets; secrets show ??? until found). */
  unlock: string
  blurb: string
  /** Human companions: their catalog entry (look, outfits, price). */
  human?: HumanCompanion
}

const HUMAN_COLORS: Record<HumanCompanion['personality'], [string, string, string]> = {
  sunny: ['#ffe0ef', '#ff8ac9', '#ffd34d'],
  cool: ['#d6d9ff', '#5b4bd9', '#7af3ff'],
  sweet: ['#fff1e0', '#e8a07a', '#ff8ac9'],
  elegant: ['#f3e8ff', '#3a1f5e', '#ff3d6e'],
  sporty: ['#e0fff4', '#1f9e74', '#ffb347'],
  regal: ['#f4ecff', '#6a2bd9', '#d7c8ff'],
}

/** Human companions, bought in the Shop (see HUMAN_COMPANIONS in forge.ts). */
export const HUMAN_PETS: PetDef[] = HUMAN_COMPANIONS.map(h => ({
  id: h.id,
  name: h.name,
  family: 'Companion',
  element: 'spirit',
  rarity: h.price >= 250 ? 'legendary' : h.price >= 100 ? 'epic' : 'rare',
  body: 'human',
  colors: HUMAN_COLORS[h.personality],
  source: 'shop',
  unlock: `Shop · $${h.price}`,
  blurb: h.tagline,
  human: h,
}))

export const PETS: PetDef[] = [
  { id: 'pip', name: 'Pip', family: 'Starter', element: 'spirit', rarity: 'common', body: 'pip', colors: ['#9ce8ff', '#3c7bff', '#d6a6ff'], source: 'starter', unlock: 'Your first companion', blurb: 'Hatched the day you awakened. Loyal to the end.' },
  // Eggs (Elemental and Mythic).
  { id: 'ember-fox', name: 'Ember Fox', family: 'Elemental', element: 'fire', rarity: 'common', body: 'fox', colors: ['#ffb36b', '#ff4d2e', '#ffe08a'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Its tail never quite stops smouldering.' },
  { id: 'tide-otter', name: 'Tide Otter', family: 'Elemental', element: 'water', rarity: 'common', body: 'otter', colors: ['#8ee8ff', '#2b8bd9', '#d9fbff'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Juggles water droplets when bored.' },
  { id: 'leaf-stag', name: 'Grove Stag', family: 'Elemental', element: 'nature', rarity: 'rare', body: 'stag', colors: ['#b8f28c', '#3f9e4a', '#ffe9a8'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Flowers bloom where it sleeps.' },
  { id: 'storm-wolf', name: 'Storm Wolf', family: 'Elemental', element: 'storm', rarity: 'rare', body: 'wolf', colors: ['#c3c9ff', '#4b52c7', '#fff36b'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Howls thunder. Fetches lightning.' },
  { id: 'volt-lynx', name: 'Volt Lynx', family: 'Elemental', element: 'storm', rarity: 'rare', body: 'lynx', colors: ['#fff59a', '#e0a400', '#7af3ff'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Static in its fur, mischief in its eyes.' },
  { id: 'crystal-tortoise', name: 'Crystal Tortoise', family: 'Elemental', element: 'crystal', rarity: 'rare', body: 'tortoise', colors: ['#c9fff2', '#3fbfa6', '#d6a6ff'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Slow, wise, and very shiny.' },
  { id: 'kitsune', name: 'Nine-Tailed Fox', family: 'Mythic', element: 'spirit', rarity: 'epic', body: 'kitsune', colors: ['#fff1f7', '#ff8ac9', '#ffd34d'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Grows a new tail for every century of wisdom.' },
  { id: 'griffin', name: 'Sky Griffin', family: 'Mythic', element: 'light', rarity: 'epic', body: 'griffin', colors: ['#ffe7b0', '#c98b2e', '#ffffff'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Guards treasure. Your Vault counts.' },
  { id: 'leviathan', name: 'Abyss Leviathan', family: 'Mythic', element: 'water', rarity: 'legendary', body: 'serpent', colors: ['#7af3ff', '#1a2fa8', '#ff6fae'], source: 'egg', unlock: 'Hatches from an egg', blurb: 'Sleeps at the bottom of the sea of your to-do list.' },
  // Milestones.
  { id: 'frost-owl', name: 'Frost Owl', family: 'Elemental', element: 'ice', rarity: 'rare', body: 'owl', colors: ['#f0fbff', '#7fb8ff', '#b8f0ff'], source: 'milestone', unlock: 'Reach a 7-day combo', blurb: 'Sees every streak from above.' },
  { id: 'qilin', name: 'Jade Qilin', family: 'Mythic', element: 'nature', rarity: 'epic', body: 'qilin', colors: ['#b6ffd9', '#1f9e74', '#ffd34d'], source: 'milestone', unlock: 'Defeat 5 bosses', blurb: 'Appears only to those who face what they dread.' },
  { id: 'azure-dragon', name: 'Azure Dragon', family: 'Mythic', element: 'storm', rarity: 'legendary', body: 'dragon', colors: ['#8fd3ff', '#2148c7', '#ffe08a'], source: 'milestone', unlock: 'Reach level 25', blurb: 'Rides the storm clouds above the east.' },
  { id: 'phoenix', name: 'Phoenix', family: 'Mythic', element: 'fire', rarity: 'legendary', body: 'phoenix', colors: ['#ffe08a', '#ff3d3d', '#ff8a3d'], source: 'milestone', unlock: 'Reach a 30-day combo', blurb: 'Every reset only makes it brighter.' },
  // Secrets.
  { id: 'lunar-moth', name: 'Lunar Moth', family: 'Elemental', element: 'moon', rarity: 'rare', body: 'moth', colors: ['#f4ecff', '#8b6bff', '#bff6ff'], source: 'secret', unlock: 'Clear a quest between midnight and 3 a.m.', blurb: 'Only flies for night owls.' },
  { id: 'chaos-wyrm', name: 'Chaos Wyrm', family: 'Mythic', element: 'void', rarity: 'epic', body: 'wyrm', colors: ['#d79bff', '#3a0b6e', '#ff3d6e'], source: 'secret', unlock: 'Roll a 1 on the Lucky Roll', blurb: 'Born from bad luck. Brings good luck. Probably.' },
  { id: 'thunderbird', name: 'Thunderbird', family: 'Mythic', element: 'storm', rarity: 'legendary', body: 'thunderbird', colors: ['#fff36b', '#ff9f1a', '#7af3ff'], source: 'secret', unlock: 'Close 5 Red Gates', blurb: 'Its wingbeat is the thunder you hear before a gate opens.' },
  ...HUMAN_PETS,
]

export const petById = (id: string) => PETS.find(p => p.id === id)

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return (h ^ (h >>> 15)) >>> 0
}
const unit = (text: string) => hash(text) / 4294967296

// ---- Eggs ----

/** Chance a source drops a pet egg. Tuned for about one new pet a week with most dailies done. */
export const EGG_CHANCE = { perfect: 0.15, golden: 0.08, gate: 0.2, boss: 0.25, main: 0.1, roll20: 1, roll18: 0.3 } as const
export type EggSource = keyof typeof EGG_CHANCE

const EGG_WEIGHT: Record<PetRarity, number> = { common: 4, rare: 3, epic: 2, legendary: 1 }

/** Quest clears an egg needs before it hatches. */
export const HATCH_CLEARS: Record<PetRarity, number> = { common: 5, rare: 8, epic: 12, legendary: 20 }

/**
 * Whether a source drops an egg, and which pet is inside: a pet you don't have
 * and isn't already in an egg, weighted towards commoner ones. Null = no egg.
 */
export function rollEgg(seed: string, source: EggSource, sourceId: string, taken: Set<string>): string | null {
  if (unit(`${seed}:egg:${sourceId}`) >= EGG_CHANCE[source]) return null
  const pool = PETS.filter(p => p.source === 'egg' && !taken.has(p.id))
  if (!pool.length) return null
  const total = pool.reduce((n, p) => n + EGG_WEIGHT[p.rarity], 0)
  let r = unit(`${seed}:egg-pick:${sourceId}`) * total
  for (const p of pool) {
    if (r < EGG_WEIGHT[p.rarity]) return p.id
    r -= EGG_WEIGHT[p.rarity]
  }
  return pool[pool.length - 1].id
}

// ---- Growth ----

/** Pet XP for each level (index = level - 1). Pip has a sixth level (its old Elder form). */
export const PET_LEVEL_XP = [0, 10, 30, 70, 140, 250]
export const PET_STAGE_NAMES = ['Hatchling', 'Young', 'Adult', 'Elder', 'Ascended', 'Mythic']
/** Affection levels for human companions. */
export const AFFECTION_NAMES = ['Stranger', 'Friend', 'Close', 'Sweetheart', 'Soulmate']
/** Affection XP for each date-night quest you clear with her. */
export const COMPANION_DATE_XP = 15
/** Pip's art keeps its own stage names. */
export const PIP_STAGES = ['egg', 'hatchling', 'sprite', 'wisp', 'drake', 'elder']
/** XP while active: per quest cleared, per perfect day. */
export const PET_XP = { clear: 1, perfect: 5 }

export interface PetMilestones {
  bestCombo: number
  level: number
  bossesDefeated: number
  gatesCleared: number
  hiddenIds: Set<string>
}

const MILESTONE: Record<string, (m: PetMilestones) => boolean> = {
  'frost-owl': m => m.bestCombo >= 7,
  qilin: m => m.bossesDefeated >= 5,
  'azure-dragon': m => m.level >= 25,
  phoenix: m => m.bestCombo >= 30,
  'lunar-moth': m => m.hiddenIds.has('night-owl'),
  'chaos-wyrm': m => m.hiddenIds.has('snake-eyes'),
  thunderbird: m => m.gatesCleared >= 5,
}

export interface OwnedPet {
  def: PetDef
  name: string
  xp: number
  /** 1-based level; its stage name is PET_STAGE_NAMES[level - 1]. */
  level: number
  stage: string
  /** XP for the next level, or null at max. */
  nextXp: number | null
  /** Pets only (human companions don't get sick): 0-100, and how it's doing. */
  health: number | null
  condition: PetCondition | null
  /** Dead pets: quest clears still needed to revive it. */
  reviveLeft: number
  /** Reached max level: its final form (see EVOLVED_NAMES), stronger perk and ability. */
  evolved: boolean
  form: string | null
  /** Its once-a-day ability, from level ABILITY_LEVEL (pets only). */
  ability: PetAbility | null
}

export type PetCondition = 'healthy' | 'weak' | 'sick' | 'critical' | 'dead'

export interface PetEgg {
  record: BonusRecord
  pet: PetDef
  clears: number
  needed: number
}

export interface PetsInput {
  /** Skill effects: multiplier on neglect damage, and quest clears to revive a fallen pet. */
  damageScale?: number
  reviveClears?: number
  completions: Completion[]
  /** Perfect days (YYYY-MM-DD). */
  perfectDays: string[]
  bonuses: BonusRecord[]
  milestones: PetMilestones
  names?: Record<string, string>
  pipName?: string
  /** Pip keeps the progress it made before pets could be swapped. */
  pipHeadStart: number
  /** Date-night quests cleared, per companion id. */
  dateClears?: Map<string, number>
  /** Finished game days, oldest first: how many dailies were missed (neglect hurts pets). */
  days?: NeglectDay[]
}

export interface NeglectDay {
  day: string
  /** When the game day ended (ms). */
  end: number
  missed: number
  perfect: boolean
  /** Recovery Days don't count. */
  rest: boolean
}

/**
 * Neglect (owner, Nov 2026: "make the pets die slowly if I don't do my dailies").
 * The pet by your side loses 8 health per missed daily (at most 40 a day); pets
 * resting in the sanctuary lose half, once they've been by your side at least
 * once. A perfect day heals 15. At 0 a pet dies: it becomes a ghost, loses all
 * its growth, and comes back after 10 more quest clears at 50 health, level 1.
 * Human companions are exempt.
 */
export const PET_HEALTH = { max: 100, missDamage: 8, maxDailyDamage: 40, perfectHeal: 15, restingShare: 0.5, reviveClears: 10, reviveHealth: 50 }

export const conditionOf = (health: number): PetCondition => (health <= 0 ? 'dead' : health < 15 ? 'critical' : health < 40 ? 'sick' : health < 70 ? 'weak' : 'healthy')

interface HealthResult {
  health: number
  dead: boolean
  /** Growth before this moment is lost (its latest death), or 0. */
  lostBefore: number
  reviveLeft: number
}

function simulateHealth(id: string, days: NeglectDay[], completions: Completion[], activeAt: (t: number) => string, firstActive: number | null, scale = 1, reviveClears: number = PET_HEALTH.reviveClears): HealthResult {
  if (firstActive === null) return { health: PET_HEALTH.max, dead: false, lostBefore: 0, reviveLeft: 0 }
  const clears = [...completions].sort((a, b) => a.createdAt - b.createdAt)
  let health = PET_HEALTH.max
  let diedAt: number | null = null
  let lostBefore = 0
  const reviveTime = (since: number) => clears.filter(c => c.createdAt > since)[reviveClears - 1]?.createdAt ?? null
  for (const d of days) {
    if (d.end <= firstActive) continue
    if (diedAt !== null) {
      const back = reviveTime(diedAt)
      if (back === null || back >= d.end) continue
      diedAt = null
      health = PET_HEALTH.reviveHealth
    }
    if (d.rest) continue
    const share = activeAt(d.end - 1) === id ? 1 : PET_HEALTH.restingShare
    if (d.perfect) health = Math.min(PET_HEALTH.max, health + PET_HEALTH.perfectHeal * share)
    else health -= Math.min(PET_HEALTH.maxDailyDamage, d.missed * PET_HEALTH.missDamage) * share * scale
    if (health <= 0) {
      health = 0
      diedAt = d.end
      lostBefore = d.end
    }
  }
  if (diedAt !== null) {
    const back = reviveTime(diedAt)
    if (back !== null) {
      health = PET_HEALTH.reviveHealth
      diedAt = null
    }
  }
  const done = diedAt === null ? 0 : clears.filter(c => c.createdAt > diedAt!).length
  return { health: Math.round(health), dead: diedAt !== null, lostBefore, reviveLeft: diedAt === null ? 0 : reviveClears - done }
}

export interface PetsState {
  owned: OwnedPet[]
  active: OwnedPet
  eggs: PetEgg[]
  /** Pets you don't have yet that are on the way, and how many secrets are still hidden. */
  missing: PetDef[]
}

/**
 * Which pets you own (Pip, hatched eggs, milestones and secrets met), which eggs
 * are still hatching, which pet is active, and each pet's growth: XP is earned
 * only while a pet is active (one per quest cleared, five per perfect day).
 */
export function petsState(i: PetsInput): PetsState {
  const owned = new Set<string>(['pip'])
  const eggs: PetEgg[] = []
  for (const r of i.bonuses.filter(b => b.kind === 'egg').sort((a, b) => a.createdAt - b.createdAt)) {
    const pet = petById(r.value)
    if (!pet || owned.has(pet.id)) continue
    const clears = i.completions.filter(c => c.createdAt >= r.createdAt).length
    const needed = HATCH_CLEARS[pet.rarity]
    if (clears >= needed) owned.add(pet.id)
    else eggs.push({ record: r, pet, clears, needed })
  }
  for (const [id, met] of Object.entries(MILESTONE)) if (met(i.milestones)) owned.add(id)
  // Human companions you bought (a refund removes the record).
  for (const r of i.bonuses) if (r.kind === 'companion' && HUMAN_PETS.some(h => h.id === r.value)) owned.add(r.value)

  // Who was active when: the latest switch to a pet you owned at that point wins.
  const switches = i.bonuses.filter(b => b.kind === 'pet' && owned.has(b.value)).sort((a, b) => a.createdAt - b.createdAt)
  const activeAt = (t: number) => {
    let id = 'pip'
    for (const s of switches) {
      if (s.createdAt > t) break
      id = s.value
    }
    return id
  }
  // A "tamer" pet by your side shields every pet from part of the neglect damage.
  const currentId = switches.length ? switches[switches.length - 1].value : 'pip'
  let scale = i.damageScale ?? 1
  const tamer = PET_PERKS[currentId]?.kind === 'tamer' ? petById(currentId) : undefined
  if (tamer) {
    const raw = i.completions.filter(c => activeAt(c.createdAt) === currentId).length * PET_XP.clear
    let lv = 1
    while (lv < 5 && raw >= PET_LEVEL_XP[lv]) lv++
    scale *= Math.max(0.3, 1 - perkAmount({ id: tamer.id, rarity: tamer.rarity, level: lv, evolved: lv === 5 }))
  }
  // Health first: a pet that died loses the growth it had before.
  const health = new Map<string, HealthResult>()
  for (const id of owned) {
    if (HUMAN_PETS.some(h => h.id === id)) continue
    const first = id === 'pip' ? 0 : switches.find(s => s.value === id)?.createdAt ?? null
    health.set(id, simulateHealth(id, i.days ?? [], i.completions, activeAt, first, scale, i.reviveClears))
  }
  const lost = (id: string) => health.get(id)?.lostBefore ?? 0
  const xp = new Map<string, number>([['pip', lost('pip') ? 0 : i.pipHeadStart]])
  for (const c of i.completions) {
    const id = activeAt(c.createdAt)
    if (c.createdAt <= lost(id)) continue
    xp.set(id, (xp.get(id) ?? 0) + PET_XP.clear)
  }
  for (const [id, n] of i.dateClears ?? []) xp.set(id, (xp.get(id) ?? 0) + n * COMPANION_DATE_XP)
  const lastClear = new Map<string, number>()
  for (const c of i.completions) lastClear.set(c.day, Math.max(lastClear.get(c.day) ?? 0, c.createdAt))
  for (const d of i.perfectDays) {
    const at = lastClear.get(d) ?? 0
    const id = activeAt(at)
    if (at <= lost(id)) continue
    xp.set(id, (xp.get(id) ?? 0) + PET_XP.perfect)
  }

  const make = (def: PetDef): OwnedPet => {
    const h = health.get(def.id)
    const x = h?.dead ? 0 : xp.get(def.id) ?? 0
    const maxLevel = def.id === 'pip' ? 6 : 5
    let level = 1
    while (level < maxLevel && x >= PET_LEVEL_XP[level]) level++
    return {
      def,
      name: (def.id === 'pip' ? i.pipName : i.names?.[def.id])?.trim() || def.name,
      xp: x,
      level,
      stage: def.id === 'pip' ? PIP_STAGES[level - 1] : def.human ? AFFECTION_NAMES[level - 1] : PET_STAGE_NAMES[level - 1],
      nextXp: level < maxLevel ? PET_LEVEL_XP[level] : null,
      health: h ? h.health : null,
      condition: h ? (h.dead ? 'dead' : conditionOf(h.health)) : null,
      reviveLeft: h?.reviveLeft ?? 0,
      evolved: !def.human && level === maxLevel,
      form: !def.human && level === maxLevel ? EVOLVED_NAMES[def.id] ?? null : null,
      ability: !def.human && level >= ABILITY_LEVEL ? petAbility(def.id, def.element) : null,
    }
  }
  const list = PETS.filter(p => owned.has(p.id)).map(make)
  const current = switches.length ? switches[switches.length - 1].value : 'pip'
  const active = list.find(p => p.def.id === current) ?? list[0]
  const pending = new Set(eggs.map(e => e.pet.id))
  return { owned: list, active, eggs, missing: PETS.filter(p => !owned.has(p.id) && !pending.has(p.id)) }
}

// ---- Human companions: outfits, talk, date nights ----

/** Outfits she has unlocked at your affection level. */
export const unlockedOutfits = (h: HumanCompanion, level: number) => h.outfits.filter(o => o.level <= level)

export type HumanAction = 'compliment' | 'gift' | 'hangout'

const LINES: Record<HumanCompanion['personality'], { idle: string[]; done: string[]; left: string[]; late: string[] }> = {
  sunny: {
    idle: ['Hiii! I saved you a seat. What are we conquering today?', "You look cute when you're focused, you know.", 'Okay but your streak? Kind of hot.'],
    done: ['Perfect day! Come here, you deserve a hug. A long one.', "You did EVERYTHING. I'm telling everyone. Mostly myself."],
    left: ['{n} left! Finish them and I owe you a date~', "Just {n} more. I'll be right here cheering."],
    late: ["It's late... sleep is a daily too. Want me to stay till you drift off?"],
  },
  cool: {
    idle: ["Took you long enough. ...I wasn't waiting. Much.", "Fine, I'll watch you grind. Don't make it boring.", 'You clear your quests, I clear my schedule for you. Deal?'],
    done: ["Perfect day. Not bad. ...Okay, kind of impressive.", "All clear. You've earned some co-op time with me."],
    left: ['{n} to go. Lose and you owe me a rematch.', "Still {n} left. I'll pretend I'm not checking."],
    late: ["Go to bed. I'll still be cute tomorrow."],
  },
  sweet: {
    idle: ['Good to see you. I made you a latte. Extra foam, like you like it.', "How are you, really? I've got time.", 'You have no idea how much I like seeing you show up.'],
    done: ["A perfect day. I'm so proud of you, honestly.", 'Everything done? Then tonight is just for us.'],
    left: ["{n} more and you're free. I'll keep the coffee warm.", "Only {n} left, love. One at a time."],
    late: ['Hey. Phone down soon, okay? I want you rested.'],
  },
  elegant: {
    idle: ['Discipline looks good on you.', 'Shall we begin? I do so enjoy watching you work.', "Mm. You're early. I like that."],
    done: ['Flawless. Dinner is on me tonight.', 'A perfect day. You may take my arm.'],
    left: ['{n} remaining. Finish them, and you have my full attention.', "{n} left. I don't date men who quit halfway."],
    late: ['It is late, darling. Rest is part of excellence.'],
  },
  sporty: {
    idle: ["Let's go! Warm-up first, then you can flirt with me.", "Hydrate, champ. I'm watching.", 'You, me, a workout, and then smoothies. Non-negotiable.'],
    done: ["PERFECT DAY! High five! ...No, a hug. You've earned it.", "That's my training partner. So proud."],
    left: ['{n} reps... I mean quests left. Push!', "Only {n} left, don't you dare tap out."],
    late: ['Recovery is gains too. Bed. Now. Smile for me first.'],
  },
  regal: {
    idle: ['My hunter returns. Kneel... or better, get to work.', 'The gate trembles when you act. So do I, a little.', 'You may speak, hunter. Briefly. Then go conquer.'],
    done: ['A perfect hunt. You may sit beside my throne tonight.', 'Flawless. I chose well.'],
    left: ['{n} trials remain. Clear them and claim your reward.', "{n} left. My favour isn't given to the idle."],
    late: ['Even queens sleep. Rest, my hunter.'],
  },
}

const REACTIONS: Record<HumanAction, string[]> = {
  compliment: ['*blushes* Say that again. Slower.', "Stop it... no, don't stop.", 'Flattery will get you everywhere with me.', '*hides a smile* You\'re dangerous, you know that?'],
  gift: ['For me? You remembered! *happy gasp*', 'This is perfect. You\'re perfect. Okay, almost.', '*hugs it* I\'m keeping this forever.'],
  hangout: ['*leans on your shoulder* This is nice.', "Let's just stay like this a bit.", '*laughs at your joke* You\'re ridiculous. Again!'],
}

/** What she says right now. */
export function humanLine(h: HumanCompanion, ctx: { dailiesLeft: number; dailiesTotal: number; hour: number }, n: number): string {
  const l = LINES[h.personality]
  const pool = ctx.hour >= 23 || ctx.hour < 4 ? [...l.late, ...l.idle] : ctx.dailiesTotal > 0 && ctx.dailiesLeft === 0 ? l.done : ctx.dailiesLeft > 0 && ctx.dailiesLeft < ctx.dailiesTotal ? [...l.left, ...l.idle] : l.idle
  return pool[Math.abs(n) % pool.length].replace('{n}', String(ctx.dailiesLeft))
}

export const humanReaction = (action: HumanAction, n: number) => REACTIONS[action][Math.abs(n) % REACTIONS[action].length]

/** Real-life date ideas: self-care and getting out, done "with" her. */
export const DATE_IDEAS: { title: string; description: string; stat: StatKey }[] = [
  { title: 'Cook a proper dinner', description: 'Cook something real, plate it nicely, eat without your phone.', stat: 'VIT' },
  { title: 'Sunset walk', description: 'A 30-minute walk at sunset, no phone, just music or quiet.', stat: 'STR' },
  { title: 'Try a new café', description: 'Go somewhere new and order something you have never had.', stat: 'CHA' },
  { title: 'Dress up and go out', description: 'Put on your best fit and go somewhere: a bar, a gallery, a show.', stat: 'CHA' },
  { title: 'Dance session', description: '20 minutes dancing to your favourite set. Yes, at home counts.', stat: 'STR' },
  { title: 'Grooming day', description: 'Haircut, skincare, a proper shave or a new fragrance.', stat: 'VIT' },
  { title: 'Plan a weekend trip', description: 'Pick a place, a date and a budget for a short trip.', stat: 'WLT' },
  { title: 'Learn something together', description: 'An hour on a course, a language or a skill you have been putting off.', stat: 'INT' },
]

/** Days between date-night ideas. */
export const DATE_EVERY = 4

/** This window's date idea from a companion (the same all window, a new one every 4 days). */
export function dateOffer(seed: string, companionId: string, today: string): { templateId: string; idea: (typeof DATE_IDEAS)[number] } {
  const [y, m, d] = today.split('-').map(Number)
  const window = Math.floor(Date.UTC(y, m - 1, d) / 86_400_000 / DATE_EVERY)
  return { templateId: `date:${companionId}:${window}`, idea: DATE_IDEAS[hash(`${seed}:date:${companionId}:${window}`) % DATE_IDEAS.length] }
}

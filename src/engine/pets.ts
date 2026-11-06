// Pets (owner's picks, Nov 2026): Mythic and Elemental creatures, about one
// new pet a week. They come from rare eggs (dropped by perfect days, Golden
// Quests, Red Gates, bosses and lucky rolls; an egg hatches after a few quest
// clears), from milestones, and from secret conditions. You keep one active
// pet at a time and can swap any time; each pet grows on its own, only while
// it's the active one. Pip is the starter. Cosmetic: pets pay nothing.
// The Shadow Legion may adopt shadow beasts later; not yet.

import type { Completion } from './types'
import type { BonusRecord } from './extras'

export type PetRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type PetFamily = 'Elemental' | 'Mythic' | 'Starter'
export type PetElement = 'fire' | 'water' | 'nature' | 'storm' | 'ice' | 'crystal' | 'moon' | 'light' | 'void' | 'spirit'
/** The body plan the art draws. */
export type PetBody = 'pip' | 'fox' | 'otter' | 'stag' | 'wolf' | 'lynx' | 'tortoise' | 'kitsune' | 'griffin' | 'serpent' | 'owl' | 'dragon' | 'qilin' | 'phoenix' | 'moth' | 'wyrm' | 'thunderbird'
export type PetSource = 'starter' | 'egg' | 'milestone' | 'secret'

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
}

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
}

export interface PetEgg {
  record: BonusRecord
  pet: PetDef
  clears: number
  needed: number
}

export interface PetsInput {
  completions: Completion[]
  /** Perfect days (YYYY-MM-DD). */
  perfectDays: string[]
  bonuses: BonusRecord[]
  milestones: PetMilestones
  names?: Record<string, string>
  pipName?: string
  /** Pip keeps the progress it made before pets could be swapped. */
  pipHeadStart: number
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
  const xp = new Map<string, number>([['pip', i.pipHeadStart]])
  for (const c of i.completions) {
    const id = activeAt(c.createdAt)
    xp.set(id, (xp.get(id) ?? 0) + PET_XP.clear)
  }
  const lastClear = new Map<string, number>()
  for (const c of i.completions) lastClear.set(c.day, Math.max(lastClear.get(c.day) ?? 0, c.createdAt))
  for (const d of i.perfectDays) {
    const id = activeAt(lastClear.get(d) ?? 0)
    xp.set(id, (xp.get(id) ?? 0) + PET_XP.perfect)
  }

  const make = (def: PetDef): OwnedPet => {
    const x = xp.get(def.id) ?? 0
    const maxLevel = def.id === 'pip' ? 6 : 5
    let level = 1
    while (level < maxLevel && x >= PET_LEVEL_XP[level]) level++
    return {
      def,
      name: (def.id === 'pip' ? i.pipName : i.names?.[def.id])?.trim() || def.name,
      xp: x,
      level,
      stage: def.id === 'pip' ? PIP_STAGES[level - 1] : PET_STAGE_NAMES[level - 1],
      nextXp: level < maxLevel ? PET_LEVEL_XP[level] : null,
    }
  }
  const list = PETS.filter(p => owned.has(p.id)).map(make)
  const current = switches.length ? switches[switches.length - 1].value : 'pip'
  const active = list.find(p => p.def.id === current) ?? list[0]
  const pending = new Set(eggs.map(e => e.pet.id))
  return { owned: list, active, eggs, missing: PETS.filter(p => !owned.has(p.id) && !pending.has(p.id)) }
}

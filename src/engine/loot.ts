// Loot drops: collectible cards that fall out of quests. Three kinds:
//  - Idols: original, fictional K-pop / J-pop / C-pop style performers, each
//    with a signature dance move (drawn as a stylised pose on the card).
//  - Relics: odd little trinkets and surprises.
//  - Rizz & Romance: cheeky dating-life loot.
//  - Your own cards, made from images you pick (setCustomCards).
// Big moments (bosses, main quest stages, the strength routine) always drop
// something good; other quests have a 1-in-4 chance. Each month a different
// series is featured and drops twice as often. Duplicates power a card up.

import type { StatKey } from './types'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type CardKind = 'idol' | 'relic'

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']
export const RARITY_NAMES: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }

/** How an anime-style portrait card is drawn (all original characters). */
export interface Portrait {
  hair: string
  style: 'long' | 'twin' | 'bob' | 'pony' | 'buns' | 'wavy'
  eyes: string
  outfit: string
  accent: 'star' | 'ribbon' | 'headphones' | 'flower' | 'crown' | 'none'
  expression: 'smile' | 'wink' | 'cool' | 'grin'
}

/** Dance poses the card art can draw. */
export type Pose = 'wave' | 'heart' | 'spin' | 'point' | 'kick' | 'hips' | 'arms-up' | 'mic' | 'lean' | 'fan'

export interface Card {
  id: string
  kind: CardKind
  name: string
  rarity: Rarity
  /** Which series it belongs to (featured series drop more often). */
  series: string
  /** Flavour text on the card. */
  text: string
  /** Idols. */
  scene?: 'K' | 'J' | 'C' | 'A'
  group?: string
  move?: string
  pose?: Pose
  /** Anime-style portrait art instead of a dance silhouette. */
  portrait?: Portrait
  /** Two colours for the card art. */
  colors?: [string, string]
  /** Relics. */
  icon?: string
  /** Your own cards: the image, from the Life log photo store. */
  photoId?: string
  /** The stat the card is themed on (flavour only). */
  stat?: StatKey
}

/** Series names for the binder. Every card is now one of yours: forged or imported. */
export const SERIES: Record<string, string> = { custom: 'My cards' }

/** Cards you make yourself from your own images (see setCustomCards). */
let customCards: Card[] = []

/**
 * Registers your own cards (made from images you choose) so they drop and show
 * in the binder alongside the built-in set. Called when the game data loads.
 */
export function setCustomCards(list: Card[]): void {
  customCards = list
}

/** A card from one of your own (see CustomCard). */
export const customCard = (c: { id: string; name: string; rarity: Rarity; text: string; photoId: string }): Card => ({
  id: `custom-${c.id}`, kind: 'idol', name: c.name, rarity: c.rarity, text: c.text, photoId: c.photoId, series: 'custom',
})


/** The built-in card set (idols, relics, portraits) was retired in Nov 2026: every card is forged or imported. */
const BUILT_IN: Card[] = []

export const allCards = (): Card[] => [...BUILT_IN, ...customCards]
export const CARDS = BUILT_IN
export const cardById = (id: string) => allCards().find(c => c.id === id)

/** What triggered a roll. Big moments drop better loot. */
export type DropSource = 'boss' | 'main' | 'strength' | 'quest' | 'focus' | 'surprise' | 'goals' | 'perfect' | 'pack' | 'golden' | 'gate' | 'roll'

/** Chance a source drops anything at all ("generous" setting). */
export const DROP_CHANCE: Record<DropSource, number> = { boss: 1, main: 1, strength: 1, quest: 0.25, focus: 0.25, surprise: 0.5, goals: 0.5, perfect: 1, pack: 1, golden: 1, gate: 1, roll: 1 }

/** Rarity odds per source, as weights for common/rare/epic/legendary. */
const RARITY_ODDS: Record<DropSource, [number, number, number, number]> = {
  boss: [0, 0, 70, 30],
  main: [0, 20, 60, 20],
  strength: [0, 65, 28, 7],
  quest: [60, 28, 10, 2],
  focus: [55, 30, 12, 3],
  surprise: [50, 32, 14, 4],
  goals: [40, 40, 16, 4],
  perfect: [0, 60, 30, 10],
  pack: [35, 40, 18, 7],
  golden: [0, 0, 75, 25],
  gate: [0, 55, 35, 10],
  roll: [0, 70, 25, 5],
}

/** A small, well-mixed hash so a roll is stable for the same source. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return (h ^ (h >>> 15)) >>> 0
}
const unit = (text: string) => hash(text) / 4294967296

/**
 * Rolls whether something you just did drops a card, and how rare it is. The
 * same source always rolls the same result (so undo and redo can't farm it).
 * Returns null for no drop. The card itself is then forged (src/db/forge.ts).
 */
export function rollRarity(source: DropSource, sourceId: string, seed: string, opts: { minRarity?: Rarity } = {}): Rarity | null {
  const base = `${seed}:${source}:${sourceId}`
  if (unit(`${base}:chance`) >= DROP_CHANCE[source]) return null
  const odds = RARITY_ODDS[source]
  let r = unit(`${base}:rarity`) * odds.reduce((a, b) => a + b, 0)
  let rarity: Rarity = 'legendary'
  for (let i = 0; i < odds.length; i++) {
    if (r < odds[i]) {
      rarity = RARITIES[i]
      break
    }
    r -= odds[i]
  }
  if (opts.minRarity && RARITIES.indexOf(rarity) < RARITIES.indexOf(opts.minRarity)) rarity = opts.minRarity
  return rarity
}

/**
 * Picks one of the cards you already have (for when a new one can't be forged):
 * the rolled rarity if you have one, else the nearest rarity below, else any.
 */
export function pickOwnedCard(rarity: Rarity, key: string): Card | null {
  const pool = allCards()
  if (!pool.length) return null
  const order = [rarity, ...RARITIES.slice(0, RARITIES.indexOf(rarity)).reverse(), ...RARITIES.slice(RARITIES.indexOf(rarity) + 1)]
  const tier = order.map(r => pool.filter(c => c.rarity === r)).find(t => t.length > 0)!
  return tier[hash(key) % tier.length]
}

/** Copies needed for each power level: 1 copy = ★, 3 = ★★, 6 = ★★★. */
export const STAR_COPIES = [1, 3, 6]
export const stars = (copies: number) => STAR_COPIES.filter(n => copies >= n).length
/** XP each time a duplicate powers a card up a star (XP only, never dollars). */
export const STAR_UP_XP = 15

export interface CollectionEntry {
  card: Card
  copies: number
  stars: number
  firstAt: number
  /** You own at least one holographic copy. */
  foil: boolean
}

/** Your binder: every card you own with its copies and power level. */
export function collection(drops: { cardId: string; createdAt: number; foil?: boolean }[]): Map<string, CollectionEntry> {
  const out = new Map<string, CollectionEntry>()
  for (const d of [...drops].sort((a, b) => a.createdAt - b.createdAt)) {
    const card = cardById(d.cardId)
    if (!card) continue
    const e = out.get(card.id) ?? { card, copies: 0, stars: 0, firstAt: d.createdAt, foil: false }
    // A foil copy counts as two.
    e.copies += d.foil ? 2 : 1
    e.foil = e.foil || !!d.foil
    e.stars = stars(e.copies)
    out.set(card.id, e)
  }
  return out
}

/** XP from duplicates powering cards up. */
export function starUpXp(drops: { cardId: string; createdAt: number; foil?: boolean }[]): number {
  let ups = 0
  for (const e of collection(drops).values()) ups += Math.max(0, e.stars - 1)
  return ups * STAR_UP_XP
}

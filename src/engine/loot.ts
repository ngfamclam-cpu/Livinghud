// Loot drops: collectible cards that fall out of quests. Three kinds:
//  - Idols: original, fictional K-pop / J-pop / C-pop style performers, each
//    with a signature dance move (drawn as a stylised pose on the card).
//  - Relics: odd little trinkets and surprises.
//  - Playing cards: a full deck plus two jokers.
// Big moments (bosses, main quest stages, the strength routine) always drop
// something good; other quests have a 1-in-4 chance. Each month a different
// series is featured and drops twice as often. Duplicates power a card up.

import type { StatKey } from './types'

export type Rarity = 'common' | 'rare' | 'epic' | 'legendary'
export type CardKind = 'idol' | 'relic' | 'playing'

export const RARITIES: Rarity[] = ['common', 'rare', 'epic', 'legendary']
export const RARITY_NAMES: Record<Rarity, string> = { common: 'Common', rare: 'Rare', epic: 'Epic', legendary: 'Legendary' }

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
  scene?: 'K' | 'J' | 'C'
  group?: string
  move?: string
  pose?: Pose
  /** Two colours for the card art. */
  colors?: [string, string]
  /** Relics. */
  icon?: string
  /** Playing cards. */
  suit?: '♠' | '♥' | '♦' | '♣' | '★'
  rank?: string
  /** The stat the card is themed on (flavour only). */
  stat?: StatKey
}

export const SERIES: Record<string, string> = {
  'neon-seoul': 'Neon Seoul (K-pop)',
  'tokyo-spark': 'Tokyo Spark (J-pop)',
  'shanghai-silk': 'Shanghai Silk (C-pop)',
  'odd-relics': 'Odd Relics',
  'dungeon-pantry': 'Dungeon Pantry',
  deck: 'The Deck',
}

const idol = (id: string, name: string, scene: 'K' | 'J' | 'C', group: string, move: string, pose: Pose, rarity: Rarity, colors: [string, string], text: string): Card => ({
  id: `idol-${id}`,
  kind: 'idol',
  name,
  scene,
  group,
  move,
  pose,
  rarity,
  colors,
  text,
  series: scene === 'K' ? 'neon-seoul' : scene === 'J' ? 'tokyo-spark' : 'shanghai-silk',
})

/** Fictional performers. Any resemblance to real people is unintended. */
const IDOLS: Card[] = [
  // Neon Seoul: K-pop style groups (fictional)
  idol('haneul', 'Haneul', 'K', 'NOVA//9', 'Skyline Wave', 'wave', 'rare', ['#ff4fa3', '#3a1c71'], 'Main dancer. Hits every count like it owes her money.'),
  idol('yuri', 'Yuri', 'K', 'NOVA//9', 'Heart Bomb', 'heart', 'rare', ['#ff7eb3', '#5f2c82'], 'The heart sign that started a fan war.'),
  idol('seoa', 'Seo-a', 'K', 'NOVA//9', 'Midnight Spin', 'spin', 'epic', ['#7f5af0', '#ff4fa3'], 'Spins so fast the lightstick ocean goes quiet.'),
  idol('jiwoo', 'Ji-woo', 'K', 'VELVET RUSH', 'Mic Drop Encore', 'mic', 'epic', ['#e94560', '#16213e'], 'Leader. Ends every set with a dropped mic and a smirk.'),
  idol('minji', 'Min-ji', 'K', 'VELVET RUSH', 'Point Choreo', 'point', 'rare', ['#f9a826', '#c2185b'], 'Points at the camera. The camera never recovers.'),
  idol('daeun', 'Da-eun', 'K', 'VELVET RUSH', 'Hip Sway', 'hips', 'rare', ['#ff6f91', '#845ec2'], 'Smooth enough to stop a stadium mid-chant.'),
  idol('sora-k', 'So-ra', 'K', 'LUNAR CODE', 'Moon Kick', 'kick', 'legendary', ['#00d2ff', '#3a1c71'], 'A high kick choreographed in zero gravity. Probably.'),
  idol('hyejin', 'Hye-jin', 'K', 'LUNAR CODE', 'Victory Arms', 'arms-up', 'epic', ['#43e97b', '#1e3c72'], 'Arms up for the final chorus. The crowd follows.'),
  // Tokyo Spark: J-pop style (fictional)
  idol('aoi', 'Aoi', 'J', 'SAKURA//DRIVE', 'Petal Twirl', 'spin', 'rare', ['#ffb7c5', '#6a3093'], 'Leaves cherry blossoms in her wake. The cleaners are tired.'),
  idol('hina', 'Hina', 'J', 'SAKURA//DRIVE', 'Peace Pop', 'point', 'rare', ['#ffd166', '#ef476f'], 'Double peace sign, triple the energy.'),
  idol('rin', 'Rin', 'J', 'SAKURA//DRIVE', 'Fan Flourish', 'fan', 'epic', ['#e63946', '#1d3557'], 'Folding-fan choreography, sharp as a blade.'),
  idol('mio', 'Mio', 'J', 'ELECTRO MAID', 'Glitch Lean', 'lean', 'epic', ['#00f5d4', '#9b5de5'], 'Leans past the point of physics. Glitches on purpose.'),
  idol('yuna', 'Yuna', 'J', 'ELECTRO MAID', 'Arcade Heart', 'heart', 'rare', ['#f15bb5', '#00bbf9'], 'Insert coin to continue loving this card.'),
  idol('kaede', 'Kaede', 'J', 'ELECTRO MAID', 'Final Boss Pose', 'arms-up', 'legendary', ['#fee440', '#9b5de5'], 'The stage goes dark. Only she is lit. Game over.'),
  idol('saki', 'Saki', 'J', 'HARAJUKU HEX', 'Hex Kick', 'kick', 'rare', ['#ff99c8', '#a9def9'], 'Platform boots, perfect extension.'),
  idol('nanami', 'Nanami', 'J', 'HARAJUKU HEX', 'Wave Machine', 'wave', 'epic', ['#c77dff', '#3c096c'], 'Body wave so smooth it has its own fan club.'),
  // Shanghai Silk: C-pop style (fictional)
  idol('meilin', 'Mei Lin', 'C', 'JADE HORIZON', 'Silk Ribbon Spin', 'spin', 'epic', ['#d00000', '#ffba08'], 'Ribbon dance meets stadium pyrotechnics.'),
  idol('xiaoyu', 'Xiao Yu', 'C', 'JADE HORIZON', 'Lantern Lean', 'lean', 'rare', ['#ff8c42', '#7b2d26'], 'Glows like a lantern festival in human form.'),
  idol('lanfei', 'Lan Fei', 'C', 'JADE HORIZON', 'Dragon Arms', 'arms-up', 'legendary', ['#06d6a0', '#073b4c'], 'The finale where the stage dragon roars with her.'),
  idol('ruoxi', 'Ruo Xi', 'C', 'NEON PEONY', 'Peony Pose', 'hips', 'rare', ['#ff70a6', '#70d6ff'], 'Poses like a magazine cover, laughs like a best friend.'),
  idol('qingyi', 'Qing Yi', 'C', 'NEON PEONY', 'Mic Spin', 'mic', 'epic', ['#ffd60a', '#003566'], 'Twirls the mic stand like a staff. Never drops it.'),
  idol('yanyan', 'Yan Yan', 'C', 'NEON PEONY', 'Fan Cascade', 'fan', 'rare', ['#ef476f', '#118ab2'], 'Two fans, one cascade, zero missed beats.'),
  idol('shuang', 'Shuang', 'C', 'CRIMSON SILK', 'Point Break', 'point', 'rare', ['#e5383b', '#161a1d'], 'Points to the back row. The back row screams.'),
  idol('ziyi', 'Zi Yi', 'C', 'CRIMSON SILK', 'Heart Lantern', 'heart', 'epic', ['#ff006e', '#3a0ca3'], 'Hearts that float up like sky lanterns.'),
]

const relic = (id: string, name: string, icon: string, rarity: Rarity, text: string, series: 'odd-relics' | 'dungeon-pantry', stat?: StatKey): Card => ({
  id: `relic-${id}`, kind: 'relic', name, icon, rarity, text, series, stat,
})

const RELICS: Card[] = [
  relic('duck', 'Suspicious Rubber Duck', '🦆', 'common', 'It has seen your code. It says nothing.', 'odd-relics', 'INT'),
  relic('sock', 'Single Lost Sock', '🧦', 'common', 'Its partner is in another dimension.', 'odd-relics', 'AGI'),
  relic('cone', 'Traffic Cone of Authority', '🚧', 'common', 'Wear it and nobody questions you.', 'odd-relics', 'CHA'),
  relic('rock', 'Pet Rock (Level 99)', '🪨', 'rare', 'Has never once missed a daily.', 'odd-relics', 'VIT'),
  relic('cassette', 'Mixtape From 2009', '📼', 'rare', 'Track 3 is a banger. Track 4 is an apology.', 'odd-relics', 'CHA'),
  relic('crystal', 'Crystal of Mild Clarity', '🔮', 'rare', 'Shows the future, but only the boring parts.', 'odd-relics', 'INT'),
  relic('crown', 'Paper Crown of the Main Character', '👑', 'epic', 'From a cracker. Worn with total conviction.', 'odd-relics', 'CHA'),
  relic('dice', 'Loaded Dice of Fate', '🎲', 'epic', 'Always roll a 6. Use responsibly.', 'odd-relics', 'WLT'),
  relic('key', 'Key to an Unknown Door', '🗝️', 'epic', 'Somewhere, a door is waiting.', 'odd-relics', 'AGI'),
  relic('portal', 'Pocket Gate', '🌀', 'legendary', 'Leads to a dungeon full of unfinished chores.', 'odd-relics', 'AGI'),
  relic('phoenix', 'Phoenix Feather', '🪶', 'legendary', 'Brings a broken streak back once. (Emotionally.)', 'odd-relics', 'VIT'),
  relic('goldfish', 'Goldfish With a Business Plan', '🐠', 'rare', 'Three-second memory, five-year vision.', 'odd-relics', 'WLT'),
  relic('ufo', 'Tiny UFO', '🛸', 'epic', 'Abducts one bad habit per week.', 'odd-relics', 'INT'),
  relic('gnome', 'Gym Gnome', '🧙', 'rare', 'Judges your form silently.', 'odd-relics', 'STR'),
  relic('cactus', 'Emotional Support Cactus', '🌵', 'common', 'Needs less care than you do.', 'odd-relics', 'VIT'),
  relic('robot', 'Wind-up Hype Robot', '🤖', 'rare', 'Says "LET’S GO" at random times.', 'odd-relics', 'CHA'),
  relic('ramen', 'Dungeon Instant Ramen', '🍜', 'common', 'Restores 30 HP and some dignity.', 'dungeon-pantry', 'VIT'),
  relic('boba', 'Legendary Boba', '🧋', 'rare', 'Exactly the right amount of pearls.', 'dungeon-pantry', 'VIT'),
  relic('onigiri', 'Triangle of Power', '🍙', 'common', 'Portable. Perfect. Undefeated.', 'dungeon-pantry', 'VIT'),
  relic('dumpling', 'Lucky Dumpling', '🥟', 'rare', 'One of them has a coin inside.', 'dungeon-pantry', 'WLT'),
  relic('coffee', 'Bottomless Coffee', '☕', 'epic', 'Every sip resets your focus timer.', 'dungeon-pantry', 'INT'),
  relic('egg', 'Golden Protein Egg', '🥚', 'epic', '+10 STR. Do not boil.', 'dungeon-pantry', 'STR'),
  relic('mochi', 'Mochi of Infinite Chill', '🍡', 'rare', 'Lowers stress by an amount.', 'dungeon-pantry', 'VIT'),
  relic('energy', 'Neon Energy Drink', '🥤', 'common', 'Tastes like 3 a.m. and bad decisions.', 'dungeon-pantry', 'AGI'),
  relic('chili', 'Chili of Courage', '🌶️', 'rare', 'Eat it before asking someone out.', 'dungeon-pantry', 'CHA'),
  relic('cake', 'Level-Up Cake', '🎂', 'legendary', 'Appears only when someone becomes stronger.', 'dungeon-pantry', 'STR'),
]

const SUITS = ['♠', '♥', '♦', '♣'] as const
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const PLAYING: Card[] = [
  ...SUITS.flatMap(suit =>
    RANKS.map<Card>(rank => ({
      id: `card-${rank}${suit}`,
      kind: 'playing',
      name: `${rank === 'A' ? 'Ace' : rank === 'J' ? 'Jack' : rank === 'Q' ? 'Queen' : rank === 'K' ? 'King' : rank} of ${{ '♠': 'Spades', '♥': 'Hearts', '♦': 'Diamonds', '♣': 'Clubs' }[suit]}`,
      suit,
      rank,
      rarity: rank === 'A' ? 'epic' : ['J', 'Q', 'K'].includes(rank) ? 'rare' : 'common',
      text: rank === 'A' ? 'Collect all four aces for a full set of power.' : 'Part of the deck. Collect them all.',
      series: 'deck',
    })),
  ),
  { id: 'card-joker-red', kind: 'playing', name: 'Red Joker', suit: '★', rank: 'JOKER', rarity: 'legendary', text: 'Wild. Chaotic. Probably plotting something.', series: 'deck' },
  { id: 'card-joker-black', kind: 'playing', name: 'Black Joker', suit: '★', rank: 'JOKER', rarity: 'legendary', text: 'Laughs last. Laughs loudest.', series: 'deck' },
]

export const CARDS: Card[] = [...IDOLS, ...RELICS, ...PLAYING]
export const cardById = (id: string) => CARDS.find(c => c.id === id)

/** What triggered a roll. Big moments drop better loot. */
export type DropSource = 'boss' | 'main' | 'strength' | 'quest' | 'focus' | 'surprise' | 'goals'

/** Chance a source drops anything at all ("generous" setting). */
export const DROP_CHANCE: Record<DropSource, number> = { boss: 1, main: 1, strength: 1, quest: 0.25, focus: 0.25, surprise: 0.5, goals: 0.5 }

/** Rarity odds per source, as weights for common/rare/epic/legendary. */
const RARITY_ODDS: Record<DropSource, [number, number, number, number]> = {
  boss: [0, 0, 70, 30],
  main: [0, 20, 60, 20],
  strength: [0, 65, 28, 7],
  quest: [60, 28, 10, 2],
  focus: [55, 30, 12, 3],
  surprise: [50, 32, 14, 4],
  goals: [40, 40, 16, 4],
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

/** This month's featured series: its cards drop twice as often. Changes every month. */
export function featuredSeries(month: string, seed: string): string {
  const keys = Object.keys(SERIES)
  return keys[hash(`${seed}:series:${month}`) % keys.length]
}

/**
 * Rolls a drop for something you just did. The same source always rolls the
 * same result (so undo and redo can't farm it). Returns null for no drop.
 */
export function rollDrop(source: DropSource, sourceId: string, seed: string, month: string): Card | null {
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
  const featured = featuredSeries(month, seed)
  const pool = CARDS.filter(c => c.rarity === rarity)
  const weights = pool.map(c => (c.series === featured ? 2 : 1))
  let pick = unit(`${base}:card`) * weights.reduce((a, b) => a + b, 0)
  for (let i = 0; i < pool.length; i++) {
    if (pick < weights[i]) return pool[i]
    pick -= weights[i]
  }
  return pool[pool.length - 1]
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
}

/** Your binder: every card you own with its copies and power level. */
export function collection(drops: { cardId: string; createdAt: number }[]): Map<string, CollectionEntry> {
  const out = new Map<string, CollectionEntry>()
  for (const d of [...drops].sort((a, b) => a.createdAt - b.createdAt)) {
    const card = cardById(d.cardId)
    if (!card) continue
    const e = out.get(card.id) ?? { card, copies: 0, stars: 0, firstAt: d.createdAt }
    e.copies++
    e.stars = stars(e.copies)
    out.set(card.id, e)
  }
  return out
}

/** XP from duplicates powering cards up. */
export function starUpXp(drops: { cardId: string; createdAt: number }[]): number {
  let ups = 0
  for (const e of collection(drops).values()) ups += Math.max(0, e.stars - 1)
  return ups * STAR_UP_XP
}

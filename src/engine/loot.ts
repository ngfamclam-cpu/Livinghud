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

export const SERIES: Record<string, string> = {
  'neon-seoul': 'Neon Seoul (K-pop)',
  'tokyo-spark': 'Tokyo Spark (J-pop)',
  'shanghai-silk': 'Shanghai Silk (C-pop)',
  starlight: 'Starlight Stage (anime)',
  'odd-relics': 'Odd Relics',
  'dungeon-pantry': 'Dungeon Pantry',
  rizz: 'Rizz & Romance',
  custom: 'My cards',
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

const anime = (id: string, name: string, group: string, move: string, rarity: Rarity, colors: [string, string], portrait: Portrait, text: string): Card => ({
  id: `anime-${id}`, kind: 'idol', scene: 'A', name, group, move, rarity, colors, portrait, text, series: 'starlight',
})

/** Starlight Stage: original anime-style idols, drawn as portraits. */
const ANIME: Card[] = [
  anime('hikari', 'Hikari', 'STARLIGHT//7', 'Shooting Star Wink', 'rare', ['#ff9ad5', '#5b2a86'], { hair: '#f4c2d7', style: 'twin', eyes: '#ff5fa2', outfit: '#ff5fa2', accent: 'star', expression: 'wink' }, 'Winks once per show. Fans count it as a holiday.'),
  anime('ren', 'Ren', 'STARLIGHT//7', 'Thunder Step', 'epic', ['#5ee7ff', '#1b1f5e'], { hair: '#2b2f77', style: 'bob', eyes: '#3fd0ff', outfit: '#3a86ff', accent: 'headphones', expression: 'cool' }, 'Produces the tracks, then out-dances everyone to them.'),
  anime('mika', 'Mika', 'STARLIGHT//7', 'Ribbon Rush', 'rare', ['#ffd36e', '#e2558a'], { hair: '#f6a440', style: 'pony', eyes: '#ff7b00', outfit: '#ff006e', accent: 'ribbon', expression: 'grin' }, 'Energy drink in human form. Never runs out.'),
  anime('yuki', 'Yuki', 'STARLIGHT//7', 'Snowfall Spin', 'legendary', ['#e0f4ff', '#6c8cff'], { hair: '#f2f6ff', style: 'long', eyes: '#7aa7ff', outfit: '#8aa9ff', accent: 'crown', expression: 'smile' }, 'Centre position. The snow machine follows her.'),
  anime('akane', 'Akane', 'CRIMSON CORE', 'Blaze Kick', 'epic', ['#ff5a5f', '#2b0b3f'], { hair: '#c1121f', style: 'pony', eyes: '#ffbe0b', outfit: '#e63946', accent: 'none', expression: 'grin' }, 'Kicks so high the lighting crew ducks.'),
  anime('sumire', 'Sumire', 'CRIMSON CORE', 'Violet Hour', 'rare', ['#c77dff', '#240046'], { hair: '#7b2cbf', style: 'wavy', eyes: '#e0aaff', outfit: '#9d4edd', accent: 'flower', expression: 'smile' }, 'Sings the ballad. The arena goes quiet.'),
  anime('nao', 'Nao', 'CRIMSON CORE', 'Pixel Pop', 'rare', ['#80ffdb', '#5390d9'], { hair: '#48bfe3', style: 'buns', eyes: '#56cfe1', outfit: '#5e60ce', accent: 'headphones', expression: 'wink' }, 'Streams rhythm games between rehearsals. Never misses a note.'),
  anime('kirara', 'Kirara', 'GALAXY GIRLS', 'Supernova', 'legendary', ['#fee440', '#f15bb5'], { hair: '#ffd166', style: 'twin', eyes: '#f15bb5', outfit: '#9b5de5', accent: 'star', expression: 'grin' }, 'Her finale sparkles are visible from space. Allegedly.'),
  anime('shiori', 'Shiori', 'GALAXY GIRLS', 'Moon Glide', 'epic', ['#a2d2ff', '#3a0ca3'], { hair: '#1d1a39', style: 'long', eyes: '#bde0fe', outfit: '#4361ee', accent: 'ribbon', expression: 'cool' }, 'Glides across the stage like gravity is optional.'),
  anime('hana', 'Hana', 'GALAXY GIRLS', 'Blossom Clap', 'common', ['#ffc8dd', '#cdb4db'], { hair: '#8d5524', style: 'bob', eyes: '#6d4c41', outfit: '#ffafcc', accent: 'flower', expression: 'smile' }, 'The friendliest member. Remembers every fan’s name.'),
  anime('rio', 'Rio', 'NEON ARCADE', 'Combo Breaker', 'rare', ['#00f5d4', '#00bbf9'], { hair: '#06d6a0', style: 'buns', eyes: '#00f5d4', outfit: '#118ab2', accent: 'headphones', expression: 'grin' }, 'Holds the high score on every dance machine in the city.'),
  anime('ayame', 'Ayame', 'NEON ARCADE', 'Final Stage', 'epic', ['#f72585', '#3a0ca3'], { hair: '#3c096c', style: 'wavy', eyes: '#f72585', outfit: '#b5179e', accent: 'crown', expression: 'wink' }, 'The last boss of the idol world. Undefeated.'),
  anime('momo', 'Momo', 'NEON ARCADE', 'Peach Bounce', 'common', ['#ffb4a2', '#e5989b'], { hair: '#ff8fa3', style: 'twin', eyes: '#ff4d6d', outfit: '#ff758f', accent: 'ribbon', expression: 'smile' }, 'Bounces through choreography like it’s a trampoline.'),
  anime('tsubaki', 'Tsubaki', 'NEON ARCADE', 'Silk Turn', 'common', ['#e9c46a', '#264653'], { hair: '#2a9d8f', style: 'pony', eyes: '#e9c46a', outfit: '#264653', accent: 'none', expression: 'cool' }, 'Quiet backstage, unstoppable on it.'),
]

const rizz = (id: string, name: string, icon: string, rarity: Rarity, text: string, stat?: StatKey): Card => ({
  id: `rizz-${id}`, kind: 'relic', name, icon, rarity, text, series: 'rizz', stat,
})

/** Rizz & Romance: cheeky dating-life loot. Flirty, never explicit. */
const RIZZ: Card[] = [
  rizz('potion', 'Rizz Potion', '🧪', 'rare', 'One sip: +50 charisma, −50 awkward silences.', 'CHA'),
  rizz('wingman', 'Wingman Token', '🪽', 'rare', 'Redeem for one perfectly timed "you two should talk".', 'CHA'),
  rizz('superlike', 'Golden Super Like', '💛', 'epic', 'Guaranteed to make someone check your profile twice.', 'CHA'),
  rizz('cologne', 'Cologne of Irresistibility', '🧴', 'epic', 'People lean in. Nobody knows why.', 'CHA'),
  rizz('lipstick', 'Lipstick Kiss Mark', '💋', 'rare', 'Left on your collar by a mystery admirer.', 'CHA'),
  rizz('roses', 'Dozen Red Roses', '🌹', 'common', 'Classic for a reason.', 'CHA'),
  rizz('dinner', 'Candlelit Dinner Ticket', '🕯️', 'rare', 'Table for two, best seat, nobody else in the room.', 'CHA'),
  rizz('slowdance', 'Slow Dance Token', '💃', 'common', 'Valid when the DJ plays the one song.', 'CHA'),
  rizz('number', 'Her Number on a Napkin', '📝', 'epic', 'Smudged a little. Still legible. Call her.', 'CHA'),
  rizz('abs', 'Golden Abs (Temporary)', '💪', 'legendary', 'Lasts exactly as long as you keep training.', 'STR'),
  rizz('lineScroll', 'Scroll of Perfect Pickup Lines', '📜', 'rare', 'Works 3 times out of 10. That is a lot of times.', 'CHA'),
  rizz('mirror', 'Confidence Mirror', '🪞', 'common', 'Always says you look good. It is correct.', 'CHA'),
  rizz('keycard', 'Penthouse Key Card', '🗝️', 'legendary', 'Top floor, city view. The night is young.', 'WLT'),
  rizz('champagne', 'Champagne Tower', '🍾', 'epic', 'For when the date goes very, very well.', 'WLT'),
  rizz('heart', 'Stolen Heart', '❤️‍🔥', 'legendary', 'Someone out there is thinking about you right now.', 'CHA'),
  rizz('loveletter', 'Sealed Love Letter', '💌', 'rare', 'Smells faintly of perfume. Open it later.', 'CHA'),
]

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

const BUILT_IN: Card[] = [...IDOLS, ...ANIME, ...RELICS, ...RIZZ]
/** Every card that can drop right now: the built-in set plus your own. */
export const allCards = (): Card[] => [...BUILT_IN, ...customCards]
export const CARDS = BUILT_IN
export const cardById = (id: string) => allCards().find(c => c.id === id)

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
  const keys = Object.keys(SERIES).filter(k => k !== 'custom')
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
  const pool = allCards().filter(c => c.rarity === rarity)
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

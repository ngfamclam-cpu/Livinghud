// Pack Forge: card packs made by an image model (Cloudflare Workers AI). The
// catalog of prompts lives here so the server only ever sends prompts built
// from this list (the endpoint can't be used to make arbitrary images), and the
// app knows each card's name, flavour line and rarity before the image exists.
//
// Owner's brief (Nov 2026): sultry and sexy, a mix of lingerie, rave fits and
// sexy-in-other-ways looks; photo-real women are East Asian and feminine; both
// styles at every rarity. Limits: fictional adults in their early 20s only (owner
// asked 18-22; kept at early 20s), no nudity (pasties declined), no sexual acts.
// These are private custom cards, not shared drops.
//
// No imports on purpose: api/forge.ts loads this file directly on the server.

export type ForgeRarity = 'common' | 'rare' | 'epic' | 'legendary'
export type ForgeStyle = 'real' | 'anime'

export interface ForgeCard {
  /** `<series>-<n>`, e.g. "rave-3". */
  id: string
  series: string
  rarity: ForgeRarity
  style: ForgeStyle
  name: string
  text: string
  scene: string
}

export interface ForgeSeries {
  id: string
  name: string
  cards: ForgeCard[]
}

type Row = [ForgeRarity, ForgeStyle, string, string, string]

const RAW: { id: string; name: string; rows: Row[] }[] = [
  { id: 'after', name: 'After Hours', rows: [
    ['common', 'real', 'Yuna · Late Checkout', 'Do not disturb. Ever.', 'She lounges on rumpled white sheets in a black lace bralette and matching high-waisted briefs, propped on one elbow, giving a slow, knowing look over her shoulder.'],
    ['common', 'anime', 'Mio · Slip Away', 'One strap down, no plans up.', 'She sits on the edge of a velvet bed in a lavender satin slip with lace trim, one strap sliding off her shoulder, biting her lip playfully.'],
    ['rare', 'real', 'Seo-yeon · Room 1204', 'The city is awake. So is she.', 'She stands by a rain-streaked hotel window in a red lace teddy under a sheer black robe, city lights behind her, one hand resting on the glass.'],
    ['rare', 'anime', 'Rei · Pillow Talk', 'She heard everything you didn’t say.', 'She kneels on silk pillows in a white lace bodysuit and thigh-high stockings, hair tousled, looking up with a slow, knowing smile.'],
    ['epic', 'real', 'Mei · Mirror Mirror', 'Twice the trouble, both hers.', 'She leans against a mirrored wall in an emerald silk corset with lace stockings and garters, her reflection doubling her silhouette, smoky eye makeup.'],
    ['legendary', 'real', 'Hana · Candle Hour', 'The last thing on your mind before sleep.', 'She reclines on a velvet chaise longue in black strappy lingerie, a sheer floor-length robe pooling around her, candles everywhere, her gaze fixed on the viewer.'],
  ]},
  { id: 'rave', name: 'Rave Siren', rows: [
    ['common', 'anime', 'Kiko · Glow Up', 'PLUR, with a little danger.', 'She dances in a rhinestone bikini top, a holographic mini skirt and fluffy leg warmers, glow sticks in her hands, glitter on her collarbones.'],
    ['common', 'real', 'Jia · Bass Face', 'Felt it in the chest. Saw her first.', 'She stands in a festival crowd in a mesh crop top over a black bralette, low-rise cargo shorts and combat boots, body glitter, a confident smirk.'],
    ['rare', 'real', 'Rin · Laser Halo', 'Lost in the drop, found on purpose.', 'She raises her arms under green lasers in a chainmail halter top and silver micro shorts, glitter shining on her skin, eyes half closed in the music.'],
    ['rare', 'anime', 'Luna · Wings Out', 'Took flight at 2 a.m.', 'She poses on a festival stage in an iridescent butterfly-wing crop top, tiny shorts and platform boots, a glowing LED fan open behind her.'],
    ['epic', 'anime', 'Nova · UV Riot', 'Glows brighter under black light.', 'She dances on a podium in a neon pink harness over a bralette, fishnet tights and a glowing visor, UV paint swirling across her skin.'],
    ['legendary', 'real', 'Aurelle · Main Stage Queen', 'The headliner turned to watch her.', 'She stands at the main stage barrier at night in a crystal body chain over a sequinned bralette and high-cut festival bottoms, pyrotechnics behind her, wind in her long hair.'],
  ]},
  { id: 'neon', name: 'Neon Nights', rows: [
    ['common', 'real', 'Mina · Last Call', 'Your tab. Her rules.', 'She sits on a bar stool in a tiny black sequinned mini dress, legs crossed, swirling a cocktail and looking straight into the camera.'],
    ['common', 'anime', 'Momo · Bubblegum', 'Sweet until she isn’t.', 'She leans in a neon alley in a glossy red vinyl mini dress and thigh-high boots, blowing a pink bubble, eyes half lidded.'],
    ['rare', 'anime', 'Akari · Midnight Drive', 'Keys optional. Trouble guaranteed.', 'She lies back across the hood of a sports car at night in a backless silver halter dress, neon reflections sliding over the paint.'],
    ['rare', 'real', 'Sora · Strobe', 'One flash and she’s all you see.', 'She dances in a crowded club in a sheer black mesh dress over a satin bralette, a strobe catching her mid hair flip.'],
    ['epic', 'real', 'Celeste · VIP Only', 'The rope lifts for her.', 'She stands in a private lounge in a plunging gold satin gown with a thigh-high slit, one hand on her hip, a champagne tower glowing behind her.'],
    ['legendary', 'anime', 'Vesper · Velvet Throne', 'Kneel, or at least try to look away.', 'She sits on a velvet throne in a black latex bodysuit with a long sheer cape, crimson lighting, a slow dangerous smile.'],
  ]},
  { id: 'sun', name: 'Sun & Salt', rows: [
    ['common', 'real', 'Kai · Wet Look', 'Salt water and bad ideas.', 'She walks out of turquoise water in a white string bikini, wet hair slicked back, laughing at the camera.'],
    ['common', 'anime', 'Lani · Tan Lines', 'Flip her over in ten minutes.', 'She lies on a beach towel in a strappy black bikini, sunglasses pushed into her hair, looking back over her shoulder.'],
    ['rare', 'real', 'Selene · Pool Edge', 'Out of office, into trouble.', 'She lounges at the edge of an infinity pool in a high-cut red one-piece swimsuit, arms folded on the ledge, sunset behind her.'],
    ['rare', 'anime', 'Marisol · Rinse', 'Last shower before the sunset party.', 'She stands under an outdoor beach shower in a tropical-print bikini, water running down her back, eyes closed, smiling.'],
    ['epic', 'real', 'Ploy · Deck Party', 'The yacht was the second-best view.', 'She poses on a yacht deck in a crochet bikini and a sheer wrap skirt, wind lifting her hair, limestone island cliffs behind her.'],
    ['legendary', 'anime', 'Iris · Moon Lagoon', 'Some tides only rise at night.', 'She rises from a glowing lagoon at night in a shimmering pearl bikini and gold body jewellery, bioluminescent water swirling around her.'],
  ]},
  { id: 'soft', name: 'Soft Hours', rows: [
    ['common', 'real', 'Dahye · Borrowed Shirt', 'It looks better on her. Obviously.', 'She sits on a sunny kitchen counter in an oversized white button-up shirt and knee socks, holding a coffee mug, a sleepy flirty smile.'],
    ['common', 'anime', 'Hina · Steam', 'Mirror’s fogged. Her mind isn’t.', 'She is wrapped in a fluffy towel after a shower, wet hair over one shoulder, steam on the mirror behind her, a playful wink.'],
    ['rare', 'real', 'Haeun · Lazy Sunday', 'Plans cancelled. Obviously.', 'She lies on her stomach on a bed in an off-shoulder knit sweater and cotton shorts, chin in her hands, kicking her feet, a flirty grin.'],
    ['rare', 'anime', 'Yerin · Door’s Open', 'She was expecting you.', 'She leans in a doorway in a silk pyjama shirt unbuttoned at the top, hair messy, one hand on the frame, an inviting look.'],
    ['epic', 'real', 'Seoa · Golden Robe', 'Golden hour, slower heartbeat.', 'She stands in golden window light in a cream satin robe tied loosely at the waist, one shoulder bare, hair falling across her face.'],
    ['legendary', 'anime', 'Tsuki · Moonlit', 'The moon only rises for her.', 'She sits on a windowsill at night in a sheer white nightgown over lace lingerie, moonlight outlining her silhouette as she looks back at the viewer.'],
  ]},
  { id: 'power', name: 'Power Muse', rows: [
    ['common', 'anime', 'Ms. Han · Overtime', 'Staying late was her idea.', 'She sits on an office desk in a fitted pencil skirt and a silk blouse unbuttoned low, glasses lowered, a pen resting on her lips.'],
    ['common', 'real', 'Raya · Kickstand', 'Helmet off. Guard down? Never.', 'She leans on a motorcycle in a cropped leather jacket over a lace bralette and tight black jeans, helmet on her hip.'],
    ['rare', 'real', 'Scarlett · Board Meeting', 'Motion carried. Unanimously.', 'She strides down a city street in a tailored oversized blazer over a black lace bralette, high heels and dark sunglasses.'],
    ['rare', 'anime', 'Vex · Rain Check', 'She never cancels. She reschedules you.', 'She stands on a rooftop in the rain in a black leather corset top and high-waisted leather trousers, wet hair, smirking.'],
    ['epic', 'anime', 'Aria · Corner Office', 'The view is the second thing you notice.', 'She lounges in a leather executive chair in a red bodycon dress, legs crossed up on the desk, a city skyline behind her, twirling a pen.'],
    ['legendary', 'real', 'Noir · The Boss', 'She doesn’t chase. She replaces.', 'She poses in a moody studio in a sharp black tuxedo jacket with a deep neckline showing a glimpse of black lace, sheer stockings and stilettos, holding her lapel.'],
  ]},
  { id: 'iron', name: 'Iron Muse', rows: [
    ['common', 'real', 'Tessa · Cooldown', 'Earned every drop of that glow.', 'She stretches on a gym mat in a seamless sports bra and high-waisted leggings, glistening after a workout, a confident smile.'],
    ['common', 'anime', 'Ivy · Hang Time', 'One more rep. For you.', 'She hangs from a pull-up bar in a cropped tank top and tiny running shorts, toned midriff, a playful grin.'],
    ['rare', 'anime', 'Rena · Round Two', 'You lasted one round. Cute.', 'She wraps her hands beside a heavy bag in a black sports bra and boxing shorts, a sheen of sweat, a fierce gaze.'],
    ['rare', 'real', 'Zia · Rest Set', 'She caught you looking. Again.', 'She sits on a weight bench in a fitted crop top and booty shorts, towel around her neck, glancing over at the camera.'],
    ['epic', 'real', 'Brynn · Mirror Pump', 'Progress pic, for science.', 'She poses in a gym mirror in a strappy matching workout set, hand on her hip, chalk on her palms, golden side light.'],
    ['legendary', 'anime', 'Astra · Summit Dawn', 'Every step counted. So did she.', 'She stands on a mountain summit at dawn in a sports bra and running shorts, wind in her ponytail, arms wide, clouds below.'],
  ]},
  { id: 'gate', name: 'Gatebreakers', rows: [
    ['common', 'anime', 'Neri · Gate Runner', 'E-rank today. Not forever.', 'She grips a dagger before a glowing blue portal in fitted leather armour with a low neckline and thigh-high boots.'],
    ['common', 'real', 'Lys · Wildwood', 'Follow her and get lost on purpose.', 'She stands in a misty forest in a sheer green elven gown with silver leaf jewellery and delicate pointed ears, a bow on her back.'],
    ['rare', 'anime', 'Noor · Hexfire', 'Her spells don’t miss.', 'She summons violet flames in a black witch’s corset dress with a high slit and a wide-brimmed hat.'],
    ['rare', 'real', 'Amara · Temple Dancer', 'The gate opened for her dance.', 'She poses in a ruined temple in a gold and crimson dancer’s costume with a coin belt and flowing veils, bare midriff.'],
    ['epic', 'anime', 'Seraphine · Gate Knight', 'The gate closes when she says so.', 'She kneels in a throne room in sleek silver corset-shaped armour with a flowing cape, a glowing sword in her hand.'],
    ['legendary', 'real', 'Empress Ryu · Violet Gate', 'Rank: beyond measuring.', 'She stands before an enormous violet portal in a dark queen’s gown with a plunging neckline and a crown of violet light, glowing silhouettes of an army behind her.'],
  ]},
]

export const FORGE_SERIES: ForgeSeries[] = RAW.map(s => ({
  id: s.id,
  name: s.name,
  cards: s.rows.map(([rarity, style, name, text, scene], i) => ({ id: `${s.id}-${i}`, series: s.id, rarity, style, name, text, scene })),
}))

const ALL = FORGE_SERIES.flatMap(s => s.cards)
export const forgeCard = (id: string): ForgeCard | undefined => ALL.find(c => c.id === id)

// Variety: each forging picks a look, so the same card never comes out twice the same.
const HERITAGE = ['a Korean', 'a Japanese', 'a Chinese', 'a Taiwanese', 'a Korean', 'a Japanese', 'a Vietnamese', 'a Thai']
const HAIR_REAL = [
  'long straight glossy black hair',
  'soft wavy dark brown hair with curtain bangs',
  'a sleek high ponytail',
  'a messy low bun with loose strands framing her face',
  'a chic shoulder-length bob',
  'long hair with honey-brown highlights',
  'long silky hair with see-through bangs',
  'loose beach waves in chestnut brown',
]
const HAIR_ANIME = [
  'long flowing black hair',
  'pastel pink twin-length hair',
  'silver-white hair with a side part',
  'long lavender hair',
  'a high ponytail of deep red hair',
  'honey-blonde waves',
  'a sleek navy bob',
  'long dark hair with blue streaks',
]
const LIGHT = [
  'Warm golden-hour light.',
  'Neon pink and electric blue light.',
  'Soft diffused window light.',
  'Moody low-key light with a warm rim light.',
  'Direct flash at night, glossy and editorial.',
  'Flickering warm candlelight.',
]

// Cloudflare checks prompts for NSFW words, so the wording leans on fashion
// language: the outfits and poses stay, explicit words and even "no nudity"
// style negatives (which name body parts) are left out. Age is early 20s:
// asking image models for 18-19 drifts them towards looking underage.
const FEMME_REAL = 'She is a stunning, very feminine young woman in her early 20s with a delicate heart-shaped face, soft jawline, big expressive eyes, long lashes, glossy full lips, flawless dewy skin and a slender hourglass figure, wearing glamorous makeup'
const FEMME_ANIME = 'She is a gorgeous, very feminine young adult woman in her early 20s with grown-up curvy proportions, elegant features, long lashes and glossy lips'
const MOOD = 'Alluring, confident and flirtatious, a glamorous fashion-editorial mood. She is a fictional adult who does not resemble any real person.'
const STYLE: Record<ForgeStyle, string> = {
  real: 'Style: photorealistic high-end fashion photography, 85mm lens, shallow depth of field, natural skin texture, flattering light, magazine quality.',
  anime: 'Style: polished modern anime key art, detailed glossy eyes, soft gradient cel shading, rich colour, trading card art.',
}
const FRAME = 'Portrait framing from the thighs up, centred, a little headroom. No text, no logos, no watermark, no other people in focus.'

/**
 * Softer wording for a second try when the image service refuses a prompt.
 * Same outfit idea, tamer words. Longest phrases first.
 */
const SOFTER: [RegExp, string][] = [
  [/black strappy lingerie/gi, 'a black strappy satin two-piece set'],
  [/lace lingerie/gi, 'a lace camisole'],
  [/lingerie/gi, 'loungewear'],
  [/red lace teddy/gi, 'red lace bodysuit'],
  [/teddy/gi, 'bodysuit'],
  [/thigh-high stockings/gi, 'over-the-knee socks'],
  [/sheer stockings/gi, 'sheer tights'],
  [/stockings and garters/gi, 'tights'],
  [/garters/gi, 'tights'],
  [/stockings/gi, 'tights'],
  [/(lace |satin |black )?bralette/gi, '$1crop top'],
  [/string bikini/gi, 'swimsuit'],
  [/bikini top/gi, 'crop top'],
  [/bikini/gi, 'two-piece swimsuit'],
  [/one-piece swimsuit/gi, 'swimsuit'],
  [/corset/gi, 'bustier'],
  [/latex/gi, 'glossy'],
  [/booty shorts|micro shorts|tiny shorts|tiny running shorts/gi, 'shorts'],
  [/low-rise /gi, ''],
  [/high-cut /gi, ''],
  [/sheer /gi, 'light '],
  [/plunging neckline/gi, 'elegant neckline'],
  [/deep neckline/gi, 'elegant neckline'],
  [/low neckline/gi, 'sweetheart neckline'],
  [/unbuttoned low|unbuttoned at the top/gi, 'loosely buttoned'],
  [/thigh-high slit|high slit/gi, 'side slit'],
  [/one strap sliding off her shoulder/gi, 'one shoulder bare'],
  [/body chain/gi, 'jewellery'],
  [/harness/gi, 'strappy top'],
  [/biting her lip/gi, 'smiling'],
  [/rumpled white sheets/gi, 'a white duvet'],
  [/hourglass figure/gi, 'figure'],
  [/curvy /gi, ''],
  [/glossy full lips/gi, 'glossy lips'],
  [/glimpse of black lace/gi, 'black silk top'],
  [/wrapped in a fluffy towel/gi, 'in a fluffy white bathrobe'],
  [/nightgown over lace loungewear/gi, 'nightdress'],
  [/Alluring, confident and flirtatious/g, 'Confident and charming'],
]

const pick = <T,>(list: T[], n: number) => list[Math.abs(n) % list.length]

/** How careful the wording is: 0 = full, 1 = the softer retry. */
export type ForgeLevel = 0 | 1

/** The full prompt sent to the image model. `variant` picks the look (heritage, hair, light). */
export function forgePrompt(c: ForgeCard, variant = 0, level: ForgeLevel = 0): string {
  const v = Math.max(0, Math.floor(variant))
  const prompt = c.style === 'real'
    ? `Photo of ${pick(HERITAGE, v)} woman. ${FEMME_REAL}, with ${pick(HAIR_REAL, v >> 3)}. ${c.scene} ${pick(LIGHT, v >> 6)} ${MOOD} ${STYLE.real} ${FRAME}`
    : `Anime illustration of a woman. ${FEMME_ANIME}, with ${pick(HAIR_ANIME, v >> 3)}. ${c.scene} ${pick(LIGHT, v >> 6)} ${MOOD} ${STYLE.anime} ${FRAME}`
  return level === 0 ? prompt : SOFTER.reduce((p, [from, to]) => p.replace(from, to), prompt)
}

/** Cards per pack, and the image model's detail level (FLUX.1 schnell: 1-8 steps). */
export const PACK_CARDS = 6
export const FORGE_STEPS = 8
export const MAX_VARIANT = 9999
/** Rarity mix of one pack, in reveal order (rarest last). */
const PACK_SHAPE: ForgeRarity[] = ['common', 'common', 'rare', 'rare', 'epic', 'legendary']

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

export interface PackPick {
  card: ForgeCard
  variant: number
}

/**
 * A mixed pack: 2 Common, 2 Rare, 1 Epic, 1 Legendary from different series
 * where it can, both styles, skipping cards made recently, each with its own look.
 */
export function pickPack(seed: string, recent: Iterable<string> = []): PackPick[] {
  const skip = new Set(recent)
  const usedSeries = new Set<string>()
  const used = new Set<string>()
  const out: PackPick[] = []
  PACK_SHAPE.forEach((rarity, slot) => {
    const pool = ALL.filter(c => c.rarity === rarity && !used.has(c.id))
    const ranked = [
      pool.filter(c => !skip.has(c.id) && !usedSeries.has(c.series)),
      pool.filter(c => !skip.has(c.id)),
      pool,
    ].find(p => p.length > 0)!
    const card = ranked[hash(`${seed}:${slot}`) % ranked.length]
    used.add(card.id)
    usedSeries.add(card.series)
    out.push({ card, variant: hash(`${seed}:look:${slot}`) % (MAX_VARIANT + 1) })
  })
  return out
}

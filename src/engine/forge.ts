// Pack Forge: card packs made by an image model (Cloudflare Workers AI). The
// catalog of prompts lives here so the server only ever sends prompts from
// this list (a public build can't be used to make arbitrary images), and the
// app knows each card's name, flavour line and rarity before the image exists.
//
// No imports on purpose: api/forge.ts loads this file directly on the server.

export type ForgeRarity = 'common' | 'rare' | 'epic' | 'legendary'

export interface ForgeCard {
  /** `<series>-<n>`, e.g. "neon-3". */
  id: string
  series: string
  rarity: ForgeRarity
  name: string
  text: string
  scene: string
}

export interface ForgeSeries {
  id: string
  name: string
  cards: ForgeCard[]
}

const SAFE = 'She is a fictional adult woman in her mid-20s, an original character who does not resemble any real person. Glamorous, confident and alluring, tasteful and fully clothed.'
const STYLE = {
  anime: 'Style: polished anime illustration, clean cel shading, vibrant colour, detailed eyes, soft rim light, trading card art.',
  real: 'Style: photorealistic editorial photo, 85mm lens, shallow depth of field, natural skin texture, cinematic lighting.',
}
const FRAME = 'Portrait framing with her whole upper body in view, centred, a little headroom. No text, no logos, no watermark, no other people in focus.'

type Row = [ForgeRarity, string, string, string]

const RAW: { id: string; name: string; rows: Row[] }[] = [
  { id: 'neon', name: 'Neon Stage', rows: [
    ['common', 'Lumi · Encore Glow', 'One more song. The crowd decided.', 'A girl mid-twirl in a sparkly silver stage outfit under pink and cyan spotlights, holding a microphone, confetti in the air.'],
    ['common', 'Rhea · Soundcheck', 'Before the lights, the work.', 'A girl at an empty arena rehearsal in an oversized hoodie and headphones around her neck, grinning at the camera from the stage edge.'],
    ['rare', 'Kiko · Fan Wave', 'Ten thousand light sticks, one wave back.', 'A girl on a runway stage waving to a sea of glowing light sticks, high ponytail, cropped jacket and pleated skirt.'],
    ['rare', 'Sora · Backstage Mirror', 'Glitter is a lifestyle.', 'A girl at a backstage mirror ringed with bulbs, adding glitter to her cheek and winking at her reflection.'],
    ['epic', 'Mira · Final Chorus', 'Arms up. Last note. Golden rain.', 'A woman centre stage in a sequinned dress, arms raised, a rain of golden confetti falling, the crowd as bokeh lights behind her.'],
    ['legendary', 'Aurelle · Crown of Lights', 'The stage rises. So does she.', 'A woman on a rising stage platform in a crystal-beaded outfit, dramatic beams of white light, haze and sparks around her, a triumphant expression.'],
  ]},
  { id: 'festival', name: 'Festival Bloom', rows: [
    ['common', 'Pixie · Glitter Check', 'Face glitter: applied. Plans: none.', 'A girl with festival braids and face glitter in a holographic top, sunny festival field and flags behind her.'],
    ['common', 'Juno · Kandi Trade', 'PLUR, one bracelet at a time.', 'A girl holding up colourful bead bracelets with a big smile, pastel festival outfit, tents and string lights behind.'],
    ['rare', 'Nova · Laser Line', 'The drop hits. She was ready.', 'A girl dancing under green and violet lasers holding a glowing LED fan, reflective jacket, smoke in the air.'],
    ['rare', 'Wren · Sunrise Set', 'Survived the night. Earned the sunrise.', 'A girl wrapped in a blanket on a grassy hill at sunrise after a festival, tired happy smile, a distant stage glowing.'],
    ['epic', 'Vela · Main Stage Drop', 'Front row, full volume.', 'A woman at the front barrier with arms up, pyrotechnic flames behind the stage, sequinned crop top and cargo pants, glitter catching the light.'],
    ['legendary', 'Iris · Bloom Goddess', 'Where the music grows flowers.', 'A woman in a flowing iridescent cape standing before a giant neon flower art installation at night, petals glowing in pink and teal.'],
  ]},
  { id: 'tokyo', name: 'Tokyo After Dark', rows: [
    ['common', 'Mei · 2 A.M. Run', 'Iced coffee is a food group.', 'A girl in an oversized bomber jacket holding iced coffee outside a brightly lit convenience store late at night.'],
    ['common', 'Yuna · Clear Umbrella', 'Rain looks better in neon.', 'A girl with a clear umbrella on a busy crossing in the rain, city signs glowing and reflecting on the wet street.'],
    ['rare', 'Hana · Claw Machine Ace', 'First try. Obviously.', 'A girl in an arcade proudly holding a plush toy she won from a claw machine, colourful machine lights around her.'],
    ['rare', 'Rin · Rooftop Signal', 'The whole city, on mute.', 'A girl in a leather jacket on a rooftop at night, the city skyline glittering behind her, wind in her hair.'],
    ['epic', 'Kaede · Neon Alley', 'Every light in the alley points to her.', 'A woman in a satin slip dress under a long coat in a narrow neon alley, glowing signs reflected in puddles.'],
    ['legendary', 'Akari · Midnight Rider', 'Last train left. She didn’t need it.', 'A woman in a racing jacket leaning on a sleek motorcycle on a bridge at night, city lights streaking behind her.'],
  ]},
  { id: 'seoul', name: 'Seoul Café Days', rows: [
    ['common', 'Dahye · Latte Art', 'She tried a heart. It’s a heart.', 'A girl in a cream knit sweater holding a latte with heart latte art in a bright minimalist café.'],
    ['common', 'Sena · Bookshop Corner', 'Just one more chapter.', 'A girl reading in a cosy bookshop corner surrounded by tall shelves and warm lamps.'],
    ['rare', 'Haeun · Rainy Window', 'Rain outside, playlist inside.', 'A girl at a café window seat on a rainy day, earbuds in, smiling at the drops on the glass.'],
    ['rare', 'Jia · Flour Fight', 'Baking is 40% flour on your face.', 'A girl baking in a sunny kitchen with flour on her cheek, laughing, apron over a striped top.'],
    ['epic', 'Yerin · Autumn Courtyard', 'Golden leaves, slow afternoon.', 'A woman in a camel coat in a traditional hanok café courtyard with falling autumn leaves, warm afternoon light.'],
    ['legendary', 'Seoa · River Golden Hour', 'The best plans have no plan.', 'A woman at a golden-hour riverside picnic, city bridge in the distance, sundress and denim jacket, sun flare.'],
  ]},
  { id: 'island', name: 'Island Escape', rows: [
    ['common', 'Kai · Snorkel Break', 'The fish were judging her form.', 'A girl on a white-sand beach with a snorkel mask pushed up on her head, laughing, turquoise water behind.'],
    ['common', 'Lani · Scooter Day', 'No map. Good vibes.', 'A girl on a scooter beside green rice terraces, sunglasses on her head, flowy summer shirt.'],
    ['rare', 'Ploy · Night Market', 'Ordered one of everything.', 'A girl holding street food skewers at a lantern-lit night market, warm glowing stalls behind her.'],
    ['rare', 'Amara · Temple Steps', 'Quiet morning, long climb, worth it.', 'A girl in a modest long sundress on ancient stone temple steps at sunrise, serene.'],
    ['epic', 'Selene · Infinity Sunset', 'Out-of-office: forever.', 'A woman in elegant resort wear and a wide sun hat at an infinity pool edge at sunset, ocean meeting the sky.'],
    ['legendary', 'Marisol · Lagoon Queen', 'Found the place from the screensaver.', 'A woman standing at the bow of a longtail boat in a lagoon framed by limestone cliffs, flowing linen dress, emerald water.'],
  ]},
  { id: 'iron', name: 'Iron Muse', rows: [
    ['common', 'Tessa · Warm-up', 'Mobility first. Ego later.', 'A girl in athletic wear stretching on a mat in a bright gym, focused and calm.'],
    ['common', 'Ivy · Bar Hang', 'One more rep than yesterday.', 'A girl hanging from a pull-up bar with a determined grin, gym lights above.'],
    ['rare', 'Rena · Wrapped Up', 'Hands wrapped. Mind clear.', 'A girl wrapping her hands with boxing tape beside a heavy bag, moody gym lighting.'],
    ['rare', 'Zia · Lane Six', 'The track is hers today.', 'A girl in a sprint start position on a running track at golden hour, long shadow behind her.'],
    ['epic', 'Brynn · Chalk & Iron', 'Chalk up. Lift heavy.', 'A strong woman in a matching training set chalking her hands beside a loaded barbell, dramatic side light, chalk dust in the air.'],
    ['legendary', 'Astra · Summit Dawn', 'Every step counted. So did she.', 'A woman in trail-running gear on a mountain summit at dawn, arms open, clouds below, sun breaking over the ridge.'],
  ]},
  { id: 'gate', name: 'Gatebreakers', rows: [
    ['common', 'Neri · Rookie Hunter', 'E-rank today. Not forever.', 'A girl in light leather armour holding a dagger in front of a glowing blue portal in an alley, nervous but brave.'],
    ['common', 'Lys · Field Medic', 'Nobody falls on her shift.', 'A girl healer in a white and blue coat holding a staff that glows with green light inside a stone dungeon.'],
    ['rare', 'Vex · Rooftop Archer', 'She never misses twice.', 'A girl archer on a city rooftop at night drawing a bow with a glowing arrow, a portal swirling in the sky.'],
    ['rare', 'Noor · Shadow Summoner', 'Her pack follows no one else.', 'A girl in a dark hooded coat with violet eyes, shadowy wolves made of smoke circling her feet.'],
    ['epic', 'Seraphine · Gate Knight', 'The gate closes when she says so.', 'A woman knight in sleek silver armour with a glowing sword in a ruined dungeon hall, embers in the air, cinematic.'],
    ['legendary', 'Morrigan · Violet Gate Queen', 'Rank: beyond measuring.', 'A woman with a crown of violet light and a long dark cape before an enormous violet portal, glowing silhouettes of an army behind her.'],
  ]},
  { id: 'date', name: 'Date Night', rows: [
    ['common', 'Coco · Movie Night', 'She picked the movie. You get popcorn.', 'A girl on a cosy couch with a bowl of popcorn and a blanket, playful smile, TV glow on her face.'],
    ['common', 'Bree · Picnic Plan', 'She packed snacks for two.', 'A girl on a picnic blanket in a park holding strawberries, sundress, soft afternoon light.'],
    ['rare', 'Jade · Karaoke Booth', 'She chose the duet. No escape.', 'A girl singing into a microphone in a neon karaoke booth, pointing at the camera with a wink.'],
    ['rare', 'Raya · Rooftop Bar', 'One drink. Two stories. Three laughs.', 'A girl at a rooftop bar holding a cocktail, city lights behind her, little black dress, leaning on the railing.'],
    ['epic', 'Scarlett · Candlelight', 'Reservation for two, under your name.', 'A woman in an elegant red dress at a candlelit restaurant table, warm golden light, a confident smile.'],
    ['legendary', 'Celeste · The Gala', 'The whole room turned. She only looked at you.', 'A woman in a floor-length shimmering gown on a grand staircase under chandeliers, glancing back over her shoulder.'],
  ]},
]

export const FORGE_SERIES: ForgeSeries[] = RAW.map(s => ({
  id: s.id,
  name: s.name,
  cards: s.rows.map(([rarity, name, text, scene], i) => ({ id: `${s.id}-${i}`, series: s.id, rarity, name, text, scene })),
}))

export const forgeCard = (id: string): ForgeCard | undefined => FORGE_SERIES.flatMap(s => s.cards).find(c => c.id === id)

/** Common and Rare are drawn in anime style; Epic and Legendary are photo-real. */
export const forgeStyle = (r: ForgeRarity): 'anime' | 'real' => (r === 'epic' || r === 'legendary' ? 'real' : 'anime')

/** The full prompt sent to the image model. */
export const forgePrompt = (c: ForgeCard): string => `${c.scene} ${SAFE} ${STYLE[forgeStyle(c.rarity)]} ${FRAME}`

/** Cards per pack, and the image model's detail level (FLUX.1 schnell: 1-8 steps). */
export const PACK_CARDS = 6
export const FORGE_STEPS = 6

function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619)
  return h >>> 0
}

/**
 * Picks a pack: one series (seeded, skipping the series of the last pack when
 * possible) and every card in it, rarest last so the pack ends on a high.
 */
export function pickPack(seed: string, lastSeries: string | null = null): { series: ForgeSeries; cards: ForgeCard[] } {
  const options = FORGE_SERIES.filter(s => s.id !== lastSeries)
  const series = options[hash(seed) % options.length]
  const order: ForgeRarity[] = ['common', 'rare', 'epic', 'legendary']
  const cards = [...series.cards].sort((a, b) => order.indexOf(a.rarity) - order.indexOf(b.rarity)).slice(0, PACK_CARDS)
  return { series, cards }
}

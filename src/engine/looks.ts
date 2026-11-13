// AI looks (Cloudflare FLUX, same endpoint as the Pack Forge): the funny common
// cards that fill every card pack, the Shadow Legion's soldiers and the pets.
// Owner, Nov 2026: "make my shadow legion cooler, ai generate their looks and
// same with the pets... instead of cards as rewards, make them packs of cards".
//
// Like forge.ts this file has no imports: api/forge.ts loads it on the server,
// so only prompts built from these lists can ever be sent.

// ---- Funny cards (Common, one image each, made once and reused) ----

export interface FunnyCard {
  id: string
  name: string
  text: string
  scene: string
}

const FUNNY_RAW: [string, string, string][] = [
  ['Tax Raccoon', 'Itemised deductions. Itemised snacks.', 'a raccoon in a tiny business suit and reading glasses doing taxes at a cluttered desk covered in receipts and half-eaten snacks'],
  ['Gym Frog', 'Never skips leg day. Only has legs.', 'a muscular frog in a sweatband lifting a heavy barbell at a gym, veins popping, extremely serious face'],
  ['Procrastination Sloth', 'Will read this card later.', 'a sloth lying on a couch surrounded by unfinished to-do lists, slowly reaching for a remote, a clock melting on the wall'],
  ['Alarm Clock Goblin', 'Snooze is not an option.', 'a gleeful green goblin smashing cymbals right next to a sleeping person\'s ear, morning light through the window'],
  ['Hydration Duck', 'Drink your water. Quack.', 'a determined duck in a tracksuit carrying a giant water bottle, a tiny cape that says nothing, sunny park'],
  ['Laundry Mountain Yeti', 'Folded once, in 2019.', 'a fluffy yeti climbing a towering mountain of unfolded laundry with an ice axe, planting a sock as a flag'],
  ['Budget Hamster', 'Every seed accounted for.', 'a hamster in a green visor at a tiny calculator with a spreadsheet, piles of sunflower seeds sorted into jars'],
  ['Rave Grandma', 'Out-partied the headliner.', 'a cheerful grandmother in sparkly rave sunglasses and glow sticks dancing on a festival stage, crowd cheering'],
  ['Inbox Kraken', 'Unread: 4,812.', 'a cartoon kraken bursting out of a laptop screen, tentacles full of envelopes and notification bells, panicking office worker'],
  ['Posture Penguin', 'Chin tucked. Shoulders back. Waddle on.', 'a penguin standing with perfect posture balancing a book on its head, looking smug, a slouching walrus behind it'],
  ['Meal Prep Wizard', 'Summons 21 identical lunches.', 'a robed wizard conjuring rows of identical plastic meal-prep containers of chicken and rice with a glowing spatula wand'],
  ['Side Hustle Squirrel', 'Five jobs. One nut. Thriving.', 'a frantic squirrel juggling a laptop, a coffee, a delivery bag and a paintbrush at the same time, wearing a headset'],
  ['Doomscroll Owl', 'It is 3 a.m. It is still scrolling.', 'a wide-eyed owl in bed at 3 a.m. lit only by a phone screen, dark circles under its eyes, piles of empty energy drinks'],
  ['Cold Shower Viking', 'Screams in Old Norse.', 'a burly viking screaming under an icy shower, icicles forming in his beard, a rubber duck floating by'],
  ['Motivational Cactus', 'You got this. Don\'t hug me.', 'a potted cactus wearing a coach\'s whistle and cap, giving a thumbs up, prickly but encouraging'],
  ['Crypto Cat', 'Bought high. Remains calm.', 'a cat in sunglasses staring at a crashing stock chart on several monitors, completely unbothered, sipping tea'],
  ['Focus Monk Pug', 'Distractions? Never heard of them.', 'a pug in monk robes meditating cross-legged on a cushion while phones buzz and notifications float around it'],
  ['Dish Pile Dragon', 'Guards its hoard of unwashed plates.', 'a small dragon curled protectively on top of a huge pile of dirty dishes in a kitchen sink, smoke puffing from its nose'],
  ['Weekend Warrior Turtle', 'Saturday mode: activated.', 'a turtle wearing a sweatband and party sunglasses sprinting with a surfboard and a cocktail, beach behind'],
  ['Step Counter Snail', '10,000 steps. Give it a year.', 'a snail wearing a tiny fitness tracker and running shoes, a finish line ribbon very far away, determined face'],
  ['Spreadsheet Bear', 'Cell A1 to bear market.', 'a big brown bear in a cardigan intensely typing into a giant colourful spreadsheet, honey jar beside the keyboard'],
  ['Nap Time Cat Lord', 'Ruler of all sunbeams.', 'a regal fluffy cat wearing a tiny crown asleep in a perfect patch of sunlight on a throne of pillows'],
  ['Overthinking Octopus', 'Eight arms. Eighty worries.', 'an octopus holding eight different thought bubbles and sticky notes, tangled in its own to-do lists, nervous sweat'],
  ['Self-Care Shark', 'Face mask on. Fin up.', 'a great white shark relaxing in a bubble bath with a green face mask and cucumber slices on its eyes, candles lit'],
  ['Group Chat Pigeons', '247 new messages. All memes.', 'a flock of pigeons on a wire all staring at tiny phones, one pigeon laughing hysterically'],
  ['Deadline Cheetah', 'Starts at 11:58 p.m.', 'a cheetah typing at blazing speed on a smoking laptop as a clock strikes midnight, papers flying everywhere'],
  ['Thrifty Goose', 'Paid in exact change. Honks.', 'a goose at a shop counter counting out coins one by one, a long impatient queue behind it, honking'],
  ['Stretching Giraffe', 'Hip flexors: elite.', 'a giraffe in yoga pants doing a deep lunge stretch on a yoga mat, neck bent comically, peaceful studio'],
  ['Snack Bandit Fox', 'Fridge raid at midnight.', 'a sneaky fox in a black mask tiptoeing away from an open glowing fridge carrying a whole cake'],
  ['Hype Man Llama', 'LET\'S GOOOO.', 'an over-excited llama with a megaphone and sunglasses hyping up a tiny nervous hedgehog at a podium'],
  ['Laundry Day Ghost', 'Last clean sheet. Spooky.', 'a cute bedsheet ghost doing laundry at a laundromat, folding other tiny ghosts, coin machine glowing'],
  ['Calendar Chameleon', 'Double-booked itself.', 'a chameleon changing colours in panic in front of an overflowing wall calendar full of overlapping appointments'],
  ['Barista Bat', 'Night shift. Extra shot.', 'a bat barista hanging upside down from the ceiling pouring latte art, coffee shop at night'],
  ['Couch Potato Knight', 'Defender of the sofa.', 'a literal potato wearing shining knight armour guarding a comfy couch with a remote control as a sword'],
  ['Wifi Wizard Grandpa', 'Turned it off and on again.', 'an old wizard with a long beard casting a spell at a blinking wifi router, sparks flying, cat watching'],
  ['Glow Stick Jellyfish', 'Brought its own light show.', 'a glowing neon jellyfish dancing at an underwater rave, fish wearing tiny headphones'],
  ['Savings Pig Bodybuilder', 'Gains in the bank.', 'a muscular piggy bank flexing on a bodybuilding stage, coins spilling out of its slot, judges impressed'],
  ['Parking Ticket Gremlin', 'Was gone 30 seconds.', 'a smug little gremlin writing a parking ticket on a car windscreen, the owner running toward it in slow motion'],
  ['Walk of Shame Pigeon', 'Last seen leaving the party.', 'a pigeon in a crumpled party outfit with one shoe walking home at sunrise holding a kebab'],
  ['Level Up Blob', 'It ate a vegetable. Stats +1.', 'a cute slime blob glowing with a level-up aura after eating a single piece of broccoli, video game sparkles around it'],
]

export const FUNNY_CARDS: FunnyCard[] = FUNNY_RAW.map(([name, text, scene], i) => ({ id: `fun-${i + 1}`, name, text, scene }))
export const funnyCard = (id: string) => FUNNY_CARDS.find(c => c.id === id)

const FUNNY_STYLE = 'Funny collectible trading card artwork, bright saturated colours, bold clean cartoon illustration with soft shading, expressive faces, playful and silly, centred subject with a simple background, portrait composition, high detail. No text, no letters, no logos, no watermark, no card border.'

export function funnyPrompt(c: FunnyCard, variant = 0): string {
  const moods = ['', 'Golden afternoon light.', 'Dramatic spotlight.', 'Cosy evening glow.', 'Neon night colours.']
  return `Illustration of ${c.scene}. ${moods[Math.abs(variant) % moods.length]} ${FUNNY_STYLE}`
}

// ---- Shadow Legion soldiers ----

export const SOLDIER_LOOKS: Record<string, string> = {
  Footman: 'a shadow footman in cracked obsidian plate armour with a notched broadsword and a round shield etched with glowing runes',
  Archer: 'a lithe shadow archer in a tattered hooded cloak drawing a longbow strung with violet light, arrows of black smoke in a quiver',
  Spearman: 'a tall shadow spearman in layered dark lamellar armour holding a long glaive that trails purple flame',
  Mage: 'a hooded shadow mage in flowing robes of living darkness, a floating grimoire and orbs of violet energy circling its hands',
  Hound: 'a huge shadow hound made of black smoke and plated armour, glowing eyes, embers rising from its fur, teeth bared',
  Rider: 'a shadow cavalry rider on a skeletal nightmare horse wreathed in black fire, holding a lance and a torn banner',
  Knight: 'an imposing shadow knight in ornate jagged black armour with a horned helm, a greatsword planted in the ground, a long torn cape',
  Elite: 'a towering elite shadow general in massive spiked armour with a crown of black flame, dual curved blades, an aura of violet lightning',
}

const SOLDIER_SCENE = ['standing on a battlefield of ash under a blood moon', 'rising from a pool of black shadow in a ruined cathedral', 'guarding a gate of a dark fortress at night', 'on a cliff above a burning city', 'in a misty graveyard with violet will-o-wisps']
const SOLDIER_STYLE = 'Dark fantasy character art, an original design, glowing purple-blue eyes, wisps of black smoke peeling off its body, dramatic rim lighting, cinematic, highly detailed digital painting, full body, centred, portrait composition. No text, no logos, no watermark.'

export function soldierPrompt(kind: string, variant = 0, veteran = false): string | null {
  const look = SOLDIER_LOOKS[kind]
  if (!look) return null
  const v = Math.abs(Math.floor(variant))
  const extra = veteran ? 'Battle-scarred veteran with gold-trimmed armour and golden glowing eyes.' : ''
  return `Illustration of ${look}, ${SOLDIER_SCENE[v % SOLDIER_SCENE.length]}. ${extra} ${SOLDIER_STYLE}`
}

// ---- Pets: one look per pet per growth level ----

export const PET_LOOKS: Record<string, string> = {
  pip: 'a small round glowing spirit creature with big sparkling eyes, tiny wings and a wispy tail, pastel blue and lavender',
  'ember-fox': 'a fire fox with fur of glowing orange embers, a smouldering flame-tipped tail and golden eyes',
  'tide-otter': 'a playful water otter with shimmering aqua fur, juggling floating water droplets, bubbles around it',
  'leaf-stag': 'a forest stag with moss-green fur, antlers made of blooming branches and flowers, fireflies around it',
  'storm-wolf': 'a storm wolf with indigo fur crackling with lightning, glowing yellow eyes, storm clouds swirling behind',
  'volt-lynx': 'an electric lynx with golden fur, sparks jumping between its ear tufts, glowing cyan stripes',
  'crystal-tortoise': 'a wise tortoise whose shell is a cluster of glowing teal and violet crystals',
  kitsune: 'a nine-tailed fox spirit with white and pink fur, glowing golden tails and floating spirit flames',
  griffin: 'a griffin with a golden eagle head and wings and a lion body, cream and gold feathers',
  leviathan: 'a sea serpent leviathan with deep blue scales, glowing pink bioluminescent fins, swirling ocean around it',
  'frost-owl': 'a frost owl with pale icy-blue feathers, frost crystals on its wings and glowing silver eyes',
  qilin: 'a jade qilin with emerald scales, a golden mane, a single antler horn and hooves of green flame',
  'azure-dragon': 'an azure eastern dragon with long sapphire scales, golden whiskers, riding storm clouds',
  phoenix: 'a phoenix with blazing crimson and gold feathers, trailing flames, rising from embers',
  'lunar-moth': 'a giant luna moth with pale lavender wings patterned with glowing moons and stars',
  'chaos-wyrm': 'a chaos wyrm with purple-black scales, glowing magenta cracks and swirling void energy',
  thunderbird: 'a thunderbird with golden and orange feathers, lightning crackling along its huge wings',
}

const PET_STAGE = [
  'as a tiny adorable baby with oversized eyes, chubby and clumsy, sitting in a cosy nest',
  'as a playful young creature, small and bouncy, full of energy',
  'as a confident adolescent creature, sleeker, with its powers starting to glow',
  'as a strong adult creature with a radiant magical aura',
  'as a majestic elder creature, huge and regal, wearing a small glowing crown, an aura of power',
  'as an ascended legendary creature radiating light, wings of energy, galaxies swirling around it',
]
const PET_STYLE = 'Cute but epic fantasy creature art, an original design, vibrant colours, soft glowing magical lighting, highly detailed digital painting like a premium collectible game, full body, centred, simple soft background. No text, no logos, no watermark, no people.'

/** Evolved pets (max level) are drawn with the top stage. */
export function petPrompt(petId: string, level: number, variant = 0): string | null {
  const look = PET_LOOKS[petId]
  if (!look) return null
  const stage = PET_STAGE[Math.min(PET_STAGE.length - 1, Math.max(0, level - 1))]
  const egg = petId === 'pip' && level <= 1
  const backdrops = ['in a sunny meadow', 'on a mossy rock in a magical forest', 'among floating clouds', 'in a starry night sky', 'by a glowing pond']
  const where = backdrops[Math.abs(Math.floor(variant)) % backdrops.length]
  return egg
    ? `Illustration of a glowing mystical egg with pastel blue and lavender swirls, a tiny spirit creature peeking out of a crack, ${where}. ${PET_STYLE}`
    : `Illustration of ${look}, ${stage}, ${where}. ${PET_STYLE}`
}

// ---- The Hunter avatar: a new look every 5 levels (stage 0-10) ----
// The face stays hidden (hood, mask or helmet), so it suits anyone.

export const AVATAR_STAGES = [
  'a beginner hunter in a plain dark hoodie and worn sneakers, face hidden in the shadow of the hood, holding a cheap dagger, nervous stance',
  'a rookie hunter in a dark hooded jacket with leather bracers and a short sword, face hidden in shadow, a faint blue glow in the eyes',
  'a capable hunter in a long black coat with light leather armour and twin daggers, hood up, face in shadow, eyes glowing blue',
  'a skilled hunter in a reinforced black trench coat with armoured gloves, a curved blade on the back, faint blue aura',
  'a veteran hunter in sleek black armour plates over a long coat, a glowing blue longsword, face hidden behind a dark mask, steady blue aura',
  'an elite hunter in ornate black armour with violet trim, a cape torn by battle, dual glowing blades, a swirling violet aura',
  'a feared hunter in jagged obsidian armour with a horned helmet, a greatsword wreathed in purple flame, shadows rising from the ground',
  'a commander of shadows in regal black armour with a flowing cape, a crown of violet light above the helmet, silhouettes of shadow soldiers behind',
  'a legendary hunter in black and gold armour radiating violet lightning, a massive dark blade, an army of shadow soldiers kneeling behind',
  'a near-mythic shadow lord in towering black armour with glowing violet runes, wings of black smoke, eyes like violet stars',
  'the sovereign of shadows on a throne of black crystal, armour of living darkness and gold, a crown of violet flame, endless shadow army bowing below',
]

const AVATAR_STYLE = 'Original dark fantasy character art, cinematic dramatic lighting, rain and city lights at night, highly detailed digital painting, full body, centred, portrait composition. The face is completely hidden in shadow or behind a mask. No text, no logos, no watermark.'

export function avatarPrompt(stage: number, variant = 0): string | null {
  const look = AVATAR_STAGES[stage]
  if (!look) return null
  const where = ['on a rooftop above a neon city', 'at the mouth of a glowing dungeon gate', 'in a ruined cathedral', 'on a battlefield under a blood moon'][Math.abs(Math.floor(variant)) % 4]
  return `Illustration of ${look}, ${where}. ${AVATAR_STYLE}`
}

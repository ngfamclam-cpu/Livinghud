// Side quests, main quests and rewards the player can pick from.
// Like the dailies, these are suggestions: players add, skip or write their own.

import type { QuestStage, RewardSpecial, StatKey } from './types'

export interface SideTemplate {
  id: string
  stat: StatKey
  title: string
  description: string
  minVersion: string
}

export const SIDE_TEMPLATES: SideTemplate[] = [
  { id: 'side-str-workouts', stat: 'STR', title: '3 workouts this week', description: 'Gym, a run, a class or a long home session.', minVersion: '2 workouts' },
  { id: 'side-str-incline-walk', stat: 'STR', title: '3 incline walks', description: '10–15 minutes uphill or on an incline each time. Let the back leg finish behind you and push off through the big toe; uphill walking works the glutes harder.', minVersion: '1 walk' },
  { id: 'side-str-posture-scan', stat: 'STR', title: 'Weekly posture scan', description: 'Take a side-on head scan and a walking scan in LivingHUD to track your posture over time.', minVersion: 'Head scan only' },
  { id: 'side-str-mobility', stat: 'STR', title: 'Mobility session', description: '20 minutes of stretching or yoga.', minVersion: '10 minutes' },
  { id: 'side-vit-cook', stat: 'VIT', title: 'Cook at home 4 times', description: 'Real meals made at home.', minVersion: '2 times' },
  { id: 'side-vit-prep', stat: 'VIT', title: 'Sunday meal prep', description: 'Prep lunches or ingredients for the week.', minVersion: 'Prep 2 meals' },
  { id: 'side-vit-fish', stat: 'VIT', title: 'Fatty fish twice', description: 'Salmon, sardines, mackerel or similar.', minVersion: 'Once' },
  { id: 'side-int-review', stat: 'INT', title: 'Sunday weekly review', description: 'What worked this week, what didn’t, and next week’s focus.', minVersion: '3 bullet points' },
  { id: 'side-cha-hangout', stat: 'CHA', title: 'In-person hangout', description: 'See a friend face to face.', minVersion: 'A video call' },
  { id: 'side-cha-family', stat: 'CHA', title: 'Call family', description: 'A real call, not just texts.', minVersion: 'A voice note' },
  { id: 'side-cha-group', stat: 'CHA', title: 'One group activity', description: 'A class, club, game night or meetup.', minVersion: 'Sign up for one' },
  { id: 'side-cha-new', stat: 'CHA', title: 'Talk to someone new', description: 'Start a real conversation with a stranger.', minVersion: 'A short chat' },
  { id: 'side-cha-ask', stat: 'CHA', title: 'Ask someone out', description: 'In person or by message.', minVersion: 'Send a first message' },
  { id: 'side-agi-laundry', stat: 'AGI', title: 'Laundry done and put away', description: 'Washed, dried and folded.', minVersion: 'One load' },
  { id: 'side-agi-errands', stat: 'AGI', title: 'Groceries and errands', description: 'Clear this week’s errand list.', minVersion: 'Groceries only' },
  { id: 'side-agi-inbox', stat: 'AGI', title: 'Inbox zero', description: 'Archive, answer or schedule every email.', minVersion: 'Last 3 days only' },
  { id: 'side-agi-dread', stat: 'AGI', title: 'One dreaded task', description: 'The thing you keep putting off.', minVersion: 'First 15 minutes of it' },
  { id: 'side-wlt-money', stat: 'WLT', title: 'Money check-in', description: '15 minutes: balances, bills, and where the money went.', minVersion: 'Check balances' },
  { id: 'side-wlt-network', stat: 'WLT', title: 'Networking message', description: 'Reach out to someone in your field.', minVersion: 'Like and comment on a post' },
  { id: 'side-wlt-ship', stat: 'WLT', title: 'Ship something', description: 'Publish, send or launch one piece of work.', minVersion: 'Share a draft' },
  { id: 'side-wlt-nospend', stat: 'WLT', title: 'No-spend day', description: 'One full day without buying anything non-essential.', minVersion: 'No-spend morning' },
]

export interface MainTemplate {
  id: string
  stat: StatKey
  title: string
  description: string
  stages: QuestStage[]
}

export const MAIN_TEMPLATES: MainTemplate[] = [
  {
    id: 'main-side-income',
    stat: 'WLT',
    title: 'Side income',
    description: 'Build a second source of income, from first idea to $1,000 a month.',
    stages: [
      { id: 'scout', title: 'Scout', description: 'List 10 side-income ideas, then pick 1 by skill, time and startup cost.', xp: 100, basePay: 20 },
      { id: 'prepare', title: 'Prepare', description: 'Build the smallest sellable version: an offer, portfolio, product or listing.', xp: 150, basePay: 40 },
      { id: 'contact', title: 'First contact', description: 'Put it in front of 10 people.', xp: 150, basePay: 30 },
      { id: 'first-blood', title: 'First blood', description: 'Earn your first $1. An A-rank achievement.', xp: 250, basePay: 60 },
      { id: 'grind-100', title: 'Grind I', description: 'Earn $100 in one month.', xp: 300, basePay: 75 },
      { id: 'grind-500', title: 'Grind II', description: 'Earn $500 in one month.', xp: 400, basePay: 100 },
      { id: 'grind-1000', title: 'Grind III', description: 'Earn $1,000 in one month.', xp: 500, basePay: 100 },
    ],
  },
  {
    id: 'main-emergency-fund',
    stat: 'WLT',
    title: 'Emergency fund',
    description: 'Build a cash cushion for real emergencies.',
    stages: [
      { id: 'automate', title: 'Automate', description: 'Set up an automatic transfer to a separate savings account.', xp: 100, basePay: 20 },
      { id: 'one-month', title: 'One month', description: 'Save one month of expenses.', xp: 250, basePay: 50 },
      { id: 'three-months', title: 'Three months', description: 'Save three months of expenses.', xp: 400, basePay: 75 },
      { id: 'six-months', title: 'Six months', description: 'Save six months of expenses.', xp: 500, basePay: 100 },
    ],
  },
  {
    id: 'main-posture',
    stat: 'STR',
    title: 'Posture rebuild',
    description: 'Stand taller in 90 days.',
    stages: [
      { id: 'photo-0', title: 'Day-zero photo', description: 'Take a side-on posture photo to compare against later.', xp: 50, basePay: 10 },
      { id: 'streak-30', title: '30-day streak', description: 'Do your posture drills 30 days in a row.', xp: 250, basePay: 50 },
      { id: 'pullups-15', title: '15 pull-ups', description: '15 unbroken pull-ups.', xp: 300, basePay: 60 },
      { id: 'photo-90', title: '90-day photo', description: 'Retake the photo and compare.', xp: 200, basePay: 40 },
    ],
  },
  {
    id: 'main-bloodwork',
    stat: 'VIT',
    title: 'Know your body',
    description: 'Base your nutrition on real numbers.',
    stages: [
      { id: 'book', title: 'Book it', description: 'Book bloodwork with your doctor.', xp: 50, basePay: 10 },
      { id: 'results', title: 'Read the results', description: 'Go through the results with your doctor.', xp: 100, basePay: 20 },
      { id: 'stack', title: 'Set your stack', description: 'Set your vitamin stack from the results, with your doctor.', xp: 100, basePay: 20 },
      { id: 'checklist-25', title: 'Nutrition month', description: 'Hit the nutrition checklist 25 of 30 days.', xp: 300, basePay: 60 },
    ],
  },
  {
    id: 'main-learning',
    stat: 'INT',
    title: 'Finish what you start',
    description: 'Finish one book or course a month for three months.',
    stages: [
      { id: 'one', title: 'First finish', description: 'Finish one book or course.', xp: 150, basePay: 30 },
      { id: 'two', title: 'Second finish', description: 'Finish another the next month.', xp: 200, basePay: 40 },
      { id: 'three', title: 'Third finish', description: 'Make it three months in a row.', xp: 300, basePay: 60 },
    ],
  },
  {
    id: 'main-friendship',
    stat: 'CHA',
    title: 'Grow your circle',
    description: 'Turn an acquaintance into a friend and find a group of your own.',
    stages: [
      { id: 'join', title: 'Find your group', description: 'Join a recurring group or club.', xp: 100, basePay: 20 },
      { id: 'attend-4', title: 'Show up', description: 'Attend it 4 times.', xp: 200, basePay: 40 },
      { id: 'hangouts-3', title: 'Make a friend', description: 'Hang out 3 times with someone who was an acquaintance.', xp: 250, basePay: 50 },
      { id: 'host', title: 'Host', description: 'Host a game night.', xp: 200, basePay: 40 },
    ],
  },
  {
    id: 'main-life-admin',
    stat: 'AGI',
    title: 'Clean slate',
    description: 'Clear the backlog and keep a steady rhythm.',
    stages: [
      { id: 'backlog', title: 'Clear the backlog', description: 'Clear every overdue life-admin task.', xp: 200, basePay: 40 },
      { id: 'declutter', title: 'Declutter a room', description: 'Sort, donate and reset one room.', xp: 150, basePay: 30 },
      { id: 'wake-30', title: 'Same wake time', description: 'Wake at the same time 30 days in a row.', xp: 300, basePay: 60 },
    ],
  },
]

/** Suggested first main quest: side income, as in the design doc. */
export const SUGGESTED_MAIN = 'main-side-income'

export interface RewardTemplate {
  id: string
  title: string
  price: number
  category: string
  special: RewardSpecial
  statGate?: { stat: StatKey; min: number }
  /** Ideas only: why it fits, and the stat it goes with (ideas for your stats show first). */
  why?: string
  stat?: StatKey
}

/** The starter reward list from the design doc, one or more per rank. */
export const REWARD_TEMPLATES: RewardTemplate[] = [
  { id: 'rw-coffee', title: 'Fancy coffee or energy drink', price: 6, category: 'Treats', special: 'none' },
  { id: 'rw-dessert', title: 'Dessert', price: 7, category: 'Treats', special: 'none' },
  { id: 'rw-gaming-1h', title: '1 hour of gaming', price: 5, category: 'Gaming', special: 'none' },
  { id: 'rw-drink', title: 'One drink out', price: 9, category: 'Going out', special: 'none' },
  { id: 'rw-takeout', title: 'Takeout', price: 25, category: 'Food', special: 'none' },
  { id: 'rw-gaming-3h', title: '3-hour gaming session', price: 15, category: 'Gaming', special: 'none' },
  { id: 'rw-cinema', title: 'Cinema', price: 18, category: 'Going out', special: 'none' },
  { id: 'rw-first-date', title: 'Drinks first date', price: 28, category: 'Dating', special: 'date' },
  { id: 'rw-dinner-date', title: 'Dinner date', price: 60, category: 'Dating', special: 'date' },
  { id: 'rw-night-out', title: 'Night out drinking', price: 60, category: 'Going out', special: 'bigNight' },
  { id: 'rw-new-game', title: 'New game', price: 70, category: 'Gaming', special: 'none' },
  { id: 'rw-restaurant', title: 'Restaurant', price: 45, category: 'Food', special: 'none' },
  { id: 'rw-rave', title: 'Rave ticket', price: 120, category: 'Going out', special: 'bigNight' },
  { id: 'rw-big-date', title: 'Big date night', price: 150, category: 'Dating', special: 'date' },
  { id: 'rw-shoes', title: 'New running shoes', price: 130, category: 'Gear', special: 'none', statGate: { stat: 'STR', min: 40 } },
  { id: 'rw-headphones', title: 'Headphones', price: 150, category: 'Gear', special: 'none' },
  { id: 'rw-concert', title: 'Concert', price: 100, category: 'Going out', special: 'none' },
  { id: 'rw-festival', title: 'Festival ticket', price: 350, category: 'Going out', special: 'bigNight' },
  { id: 'rw-gadget', title: 'Gadget', price: 300, category: 'Gear', special: 'none' },
  { id: 'rw-weekend', title: 'Weekend event', price: 250, category: 'Going out', special: 'none' },
  { id: 'rw-trip', title: 'Trip', price: 1000, category: 'Travel', special: 'none' },
  { id: 'rw-festival-weekend', title: 'Festival weekend', price: 800, category: 'Travel', special: 'bigNight' },
  { id: 'rw-big-tech', title: 'Big tech purchase', price: 1200, category: 'Gear', special: 'none' },
]

/**
 * More reward ideas, picked to go with the rest of the game (training, posture,
 * automations, side income, social life). Prices are typical, not quotes: edit
 * them after adding. Shown in the Shop, one tap to add.
 */
export const REWARD_IDEAS: RewardTemplate[] = [
  // Training and posture
  { id: 'idea-tripod', title: 'Phone tripod with clip', price: 20, category: 'Training gear', special: 'none', stat: 'STR', why: 'Props the phone for the rep counter and posture scans.' },
  { id: 'idea-bands', title: 'Resistance band set', price: 25, category: 'Training gear', special: 'none', stat: 'STR', why: 'Face pulls and band pull-aparts, two of the best moves for forward head posture.' },
  { id: 'idea-foam-roller', title: 'Foam roller', price: 30, category: 'Training gear', special: 'none', stat: 'STR', why: 'Upper-back extension over the roller after long desk days.' },
  { id: 'idea-pullup-bar', title: 'Doorway pull-up bar', price: 35, category: 'Training gear', special: 'none', stat: 'STR', why: 'Pull days, dead hangs and pull-up negatives at home.' },
  { id: 'idea-dip-bars', title: 'Parallettes / dip bars', price: 60, category: 'Training gear', special: 'none', stat: 'STR', why: 'Proper dips and L-sits for push days.' },
  { id: 'idea-massage', title: 'Sports massage', price: 80, category: 'Recovery', special: 'none', stat: 'STR', why: 'A reward for a 30-day streak; good for tight hips and upper back.' },
  { id: 'idea-dumbbells', title: 'Adjustable dumbbells', price: 250, category: 'Training gear', special: 'none', stat: 'STR', why: 'The next step once bodyweight targets get easy.', statGate: { stat: 'STR', min: 60 } },
  // Desk setup (forward head posture)
  { id: 'idea-laptop-stand', title: 'Laptop stand', price: 35, category: 'Desk setup', special: 'none', stat: 'STR', why: 'Screen at eye level: the simplest fix for screen-time head posture.' },
  { id: 'idea-lumbar', title: 'Lumbar support cushion', price: 30, category: 'Desk setup', special: 'none', stat: 'STR', why: 'Helps you sit stacked instead of slumped.' },
  { id: 'idea-monitor-arm', title: 'Monitor arm', price: 70, category: 'Desk setup', special: 'none', stat: 'STR', why: 'Puts the monitor at the right height and distance.' },
  // Automations
  { id: 'idea-nfc', title: 'NFC sticker pack', price: 12, category: 'Automation', special: 'none', stat: 'AGI', why: 'Tap-to-clear quests: vitamins, bedside reset, desk.' },
  { id: 'idea-macrodroid-pro', title: 'MacroDroid Pro', price: 5, category: 'Automation', special: 'none', stat: 'AGI', why: 'Unlimited automations and no ads (one-time; check the Play Store price).' },
  { id: 'idea-smartwatch', title: 'Fitness smartwatch', price: 300, category: 'Tech', special: 'none', stat: 'VIT', why: 'Steps and sleep for VIT quests, ready for the native app phase.' },
  { id: 'idea-glasses', title: 'Smart glasses', price: 800, category: 'Tech', special: 'none', stat: 'INT', why: 'The end-game HUD. S-rank, so it needs the Vault and a cleared main quest.' },
  // Vitality
  { id: 'idea-bottle', title: 'Good water bottle', price: 30, category: 'Health', special: 'none', stat: 'VIT', why: 'Makes the 8-glasses part of your daily easier.' },
  { id: 'idea-sleep-kit', title: 'Sleep mask and earplugs', price: 20, category: 'Health', special: 'none', stat: 'VIT', why: 'Cheap help for the 7.5-hour sleep target.' },
  { id: 'idea-meal-kit', title: 'Healthy meal kit for a week', price: 70, category: 'Health', special: 'none', stat: 'VIT', why: 'A week of nutrition-checklist wins without the planning.' },
  // Learning and side income
  { id: 'idea-book', title: 'A new book', price: 18, category: 'Learning', special: 'none', stat: 'INT', why: 'Feeds "Read 10 pages" and the finish-a-book main quest.' },
  { id: 'idea-course', title: 'Online course', price: 50, category: 'Learning', special: 'none', stat: 'INT', why: 'A skill for the side-income chain.' },
  { id: 'idea-domain', title: 'Domain and site for my side hustle', price: 20, category: 'Side income', special: 'none', stat: 'WLT', why: 'The "Prepare" stage of your side-income main quest.' },
  { id: 'idea-business-cards', title: 'Business cards', price: 25, category: 'Side income', special: 'none', stat: 'WLT', why: 'For "First contact": put it in front of 10 people.' },
  // Social
  { id: 'idea-escape-room', title: 'Escape room with friends', price: 35, category: 'Social', special: 'none', stat: 'CHA', why: 'A group activity that clears CHA side quests.' },
  { id: 'idea-board-game', title: 'Board game for game night', price: 45, category: 'Social', special: 'none', stat: 'CHA', why: 'For the "Host a game night" stage of Grow your circle.' },
  { id: 'idea-climbing', title: 'Climbing gym day pass', price: 25, category: 'Social', special: 'none', stat: 'CHA', why: 'Fun with a friend, and great for grip and back strength.' },
  { id: 'idea-haircut', title: 'Fresh haircut', price: 35, category: 'Self-care', special: 'none', stat: 'CHA', why: 'Before a big date or night out.' },
  { id: 'idea-outfit', title: 'New outfit', price: 120, category: 'Self-care', special: 'none', stat: 'CHA', why: 'For dates, raves and events.' },
  // Gaming
  { id: 'idea-game-pass', title: 'A month of a game subscription', price: 17, category: 'Gaming', special: 'none', why: 'A month of games for a month of streaks.' },
  { id: 'idea-controller', title: 'New game controller', price: 60, category: 'Gaming', special: 'none' },
  { id: 'idea-gaming-chair', title: 'Ergonomic gaming chair', price: 280, category: 'Gaming', special: 'none', stat: 'STR', why: 'Long sessions without the slump; pick one with real lumbar support.' },
  // Raves and festivals
  { id: 'idea-hifi-earplugs', title: 'High-fidelity earplugs', price: 30, category: 'Raves', special: 'none', stat: 'VIT', why: 'Music still sounds good, your ears survive the season.' },
  { id: 'idea-hydration-pack', title: 'Festival hydration pack', price: 45, category: 'Raves', special: 'none', stat: 'VIT', why: 'Water on your back all night. Pairs with the Rave-ready week quest.' },
  { id: 'idea-rave-outfit', title: 'Rave outfit', price: 80, category: 'Raves', special: 'none', stat: 'CHA', why: 'For Main character day and the next event.' },
  { id: 'idea-camp-kit', title: 'Festival camping kit', price: 180, category: 'Raves', special: 'none', why: 'Tent, mat and a decent sleeping bag for festival weekends.' },
  { id: 'idea-vip-upgrade', title: 'VIP upgrade at a festival', price: 450, category: 'Raves', special: 'bigNight', stat: 'CHA', why: 'Shorter queues, better views. A-rank: it comes out of the Vault.' },
  // Asia trip
  { id: 'idea-carry-on', title: 'Carry-on travel backpack', price: 150, category: 'Travel', special: 'none', why: 'One bag for the whole Asia trip; skip the checked-bag fees.' },
  { id: 'idea-packing-cubes', title: 'Packing cubes', price: 25, category: 'Travel', special: 'none', why: 'Makes living out of a backpack painless.' },
  { id: 'idea-language-app', title: 'A year of a language app', price: 60, category: 'Travel', special: 'none', stat: 'INT', why: 'For the Speak for the trip main quest.' },
  { id: 'idea-esim', title: 'Travel eSIM data plan', price: 35, category: 'Travel', special: 'none', why: 'Data the moment you land, no SIM hunting.' },
  { id: 'idea-noise-cancel', title: 'Noise-cancelling headphones', price: 300, category: 'Travel', special: 'none', why: 'Long-haul flights, train rides and focus sessions at home.' },
  { id: 'idea-food-tour', title: 'Street-food tour in Asia', price: 60, category: 'Travel', special: 'none', stat: 'CHA', why: 'Book it ahead and it becomes something to look forward to.' },
  { id: 'idea-business-class', title: 'Business-class upgrade for one flight', price: 900, category: 'Travel', special: 'none', why: 'The ultimate S-rank flex for the Asia trip.' },
  // Life log and memories
  { id: 'idea-photo-book', title: 'Printed photo book', price: 50, category: 'Memories', special: 'none', stat: 'INT', why: 'Your Life log photos of the year, on paper.' },
  { id: 'idea-action-cam', title: 'Action camera', price: 250, category: 'Memories', special: 'none', why: 'Raves, trips and training clips worth keeping.' },
  { id: 'idea-instant-camera', title: 'Instant camera', price: 90, category: 'Memories', special: 'none', stat: 'CHA', why: 'Photos you can hand to friends on the night.' },
  // Experiences and self-care
  { id: 'idea-float', title: 'Float tank or sauna session', price: 50, category: 'Recovery', special: 'none', stat: 'VIT', why: 'A proper reset after a big week.' },
  { id: 'idea-physio', title: 'Posture assessment with a physio', price: 110, category: 'Recovery', special: 'none', stat: 'STR', why: 'A professional check of your pelvic tilt and neck, to compare with your scans.' },
  { id: 'idea-pt-session', title: 'Personal-trainer session', price: 80, category: 'Training gear', special: 'none', stat: 'STR', why: 'Form check on pull-ups, squats and glute work.' },
  { id: 'idea-cooking-class', title: 'Cooking class', price: 90, category: 'Health', special: 'none', stat: 'VIT', why: 'Learn the go-to meals for Recomp season.' },
  { id: 'idea-skincare', title: 'Skincare starter kit', price: 45, category: 'Self-care', special: 'none', stat: 'CHA', why: 'Small daily habit, noticeable glow-up.' },
  { id: 'idea-fragrance', title: 'Signature fragrance', price: 130, category: 'Self-care', special: 'none', stat: 'CHA', why: 'Main-character energy in a bottle.' },
  { id: 'idea-tailored', title: 'A tailored suit or blazer', price: 400, category: 'Self-care', special: 'none', stat: 'WLT', why: 'For interviews, deals and the quiet empire.' },
  // Money and productivity
  { id: 'idea-mech-keyboard', title: 'Mechanical keyboard', price: 120, category: 'Desk setup', special: 'none', stat: 'INT', why: 'Makes deep-work sessions a little more fun.' },
  { id: 'idea-standing-desk', title: 'Standing desk', price: 400, category: 'Desk setup', special: 'none', stat: 'STR', why: 'Switch positions all day; pairs with the Posture rebuild quest.' },
  { id: 'idea-invest', title: 'First $100 into an index fund', price: 100, category: 'Money', special: 'none', stat: 'WLT', why: 'A reward that pays you back. Counts toward Net worth +$5,000.' },
]

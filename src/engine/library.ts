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

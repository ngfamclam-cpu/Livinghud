// Quest offers: every 3 days the System offers a fresh handful of side quests,
// and every Monday a couple of big main quests. Picks come from the period and
// the player's id (like surprises), so every device sees the same offers and
// nothing is stored until you add one. Offers lean toward your weakest stats.

import type { MainTemplate, SideTemplate } from './library'
import type { StatKey } from './types'

export const SIDE_OFFER_DAYS = 3

export type OfferKind = 'you' | 'better' | 'dark'

export const OFFER_KIND_NAMES: Record<OfferKind, string> = {
  you: 'For you',
  better: 'Better you',
  dark: 'Dark side (for fun)',
}

export interface SideOffer extends SideTemplate {
  kind: OfferKind
}

export interface MainOffer extends MainTemplate {
  /** Rough time it takes, shown on the offer. */
  span: string
}

/**
 * "For you" offers are built around this player: posture (forward head and
 * pelvic tilt), training, raves and festivals, the Asia trip, side income,
 * MacroDroid and the desk setup. "Better you" are healthier, happier, more
 * productive habits. "Dark side" plays with narcissism and Machiavellianism in
 * ways that hurt no one.
 */
export const SIDE_OFFERS: SideOffer[] = [
  // For you
  { kind: 'you', id: 'offer-posture-walk', stat: 'STR', title: 'Posture walk ×3', description: '15-minute walks with ribs down, chin gently tucked and a long back-leg push-off. Check your reflection in a window halfway.', minVersion: '1 walk' },
  { kind: 'you', id: 'offer-glute-ladder', stat: 'STR', title: 'Glute ladder', description: '3 sessions of single-leg glute bridges and split-stance tuck holds. Strong glutes pull the pelvis out of anterior tilt.', minVersion: '1 session' },
  { kind: 'you', id: 'offer-desk-audit', stat: 'STR', title: 'Desk posture audit', description: 'Screen top at eye level, elbows at 90°, feet flat. Take a side-on photo at your desk before and after the fix.', minVersion: 'Raise the screen' },
  { kind: 'you', id: 'offer-pullup-push', stat: 'STR', title: 'Pull-up push', description: 'Three sessions of pull-up practice: dead hangs, negatives or band-assisted reps. Pulling strength helps forward shoulders.', minVersion: '1 session' },
  { kind: 'you', id: 'offer-rave-ready', stat: 'VIT', title: 'Rave-ready week', description: 'Before the next event: 4 nights of 7.5h+ sleep, electrolytes on hand, earplugs packed, a meet-up spot agreed with friends.', minVersion: 'Earplugs + electrolytes sorted' },
  { kind: 'you', id: 'offer-recovery-ritual', stat: 'VIT', title: 'Recovery ritual', description: 'After a big night: water and a proper meal before bed, a walk in daylight the next day, early night.', minVersion: 'Water + early night' },
  { kind: 'you', id: 'offer-asia-phrases', stat: 'INT', title: '20 travel phrases', description: 'Learn 20 phrases for your Asia trip (hello, thank you, how much, where is, the bill please) and say them out loud.', minVersion: '10 phrases' },
  { kind: 'you', id: 'offer-asia-research', stat: 'INT', title: 'Trip intel', description: 'Research one city on your Asia list: 5 things to do, 3 foods to try, where to stay, how to get around. Save it to the plan.', minVersion: '1 list' },
  { kind: 'you', id: 'offer-macrodroid', stat: 'AGI', title: 'Automate one habit', description: 'Build one MacroDroid macro that completes a quest for you or nudges you at the right moment (NFC tag, Wi-Fi, a time).', minVersion: 'Plan the macro' },
  { kind: 'you', id: 'offer-asia-fund', stat: 'WLT', title: 'Feed the Asia fund', description: 'Move money into your Asia plan this week, even a little. Watch the bar move.', minVersion: '$10' },
  { kind: 'you', id: 'offer-side-hour', stat: 'WLT', title: 'Side-income power hour ×3', description: 'Three focused hours on your side income: build, pitch or post. Use a focus dungeon for each.', minVersion: '1 hour' },
  { kind: 'you', id: 'offer-festival-crew', stat: 'CHA', title: 'Assemble the crew', description: 'Pick the next rave or festival and get at least two friends to commit to it.', minVersion: 'Ask two people' },
  { kind: 'you', id: 'offer-game-night', stat: 'CHA', title: 'Host a game night', description: 'Gaming, board games or cards: invite people over or online for one evening.', minVersion: 'Send the invites' },
  { kind: 'you', id: 'offer-memory-walk', stat: 'INT', title: 'Explore somewhere new', description: 'Go somewhere you have never been (a suburb, park, café or trail) and log it in the Life log with a photo.', minVersion: 'A new café' },

  // Better you
  { kind: 'better', id: 'offer-sunlight', stat: 'VIT', title: 'Morning light ×5', description: '10 minutes outside within an hour of waking, on 5 days. It sets your body clock and helps sleep.', minVersion: '3 days' },
  { kind: 'better', id: 'offer-no-alcohol', stat: 'VIT', title: 'Dry week', description: 'No alcohol for 7 days. Notice sleep, mood and money.', minVersion: '4 days' },
  { kind: 'better', id: 'offer-veg-30', stat: 'VIT', title: '30 plants', description: 'Eat 30 different plants this week (veg, fruit, nuts, seeds, herbs, grains). Count them.', minVersion: '15 plants' },
  { kind: 'better', id: 'offer-zone2', stat: 'STR', title: 'Zone 2 cardio ×3', description: '30 minutes where you can still talk in full sentences: brisk walk, bike, easy jog.', minVersion: '1 session' },
  { kind: 'better', id: 'offer-gratitude', stat: 'INT', title: 'Three good things', description: 'Each night for 5 nights, write three things that went well and why. One of the best-tested happiness habits.', minVersion: '3 nights' },
  { kind: 'better', id: 'offer-deep-work', stat: 'INT', title: 'Deep work ×4', description: 'Four 60-minute sessions, phone in another room, one task only.', minVersion: '2 sessions' },
  { kind: 'better', id: 'offer-one-book', stat: 'INT', title: 'Finish a book', description: 'Finish the book you are reading (or a short one).', minVersion: '100 pages' },
  { kind: 'better', id: 'offer-phone-sunday', stat: 'AGI', title: 'Phone-light day', description: 'One full day with social apps logged out. Calls, maps and music are fine.', minVersion: 'Half a day' },
  { kind: 'better', id: 'offer-plan-week', stat: 'AGI', title: 'Plan the week', description: 'Sunday: put workouts, the 3 most important tasks and one fun thing in your calendar.', minVersion: 'Just the top 3' },
  { kind: 'better', id: 'offer-reset-room', stat: 'AGI', title: 'Deep clean one room', description: 'The whole room: surfaces, floor, under things, donate what you do not use.', minVersion: 'One corner' },
  { kind: 'better', id: 'offer-kindness', stat: 'CHA', title: 'Three acts of kindness', description: 'Do three small, unasked kind things this week. Write down how each felt.', minVersion: 'One act' },
  { kind: 'better', id: 'offer-reconnect', stat: 'CHA', title: 'Reconnect', description: 'Message someone you have not spoken to in 6+ months and suggest catching up.', minVersion: 'Send the message' },
  { kind: 'better', id: 'offer-budget-review', stat: 'WLT', title: 'Spending autopsy', description: 'Go through last month’s spending line by line. Mark each: worth it, meh, regret. Cut one regret.', minVersion: 'One week of spending' },
  { kind: 'better', id: 'offer-skill-post', stat: 'WLT', title: 'Show your work', description: 'Post something you made or learned (LinkedIn, a portfolio, GitHub or a forum).', minVersion: 'Draft it' },

  // Dark side (for fun): borrowing the playbook, harmlessly.
  { kind: 'dark', id: 'offer-main-character', stat: 'CHA', title: 'Main character day', description: 'Narcissist mode, harmless edition: best outfit, slow walk, take up space, take a photo that makes you look like the lead in a film.', minVersion: 'Best outfit, one photo' },
  { kind: 'dark', id: 'offer-power-presence', stat: 'CHA', title: 'Command the room', description: 'In 3 conversations: hold eye contact, speak a little slower, pause before you answer, and do not fill silences.', minVersion: '1 conversation' },
  { kind: 'dark', id: 'offer-hype-file', stat: 'INT', title: 'Build your hype file', description: 'Write a list of 20 things you have done that you are proud of. Read it before anything scary.', minVersion: '10 things' },
  { kind: 'dark', id: 'offer-negotiate', stat: 'WLT', title: 'The negotiator', description: 'Machiavelli would: ask for a discount, an upgrade or a better rate 3 times this week. Smile, then go quiet.', minVersion: 'Ask once' },
  { kind: 'dark', id: 'offer-chess-moves', stat: 'WLT', title: 'Three moves ahead', description: 'For one goal at work or in life, map who decides, what they want, and your next 3 moves. Then make move one.', minVersion: 'Write the map' },
  { kind: 'dark', id: 'offer-mirror', stat: 'CHA', title: 'The mirror trick', description: 'In 3 conversations, subtly match the other person’s pace and posture, and repeat their last few words as a question. Notice how they open up.', minVersion: '1 conversation' },
  { kind: 'dark', id: 'offer-poker-face', stat: 'AGI', title: 'Poker face', description: 'For a full day, never show irritation. Breathe, smile, decide later. Note who tried to rattle you.', minVersion: 'Half a day' },
  { kind: 'dark', id: 'offer-favour-bank', stat: 'CHA', title: 'Favour bank', description: 'Do 3 useful favours for people who matter to your goals. Nothing asked in return, yet.', minVersion: '1 favour' },
]

/** Big main quests, offered two at a time each week. Harder and longer than the library ones. */
export const MAIN_OFFERS: MainOffer[] = [
  {
    id: 'offer-main-pullups', stat: 'STR', span: '3–4 months', title: 'Ten strict pull-ups',
    description: 'From hanging to ten clean pull-ups. Fixes forward shoulders and builds a strong back.',
    stages: [
      { id: 'hang', title: 'Grip', description: 'Dead hang for 60 seconds.', xp: 150, basePay: 25 },
      { id: 'negatives', title: 'Negatives', description: '5 slow 5-second negatives in one set.', xp: 200, basePay: 35 },
      { id: 'first', title: 'First rep', description: 'One strict pull-up, chin over the bar, no kip.', xp: 300, basePay: 50 },
      { id: 'five', title: 'Five', description: '5 strict pull-ups in one set.', xp: 400, basePay: 70 },
      { id: 'ten', title: 'Ten', description: '10 strict pull-ups in one set. S-rank back.', xp: 600, basePay: 120 },
    ],
  },
  {
    id: 'offer-main-10k', stat: 'STR', span: '3 months', title: 'Run a 10K',
    description: 'From couch to a timed 10K event.',
    stages: [
      { id: 'run-5', title: 'Five minutes', description: 'Run 5 minutes without stopping.', xp: 150, basePay: 25 },
      { id: 'run-5k', title: '5K', description: 'Run 5 km without walking.', xp: 300, basePay: 50 },
      { id: 'signup', title: 'Commit', description: 'Sign up for a 10K event.', xp: 150, basePay: 25 },
      { id: 'run-8k', title: '8K', description: 'An 8 km long run.', xp: 350, basePay: 60 },
      { id: 'race', title: 'Race day', description: 'Finish the 10K.', xp: 600, basePay: 120 },
    ],
  },
  {
    id: 'offer-main-posture-90', stat: 'STR', span: '90 days', title: 'Posture rebuild: 90 days',
    description: 'Measurably better head and pelvis position, tracked with posture scans.',
    stages: [
      { id: 'baseline', title: 'Baseline', description: 'Head and walking scans, plus side-on photos standing and at your desk.', xp: 100, basePay: 20 },
      { id: 'month-1', title: 'Month one', description: '30 days of the posture routine (minimums count).', xp: 300, basePay: 50 },
      { id: 'desk', title: 'Fix the desk', description: 'Screen at eye level, a timer to stand every 45 minutes.', xp: 150, basePay: 25 },
      { id: 'month-2', title: 'Month two', description: '60 days of the routine and a head-angle scan better than your baseline.', xp: 400, basePay: 70 },
      { id: 'month-3', title: 'Month three', description: '90 days, new photos next to the old ones. Post them in the Life log.', xp: 600, basePay: 110 },
    ],
  },
  {
    id: 'offer-main-sleep', stat: 'VIT', span: '6 weeks', title: 'Master your sleep',
    description: 'Six weeks to a consistent, deep sleep schedule.',
    stages: [
      { id: 'track', title: 'Track', description: 'Log bedtime and wake time for 7 days.', xp: 100, basePay: 20 },
      { id: 'anchor', title: 'Anchor', description: 'Same wake time (±30 min) for 14 days, weekends too.', xp: 250, basePay: 40 },
      { id: 'cave', title: 'Cave mode', description: 'Dark, cool, quiet bedroom: blackout, fan, no phone in bed.', xp: 150, basePay: 30 },
      { id: 'thirty', title: 'Thirty nights', description: '30 nights of 7.5h+ in bed.', xp: 500, basePay: 90 },
    ],
  },
  {
    id: 'offer-main-shred', stat: 'VIT', span: '12 weeks', title: 'Recomp season',
    description: 'Twelve weeks of eating for muscle and energy: protein, plants, fewer takeaways.',
    stages: [
      { id: 'audit', title: 'Audit', description: 'Photo every meal for 5 days. Spot your patterns.', xp: 100, basePay: 20 },
      { id: 'protein', title: 'Protein habit', description: '21 days hitting protein at every meal.', xp: 300, basePay: 50 },
      { id: 'cook', title: 'Home cook', description: '5 go-to meals you can cook without a recipe.', xp: 250, basePay: 40 },
      { id: 'twelve', title: 'Twelve weeks', description: '12 weeks, then before and after photos.', xp: 600, basePay: 110 },
    ],
  },
  {
    id: 'offer-main-language', stat: 'INT', span: '4 months', title: 'Speak for the trip',
    description: 'Hold a basic conversation in the language of your first Asia stop.',
    stages: [
      { id: 'script', title: 'Sounds and script', description: 'Learn the pronunciation basics (and a phonetic script, if it has one).', xp: 200, basePay: 30 },
      { id: 'streak', title: '30-day streak', description: '30 days of 15 minutes of practice.', xp: 300, basePay: 50 },
      { id: 'survival', title: 'Survival', description: 'Order food, ask directions and haggle, out loud, with no notes.', xp: 300, basePay: 50 },
      { id: 'tutor', title: 'First conversation', description: 'A 20-minute conversation with a tutor or native speaker.', xp: 500, basePay: 90 },
    ],
  },
  {
    id: 'offer-main-ship-project', stat: 'INT', span: '2–3 months', title: 'Build and ship a project',
    description: 'Make one real thing from start to finish (an app, a video, a track, a website) and put it out there.',
    stages: [
      { id: 'pick', title: 'Pick', description: 'Choose one idea and write a one-page plan.', xp: 100, basePay: 20 },
      { id: 'prototype', title: 'Prototype', description: 'A rough working version.', xp: 300, basePay: 50 },
      { id: 'feedback', title: 'Feedback', description: 'Show it to 5 people and write down what they say.', xp: 250, basePay: 40 },
      { id: 'ship', title: 'Ship', description: 'Release it publicly.', xp: 600, basePay: 110 },
    ],
  },
  {
    id: 'offer-main-circle', stat: 'CHA', span: '3 months', title: 'Build your circle',
    description: 'Turn acquaintances into a real crew you see regularly.',
    stages: [
      { id: 'list', title: 'The list', description: 'List 10 people you want to be closer to. Add them to the Party list.', xp: 100, basePay: 20 },
      { id: 'one-on-ones', title: 'One-on-ones', description: '5 one-on-one hangouts.', xp: 300, basePay: 50 },
      { id: 'host', title: 'Host', description: 'Host a gathering of 6+ people.', xp: 350, basePay: 60 },
      { id: 'ritual', title: 'Ritual', description: 'Start something regular (weekly game night, a run club, monthly dinner) and run it 3 times.', xp: 500, basePay: 90 },
    ],
  },
  {
    id: 'offer-main-festival-season', stat: 'CHA', span: 'A season', title: 'Festival season',
    description: 'Plan, fund and survive a full season of raves and festivals, safely and on budget.',
    stages: [
      { id: 'calendar', title: 'Line-up', description: 'Pick 3 events for the season and add them to Plans.', xp: 100, basePay: 20 },
      { id: 'funded', title: 'Funded', description: 'All three plans fully funded before ticket deadlines.', xp: 350, basePay: 60 },
      { id: 'first', title: 'First event', description: 'Go, with water, earplugs and a crew plan. Log it in the Life log.', xp: 250, basePay: 40 },
      { id: 'season', title: 'Season complete', description: 'All three done, nothing over budget.', xp: 500, basePay: 90 },
    ],
  },
  {
    id: 'offer-main-1k-month', stat: 'WLT', span: '6 months', title: '$1,000 month',
    description: 'One month where side income passes $1,000.',
    stages: [
      { id: 'offer', title: 'The offer', description: 'One clear offer with a price.', xp: 150, basePay: 25 },
      { id: 'pipeline', title: 'Pipeline', description: '30 people or businesses contacted.', xp: 300, basePay: 50 },
      { id: 'repeat', title: 'Repeat customer', description: 'Someone pays you twice.', xp: 300, basePay: 50 },
      { id: 'grand', title: 'The grand', description: '$1,000 in one month.', xp: 700, basePay: 130 },
    ],
  },
  {
    id: 'offer-main-net-worth', stat: 'WLT', span: '1 year', title: 'Net worth +$5,000',
    description: 'Raise your net worth by $5,000 in a year: save, invest, cut and earn.',
    stages: [
      { id: 'snapshot', title: 'Snapshot', description: 'Write down everything you own and owe. That is your starting number.', xp: 100, basePay: 20 },
      { id: 'auto', title: 'Autopilot', description: 'Automatic transfers to savings or investing on payday.', xp: 200, basePay: 35 },
      { id: 'plus-1k', title: '+$1,000', description: 'Net worth up $1,000.', xp: 300, basePay: 50 },
      { id: 'plus-2500', title: '+$2,500', description: 'Net worth up $2,500.', xp: 400, basePay: 70 },
      { id: 'plus-5k', title: '+$5,000', description: 'Net worth up $5,000.', xp: 700, basePay: 130 },
    ],
  },
  {
    id: 'offer-main-discipline', stat: 'AGI', span: '75 days', title: 'Iron discipline: 75 days',
    description: 'A softer 75 Hard: 75 days of a workout, a clean diet, 10 pages, 2 litres of water and no skipped days.',
    stages: [
      { id: 'day-7', title: 'Week one', description: '7 days, no misses.', xp: 150, basePay: 25 },
      { id: 'day-30', title: 'Day 30', description: '30 days, no misses.', xp: 350, basePay: 60 },
      { id: 'day-50', title: 'Day 50', description: '50 days, no misses.', xp: 400, basePay: 70 },
      { id: 'day-75', title: 'Day 75', description: 'All 75. Very few people finish.', xp: 700, basePay: 130 },
    ],
  },
  {
    id: 'offer-main-dark-empire', stat: 'WLT', span: '6 months', title: 'The quiet empire',
    description: 'Machiavelli for good: become the person people come to. Build influence at work or in your scene, ethically.',
    stages: [
      { id: 'map', title: 'Map the board', description: 'Who has influence where you want to grow, and what do they need?', xp: 150, basePay: 25 },
      { id: 'useful', title: 'Be useful', description: 'Solve a real problem for 3 influential people.', xp: 300, basePay: 50 },
      { id: 'known', title: 'Known for something', description: 'Become the go-to for one skill: people ask you for it unprompted.', xp: 400, basePay: 70 },
      { id: 'seat', title: 'A seat at the table', description: 'Get invited into a room (a project, team, lineup or deal) you could not get into 6 months ago.', xp: 700, basePay: 130 },
    ],
  },
]

/** A small, well-mixed hash so each period gets a stable random pick. */
function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return (h ^ (h >>> 15)) >>> 0
}

/** Deterministic shuffle: same seed, same order. */
function shuffled<T extends { id: string }>(xs: T[], seed: string): T[] {
  return [...xs].map(x => ({ x, k: hash(`${seed}:${x.id}`) })).sort((a, b) => a.k - b.k).map(({ x }) => x)
}

/**
 * Quest template ids you already have, with the day each was added. Quests
 * added before a window started are left out of it; ones added during it stay
 * (shown as added), so the set doesn't reshuffle when you pick one.
 */
export type Owned = Map<string, string>

export interface SideOfferSet {
  /** Which 3-day window this is (0 = signup day's). */
  period: number
  startedOn: string
  /** Day the next set arrives. */
  nextOn: string
  offers: SideOffer[]
}

/** The 3-day window today falls in. */
export function sideWindow(daysSinceStart: number, today: string, addDays: (day: string, n: number) => string) {
  const days = Math.max(0, daysSinceStart)
  const into = days % SIDE_OFFER_DAYS
  return { period: Math.floor(days / SIDE_OFFER_DAYS), startedOn: addDays(today, -into), nextOn: addDays(today, SIDE_OFFER_DAYS - into) }
}

/**
 * This window's side-quest offers (pass stat scores from the day before the
 * window started, so the set stays put while you play): 3 picked for you (two from your weakest
 * stats when possible), 2 better-you habits, and 1 dark-side quest (2 every
 * other window). Quests you already have are skipped.
 */
export function sideOffers(
  input: { seed: string; daysSinceStart: number; stats: StatKey[]; scores: Partial<Record<StatKey, number>>; owned: Owned },
  addDays: (day: string, n: number) => string,
  today: string,
): SideOfferSet {
  const { period, startedOn, nextOn } = sideWindow(input.daysSinceStart, today, addDays)
  const seed = `${input.seed}:side:${period}`
  const pool = SIDE_OFFERS.filter(o => input.stats.includes(o.stat) && !((input.owned.get(o.id) ?? '9999') < startedOn))
  const weakest = [...input.stats].sort((a, b) => (input.scores[a] ?? 0) - (input.scores[b] ?? 0)).slice(0, 2)

  const picked: SideOffer[] = []
  const take = (list: SideOffer[], n: number) => {
    for (const o of list) {
      if (n <= 0) break
      if (picked.some(p => p.id === o.id)) continue
      picked.push(o)
      n--
    }
  }
  const mine = shuffled(pool.filter(o => o.kind === 'you'), seed)
  take(mine.filter(o => weakest.includes(o.stat)), 2)
  take(mine, 3 - picked.length)
  take(shuffled(pool.filter(o => o.kind === 'better'), seed), 2)
  take(shuffled(pool.filter(o => o.kind === 'dark'), seed), period % 2 === 1 ? 2 : 1)
  return { period, startedOn, nextOn, offers: picked }
}

export interface MainOfferSet {
  /** The Monday the offers changed. */
  week: string
  nextOn: string
  offers: MainOffer[]
}

/** This week's two big main quest offers, from different stats, leaning toward your weakest (scores from before the week). */
export function mainOffers(
  input: { seed: string; week: string; stats: StatKey[]; scores: Partial<Record<StatKey, number>>; owned: Owned },
  addDays: (day: string, n: number) => string,
): MainOfferSet {
  const pool = shuffled(MAIN_OFFERS.filter(o => input.stats.includes(o.stat) && !((input.owned.get(o.id) ?? '9999') < input.week)), `${input.seed}:main:${input.week}`)
  const weakest = [...input.stats].sort((a, b) => (input.scores[a] ?? 0) - (input.scores[b] ?? 0))[0]
  const first = pool.find(o => o.stat === weakest) ?? pool[0]
  const second = pool.find(o => o !== first && o.stat !== first?.stat) ?? pool.find(o => o !== first)
  return { week: input.week, nextOn: addDays(input.week, 7), offers: [first, second].filter((o): o is MainOffer => !!o) }
}

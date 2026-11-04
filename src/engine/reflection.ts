// Daily reflection questions that evolve with you. No AI: the questions come
// from a bank grouped by theme, picked each day from what your entries show.
//  - Follow-ups on yesterday: the thing you said you'd adjust, ideas you
//    brainstormed, something you started tracking.
//  - Patterns: a drain that keeps coming back, a top-3 goal that keeps slipping,
//    your weakest stat.
//  - Mood: gentler questions after a rough day, stretch questions on good ones.
//  - Engagement: themes you write the most about come up more, ones you skip
//    come up less (never never), and recent questions don't repeat.
// The same day always gives the same questions on every device. Every
// question is optional; three answers clear the journal daily in full.

import { journalPatterns } from './journal'
import { addDays } from './time'
import type { DayGoals, JournalEntry, StatKey } from './types'

export type ReflectionTheme =
  | 'wins' | 'energy' | 'people' | 'ideas' | 'growth' | 'body' | 'money' | 'focus' | 'fun' | 'future' | 'mind' | 'gratitude' | 'tracking'

export const THEME_NAMES: Record<ReflectionTheme, string> = {
  wins: 'Wins', energy: 'Energy', people: 'People', ideas: 'Brainstorm', growth: 'Growth', body: 'Body', money: 'Money',
  focus: 'Focus', fun: 'Fun', future: 'Future', mind: 'Mind', gratitude: 'Gratitude', tracking: 'Track it',
}

/** The stat each theme speaks to, for leaning toward your weakest stat. */
const THEME_STAT: Partial<Record<ReflectionTheme, StatKey>> = {
  body: 'STR', energy: 'VIT', ideas: 'INT', growth: 'INT', people: 'CHA', fun: 'CHA', focus: 'AGI', money: 'WLT', future: 'WLT',
}

export interface BankQuestion {
  id: string
  theme: ReflectionTheme
  text: string
  /** 'stretch' suits good days, 'gentle' rough ones; most are for any day. */
  tone?: 'stretch' | 'gentle'
}

export const QUESTION_BANK: BankQuestion[] = [
  // Wins
  { id: 'win-proud', theme: 'wins', text: 'What did you do today that you are quietly proud of?' },
  { id: 'win-small', theme: 'wins', text: 'What small win would be easy to miss if you did not write it down?' },
  { id: 'win-skill', theme: 'wins', text: 'Where did you notice yourself getting better at something?' },
  { id: 'win-hard', theme: 'wins', text: 'What was hard today that you did anyway?', tone: 'stretch' },
  // Energy
  { id: 'en-peak', theme: 'energy', text: 'When did you have the most energy today, and what were you doing?' },
  { id: 'en-leak', theme: 'energy', text: 'What leaked your energy today that you could plug tomorrow?' },
  { id: 'en-sleep', theme: 'energy', text: 'How did last night’s sleep shape today? What would make tonight better?' },
  { id: 'en-recharge', theme: 'energy', text: 'What actually recharges you, and when did you last do it?', tone: 'gentle' },
  // People
  { id: 'ppl-who', theme: 'people', text: 'Who made today better, and do they know it?' },
  { id: 'ppl-reach', theme: 'people', text: 'Who have you been meaning to message? What would you say?' },
  { id: 'ppl-plan', theme: 'people', text: 'What could you plan with friends in the next two weeks?' },
  { id: 'ppl-date', theme: 'people', text: 'What kind of date or night out would you actually look forward to?', tone: 'stretch' },
  { id: 'ppl-conflict', theme: 'people', text: 'Is there a conversation you are avoiding? What is the first sentence?' },
  // Ideas / brainstorm
  { id: 'idea-three', theme: 'ideas', text: 'Brainstorm: list three ideas, however wild, for making money on the side.', tone: 'stretch' },
  { id: 'idea-fix', theme: 'ideas', text: 'Brainstorm: what is something annoying in your day that someone could build a fix for?' },
  { id: 'idea-content', theme: 'ideas', text: 'Brainstorm: three things you know that others would pay or tune in to learn.' },
  { id: 'idea-trip', theme: 'ideas', text: 'Brainstorm: five things you want to do on the Asia trip.' },
  { id: 'idea-weekend', theme: 'ideas', text: 'Brainstorm: three ways to make this weekend memorable.' },
  { id: 'idea-automate', theme: 'ideas', text: 'Brainstorm: what part of your routine could a phone automation do for you?' },
  { id: 'idea-what-if', theme: 'ideas', text: 'What if you had one free month and $5,000: what would you build or try?', tone: 'stretch' },
  // Growth
  { id: 'gr-learn', theme: 'growth', text: 'What did you learn today, and where could you use it this week?' },
  { id: 'gr-mistake', theme: 'growth', text: 'What went wrong today, and what does it teach you?' },
  { id: 'gr-skill', theme: 'growth', text: 'Which one skill, if you got good at it this year, would change the most?', tone: 'stretch' },
  { id: 'gr-advice', theme: 'growth', text: 'What advice would you give a friend in your exact situation right now?' },
  // Body
  { id: 'body-feel', theme: 'body', text: 'How did your body feel today? Any tightness, pain or strength you noticed?' },
  { id: 'body-posture', theme: 'body', text: 'When did you catch your posture today, and what were you doing?' },
  { id: 'body-train', theme: 'body', text: 'What would make tomorrow’s training something you look forward to?' },
  { id: 'body-food', theme: 'body', text: 'What did you eat today that helped you, and what dragged you down?' },
  // Money
  { id: 'money-worth', theme: 'money', text: 'What did you spend on today that was worth it, and what was not?' },
  { id: 'money-want', theme: 'money', text: 'What are you saving for right now, and how would getting it feel?' },
  { id: 'money-earn', theme: 'money', text: 'What is one step this week that could earn you money?', tone: 'stretch' },
  { id: 'money-cut', theme: 'money', text: 'Which subscription or habit costs more than it gives back?' },
  // Focus
  { id: 'foc-distract', theme: 'focus', text: 'What pulled your attention away most today? How could you block it?' },
  { id: 'foc-deep', theme: 'focus', text: 'When were you most focused today? What made it work?' },
  { id: 'foc-one', theme: 'focus', text: 'If you could only get one thing done tomorrow, what should it be?' },
  { id: 'foc-avoid', theme: 'focus', text: 'What task are you avoiding, and what is the smallest first step?' },
  // Fun
  { id: 'fun-best', theme: 'fun', text: 'What was the most fun part of today? How do you get more of it?' },
  { id: 'fun-next', theme: 'fun', text: 'What event, rave or trip are you looking forward to? What would make it even better?' },
  { id: 'fun-new', theme: 'fun', text: 'What is something new you want to try this month?' },
  // Future
  { id: 'fut-year', theme: 'future', text: 'One year from now, what do you want to be able to say about this year?', tone: 'stretch' },
  { id: 'fut-week', theme: 'future', text: 'What would make next week a great week?' },
  { id: 'fut-version', theme: 'future', text: 'What would the strongest version of you do differently tomorrow?' },
  { id: 'fut-goal', theme: 'future', text: 'Which goal excites you most right now, and what is its next step?' },
  // Mind
  { id: 'mind-worry', theme: 'mind', text: 'What is on your mind that you have not said out loud?', tone: 'gentle' },
  { id: 'mind-kind', theme: 'mind', text: 'What would you say to yourself if you were being kind?', tone: 'gentle' },
  { id: 'mind-control', theme: 'mind', text: 'What is in your control tomorrow, and what can you let go of?', tone: 'gentle' },
  { id: 'mind-mood', theme: 'mind', text: 'What shifted your mood today, for better or worse?' },
  // Gratitude
  { id: 'grat-three', theme: 'gratitude', text: 'Name three things you are grateful for today, and why.' },
  { id: 'grat-person', theme: 'gratitude', text: 'Who are you grateful for this week?' },
  { id: 'grat-simple', theme: 'gratitude', text: 'What simple thing made today a little better?', tone: 'gentle' },
  // Tracking
  { id: 'trk-habit', theme: 'tracking', text: 'What is one habit you wish you were already tracking?' },
  { id: 'trk-measure', theme: 'tracking', text: 'What is one number in your life you want to improve? How would you measure it?' },
  { id: 'trk-challenge', theme: 'tracking', text: 'What new challenge could you take on next week?', tone: 'stretch' },
]

/** The three classic prompts. Still offered every day, but optional like the rest. */
export const CLASSIC_QUESTIONS = [
  { id: 'wentWell', text: 'What went well?' },
  { id: 'drained', text: 'What drained me?' },
  { id: 'adjust', text: 'One thing to adjust tomorrow' },
] as const

export interface DailyQuestion {
  id: string
  theme: ReflectionTheme
  text: string
  /** Why the System is asking this one (shown small under the question). */
  why?: string
}

export const ANSWERS_FOR_FULL = 3

export interface ReflectionContext {
  day: string
  seed: string
  entries: JournalEntry[]
  goals?: DayGoals[]
  /** 0-100 stat scores, to lean toward the weakest. */
  stats?: Partial<Record<StatKey, number>>
  /** How many evolving questions to offer besides the classics. */
  count?: number
}

const clip = (s: string, n = 70) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s)

function hash(text: string): number {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619)
  h ^= h >>> 13
  h = Math.imul(h, 0x5bd1e995)
  return (h ^ (h >>> 15)) >>> 0
}
const unit = (text: string) => hash(text) / 4294967296

/** How much you engage with each theme: share of times answered, and how much you write. */
export function themeEngagement(entries: JournalEntry[], day: string, days = 30): Map<ReflectionTheme, { asked: number; answered: number; avgLength: number }> {
  const since = addDays(day, -days)
  const out = new Map<ReflectionTheme, { asked: number; answered: number; avgLength: number }>()
  for (const e of entries) {
    if (e.day < since || e.day >= day) continue
    for (const a of e.answers ?? []) {
      const s = out.get(a.theme as ReflectionTheme) ?? { asked: 0, answered: 0, avgLength: 0 }
      s.asked++
      if (a.answer.trim()) {
        s.avgLength = (s.avgLength * s.answered + a.answer.trim().length) / (s.answered + 1)
        s.answered++
      }
      out.set(a.theme as ReflectionTheme, s)
    }
    for (const id of e.skipped ?? []) {
      const theme = QUESTION_BANK.find(q => q.id === id)?.theme
      if (!theme) continue
      const s = out.get(theme) ?? { asked: 0, answered: 0, avgLength: 0 }
      s.asked++
      out.set(theme, s)
    }
  }
  return out
}

/**
 * Today's evolving questions (the classics are separate and always offered).
 * Follow-ups first, then themed questions picked by weight.
 */
export function dailyQuestions(ctx: ReflectionContext): DailyQuestion[] {
  const count = ctx.count ?? 4
  const sorted = [...ctx.entries].filter(e => e.day < ctx.day).sort((a, b) => b.day.localeCompare(a.day))
  const last = sorted[0]
  const yesterday = sorted.find(e => e.day === addDays(ctx.day, -1))
  const out: DailyQuestion[] = []

  // 1. Follow-ups on what you wrote.
  if (yesterday?.adjust.trim()) {
    out.push({ id: 'fu-adjust', theme: 'growth', text: `Yesterday you wanted to adjust: “${clip(yesterday.adjust)}”. Did it happen? What got in the way, or what helped?`, why: 'Following up on yesterday' })
  }
  const lastIdeas = (last?.answers ?? []).find(a => a.theme === 'ideas' && a.answer.trim().length > 15)
  if (lastIdeas && out.length < 2) {
    out.push({ id: 'fu-ideas', theme: 'ideas', text: `Last time you brainstormed: “${clip(lastIdeas.answer, 60)}”. Pick the best one: what is a 15-minute first step?`, why: 'Building on your ideas' })
  }
  const tracked = last?.tracked?.[0]
  if (tracked && out.length < 2) {
    out.push({ id: 'fu-tracked', theme: 'tracking', text: `You started tracking “${clip(tracked.title, 50)}”. How is it going so far?`, why: 'Checking in on something new' })
  }

  // 2. Patterns: a recurring drain, a goal that keeps slipping.
  const drains = journalPatterns(ctx.entries.filter(e => e.day < ctx.day), [], 0, ctx.day).drains
  const drain = drains.find(d => d.count >= 2)
  if (drain && out.length < 3) {
    out.push({ id: 'pat-drain', theme: 'energy', text: `“${drain.word}” has drained you ${drain.count} times lately. What is one way to make it smaller this week?`, why: 'A pattern in your entries' })
  }
  const slipping = slippingGoal(ctx.goals ?? [], ctx.day)
  if (slipping && out.length < 3) {
    out.push({ id: 'pat-goal', theme: 'focus', text: `“${clip(slipping, 50)}” keeps getting pushed back. What is really stopping it, and what is the smallest version you could do?`, why: 'A goal that keeps slipping' })
  }

  // 3. Themed questions, weighted by engagement, mood, your weakest stat, and freshness.
  const engagement = themeEngagement(ctx.entries, ctx.day)
  const recentIds = new Set(sorted.filter(e => e.day >= addDays(ctx.day, -10)).flatMap(e => [...(e.answers ?? []).map(a => a.id), ...(e.skipped ?? [])]))
  const lastMood = last?.mood ?? 3
  const weakest = ctx.stats ? (Object.entries(ctx.stats) as [StatKey, number][]).sort((a, b) => a[1] - b[1])[0]?.[0] : undefined
  const usedThemes = new Set(out.map(q => q.theme))
  const weight = (q: BankQuestion) => {
    const e = engagement.get(q.theme)
    let w = 1
    if (e && e.asked > 0) w *= 0.4 + (e.answered / e.asked) * (1 + Math.min(1, e.avgLength / 150))
    if (lastMood <= 2) w *= q.tone === 'gentle' ? 2.2 : q.tone === 'stretch' ? 0.4 : 1
    if (lastMood >= 4) w *= q.tone === 'stretch' ? 1.8 : q.tone === 'gentle' ? 0.6 : 1
    if (weakest && THEME_STAT[q.theme] === weakest) w *= 1.6
    if (q.theme === 'ideas') w *= 1.3 // the owner wants daily brainstorming
    return w
  }
  const pool = QUESTION_BANK.filter(q => !recentIds.has(q.id))
  const candidates = (pool.length >= count ? pool : QUESTION_BANK).map(q => ({ q, key: -Math.log(unit(`${ctx.seed}:${ctx.day}:${q.id}`) || 1e-9) / weight(q) }))
  candidates.sort((a, b) => a.key - b.key)
  // One brainstorm question every day.
  if (![...out].some(q => q.theme === 'ideas')) {
    const idea = candidates.find(c => c.q.theme === 'ideas')
    if (idea) {
      out.push({ ...idea.q, why: 'Daily brainstorm' })
      usedThemes.add('ideas')
    }
  }
  for (const { q } of candidates) {
    if (out.length >= count + 1) break
    if (usedThemes.has(q.theme) || out.some(o => o.id === q.id)) continue
    out.push({ ...q, why: whyFor(q, weakest, lastMood) })
    usedThemes.add(q.theme)
  }
  return out
}

function whyFor(q: BankQuestion, weakest: StatKey | undefined, mood: number): string | undefined {
  if (weakest && THEME_STAT[q.theme] === weakest) return `For your ${weakest}`
  if (mood <= 2 && q.tone === 'gentle') return 'Taking it easy after a rough day'
  if (mood >= 4 && q.tone === 'stretch') return 'You are on a roll: aim higher'
  return undefined
}

/** A top-3 goal set on 2+ of the last 14 days that still isn't done. */
function slippingGoal(goals: DayGoals[], day: string): string | null {
  const since = addDays(day, -14)
  const seen = new Map<string, { text: string; days: number; done: boolean }>()
  for (const g of goals) {
    if (g.day < since || g.day > day) continue
    for (const i of g.items) {
      const key = i.text.trim().toLowerCase()
      if (!key) continue
      const s = seen.get(key) ?? { text: i.text.trim(), days: 0, done: false }
      s.days++
      s.done = s.done || i.done
      seen.set(key, s)
    }
  }
  return [...seen.values()].filter(s => s.days >= 2 && !s.done).sort((a, b) => b.days - a.days)[0]?.text ?? null
}

/** A replacement for a question you swapped away: the next best one not already shown. */
export function swapQuestion(ctx: ReflectionContext, shownIds: string[], n: number): DailyQuestion | null {
  const many = dailyQuestions({ ...ctx, count: 12 + n })
  return many.find(q => !shownIds.includes(q.id)) ?? QUESTION_BANK.find(q => !shownIds.includes(q.id)) ?? null
}

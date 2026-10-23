// History for the PC dashboard: the streak calendar, stat trends, money by
// month, lifetime totals, training charts and the activity log. All derived
// from the logs, like everything else; nothing here is stored.

import { BOSS_XP } from './focus'
import { CONTACT_NAMES } from './party'
import { statScores } from './summary'
import { addDays, dayKey, daysBetween, monthOf } from './time'
import type { Boss, Completion, Contact, ExerciseKey, ExerciseSet, FocusRun, JournalEntry, Person, Player, PlanFund, Purchase, Quest, SavingsEntry, StatKey, SurpriseClear } from './types'

export interface CalendarDay {
  day: string
  /** Dailies done (a minimum counts as half). */
  done: number
  /** Dailies that were due that day. */
  due: number
  rest: boolean
  /** Before signup, or after today. */
  outside: boolean
}

const dayOf = (createdAt: number, resetHour: number) => dayKey(new Date(createdAt), resetHour)

/** Every day of the last `weeks` weeks (Monday-first columns), oldest first, ending on the week of today. */
export function calendarDays(
  player: Pick<Player, 'createdAt' | 'settings'>,
  quests: Quest[],
  completions: Completion[],
  restDays: Set<string>,
  today: string,
  weeks: number,
): CalendarDay[] {
  const resetHour = player.settings.resetHour
  const startDay = dayOf(player.createdAt, resetHour)
  const dailies = quests.filter(q => q.kind === 'daily' && q.active).map(q => ({ id: q.id, since: dayOf(q.createdAt, resetHour) }))
  const ids = new Set(dailies.map(d => d.id))
  const doneOn = new Map<string, number>()
  for (const c of completions) if (ids.has(c.questId)) doneOn.set(c.day, (doneOn.get(c.day) ?? 0) + (c.version === 'full' ? 1 : 0.5))
  const [y, m, d] = today.split('-').map(Number)
  const weekday = (new Date(y, m - 1, d).getDay() + 6) % 7
  const first = addDays(today, -weekday - 7 * (weeks - 1))
  const days: CalendarDay[] = []
  for (let i = 0; i < weeks * 7; i++) {
    const day = addDays(first, i)
    const outside = day < startDay || day > today
    days.push({
      day,
      done: outside ? 0 : Math.min(doneOn.get(day) ?? 0, dailies.length),
      due: outside ? 0 : dailies.filter(q => q.since <= day).length,
      rest: restDays.has(day),
      outside,
    })
  }
  return days
}

/** Each stat's 0-100 score as it stood at the end of each of the last `days` days. */
export function statHistory(
  player: Pick<Player, 'stats' | 'createdAt' | 'settings'>,
  quests: Quest[],
  completions: Completion[],
  restDays: Set<string>,
  today: string,
  days: number,
): { day: string; stats: Partial<Record<StatKey, number>> }[] {
  const startDay = dayOf(player.createdAt, player.settings.resetHour)
  const dailies = quests.filter(q => q.kind === 'daily' && q.active)
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i)
    if (day < startDay) continue
    out.push({ day, stats: statScores(player, dailies, completions, restDays, day, startDay).stats })
  }
  return out
}

export interface MonthMoney {
  month: string
  /** Quest dollars earned that month (before the budget cap). */
  earned: number
  /** Paid from the wallet. */
  spent: number
  /** Logged as saved toward the savings gate. */
  saved: number
}

/** The last `months` months of money, oldest first. */
export function moneyByMonth(completions: Completion[], purchases: Purchase[], savings: SavingsEntry[], today: string, months: number): MonthMoney[] {
  const [y, m] = monthOf(today).split('-').map(Number)
  const list: MonthMoney[] = []
  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(y, m - 1 - i, 1)
    const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const sum = <T,>(xs: T[], day: (x: T) => string, value: (x: T) => number) => xs.filter(x => monthOf(day(x)) === month).reduce((s, x) => s + value(x), 0)
    list.push({
      month,
      earned: round(sum(completions, c => c.day, c => c.dollars)),
      spent: round(sum(purchases, p => p.day, p => p.fromWallet)),
      saved: round(sum(savings.filter(e => e.kind === 'saved'), e => e.day, e => e.amount)),
    })
  }
  return list
}

export interface Lifetime {
  daysPlayed: number
  questsCleared: number
  dollarsEarned: number
  focusHours: number
  reps: number
  contacts: number
  bossesDefeated: number
  journalEntries: number
}

export function lifetimeTotals(
  player: Pick<Player, 'createdAt' | 'settings'>,
  today: string,
  logs: { completions: Completion[]; focusRuns: FocusRun[]; sets: ExerciseSet[]; contacts: Contact[]; bosses: Boss[]; journal: JournalEntry[] },
  repExercises: Set<ExerciseKey>,
): Lifetime {
  return {
    daysPlayed: daysBetween(dayOf(player.createdAt, player.settings.resetHour), today) + 1,
    questsCleared: logs.completions.length,
    dollarsEarned: round(logs.completions.reduce((s, c) => s + c.dollars, 0)),
    focusHours: Math.round(logs.focusRuns.reduce((s, r) => s + r.minutes, 0) / 6) / 10,
    reps: Math.max(0, logs.sets.filter(s => repExercises.has(s.exercise)).reduce((s, x) => s + x.amount, 0)),
    contacts: logs.contacts.length,
    bossesDefeated: logs.bosses.filter(b => b.defeatedAt).length,
    journalEntries: logs.journal.length,
  }
}

/** One exercise's daily totals for the last `days` days, oldest first (corrections included). */
export function exerciseHistory(sets: ExerciseSet[], exercise: ExerciseKey, today: string, days: number): { day: string; total: number }[] {
  const by = new Map<string, number>()
  for (const s of sets) if (s.exercise === exercise) by.set(s.day, (by.get(s.day) ?? 0) + s.amount)
  const out = []
  for (let i = days - 1; i >= 0; i--) {
    const day = addDays(today, -i)
    out.push({ day, total: Math.max(0, by.get(day) ?? 0) })
  }
  return out
}

export type FeedKind = 'quest' | 'reward' | 'set' | 'contact' | 'focus' | 'boss' | 'journal' | 'surprise' | 'savings' | 'plan'

export interface FeedEntry {
  id: string
  at: number
  kind: FeedKind
  text: string
  /** Short gain, e.g. "+20 XP". */
  gain: string
  stat: StatKey | null
}

/** Everything that happened, newest first. */
export function activityFeed(
  logs: {
    quests: Quest[]
    completions: Completion[]
    purchases: Purchase[]
    sets: ExerciseSet[]
    people: Person[]
    contacts: Contact[]
    focusRuns: FocusRun[]
    bosses: Boss[]
    journal: JournalEntry[]
    surprises: SurpriseClear[]
    savings: SavingsEntry[]
    planFunds: PlanFund[]
    planNames: Map<string, string>
    exerciseName: (key: ExerciseKey) => string
  },
  limit: number,
): FeedEntry[] {
  const quest = new Map(logs.quests.map(q => [q.id, q]))
  const person = new Map(logs.people.map(p => [p.id, p.name]))
  const out: FeedEntry[] = []
  const dollars = (n: number) => `$${n.toFixed(2)}`
  for (const c of logs.completions) {
    const q = quest.get(c.questId)
    const stage = c.stageId ? q?.stages?.find(s => s.id === c.stageId) : undefined
    out.push({
      id: c.id,
      at: c.createdAt,
      kind: 'quest',
      text: `${c.version === 'min' ? 'Minimum cleared' : 'Cleared'}: ${q?.title ?? 'a removed quest'}${stage ? ` (${stage.title})` : ''}`,
      gain: `+${c.xp} XP${c.dollars > 0 ? ` · +${dollars(c.dollars)}` : ''}`,
      stat: c.stat,
    })
  }
  for (const p of logs.purchases) {
    out.push({ id: p.id, at: p.createdAt, kind: p.planId ? 'plan' : 'reward', text: `${p.planId ? 'Booked' : `${p.rank}-rank reward`}: ${p.title}`, gain: `−${dollars(p.price)}`, stat: p.stat })
  }
  for (const s of logs.sets) {
    if (s.amount === 0) continue
    out.push({ id: s.id, at: s.createdAt, kind: 'set', text: `${logs.exerciseName(s.exercise)}${s.source === 'correction' ? ' (count fixed)' : ''}`, gain: `${s.amount > 0 ? '+' : ''}${s.amount}`, stat: 'STR' })
  }
  for (const c of logs.contacts) {
    out.push({ id: c.id, at: c.createdAt, kind: 'contact', text: `${CONTACT_NAMES[c.kind]} with ${person.get(c.personId) ?? 'someone'}`, gain: `+${c.xp} XP`, stat: 'CHA' })
  }
  for (const r of logs.focusRuns) {
    out.push({ id: r.id, at: r.createdAt, kind: 'focus', text: `${r.cleared ? 'Dungeon cleared' : 'Focus'}: ${r.label}, ${r.minutes} min`, gain: `+${r.xp} XP`, stat: r.stat })
  }
  for (const b of logs.bosses) {
    if (b.defeatedAt) out.push({ id: `${b.id}-defeat`, at: b.defeatedAt, kind: 'boss', text: `Boss defeated: ${b.name}`, gain: `+${BOSS_XP} XP`, stat: b.stat })
  }
  for (const j of logs.journal) out.push({ id: j.id, at: j.createdAt, kind: 'journal', text: 'Journal entry written', gain: '', stat: 'INT' })
  for (const s of logs.surprises) out.push({ id: s.id, at: s.createdAt, kind: 'surprise', text: 'Surprise quest cleared', gain: `+${s.xp} XP`, stat: null })
  for (const e of logs.savings) out.push({ id: e.id, at: e.createdAt, kind: 'savings', text: e.kind === 'saved' ? 'Savings logged' : 'Income logged', gain: dollars(e.amount), stat: 'WLT' })
  for (const f of logs.planFunds) {
    if (f.amount > 0) out.push({ id: f.id, at: f.createdAt, kind: 'plan', text: `Saved into ${logs.planNames.get(f.planId) ?? 'a plan'}`, gain: dollars(f.amount), stat: 'WLT' })
  }
  return out.sort((a, b) => b.at - a.at).slice(0, limit)
}

const round = (n: number) => Math.round(n * 100) / 100

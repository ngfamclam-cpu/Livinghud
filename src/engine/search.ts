// Search across everything you've written or logged: journal and reflection
// answers, Life log notes and places, top-3 goals, quests, money entries and
// bills, people and contact notes, rewards and purchases, plans, bosses, focus
// sessions and your cards. Pure: the screen builds the documents from its data.

import type { BonusRecord } from './extras'
import { couponById } from './extras'
import type { Bill, Boss, Completion, Contact, CustomCard, DayGoals, FocusRun, JournalEntry, Memory, Person, Place, Plan, Purchase, Quest, Reward, Transaction } from './types'

export type SearchKind = 'journal' | 'memory' | 'place' | 'goal' | 'quest' | 'money' | 'bill' | 'person' | 'contact' | 'reward' | 'purchase' | 'plan' | 'boss' | 'focus' | 'card' | 'coupon'

/** Where a result opens. */
export type SearchTarget = 'journal' | 'lifelog' | 'goals' | 'quests' | 'finance' | 'party' | 'shop' | 'plans' | 'focus' | 'collection' | 'rewards'

export interface SearchDoc {
  id: string
  kind: SearchKind
  title: string
  /** The searchable body (shown in full when a result is opened). */
  text: string
  /** Game day, if it has one. */
  day?: string
  at: number
  open: SearchTarget
  planId?: string
}

export interface SearchData {
  journal?: JournalEntry[]
  memories?: Memory[]
  places?: Place[]
  goals?: DayGoals[]
  quests?: Quest[]
  completions?: Completion[]
  transactions?: Transaction[]
  bills?: Bill[]
  people?: Person[]
  contacts?: Contact[]
  rewards?: Reward[]
  purchases?: Purchase[]
  plans?: Plan[]
  bosses?: Boss[]
  focusRuns?: FocusRun[]
  customCards?: CustomCard[]
  bonuses?: BonusRecord[]
}

export const SEARCH_KIND_NAMES: Record<SearchKind, string> = {
  journal: 'Journal', memory: 'Life log', place: 'Place', goal: 'Top 3', quest: 'Quest', money: 'Money', bill: 'Bill', person: 'Person', contact: 'Contact',
  reward: 'Reward', purchase: 'Purchase', plan: 'Plan', boss: 'Boss', focus: 'Focus', card: 'Card', coupon: 'Coupon',
}

const lines = (parts: (string | undefined | false | null)[]) => parts.filter((p): p is string => !!p && !!p.trim()).join('\n')
const money = (n: number) => `$${n.toFixed(2)}`

/** Turns the save into searchable documents. */
export function buildSearchDocs(d: SearchData): SearchDoc[] {
  const docs: SearchDoc[] = []
  const placeName = new Map((d.places ?? []).map(p => [p.id, [p.name, p.city, p.country].filter(Boolean).join(', ')]))
  const personName = new Map((d.people ?? []).map(p => [p.id, p.name]))
  const questTitle = new Map((d.quests ?? []).map(q => [q.id, q.title]))

  for (const e of d.journal ?? []) {
    docs.push({
      id: `journal-${e.id}`, kind: 'journal', title: `Reflection · mood ${e.mood}/5 · energy ${e.energy}/5`, day: e.day, at: e.updatedAt || e.createdAt, open: 'journal',
      text: lines([
        e.wentWell && `Went well: ${e.wentWell}`,
        e.drained && `Drained me: ${e.drained}`,
        e.adjust && `Adjust tomorrow: ${e.adjust}`,
        e.prompt && e.promptAnswer && `${e.prompt} ${e.promptAnswer}`,
        ...(e.answers ?? []).filter(a => a.answer.trim()).map(a => `${a.question} ${a.answer}`),
        ...(e.tracked ?? []).map(t => `Tracked: ${t.title}`),
      ]),
    })
  }
  for (const m of d.memories ?? []) {
    const place = m.placeId ? placeName.get(m.placeId) : undefined
    docs.push({ id: `memory-${m.id}`, kind: 'memory', title: place ? `Life log · ${place}` : 'Life log', text: lines([m.note, place && `At ${place}`, m.photos.length ? `${m.photos.length} photo${m.photos.length === 1 ? '' : 's'}` : '']), day: m.day, at: m.at, open: 'lifelog' })
  }
  for (const p of d.places ?? []) docs.push({ id: `place-${p.id}`, kind: 'place', title: p.name, text: lines([p.city, p.country]), at: p.createdAt, open: 'lifelog' })
  for (const g of d.goals ?? []) {
    if (!g.items.length) continue
    docs.push({ id: `goal-${g.id}`, kind: 'goal', title: `Top 3 for ${g.day}`, text: g.items.map(i => `${i.done ? '✔' : '○'} ${i.text}${i.source === 'reflection' ? ' (from reflection)' : ''}`).join('\n'), day: g.day, at: g.createdAt, open: 'goals' })
  }
  const clears = new Map<string, Completion[]>()
  for (const c of d.completions ?? []) (clears.get(c.questId) ?? clears.set(c.questId, []).get(c.questId)!).push(c)
  for (const q of d.quests ?? []) {
    const done = clears.get(q.id) ?? []
    const last = done.reduce((a, c) => Math.max(a, c.createdAt), 0)
    docs.push({
      id: `quest-${q.id}`, kind: 'quest', title: q.title, open: 'quests', at: last || q.createdAt,
      text: lines([q.description, q.minVersion && `Minimum: ${q.minVersion}`, `${q.kind} quest${q.active ? '' : ' (archived)'}`, done.length ? `Cleared ${done.length} time${done.length === 1 ? '' : 's'}` : '', ...(q.stages ?? []).map(s => `Stage: ${s.title} ${s.description}`)]),
    })
  }
  for (const t of d.transactions ?? []) {
    if (t.kind === 'nospend') {
      docs.push({ id: `money-${t.id}`, kind: 'money', title: 'No-spend day', text: t.note, day: t.day, at: t.createdAt, open: 'finance' })
      continue
    }
    docs.push({ id: `money-${t.id}`, kind: 'money', title: `${t.kind === 'income' ? 'Income' : 'Spent'} ${money(t.amount)} · ${t.category}`, text: lines([t.note]), day: t.day, at: t.createdAt, open: 'finance' })
  }
  for (const b of d.bills ?? []) docs.push({ id: `bill-${b.id}`, kind: 'bill', title: `${b.name} · ${money(b.amount)} ${b.cycle}`, text: lines([b.category, `Next due ${b.nextDue}`, b.active ? '' : 'stopped']), at: b.createdAt, open: 'finance' })
  for (const p of d.people ?? []) docs.push({ id: `person-${p.id}`, kind: 'person', title: p.name, text: lines([p.note, p.circle]), at: p.updatedAt || p.createdAt, open: 'party' })
  for (const c of d.contacts ?? []) {
    const who = personName.get(c.personId) ?? 'Someone'
    docs.push({ id: `contact-${c.id}`, kind: 'contact', title: `${c.kind[0].toUpperCase()}${c.kind.slice(1)} with ${who}`, text: lines([c.note]), day: c.day, at: c.createdAt, open: 'party' })
  }
  for (const r of d.rewards ?? []) docs.push({ id: `reward-${r.id}`, kind: 'reward', title: `${r.title} · ${money(r.price)}`, text: lines([r.category, r.active ? '' : '(removed)']), at: r.createdAt, open: 'shop' })
  for (const p of d.purchases ?? []) docs.push({ id: `purchase-${p.id}`, kind: 'purchase', title: `Bought: ${p.title} · ${money(p.price)}`, text: `${p.rank}-rank`, day: p.day, at: p.createdAt, open: 'shop' })
  for (const p of d.plans ?? []) {
    docs.push({ id: `plan-${p.id}`, kind: 'plan', title: p.name, text: lines([p.date && `Date: ${p.date}`, p.status !== 'active' ? p.status : '', ...p.items.map(i => `${i.label} ${money(i.cost)}${i.purchaseId ? ' (booked)' : ''}`)]), at: p.updatedAt || p.createdAt, open: 'plans', planId: p.id })
  }
  for (const b of d.bosses ?? []) docs.push({ id: `boss-${b.id}`, kind: 'boss', title: b.name, text: b.defeatedAt ? 'Defeated' : 'Still standing', at: b.defeatedAt ?? b.createdAt, open: 'focus' })
  for (const f of d.focusRuns ?? []) docs.push({ id: `focus-${f.id}`, kind: 'focus', title: `Focus: ${f.label}`, text: lines([`${f.minutes} minutes`, f.questId ? questTitle.get(f.questId) : '']), day: f.day, at: f.createdAt, open: 'focus' })
  for (const c of d.customCards ?? []) docs.push({ id: `card-${c.id}`, kind: 'card', title: `${c.name} · ${c.rarity}`, text: c.text, at: c.createdAt, open: 'collection' })
  for (const b of d.bonuses ?? []) {
    if (b.kind !== 'coupon') continue
    const coupon = couponById(b.value)
    if (coupon) docs.push({ id: `coupon-${b.id}`, kind: 'coupon', title: `Coupon: ${coupon.name}`, text: '', day: b.day, at: b.createdAt, open: 'rewards' })
  }
  return docs
}

const fold = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']

/** Extra words a day matches: "2026-11-05" also finds "november", "thursday", "2026". */
function dayWords(day?: string): string {
  if (!day) return ''
  const [y, m, d] = day.split('-').map(Number)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return ` ${day} ${MONTHS[m - 1]} ${weekday} ${y}`
}

export interface SearchHit {
  doc: SearchDoc
  score: number
  /** A short piece of the text around the first match. */
  snippet: string
  /** The query words, for highlighting. */
  terms: string[]
}

export const searchTerms = (query: string) => fold(query).split(/\s+/).map(t => t.replace(/[^\p{L}\p{N}$.-]/gu, '')).filter(t => t.length > 0)

/**
 * Every word in the query must appear (in the title, text, kind or date).
 * Title matches count most (more if the title starts with the word), then how
 * often words appear; newer wins ties.
 */
export function searchDocs(docs: SearchDoc[], query: string, opts: { kinds?: Set<SearchKind>; limit?: number } = {}): SearchHit[] {
  const terms = searchTerms(query)
  if (!terms.length) return []
  const hits: SearchHit[] = []
  for (const doc of docs) {
    if (opts.kinds && opts.kinds.size && !opts.kinds.has(doc.kind)) continue
    const title = fold(doc.title)
    const text = fold(doc.text)
    const extra = fold(`${SEARCH_KIND_NAMES[doc.kind]}${dayWords(doc.day)}`)
    let score = 0
    let all = true
    for (const t of terms) {
      const inTitle = title.includes(t)
      const count = text.split(t).length - 1
      if (!inTitle && !count && !extra.includes(t)) {
        all = false
        break
      }
      score += (inTitle ? 5 : 0) + (title.startsWith(t) ? 3 : 0) + Math.min(count, 5) * 2 + (extra.includes(t) ? 1 : 0)
    }
    if (!all) continue
    hits.push({ doc, score, snippet: snippetOf(doc.text, terms), terms })
  }
  hits.sort((a, b) => b.score - a.score || b.doc.at - a.doc.at)
  return hits.slice(0, opts.limit ?? 100)
}

/** About 140 characters of the text around the first matching word. */
export function snippetOf(text: string, terms: string[], width = 140): string {
  const flat = text.replace(/\s+/g, ' ').trim()
  if (flat.length <= width) return flat
  const folded = fold(flat)
  const first = terms.map(t => folded.indexOf(t)).filter(i => i >= 0).sort((a, b) => a - b)[0] ?? 0
  const start = Math.max(0, Math.min(first - Math.floor(width / 3), flat.length - width))
  return `${start > 0 ? '…' : ''}${flat.slice(start, start + width).trim()}${start + width < flat.length ? '…' : ''}`
}

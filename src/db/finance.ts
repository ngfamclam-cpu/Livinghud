// Finance tracker writes: entries, no-spend days, bills, the monthly limit,
// and the money quests that clear themselves from what you log.

import { addDays, dayKey, emit, nextDue, weekOf, type Bill, type Transaction } from '../engine'
import { announceProgress, completeQuest, snapshot } from './actions'
import { db, LOCAL_USER, newId } from './db'

/** Clears a quest by template if it's active and not already done for today (dailies) or this week (side quests). */
async function clearQuest(templateId: string): Promise<void> {
  const { summary, quests } = await snapshot()
  const quest = quests.find(q => q.active && q.templateId === templateId)
  if (!quest) return
  const done = quest.kind === 'daily' ? summary.todayDone.get(quest.id) : quest.kind === 'side' ? summary.weekDone.get(quest.id) : undefined
  if (done) return
  await completeQuest(quest, 'full')
}

async function today(): Promise<string> {
  const player = await db.players.get(LOCAL_USER)
  return dayKey(new Date(), player?.settings.resetHour ?? 4)
}

/** Logs spending or income. Any entry clears "Log today's spending". */
export async function addTransaction(input: { kind: 'expense' | 'income'; amount: number; category: string; note: string; day?: string; billId?: string | null }): Promise<void> {
  const amount = Math.round(Math.abs(input.amount) * 100) / 100
  if (!(amount > 0)) return
  const before = (await snapshot()).summary
  const day = input.day ?? (await today())
  const now = Date.now()
  const t: Transaction = { id: newId(), userId: LOCAL_USER, day, kind: input.kind, amount, category: input.category, note: input.note.trim().slice(0, 80), billId: input.billId ?? null, createdAt: now, updatedAt: now }
  await db.transactions.add(t)
  emit({ type: 'finance.logged', kind: input.kind, amount, category: t.category })
  if (day === (await today())) await clearQuest('wlt-spend')
  await announceProgress(before)
}

export async function updateTransaction(id: string, patch: Partial<Pick<Transaction, 'amount' | 'category' | 'note' | 'day'>>): Promise<void> {
  await db.transactions.update(id, { ...patch, ...(patch.amount !== undefined ? { amount: Math.round(Math.abs(patch.amount) * 100) / 100 } : {}), updatedAt: Date.now() })
}

export async function deleteTransaction(id: string): Promise<void> {
  await db.transactions.delete(id)
}

/**
 * Marks a day (today or yesterday) as a no-spend day. Clears "Log today's
 * spending" for today, and the weekly "No-spend day" side quest.
 */
export async function markNoSpend(day: string): Promise<void> {
  const t = await today()
  if (day !== t && day !== addDays(t, -1)) return
  const already = await db.transactions.where('day').equals(day).filter(x => x.userId === LOCAL_USER && x.kind === 'nospend').count()
  if (!already) {
    const now = Date.now()
    await db.transactions.add({ id: newId(), userId: LOCAL_USER, day, kind: 'nospend', amount: 0, category: 'other', note: '', billId: null, createdAt: now, updatedAt: now })
  }
  if (day === t) await clearQuest('wlt-spend')
  if (weekOf(day) === weekOf(t)) await clearQuest('side-wlt-nospend')
}

/** Sets the monthly spending limit. XP for staying under it counts from the first day a limit is set. */
export async function saveFinanceSettings(limit: number, billsInLimit: boolean): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  const clean = Math.max(0, Math.round(limit))
  const since = player.finance?.since && player.finance.limit > 0 ? player.finance.since : await today()
  await db.players.update(LOCAL_USER, { finance: { limit: clean, billsInLimit, since }, updatedAt: Date.now() })
}

/** The weekly check-in is done: clears the "Money check-in" side quest. */
export const markWeekReviewed = () => clearQuest('side-wlt-money')
/** The monthly report is reviewed: clears the "Spending autopsy" side quest (from the quest offers). */
export const markMonthReviewed = () => clearQuest('offer-budget-review')

// ---- Bills and subscriptions ----

export async function addBill(input: { name: string; amount: number; category: string; cycle: Bill['cycle']; nextDue: string }): Promise<void> {
  const now = Date.now()
  await db.bills.add({
    id: newId(),
    userId: LOCAL_USER,
    name: input.name.trim().slice(0, 40) || 'Bill',
    amount: Math.round(Math.abs(input.amount) * 100) / 100,
    category: input.category,
    cycle: input.cycle,
    nextDue: input.nextDue,
    active: true,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updateBill(id: string, patch: Partial<Pick<Bill, 'name' | 'amount' | 'category' | 'cycle' | 'nextDue' | 'active'>>): Promise<void> {
  await db.bills.update(id, { ...patch, updatedAt: Date.now() })
}

/** Pays a bill: logs the expense and moves the due date to the next cycle. */
export async function payBill(id: string): Promise<void> {
  const bill = await db.bills.get(id)
  if (!bill) return
  await addTransaction({ kind: 'expense', amount: bill.amount, category: bill.category, note: bill.name, billId: bill.id })
  await db.bills.update(id, { nextDue: nextDue(bill.nextDue, bill.cycle), updatedAt: Date.now() })
}

/** Skips one cycle without logging a payment (e.g. paid elsewhere, or free this month). */
export async function skipBill(id: string): Promise<void> {
  const bill = await db.bills.get(id)
  if (bill) await db.bills.update(id, { nextDue: nextDue(bill.nextDue, bill.cycle), updatedAt: Date.now() })
}

// The weekend menu: the things the owner really spends on, at real prices,
// so quest money maps straight onto real life (owner, Nov 2026).
import type { Purchase, RewardSpecial } from './types'
import { round2 } from './economy'
import { addDays } from './time'

export interface WeekendItem {
  id: string
  title: string
  emoji: string
  /** Default real price in dollars; the player can change it. */
  price: number
  special: RewardSpecial
  /** Drinks are bought by the round: the shop shows a count. */
  counted?: boolean
}

export const WEEKEND_ITEMS: WeekendItem[] = [
  { id: 'drink', title: 'Drink', emoji: '🍹', price: 15, special: 'none', counted: true },
  { id: 'food-low', title: 'Food (cheap eats)', emoji: '🌮', price: 20, special: 'none' },
  { id: 'food-high', title: 'Food (nice meal)', emoji: '🍣', price: 35, special: 'none' },
  { id: 'ticket', title: 'Event ticket', emoji: '🎟️', price: 50, special: 'none' },
  { id: 'date', title: 'Date night', emoji: '💘', price: 100, special: 'date' },
]

/** "Purchase" comes in four sizes. */
export const PURCHASE_SIZES = [25, 50, 75, 100]

export const weekendPrice = (item: WeekendItem, prices?: Record<string, number>): number => {
  const p = prices?.[item.id]
  return p !== undefined && p > 0 ? p : item.price
}

/** A typical month of weekends, used to suggest a monthly budget. */
export interface WeekendPlan {
  /** Per weekend. */
  drinks: number
  foodLow: number
  foodHigh: number
  /** Per month. */
  tickets: number
  dates: number
  /** Dollars of other purchases per month. */
  purchases: number
}

export const DEFAULT_WEEKEND_PLAN: WeekendPlan = { drinks: 3, foodLow: 1, foodHigh: 1, tickets: 1, dates: 2, purchases: 50 }

/** Weekends in an average month (52 / 12). */
export const WEEKENDS_PER_MONTH = 52 / 12

export function planCost(plan: WeekendPlan, prices?: Record<string, number>): { perWeekend: number; perMonth: number } {
  const price = (id: string) => weekendPrice(WEEKEND_ITEMS.find(i => i.id === id)!, prices)
  const perWeekend = plan.drinks * price('drink') + plan.foodLow * price('food-low') + plan.foodHigh * price('food-high')
  const perMonth = perWeekend * WEEKENDS_PER_MONTH + plan.tickets * price('ticket') + plan.dates * price('date') + plan.purchases
  return { perWeekend: round2(perWeekend), perMonth: Math.round(perMonth / 5) * 5 }
}

/** Friday of the weekend a game day belongs to (Mon-Thu belong to the coming one). */
export function weekendOf(day: string): string {
  const dow = new Date(`${day}T12:00:00`).getDay() // 0 Sun .. 6 Sat
  const back = dow === 0 ? 2 : dow === 6 ? 1 : dow === 5 ? 0 : -(5 - dow)
  return addDays(day, -back)
}

/** What went on the weekend menu this weekend (Fri-Sun, counting buys made earlier in the week for it). */
export function weekendSpend(purchases: Purchase[], today: string): { total: number; count: number } {
  const friday = weekendOf(today)
  let total = 0
  let count = 0
  for (const p of purchases) {
    if (!p.rewardId.startsWith('weekend:') || weekendOf(p.day) !== friday) continue
    total += p.price
    count++
  }
  return { total: round2(total), count }
}

// ---- Day Off pass: buy a break from your dailies ----

/** Day Off passes per Mon-Sun week. */
export const DAY_OFF_PER_WEEK = 1

/** What a day off costs: about two perfect days of pay at your budget, at least $5. */
export function dayOffPrice(monthlyBudget: number): number {
  return Math.max(5, Math.round((monthlyBudget / 12) / 5) * 5)
}

/** Monday of the week a day is in. */
function mondayOf(day: string): string {
  const dow = new Date(`${day}T12:00:00`).getDay()
  return addDays(day, -((dow + 6) % 7))
}

/** Whether a Day Off pass can be bought for `forDay` (today or tomorrow), and why not. */
export function dayOffCheck(purchases: Purchase[], forDay: string, today: string, isRecovery: (day: string) => boolean): string | null {
  if (forDay !== today && forDay !== addDays(today, 1)) return 'Only for today or tomorrow'
  if (isRecovery(forDay)) return 'That day is already a Recovery Day'
  const week = mondayOf(forDay)
  const used = purchases.filter(p => p.special === 'dayOff' && mondayOf(p.forDay ?? p.day) === week).length
  if (used >= DAY_OFF_PER_WEEK) return 'One day off per week (Monday to Sunday)'
  return null
}

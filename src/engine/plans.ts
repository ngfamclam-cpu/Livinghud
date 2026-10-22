// Plans for raves, festivals and trips: big experiences saved for from the Vault
// and booked piece by piece. The money is the gate: any part can be booked as
// soon as the plan's fund covers it and this month's savings goal is met, with
// no level requirement, so real-life early booking works.

import { addDays, daysBetween } from './time'
import type { Plan, PlanFund, PlanItemKind, PlanKind, Purchase, QuestStage } from './types'

export const PLAN_KIND_NAMES: Record<PlanKind, string> = { rave: 'Rave', festival: 'Festival', trip: 'Trip' }
export const ITEM_KIND_NAMES: Record<PlanItemKind, string> = { ticket: 'Ticket', travel: 'Travel', stay: 'Stay', food: 'Food & drinks', gear: 'Gear', other: 'Other' }

export interface PlanTemplate {
  id: string
  name: string
  kind: PlanKind
  items: { label: string; kind: PlanItemKind; cost: number }[]
}

/** Starting points with typical costs (not quotes). Every line can be edited. */
export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'rave',
    name: 'Rave',
    kind: 'rave',
    items: [
      { label: 'Ticket', kind: 'ticket', cost: 120 },
      { label: 'Getting there and back', kind: 'travel', cost: 30 },
      { label: 'Food and drinks', kind: 'food', cost: 40 },
      { label: 'Outfit', kind: 'gear', cost: 40 },
    ],
  },
  {
    id: 'festival',
    name: 'Festival weekend',
    kind: 'festival',
    items: [
      { label: 'Festival ticket', kind: 'ticket', cost: 350 },
      { label: 'Travel', kind: 'travel', cost: 150 },
      { label: 'Camping or accommodation', kind: 'stay', cost: 150 },
      { label: 'Food and drinks', kind: 'food', cost: 150 },
      { label: 'Gear and outfits', kind: 'gear', cost: 60 },
    ],
  },
  {
    id: 'asia',
    name: 'Asia trip',
    kind: 'trip',
    items: [
      { label: 'Return flights', kind: 'travel', cost: 1100 },
      { label: 'Accommodation (2 weeks)', kind: 'stay', cost: 900 },
      { label: 'Food', kind: 'food', cost: 500 },
      { label: 'Activities and events', kind: 'other', cost: 400 },
      { label: 'Local transport', kind: 'travel', cost: 200 },
      { label: 'Travel insurance', kind: 'other', cost: 80 },
      { label: 'Passport and visas', kind: 'other', cost: 60 },
    ],
  },
]

export interface PlanStatus {
  plan: Plan
  total: number
  /** Cost of the parts already booked. */
  booked: number
  /** Money in the plan's fund, not yet spent on bookings. */
  fund: number
  /** Saved or booked, as a share of the total (0-1). */
  progress: number
  /** Still to save: total minus booked minus fund. */
  remaining: number
  daysLeft: number | null
  /** Rough month the fund reaches the total at your recent Vault pace; null if unknown. */
  readyBy: string | null
  /** Dollars a month needed to be ready by the date; null without a date. */
  perMonthNeeded: number | null
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function planStatus(plan: Plan, funds: PlanFund[], purchases: Purchase[], today: string, vaultPerMonth: number | null): PlanStatus {
  const total = round2(plan.items.reduce((s, i) => s + i.cost, 0))
  const booked = round2(purchases.filter(p => p.planId === plan.id).reduce((s, p) => s + p.price, 0))
  const fund = round2(Math.max(0, funds.filter(f => f.planId === plan.id).reduce((s, f) => s + f.amount, 0)))
  const remaining = round2(Math.max(0, total - booked - fund))
  const daysLeft = plan.date ? daysBetween(today, plan.date) : null
  const monthsLeft = daysLeft !== null && daysLeft > 0 ? daysLeft / 30.4 : null
  let readyBy: string | null = remaining === 0 ? today : null
  if (remaining > 0 && vaultPerMonth && vaultPerMonth > 0) readyBy = addDays(today, Math.ceil((remaining / vaultPerMonth) * 30.4))
  return {
    plan,
    total,
    booked,
    fund,
    progress: total > 0 ? Math.min(1, (booked + fund) / total) : 0,
    remaining,
    daysLeft,
    readyBy,
    perMonthNeeded: monthsLeft ? round2(remaining / monthsLeft) : null,
  }
}

/** Why a part can't be booked yet, or null if it can. */
export function bookingBlock(cost: number, fund: number, savingsMet: boolean): string | null {
  if (!savingsMet) return 'Savings goal not met this month'
  if (fund < cost) return `Plan needs $${(cost - fund).toFixed(2)} more`
  return null
}

/** Stages for the optional Expedition main quest; the "save" stages clear themselves as the fund grows. */
export function expeditionStages(kind: PlanKind): QuestStage[] {
  const pay = kind === 'trip' ? 60 : 30
  return [
    { id: 'plan', title: 'Set the plan', description: 'Pick the dates and check every cost line.', xp: 100, basePay: pay },
    { id: 'save-25', title: 'A quarter saved', description: 'Move 25% of the total into the plan.', xp: 150, basePay: pay },
    { id: 'save-50', title: 'Halfway', description: 'Half of the total saved or booked.', xp: 200, basePay: pay },
    { id: 'save-75', title: 'Three quarters', description: '75% saved or booked.', xp: 250, basePay: pay },
    { id: 'save-100', title: 'Fully funded', description: 'Everything saved or booked.', xp: 300, basePay: pay },
    { id: 'go', title: kind === 'trip' ? 'Depart' : 'Go', description: 'Go and enjoy it. You earned this.', xp: 500, basePay: pay },
  ]
}

/** Which "save" stage a plan's progress has reached. */
export const savedStageReached = (stageId: string, progress: number) => {
  const m = /^save-(\d+)$/.exec(stageId)
  return !!m && progress * 100 >= Number(m[1]) - 1e-9
}

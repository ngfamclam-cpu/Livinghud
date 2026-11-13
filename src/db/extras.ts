// Surprise rewards, writes side: Golden Quest and Red Gate payouts, the Lucky
// Roll, coupons, wildcards, job changes, name plates and the companion's name.
// Rules live in src/engine/extras.ts; this only records the moments.

import {
  EXTRA_PAY, rollPay, scalePay,
  GATE_NEEDED, couponById, couponFor, emit, featureOn, gateCount, gateWildcard, jobById, luckyRoll, redGate, rollReward, rollsCoupon,
  type BonusKind, type BonusRecord, type Completion, type Quest, type Summary,
} from '../engine'
import { announceProgress, dropLoot, snapshot, surpriseSeed } from './actions'
import { HATCH_CLEARS, petById, rollEgg, type EggSource } from '../engine'
import { db, LOCAL_USER, newId } from './db'

async function addBonus(kind: BonusKind, day: string, sourceId: string, value: string, questId?: string): Promise<BonusRecord> {
  const record: BonusRecord = { id: newId(), userId: LOCAL_USER, kind, day, sourceId, value, ...(questId ? { questId } : {}), createdAt: Date.now() }
  await db.bonuses.add(record)
  return record
}

async function giveCoupon(seed: string, day: string, sourceId: string): Promise<void> {
  const coupon = couponFor(seed, sourceId)
  await addBonus('coupon', day, sourceId, coupon.id)
  emit({ type: 'extra', title: 'Treat coupon', text: coupon.name })
}

async function giveWildcard(day: string, sourceId: string): Promise<void> {
  await addBonus('wildcard', day, sourceId, '')
  emit({ type: 'extra', title: 'Wildcard', text: 'Saves one missed daily so its streak survives.' })
}

/** Takes back everything a source gave (undo): cards, coupons, wildcards, rolls, gate clears. */
async function takeBack(sourceIds: string[]): Promise<void> {
  if (!sourceIds.length) return
  const forge = await import('./forge')
  forge.cancelDrops(sourceIds)
  await db.loot.where('sourceId').anyOf(sourceIds).delete()
  await db.bonuses.where('sourceId').anyOf(sourceIds).delete()
  await forge.pruneOrphanForged()
}

/** XP multiplier for clearing a daily right now (the Golden Quest triples it). */
export function goldenFor(summary: Summary, quest: Quest, day: string): boolean {
  return summary.extras.on && quest.kind === 'daily' && day === summary.today && summary.extras.golden === quest.id
}

/** After a daily is cleared: Golden Quest loot, and whether it closes today's Red Gate. */
export async function afterDailyCleared(completion: Completion): Promise<void> {
  const { summary, player, completions, quests } = await snapshot()
  if (!featureOn(player, 'extras')) return
  const seed = surpriseSeed(player)
  const day = completion.day
  if (completion.golden) {
    emit({ type: 'extra', title: 'Golden Quest cleared', text: `Triple XP: +${completion.xp} XP and +$${completion.dollars.toFixed(2)}. An Epic-or-better card is on its way.` })
    await dropLoot('golden', `golden-${day}`, { minRarity: 'epic' })
    await maybeEgg('golden', `golden-${day}`)
    if (rollsCoupon(seed, 'golden', `golden-${day}`)) await giveCoupon(seed, day, `golden-${day}`)
  }
  if (day !== summary.today) return
  const gate = redGate(seed, day, player.settings.wakeTime, player.settings.bedTime, summary.progression.effects.gateMinutes)
  if (!gate || (await db.bonuses.where('sourceId').equals(`gate-${day}`).filter(b => b.kind === 'gate').count())) return
  const dailyIds = new Set(quests.filter(q => q.kind === 'daily').map(q => q.id))
  if (gateCount(gate, completions, dailyIds) < GATE_NEEDED) return
  const before = summary
  await addBonus('gate', day, `gate-${day}`, '')
  emit({ type: 'extra', title: 'Red Gate closed', text: `+40 XP, +$${scalePay(EXTRA_PAY.gate, player.settings.monthlyBudget).toFixed(2)} and a card from the other side.` })
  await dropLoot('gate', `gate-${day}`, { minRarity: 'rare' })
  await maybeEgg('gate', `gate-${day}`)
  if (rollsCoupon(seed, 'gate', `gate-${day}`)) await giveCoupon(seed, day, `gate-${day}`)
  if (gateWildcard(seed, day)) await giveWildcard(day, `gate-${day}`)
  await announceProgress(before)
}

/** After a daily is undone: take back the Golden Quest's loot, a gate it closed, and a roll it made possible. */
export async function afterDailyUndone(done: Completion): Promise<void> {
  const { summary, player, completions, quests } = await snapshot()
  const day = done.day
  const back: string[] = []
  if (done.golden) back.push(`golden-${day}`)
  // No longer a perfect day: its roll (and what it gave) goes too.
  if (!summary.incentives?.perfectToday || day !== summary.today) back.push(`roll-${day}`, `perfect-${day}`)
  const gate = redGate(surpriseSeed(player), day, player.settings.wakeTime, player.settings.bedTime, summary.progression.effects.gateMinutes)
  const dailyIds = new Set(quests.filter(q => q.kind === 'daily').map(q => q.id))
  if (gate && gateCount(gate, completions, dailyIds) < GATE_NEEDED) back.push(`gate-${day}`)
  await takeBack(back)
}

/** A perfect day's chest sometimes holds a treat coupon too. */
export async function perfectDayExtras(day: string): Promise<void> {
  const { player } = await snapshot()
  if (!featureOn(player, 'extras')) return
  const seed = surpriseSeed(player)
  if (rollsCoupon(seed, 'perfect', `perfect-${day}`)) await giveCoupon(seed, day, `perfect-${day}`)
  await maybeEgg('perfect', `perfect-${day}`)
}

/** Rolls the d20 for a perfect day (once). Returns the number. */
export async function rollTheDice(): Promise<number | null> {
  const { summary, player } = await snapshot()
  const day = summary.extras.rollDay
  if (!day || !featureOn(player, 'extras')) return null
  if (await db.bonuses.where('sourceId').equals(`roll-${day}`).filter(b => b.kind === 'roll').count()) return null
  const seed = surpriseSeed(player)
  const n = Math.min(20, luckyRoll(seed, day) + summary.progression.effects.rollBonus)
  const reward = rollReward(n)
  await addBonus('roll', day, `roll-${day}`, String(n))
  const pay = scalePay(rollPay(n), player.settings.monthlyBudget)
  emit({ type: 'extra', title: `You rolled ${n}`, text: pay > 0 ? `${reward.text} Plus $${pay.toFixed(2)}.` : reward.text })
  if (reward.card) await dropLoot('roll', `roll-${day}`, { minRarity: reward.card })
  if (n >= 18) await maybeEgg(n === 20 ? 'roll20' : 'roll18', `roll-${day}`)
  if (reward.coupon) await giveCoupon(seed, day, `roll-${day}`)
  if (reward.wildcard) await giveWildcard(day, `roll-${day}`)
  await announceProgress(summary)
  return n
}

/** Redeems a treat coupon (honour system). A lazy-day coupon turns today into a Recovery Day. */
export async function redeemCoupon(recordId: string): Promise<void> {
  const { summary } = await snapshot()
  const item = summary.extras.coupons.find(c => c.record.id === recordId)
  if (!item) return
  await addBonus('coupon-use', summary.today, `use-${recordId}`, recordId)
  emit({ type: 'extra', title: 'Coupon redeemed', text: `${item.coupon.name}. Enjoy it, you earned it.` })
}

/** Spends a wildcard to save a missed day of one daily's streak. */
export async function playWildcard(questId: string, day: string): Promise<boolean> {
  const { summary } = await snapshot()
  if (summary.extras.wildcards < 1 || !summary.extras.wildcardOffers.some(o => o.questId === questId && o.day === day)) return false
  await addBonus('wildcard-use', day, `wild-${questId}-${day}`, '', questId)
  emit({ type: 'extra', title: 'Wildcard played', text: 'Yesterday is saved. The streak lives on.' })
  return true
}

/** Takes the next Job Change once its trial is complete. */
export async function takeJobChange(): Promise<void> {
  const { summary } = await snapshot()
  const next = summary.extras.nextJob
  if (!next?.ready) return
  await addBonus('job', summary.today, `job-${next.job.id}`, next.job.id)
  emit({ type: 'extra', title: `Job Change: ${next.job.title}`, text: `${next.job.blurb} +${next.job.xp} XP and +$${scalePay(EXTRA_PAY.job[next.job.id] ?? 0, summary.wallet.budget).toFixed(2)}.` })
  await announceProgress(summary)
}

export async function setPlate(plate: string): Promise<void> {
  await db.players.update(LOCAL_USER, { plate, updatedAt: Date.now() })
}

export async function nameCompanion(name: string): Promise<void> {
  await db.players.update(LOCAL_USER, { companionName: name.trim().slice(0, 20), updatedAt: Date.now() })
}

/** Unused-coupon name, for messages. */
export const couponName = (id: string) => couponById(id)?.name ?? 'Treat coupon'
export const jobTitle = (id: string) => jobById(id)?.title ?? id

/** Gives a shadow soldier a name of your own (empty = back to their shade name). */
export async function renameSoldier(id: string, name: string): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  const names = { ...(player.legion?.names ?? {}) }
  if (name.trim()) names[id] = name.trim().slice(0, 30)
  else delete names[id]
  await db.players.update(LOCAL_USER, { legion: { ...player.legion, names }, updatedAt: Date.now() })
}

/** Posts a soldier to guard a quest (null = stand down). They level up as you clear it. */
export async function setGuard(id: string, questId: string | null): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  const guards = { ...(player.legion?.guards ?? {}) }
  if (questId) guards[id] = { questId, at: Date.now() }
  else delete guards[id]
  await db.players.update(LOCAL_USER, { legion: { ...player.legion, guards }, updatedAt: Date.now() })
}

// ---- Pets ----

/** Maybe drops a pet egg (a pet you don't have yet). It hatches after a few quest clears. */
export async function maybeEgg(source: EggSource, sourceId: string): Promise<void> {
  const { summary, player } = await snapshot()
  const pets = summary.extras.pets
  if (!pets || !featureOn(player, 'companion')) return
  if (await db.bonuses.where('sourceId').equals(sourceId).filter(b => b.kind === 'egg').count()) return
  const taken = new Set([...pets.owned.map(p => p.def.id), ...pets.eggs.map(e => e.pet.id)])
  const petId = rollEgg(surpriseSeed(player), source, sourceId, taken)
  const pet = petId ? petById(petId) : undefined
  if (!pet) return
  await addBonus('egg', summary.today, sourceId, pet.id)
  emit({ type: 'extra', title: `${pet.family} pet egg`, text: `A ${pet.rarity} egg dropped! It hatches after ${HATCH_CLEARS[pet.rarity]} more quest clears.` })
}

/** Makes a pet you own your active companion. It grows only while active. */
export async function setActivePet(petId: string): Promise<void> {
  const { summary } = await snapshot()
  if (!summary.extras.pets?.owned.some(p => p.def.id === petId) || summary.extras.pets.active.def.id === petId) return
  const now = Date.now()
  await addBonus('pet', summary.today, `pet-${now}`, petId)
  const pet = summary.extras.pets.owned.find(p => p.def.id === petId)!
  emit({ type: 'extra', title: `${pet.name} is by your side`, text: 'Your active pet grows as you clear quests.' })
}

/** Names a pet (Pip's name lives in companionName). Empty = back to its species name. */
export async function renamePet(petId: string, name: string): Promise<void> {
  if (petId === 'pip') return nameCompanion(name)
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  const petNames = { ...(player.petNames ?? {}) }
  if (name.trim()) petNames[petId] = name.trim().slice(0, 20)
  else delete petNames[petId]
  await db.players.update(LOCAL_USER, { petNames, updatedAt: Date.now() })
}

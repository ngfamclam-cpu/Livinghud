// The only place that writes game data. Each action updates the database,
// then announces what happened on the event bus.

import {
  DAILY_TEMPLATES,
  DATE_XP,
  MAIN_TEMPLATES,
  REWARD_TEMPLATES,
  SIDE_TEMPLATES,
  addDays,
  dayKey,
  weekOf,
  checkPurchase,
  emit,
  questReward,
  routineDescription,
  routineLevel,
  rewardRank,
  strengthDescription,
  summarize,
  type Completion,
  type CompletionVersion,
  type ExerciseKey,
  type FitnessBaseline,
  type PlayerSettings,
  type Purchase,
  type Quest,
  type QuestStage,
  type RoutineExercise,
  type Reward,
  type RewardSpecial,
  type StatKey,
  type Summary,
} from '../engine'
import { db, LOCAL_USER, newId } from './db'

export interface AwakeningAnswers {
  name: string
  stats: StatKey[]
  fitness: FitnessBaseline | null
  dailyTemplateIds: string[]
  mainTemplateIds: string[]
  rewardTemplateIds: string[]
  settings: PlayerSettings
}

export async function awaken(answers: AwakeningAnswers): Promise<void> {
  const now = Date.now()
  const quests: Quest[] = answers.dailyTemplateIds.map((id, i) => {
    const t = DAILY_TEMPLATES.find(t => t.id === id)!
    return {
      id: newId(),
      userId: LOCAL_USER,
      kind: 'daily',
      stat: t.stat,
      title: t.title,
      description: t.id === 'str-routine' && answers.fitness ? strengthDescription(answers.fitness) : t.description,
      minVersion: t.minVersion,
      active: true,
      templateId: t.id,
      // Offset so quests keep the order the player picked them in.
      createdAt: now + i,
      updatedAt: now + i,
    }
  })
  answers.mainTemplateIds.forEach((id, i) => quests.push(mainFromTemplate(id, now + 100 + i)))
  const rewards = answers.rewardTemplateIds.map((id, i) => rewardFromTemplate(id, now + i))

  await db.transaction('rw', db.players, db.quests, db.rewards, async () => {
    await db.players.put({
      id: LOCAL_USER,
      userId: LOCAL_USER,
      name: answers.name,
      stats: answers.stats,
      fitness: answers.fitness,
      settings: answers.settings,
      createdAt: now,
      updatedAt: now,
    })
    await db.quests.bulkPut(quests)
    await db.rewards.bulkPut(rewards)
  })
  emit({ type: 'player.awakened', name: answers.name, stats: answers.stats })
}

export async function updateSettings(patch: Partial<PlayerSettings>): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  await db.players.update(LOCAL_USER, { settings: { ...player.settings, ...patch }, updatedAt: Date.now() })
}

async function snapshot() {
  const player = await db.players.get(LOCAL_USER)
  if (!player) throw new Error('No player yet')
  const [quests, completions, purchases, savings, sets] = await Promise.all([
    db.quests.where('userId').equals(LOCAL_USER).toArray(),
    db.completions.where('userId').equals(LOCAL_USER).toArray(),
    db.purchases.where('userId').equals(LOCAL_USER).toArray(),
    db.savings.where('userId').equals(LOCAL_USER).toArray(),
    db.sets.where('userId').equals(LOCAL_USER).toArray(),
  ])
  const summary = summarize(player, quests, completions, new Date(), { purchases, savings, sets })
  return { player, quests, completions, purchases, savings, sets, summary }
}

/** Announces level-ups, a full wallet and a met savings goal after any change. */
async function announceProgress(before: Summary): Promise<void> {
  const { summary: after } = await snapshot()
  if (after.level.level > before.level.level) emit({ type: 'level.up', level: after.level.level })
  const { budget } = after.wallet
  if (budget > 0 && before.wallet.earned < budget && after.wallet.earned >= budget) {
    emit({ type: 'wallet.full', month: after.wallet.month, budget })
  }
  if (after.savings.target > 0 && !before.savings.met && after.savings.met) {
    emit({ type: 'savings.goalMet', month: after.wallet.month, target: after.savings.target })
  }
}

// ---- Quests ----

/** Completes a daily (today), a side quest (this week) or the current stage of a main quest. */
export async function completeQuest(
  quest: Quest,
  version: CompletionVersion = 'full',
  { at, via }: { at?: number; via?: 'automation' } = {},
): Promise<boolean> {
  const before = await snapshot()
  const { summary, player } = before
  if (!quest.active) return false

  // An automation can report something that happened before the app was opened:
  // it counts for the game day it happened on.
  const day = at ? dayKey(new Date(Math.min(at, Date.now())), player.settings.resetHour) : summary.today
  const mine = before.completions.filter(c => c.questId === quest.id)
  let stage: QuestStage | undefined
  if (quest.kind === 'daily' && mine.some(c => c.day === day)) return false
  if (quest.kind === 'side' && mine.some(c => weekOf(c.day) === weekOf(day))) return false
  if (quest.kind === 'main') {
    const current = summary.mainProgress.get(quest.id)?.current
    stage = quest.stages?.find(s => s.id === current)
    if (!stage) return false
    version = 'full'
  }

  const activeDailies = before.quests.filter(q => q.kind === 'daily' && q.active).length
  const reward = questReward(quest, version, player.settings.monthlyBudget, activeDailies, stage)
  const completion: Completion = {
    id: newId(),
    userId: LOCAL_USER,
    questId: quest.id,
    stat: quest.stat,
    day,
    version,
    ...(stage ? { stageId: stage.id } : {}),
    xp: reward.xp,
    dollars: reward.dollars,
    createdAt: Date.now(),
  }
  await db.completions.add(completion)
  emit({ type: 'quest.completed', completion, questTitle: stage ? `${quest.title}: ${stage.title}` : quest.title, via })
  if (stage && quest.stages?.[quest.stages.length - 1].id === stage.id) {
    emit({ type: 'mainQuest.cleared', questId: quest.id, questTitle: quest.title })
  }
  await announceProgress(summary)
  return true
}

/** Undoes today's daily, this week's side quest, or the last cleared main quest stage. */
export async function undoQuest(quest: Quest): Promise<void> {
  const { summary, completions } = await snapshot()
  let done: Completion | undefined
  if (quest.kind === 'daily') done = summary.todayDone.get(quest.id)
  if (quest.kind === 'side') done = summary.weekDone.get(quest.id)
  if (quest.kind === 'main') {
    done = completions.filter(c => c.questId === quest.id && c.stageId).sort((a, b) => b.createdAt - a.createdAt)[0]
  }
  if (!done) return
  await db.completions.delete(done.id)
  emit({ type: 'quest.undone', questId: quest.id, questTitle: quest.title })
}

export async function addSideQuest(input: { stat: StatKey; title: string; description: string; minVersion: string; templateId?: string }): Promise<void> {
  const now = Date.now()
  await db.quests.add({
    id: newId(),
    userId: LOCAL_USER,
    kind: 'side',
    stat: input.stat,
    title: input.title.trim(),
    description: input.description.trim(),
    minVersion: input.minVersion.trim() || 'Half of it',
    active: true,
    templateId: input.templateId ?? null,
    createdAt: now,
    updatedAt: now,
  })
}

export async function addSideFromTemplate(templateId: string): Promise<void> {
  const t = SIDE_TEMPLATES.find(t => t.id === templateId)
  if (t) await addSideQuest({ ...t, templateId: t.id })
}

export async function addMainFromTemplate(templateId: string): Promise<void> {
  await db.quests.add(mainFromTemplate(templateId, Date.now()))
}

/** A custom main quest: one stage per line, each paying a mid-size stage reward. */
export async function addCustomMain(input: { stat: StatKey; title: string; description: string; stageTitles: string[] }): Promise<void> {
  const now = Date.now()
  await db.quests.add({
    id: newId(),
    userId: LOCAL_USER,
    kind: 'main',
    stat: input.stat,
    title: input.title.trim(),
    description: input.description.trim(),
    minVersion: '',
    active: true,
    templateId: null,
    stages: input.stageTitles.map((title, i) => ({ id: `s${i + 1}`, title, description: '', xp: 150, basePay: 30 })),
    createdAt: now,
    updatedAt: now,
  })
}

/** Removes a quest from the board. Its history stays, so XP and money already earned are kept. */
export async function archiveQuest(quest: Quest): Promise<void> {
  await db.quests.update(quest.id, { active: false, updatedAt: Date.now() })
}

function mainFromTemplate(templateId: string, at: number): Quest {
  const t = MAIN_TEMPLATES.find(t => t.id === templateId)!
  return {
    id: newId(),
    userId: LOCAL_USER,
    kind: 'main',
    stat: t.stat,
    title: t.title,
    description: t.description,
    minVersion: '',
    active: true,
    templateId: t.id,
    stages: t.stages.map(s => ({ ...s })),
    createdAt: at,
    updatedAt: at,
  }
}

// ---- Rewards ----

export interface RewardInput {
  title: string
  price: number
  category: string
  special: RewardSpecial
  statGate?: { stat: StatKey; min: number } | null
  templateId?: string
}

function newReward(input: RewardInput, at: number): Reward {
  return {
    id: newId(),
    userId: LOCAL_USER,
    title: input.title.trim(),
    price: Math.max(0, Math.round(input.price * 100) / 100),
    category: input.category.trim() || 'Other',
    special: input.special,
    statGate: input.statGate ?? null,
    active: true,
    templateId: input.templateId ?? null,
    createdAt: at,
    updatedAt: at,
  }
}

function rewardFromTemplate(templateId: string, at: number): Reward {
  const t = REWARD_TEMPLATES.find(t => t.id === templateId)!
  return newReward({ ...t, templateId: t.id }, at)
}

export async function addReward(input: RewardInput): Promise<void> {
  await db.rewards.add(newReward(input, Date.now()))
}

/** Adds suggested rewards the player doesn't already have. */
export async function addSuggestedRewards(templateIds: string[]): Promise<void> {
  const existing = new Set((await db.rewards.where('userId').equals(LOCAL_USER).toArray()).filter(r => r.active).map(r => r.templateId))
  const now = Date.now()
  await db.rewards.bulkAdd(templateIds.filter(id => !existing.has(id)).map((id, i) => rewardFromTemplate(id, now + i)))
}

export async function removeReward(reward: Reward): Promise<void> {
  await db.rewards.update(reward.id, { active: false, updatedAt: Date.now() })
}

/** Buys a reward if every gate passes. Returns why not when it can't. */
export async function buyReward(reward: Reward): Promise<string | null> {
  const { summary } = await snapshot()
  const check = checkPurchase(reward, {
    level: summary.level.level,
    stats: summary.stats,
    wallet: summary.wallet.available,
    vault: summary.wallet.vault,
    savingsMet: summary.savings.met,
    mainQuestsCleared: summary.mainQuestsCleared,
  })
  if (!check.ok) return check.reason

  const purchase: Purchase = {
    id: newId(),
    userId: LOCAL_USER,
    rewardId: reward.id,
    title: reward.title,
    price: reward.price,
    rank: rewardRank(reward.price),
    special: reward.special,
    day: summary.today,
    fromWallet: check.fromWallet,
    fromVault: check.fromVault,
    xp: reward.special === 'date' ? DATE_XP : 0,
    stat: reward.special === 'date' ? 'CHA' : null,
    createdAt: Date.now(),
  }
  await db.purchases.add(purchase)
  emit({ type: 'reward.purchased', purchase })
  if (purchase.special === 'bigNight') emit({ type: 'recovery.granted', day: addDays(purchase.day, 1) })
  await announceProgress(summary)
  return null
}

/** Refunds a purchase made today, putting the money back where it came from. */
export async function refundPurchase(purchase: Purchase): Promise<void> {
  const { summary } = await snapshot()
  if (purchase.day !== summary.today) return
  await db.purchases.delete(purchase.id)
  emit({ type: 'reward.refunded', purchase })
}

// ---- Savings gate ----

export async function logSavings(kind: 'saved' | 'income', amount: number): Promise<void> {
  if (!(amount > 0)) return
  const { summary } = await snapshot()
  await db.savings.add({
    id: newId(),
    userId: LOCAL_USER,
    kind,
    amount: Math.round(amount * 100) / 100,
    day: summary.today,
    createdAt: Date.now(),
  })
  emit({ type: 'savings.logged', kind, amount })
  await announceProgress(summary)
}

export async function deleteSavings(id: string): Promise<void> {
  await db.savings.delete(id)
}

// ---- Auto-complete links ----

/** The secret in this player's auto-complete links. Saved on the player, so every synced device shares it. */
export async function ensureTriggerToken(): Promise<string | null> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return null
  if (player.settings.triggerToken) return player.settings.triggerToken
  return resetTriggerToken()
}

/** Makes a new secret; every old auto-complete link stops working. */
export async function resetTriggerToken(): Promise<string> {
  const token = randomCode()
  await updateSettings({ triggerToken: token })
  return token
}

/** Applies a completion an automation sent while the app was closed. */
export async function completeFromTrigger(questId: string, version: CompletionVersion, at: number): Promise<void> {
  const quest = await db.quests.get(questId)
  if (quest?.userId !== LOCAL_USER) return
  await completeQuest(quest, version, { at, via: 'automation' })
}

// No 0/O or 1/I, so a code copied by hand can't be misread. 25 characters is about 125 bits.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export function randomCode(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(25)), b => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('')
}

// ---- Strength routine ----

/** Logs a set of the strength routine, then keeps the quest in step with the targets. */
export async function logSet(exercise: ExerciseKey, amount: number, source: 'camera' | 'manual' | 'correction'): Promise<void> {
  amount = Math.round(amount)
  if (amount === 0 || (source !== 'correction' && amount < 0)) return
  const { summary } = await snapshot()
  await db.sets.add({ id: newId(), userId: LOCAL_USER, exercise, amount, day: summary.today, source, createdAt: Date.now() })
  const routine = (await snapshot()).summary.routine
  if (routine && source !== 'correction') {
    const name = routine.exercises.find(e => e.key === exercise)?.name ?? exercise
    emit({ type: 'workout.set', exercise, name, amount, total: routine.done[exercise] ?? 0, target: routine.targets[exercise] ?? 0 })
  }
  await syncRoutineQuest()
}

/** Sets today's total for an exercise by hand, e.g. when the camera miscounted. Honour system. */
export async function correctTotal(exercise: ExerciseKey, total: number): Promise<void> {
  const { summary } = await snapshot()
  const current = summary.routine?.done[exercise] ?? 0
  await logSet(exercise, Math.max(0, Math.round(total)) - current, 'correction')
}

export async function deleteSet(id: string): Promise<void> {
  await db.sets.delete(id)
  await syncRoutineQuest()
}

/**
 * Clears the strength quest once every target is hit, and un-clears an automatic
 * clear if a correction, deleted set or raised target means it no longer is.
 */
async function syncRoutineQuest(): Promise<void> {
  const { summary, quests } = await snapshot()
  const routine = summary.routine
  const quest = quests.find(q => q.kind === 'daily' && q.active && q.templateId === 'str-routine')
  if (!routine || !quest) return
  const full = routineLevel(routine.targets, routine.done) === 'full'
  const done = summary.todayDone.get(quest.id)
  if (full && !done) await completeQuest(quest, 'full')
  if (!full && done?.version === 'full') {
    await db.completions.delete(done.id)
    emit({ type: 'quest.undone', questId: quest.id, questTitle: quest.title })
  }
}

/** Replaces the player's strength routine (targets, exercises) and updates the quest text to match. */
export async function saveRoutine(exercises: RoutineExercise[]): Promise<void> {
  const clean = exercises
    .map(e => ({ ...e, name: e.name.trim(), target: Math.max(1, Math.round(e.target)) }))
    .filter(e => e.name && e.target > 0)
  if (clean.length === 0) return
  const now = Date.now()
  await db.players.update(LOCAL_USER, { routine: clean, updatedAt: now })
  const quests = await db.quests.where('userId').equals(LOCAL_USER).toArray()
  for (const q of quests.filter(q => q.templateId === 'str-routine')) {
    await db.quests.update(q.id, { description: routineDescription(clean), updatedAt: now })
  }
  await syncRoutineQuest()
}

/** Takes the System's offer of harder targets after 3 clean weeks. */
export async function acceptRoutineOffer(): Promise<void> {
  const { summary } = await snapshot()
  if (!summary.routineOffer) return
  await db.players.update(LOCAL_USER, { routineReviewedOn: summary.today })
  await saveRoutine(summary.routineOffer)
  emit({ type: 'routine.raised' })
}

/** "Not now": the System asks again after another 3 clean weeks. */
export async function declineRoutineOffer(): Promise<void> {
  const { summary } = await snapshot()
  await db.players.update(LOCAL_USER, { routineReviewedOn: summary.today, updatedAt: Date.now() })
}

/** A unique id for a player-made exercise. */
export const customExerciseKey = () => `custom-${newId().slice(0, 8)}`

// ---- Save file: a full copy of the game, used for backups and cloud sync ----

const SAVE_FORMAT = 'livinghud-save'
const tables = () => [db.players, db.quests, db.completions, db.rewards, db.purchases, db.savings, db.sets]
/** The record lists a save file holds, in order. */
export const SAVE_TABLES = ['players', 'quests', 'completions', 'rewards', 'purchases', 'savings', 'sets'] as const

/** Every record, in a stable order, so two copies of the same game serialize identically. */
export async function saveData() {
  const [players, quests, completions, rewards, purchases, savings, sets] = await Promise.all(tables().map(t => t.toArray()))
  return { format: SAVE_FORMAT, version: 3, players, quests, completions, rewards, purchases, savings, sets }
}

export async function exportSave(): Promise<string> {
  return JSON.stringify({ ...(await saveData()), exportedAt: Date.now() }, null, 2)
}

/** Loads a save file. Phase 1 (version 1) saves load too; they just have no rewards yet. */
export async function importSave(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data?.format !== SAVE_FORMAT || !Array.isArray(data.players)) {
    throw new Error('This is not a LivingHUD save file.')
  }
  await db.transaction('rw', tables(), async () => {
    await Promise.all(tables().map(t => t.clear()))
    await db.players.bulkPut(data.players)
    await db.quests.bulkPut(data.quests ?? [])
    await db.completions.bulkPut(data.completions ?? [])
    await db.rewards.bulkPut(data.rewards ?? [])
    await db.purchases.bulkPut(data.purchases ?? [])
    await db.savings.bulkPut(data.savings ?? [])
    await db.sets.bulkPut(data.sets ?? [])
  })
}

export async function resetEverything(): Promise<void> {
  await db.transaction('rw', tables(), async () => {
    await Promise.all(tables().map(t => t.clear()))
  })
}

// The only place that writes game data. Each action updates the database,
// then announces what happened on the event bus.

import {
  DAILY_TEMPLATES,
  DATE_XP,
  MAIN_TEMPLATES,
  REWARD_TEMPLATES,
  REWARD_IDEAS,
  SIDE_TEMPLATES,
  SIDE_OFFERS,
  MAIN_OFFERS,
  addDays,
  dayKey,
  weekOf,
  checkPurchase,
  emit,
  questReward,
  CONTACT_XP,
  BOSS_XP,
  MINUTES_PER_HIT,
  focusQuestVersion,
  focusXp,
  journalVersion,
  featureOn,
  STREAK_BONUS,
  THEMES,
  SURPRISE_XP,
  PLAN_TEMPLATES,
  bookingBlock,
  expeditionStages,
  savedStageReached,
  dailySurprise,
  surpriseState,
  DEFAULT_BOND_DAYS,
  planDescription,
  missingPostureMoves,
  routineLevel,
  rewardRank,
  defaultPlan,
  summarize,
  type Completion,
  type CompletionVersion,
  type Circle,
  type ContactKind,
  type FeatureKey,
  type JournalEntry,
  type Person,
  type ExerciseKey,
  type ExerciseSet,
  type FitnessBaseline,
  type PlayerSettings,
  type Player,
  type Plan,
  type Purchase,
  type Quest,
  type QuestStage,
  type TrainingPlan,
  type PostureScan,
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
      description: t.id === 'str-routine' ? planDescription(defaultPlan(answers.fitness, '')) : t.description,
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
      penaltiesSince: dayKey(new Date(now), answers.settings.resetHour),
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
  await (await import('./memories')).ensureMemoryQuest()
}

export async function updateSettings(patch: Partial<PlayerSettings>): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  const settings = { ...player.settings, ...patch }
  // A new difficulty applies from today, never to days already past.
  const restart = patch.difficulty && patch.difficulty !== player.settings.difficulty
  await db.players.update(LOCAL_USER, {
    settings,
    ...(restart ? { penaltiesSince: dayKey(new Date(), settings.resetHour) } : {}),
    updatedAt: Date.now(),
  })
}

/** Starts counting penalties from today for a player who doesn't have a start day yet. */
export async function ensurePenaltyStart(): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player || player.penaltiesSince || !featureOn(player, 'penalties')) return
  await db.players.update(LOCAL_USER, { penaltiesSince: dayKey(new Date(), player.settings.resetHour) })
}

export async function snapshot() {
  const player = await db.players.get(LOCAL_USER)
  if (!player) throw new Error('No player yet')
  const [quests, completions, purchases, savings, sets] = await Promise.all([
    db.quests.where('userId').equals(LOCAL_USER).toArray(),
    db.completions.where('userId').equals(LOCAL_USER).toArray(),
    db.purchases.where('userId').equals(LOCAL_USER).toArray(),
    db.savings.where('userId').equals(LOCAL_USER).toArray(),
    db.sets.where('userId').equals(LOCAL_USER).toArray(),
  ])
  const [people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds, memories, places] = await Promise.all([
    db.people.where('userId').equals(LOCAL_USER).toArray(),
    db.contacts.where('userId').equals(LOCAL_USER).toArray(),
    db.focusRuns.where('userId').equals(LOCAL_USER).toArray(),
    db.bosses.where('userId').equals(LOCAL_USER).toArray(),
    db.journal.where('userId').equals(LOCAL_USER).toArray(),
    db.surprises.where('userId').equals(LOCAL_USER).toArray(),
    db.plans.where('userId').equals(LOCAL_USER).toArray(),
    db.planFunds.where('userId').equals(LOCAL_USER).toArray(),
    db.memories.where('userId').equals(LOCAL_USER).toArray(),
    db.places.where('userId').equals(LOCAL_USER).toArray(),
  ])
  const summary = summarize(player, quests, completions, new Date(), {
    purchases, savings, sets, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds, memories, places,
  })
  return { player, quests, completions, purchases, savings, sets, people, contacts, focusRuns, bosses, summary }
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
  const player = await db.players.get(LOCAL_USER)
  if (player && featureOn(player, 'badges')) {
    const had = new Set(before.badges.map(b => b.id))
    for (const b of after.badges) if (!had.has(b.id)) emit({ type: 'badge.earned', title: b.title, description: b.description })
  }
  if (player && featureOn(player, 'loot')) {
    for (const id of after.themes) {
      if (!before.themes.includes(id)) emit({ type: 'loot.dropped', name: THEMES.find(t => t.id === id)?.name ?? id })
    }
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
  const base = questReward(quest, version, player.settings.monthlyBudget, activeDailies, stage)
  // A 30-day streak on this stat's dailies adds 10% XP (never dollars) while it holds.
  const bonus = featureOn(player, 'badges') && summary.streakBonus.has(quest.stat) ? 1 + STREAK_BONUS : 1
  const reward = { ...base, xp: Math.round(base.xp * bonus) }
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
  // Clearing an Expedition stage by hand can make the next saving milestones due.
  if (stage) {
    const plan = await db.plans.where('userId').equals(LOCAL_USER).filter(p => p.questId === quest.id).first()
    if (plan) await advancePlanQuest(plan.id)
  }
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
  const t = SIDE_TEMPLATES.find(t => t.id === templateId) ?? SIDE_OFFERS.find(t => t.id === templateId)
  if (t) await addSideQuest({ stat: t.stat, title: t.title, description: t.description, minVersion: t.minVersion, templateId: t.id })
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
  const t = MAIN_TEMPLATES.find(t => t.id === templateId) ?? MAIN_OFFERS.find(t => t.id === templateId)!
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
  const t = [...REWARD_TEMPLATES, ...REWARD_IDEAS].find(t => t.id === templateId)!
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

/** Changes a reward's name, price, category or type. Its rank follows the new price. */
export async function updateReward(id: string, patch: Pick<RewardInput, 'title' | 'price' | 'category' | 'special'>): Promise<void> {
  await db.rewards.update(id, {
    title: patch.title.trim(),
    price: Math.max(0, Math.round(patch.price * 100) / 100),
    category: patch.category.trim() || 'Other',
    special: patch.special,
    updatedAt: Date.now(),
  })
}

/**
 * Buys something that isn't on the list, as needed. Same gates as any reward
 * (savings goal, level for its rank, wallet or Vault). Kept in the shop only if
 * asked; otherwise it's just in the purchase history. Returns why not if it can't.
 */
export async function buyOneOff(input: RewardInput, keep: boolean): Promise<string | null> {
  const reward = newReward(input, Date.now())
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
  await db.rewards.add({ ...reward, active: keep })
  return buyReward(reward)
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

/** Logs exercise an automation sent (e.g. a posture check-in reminder tap). */
export async function logFromTrigger(exercise: ExerciseKey, amount: number, at: number): Promise<void> {
  await logSet(exercise, amount, 'link', at)
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
export async function logSet(exercise: ExerciseKey, amount: number, source: ExerciseSet['source'], at?: number): Promise<void> {
  amount = Math.round(amount)
  if (amount === 0 || (source !== 'correction' && amount < 0)) return
  const { summary, player } = await snapshot()
  // A reminder tap can arrive later: it counts for the game day it happened on.
  const day = at ? dayKey(new Date(Math.min(at, Date.now())), player.settings.resetHour) : summary.today
  await db.sets.add({ id: newId(), userId: LOCAL_USER, exercise, amount, day, source, createdAt: Date.now() })
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

/** Saves the player's training plan (cycle, workouts, posture) and updates the quest text to match. */
export async function savePlan(plan: TrainingPlan): Promise<void> {
  const clean = (list: TrainingPlan['posture']) =>
    list.map(e => ({ ...e, name: e.name.trim(), target: Math.max(1, Math.round(e.target)) })).filter(e => e.name)
  const workouts: TrainingPlan['workouts'] = {}
  for (const [kind, list] of Object.entries(plan.workouts)) workouts[kind as keyof TrainingPlan['workouts']] = clean(list ?? [])
  const saved: TrainingPlan = { ...plan, workouts, posture: clean(plan.posture) }
  if (saved.cycle.length === 0) return
  const now = Date.now()
  await db.players.update(LOCAL_USER, { plan: saved, updatedAt: now })
  const quests = await db.quests.where('userId').equals(LOCAL_USER).toArray()
  for (const q of quests.filter(q => q.templateId === 'str-routine')) {
    await db.quests.update(q.id, { description: planDescription(saved), updatedAt: now })
  }
  await syncRoutineQuest()
}

/** Takes the System's offer of harder targets after 3 clean weeks. */
export async function acceptRoutineOffer(): Promise<void> {
  const { summary } = await snapshot()
  if (!summary.routineOffer) return
  await db.players.update(LOCAL_USER, { routineReviewedOn: summary.today })
  await savePlan(summary.routineOffer)
  emit({ type: 'routine.raised' })
}

/** "Not now": the System asks again after another 3 clean weeks. */
export async function declineRoutineOffer(): Promise<void> {
  const { summary } = await snapshot()
  await db.players.update(LOCAL_USER, { routineReviewedOn: summary.today, updatedAt: Date.now() })
}

export const POSTURE_UPDATE = 'posture-research-2026-10'

/**
 * Adds the research-based posture additions to a player's own plan: pelvic control
 * drills and posture check-ins, plus the incline walking and weekly scan side quests.
 */
export async function applyPostureUpdate(): Promise<void> {
  const { summary, quests } = await snapshot()
  const plan = summary.routine.plan
  const missing = missingPostureMoves(plan)
  if (missing.length > 0) await savePlan({ ...plan, posture: [...plan.posture, ...missing] })
  const active = new Set(quests.filter(q => q.active).map(q => q.templateId))
  for (const id of ['side-str-incline-walk', 'side-str-posture-scan']) if (!active.has(id)) await addSideFromTemplate(id)
  await dismissNotice(POSTURE_UPDATE)
}

export async function dismissNotice(id: string): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player || player.dismissedNotices?.includes(id)) return
  await db.players.update(LOCAL_USER, { dismissedNotices: [...(player.dismissedNotices ?? []), id], updatedAt: Date.now() })
}

/** Saves a posture scan, and clears the weekly scan side quest once both kinds are done this week. */
export async function saveScan(kind: PostureScan['kind'], value: number): Promise<void> {
  const { summary, quests } = await snapshot()
  await db.scans.add({ id: newId(), userId: LOCAL_USER, kind, value: Math.round(value * 10) / 10, day: summary.today, createdAt: Date.now() })
  const quest = quests.find(q => q.active && q.templateId === 'side-str-posture-scan')
  if (!quest) return
  const week = await db.scans.where('userId').equals(LOCAL_USER).filter(s => weekOf(s.day) === summary.week).toArray()
  const kinds = new Set(week.map(s => s.kind))
  const done = summary.weekDone.get(quest.id)
  if (kinds.has('head') && kinds.has('walk')) {
    // Upgrade a minimum clear (head scan only) once the walking scan is in too.
    if (done?.version === 'min') await db.completions.delete(done.id)
    if (done?.version !== 'full') await completeQuest(quest, 'full')
  } else if (kinds.has('head') && !done) await completeQuest(quest, 'min')
}

export async function deleteScan(id: string): Promise<void> {
  await db.scans.delete(id)
}

/** A unique id for a player-made exercise. */
export const customExerciseKey = () => `custom-${newId().slice(0, 8)}`

// ---- Party list ----

export async function addPerson(input: { name: string; circle: Circle; bondDays?: number; note?: string }): Promise<void> {
  const now = Date.now()
  await db.people.add({
    id: newId(),
    userId: LOCAL_USER,
    name: input.name.trim(),
    circle: input.circle,
    bondDays: Math.max(1, Math.round(input.bondDays ?? DEFAULT_BOND_DAYS)),
    note: input.note?.trim() ?? '',
    active: true,
    createdAt: now,
    updatedAt: now,
  })
}

export async function updatePerson(id: string, patch: Partial<Pick<Person, 'name' | 'circle' | 'bondDays' | 'note'>>): Promise<void> {
  await db.people.update(id, { ...patch, updatedAt: Date.now() })
}

/** Takes someone off the list. Their contact history (and the XP it earned) stays. */
export async function removePerson(id: string): Promise<void> {
  await db.people.update(id, { active: false, updatedAt: Date.now() })
}

/**
 * Logs contact with someone: earns CHA XP and clears the matching CHA quests
 * (any contact clears "Reach out to 1 person"; a hangout clears the weekly
 * hangout quest; a call with family clears "Call family").
 */
export async function logContact(personId: string, kind: ContactKind, note = ''): Promise<void> {
  const { summary, quests } = await snapshot()
  const person = await db.people.get(personId)
  if (!person) return
  const xp = CONTACT_XP[kind]
  await db.contacts.add({ id: newId(), userId: LOCAL_USER, personId, kind, note: note.trim(), day: summary.today, xp, createdAt: Date.now() })
  emit({ type: 'contact.logged', name: person.name, kind, xp })
  await announceProgress(summary)

  const clears = (templateId: string) => quests.find(q => q.active && q.templateId === templateId)
  const reach = clears('cha-reach')
  if (reach) await completeQuest(reach, 'full')
  const hangout = clears('side-cha-hangout')
  if (hangout && kind === 'hangout') await completeQuest(hangout, 'full')
  const family = clears('side-cha-family')
  if (family && kind === 'call' && person.circle === 'family') await completeQuest(family, 'full')
}

export async function deleteContact(id: string): Promise<void> {
  await db.contacts.delete(id)
}

// ---- Focus dungeons and bosses ----

export interface FocusResult {
  label: string
  stat: StatKey
  questId: string | null
  bossId: string | null
  plannedMin: number
  minutes: number
  cleared: boolean
  startedAt: number
  manual?: boolean
}

/**
 * Saves a finished focus session: XP per minute (plus a bonus for a full clear),
 * the linked quest (30+ min full, 10+ min minimum, only if not broken), and damage
 * to a linked boss.
 */
export async function saveFocusRun(r: FocusResult): Promise<void> {
  const { summary, player, quests } = await snapshot()
  const minutes = Math.max(0, Math.floor(r.minutes))
  if (minutes === 0 && !r.manual) return
  const xp = focusXp(minutes, r.cleared)
  const day = dayKey(new Date(r.startedAt), player.settings.resetHour)
  await db.focusRuns.add({
    id: newId(),
    userId: LOCAL_USER,
    label: r.label.trim() || 'Focus',
    stat: r.stat,
    questId: r.questId,
    bossId: r.bossId,
    plannedMin: r.plannedMin,
    minutes,
    cleared: r.cleared,
    manual: !!r.manual,
    day,
    xp,
    startedAt: r.startedAt,
    createdAt: Date.now(),
  })
  if (!r.manual) emit({ type: 'focus.ended', label: r.label, minutes, cleared: r.cleared, xp })
  await announceProgress(summary)

  // A broken session still counts its minutes, but doesn't clear a quest.
  const quest = r.questId ? quests.find(q => q.id === r.questId) : undefined
  const version = r.cleared || r.manual ? focusQuestVersion(minutes) : null
  if (quest && version) await completeQuest(quest, version, { at: r.startedAt })
  if (r.bossId) await damageBoss(r.bossId)
}

/** Logs a 15-minute hit on a boss done without the timer (honour system). */
export async function hitBoss(bossId: string): Promise<void> {
  const boss = await db.bosses.get(bossId)
  if (!boss) return
  await saveFocusRun({ label: boss.name, stat: boss.stat, questId: null, bossId, plannedMin: MINUTES_PER_HIT, minutes: MINUTES_PER_HIT, cleared: true, startedAt: Date.now(), manual: true })
}

/** After damage: announce it, clear the dreaded-task side quest, and mark the boss defeated at 0 HP. */
async function damageBoss(bossId: string): Promise<void> {
  const { summary, quests } = await snapshot()
  const status = summary.bosses.find(b => b.boss.id === bossId)
  if (!status || status.boss.defeatedAt) return
  emit({ type: 'boss.hit', name: status.boss.name, damage: status.damage, hpLeft: status.hpLeft })
  const dread = quests.find(q => q.active && q.templateId === 'side-agi-dread')
  if (status.hpLeft === 0) {
    await db.bosses.update(bossId, { defeatedAt: Date.now(), updatedAt: Date.now() })
    emit({ type: 'boss.defeated', name: status.boss.name, xp: BOSS_XP })
    const done = dread && summary.weekDone.get(dread.id)
    if (dread && done?.version === 'min') await db.completions.delete(done.id)
    if (dread && done?.version !== 'full') await completeQuest(dread, 'full')
    await announceProgress(summary)
  } else if (dread && !summary.weekDone.has(dread.id)) {
    // "First 15 minutes of it" is the dreaded task's minimum version.
    await completeQuest(dread, 'min')
  }
}

export async function addBoss(input: { name: string; stat: StatKey; hours: number }): Promise<void> {
  const now = Date.now()
  await db.bosses.add({
    id: newId(),
    userId: LOCAL_USER,
    name: input.name.trim(),
    stat: input.stat,
    hp: Math.max(1, Math.round((input.hours * 60) / MINUTES_PER_HIT)),
    active: true,
    defeatedAt: null,
    createdAt: now,
    updatedAt: now,
  })
}

/** Removes a boss from the board. Its sessions and XP stay. */
export async function removeBoss(id: string): Promise<void> {
  await db.bosses.update(id, { active: false, updatedAt: Date.now() })
}

// ---- Reflection journal ----

/**
 * Saves today's journal entry (one per day; saving again updates it) and clears
 * the journal daily: all three prompts is the full quest, one line the minimum.
 */
export async function saveJournal(input: Pick<JournalEntry, 'wentWell' | 'drained' | 'adjust' | 'mood' | 'energy'>): Promise<void> {
  const { summary, quests } = await snapshot()
  const now = Date.now()
  const existing = await db.journal.where('userId').equals(LOCAL_USER).filter(e => e.day === summary.today).first()
  const entry = { ...input, wentWell: input.wentWell.trim(), drained: input.drained.trim(), adjust: input.adjust.trim(), updatedAt: now }
  if (existing) await db.journal.update(existing.id, entry)
  else await db.journal.add({ id: newId(), userId: LOCAL_USER, day: summary.today, createdAt: now, ...entry })

  const quest = quests.find(q => q.active && q.kind === 'daily' && q.templateId === 'int-journal')
  const version = journalVersion(entry)
  if (!quest || !version) return
  const done = summary.todayDone.get(quest.id)
  if (done?.version === 'min' && version === 'full') await db.completions.delete(done.id)
  if (!done || (done.version === 'min' && version === 'full')) await completeQuest(quest, version)
}

// ---- Surprise challenges ----

/** The seed that makes each day's surprise the same on every device. */
export const surpriseSeed = (player: Player) => `${player.id}:${player.createdAt}`

/** Marks today's surprise as done (honour system) while it's open: +30 XP. */
export async function clearSurprise(): Promise<void> {
  const { summary, player } = await snapshot()
  const s = dailySurprise(summary.today, surpriseSeed(player), player.stats, player.settings.wakeTime, player.settings.bedTime)
  if (!s) return
  const already = await db.surprises.where('userId').equals(LOCAL_USER).filter(x => x.day === summary.today).count()
  if (already > 0 || surpriseState(s, false, Date.now()) !== 'open') return
  await db.surprises.add({ id: newId(), userId: LOCAL_USER, day: summary.today, challengeId: s.challenge.id, xp: SURPRISE_XP, createdAt: Date.now() })
  emit({ type: 'surprise.cleared', text: s.challenge.text, xp: SURPRISE_XP })
  await announceProgress(summary)
}

// ---- Plans: raves, festivals, trips ----

/** Starts a plan from a template (or blank), optionally with an Expedition main quest. */
export async function createPlan(input: { templateId: string | null; name: string; date: string; withQuest: boolean }): Promise<string> {
  const now = Date.now()
  const t = PLAN_TEMPLATES.find(t => t.id === input.templateId)
  const kind = t?.kind ?? 'trip'
  const id = newId()
  let questId: string | null = null
  if (input.withQuest) {
    questId = newId()
    await db.quests.add({
      id: questId,
      userId: LOCAL_USER,
      kind: 'main',
      stat: 'WLT',
      title: `Expedition: ${input.name.trim()}`,
      description: `Save for and book ${input.name.trim()}. The saving stages clear themselves as the plan fills up.`,
      minVersion: '',
      active: true,
      templateId: null,
      stages: expeditionStages(kind),
      createdAt: now,
      updatedAt: now,
    })
  }
  await db.plans.add({
    id,
    userId: LOCAL_USER,
    name: input.name.trim(),
    kind,
    date: input.date,
    items: (t?.items ?? []).map(i => ({ ...i, id: newId(), purchaseId: null })),
    questId,
    status: 'active',
    createdAt: now,
    updatedAt: now,
  })
  return id
}

export async function updatePlan(id: string, patch: Partial<Pick<Plan, 'name' | 'date' | 'items' | 'status'>>): Promise<void> {
  await db.plans.update(id, { ...patch, updatedAt: Date.now() })
  await advancePlanQuest(id)
}

/** Moves money from the free Vault into a plan (negative returns it to the Vault). */
export async function fundPlan(planId: string, amount: number): Promise<string | null> {
  const { summary } = await snapshot()
  const plan = await db.plans.get(planId)
  const status = summary.plans.find(p => p.plan.id === planId)
  if (!plan || !status) return 'Plan not found'
  amount = Math.round(amount * 100) / 100
  if (amount > 0 && amount > summary.wallet.vault) return `The Vault only has $${summary.wallet.vault.toFixed(2)} free`
  if (amount < 0 && -amount > status.fund) return `The plan only has $${status.fund.toFixed(2)} unspent`
  if (amount === 0) return null
  await db.planFunds.add({ id: newId(), userId: LOCAL_USER, planId, amount, day: summary.today, createdAt: Date.now() })
  if (amount > 0) emit({ type: 'plan.funded', name: plan.name, amount })
  await advancePlanQuest(planId)
  return null
}

/** Books one part of a plan, paid from the plan's fund. The money is the gate: no level needed. */
export async function bookPlanItem(planId: string, itemId: string): Promise<string | null> {
  const { summary } = await snapshot()
  const plan = await db.plans.get(planId)
  const status = summary.plans.find(p => p.plan.id === planId)
  const item = plan?.items.find(i => i.id === itemId)
  if (!plan || !status || !item || item.purchaseId) return 'Already booked'
  const block = bookingBlock(item.cost, status.fund, summary.savings.met)
  if (block) return block
  const purchaseId = newId()
  const bigNight = plan.kind !== 'trip' && item.kind === 'ticket'
  await db.transaction('rw', db.purchases, db.planFunds, db.plans, async () => {
    await db.purchases.add({
      id: purchaseId,
      userId: LOCAL_USER,
      rewardId: `plan:${planId}`,
      title: `${plan.name}: ${item.label}`,
      price: item.cost,
      rank: rewardRank(item.cost),
      special: bigNight ? 'bigNight' : 'none',
      day: summary.today,
      ...(bigNight && plan.date ? { forDay: plan.date } : {}),
      fromWallet: 0,
      fromVault: item.cost,
      xp: 0,
      stat: null,
      planId,
      createdAt: Date.now(),
    })
    await db.planFunds.add({ id: newId(), userId: LOCAL_USER, planId, amount: -item.cost, day: summary.today, createdAt: Date.now() })
    await db.plans.update(planId, { items: plan.items.map(i => (i.id === itemId ? { ...i, purchaseId } : i)), updatedAt: Date.now() })
  })
  emit({ type: 'plan.booked', name: plan.name, label: item.label, cost: item.cost })
  await advancePlanQuest(planId)
  return null
}

/** Un-books a part (e.g. a cancelled booking): the money goes back into the plan's fund. */
export async function unbookPlanItem(planId: string, itemId: string): Promise<void> {
  const { summary } = await snapshot()
  const plan = await db.plans.get(planId)
  const item = plan?.items.find(i => i.id === itemId)
  if (!plan || !item?.purchaseId) return
  await db.transaction('rw', db.purchases, db.planFunds, db.plans, async () => {
    await db.purchases.delete(item.purchaseId!)
    await db.planFunds.add({ id: newId(), userId: LOCAL_USER, planId, amount: item.cost, day: summary.today, createdAt: Date.now() })
    await db.plans.update(planId, { items: plan.items.map(i => (i.id === itemId ? { ...i, purchaseId: null } : i)), updatedAt: Date.now() })
  })
}

/** Ends a plan. Cancelling returns its unspent fund to the Vault; bookings stay as purchases. */
export async function closePlan(planId: string, status: 'done' | 'cancelled'): Promise<void> {
  const { summary } = await snapshot()
  const fund = summary.plans.find(p => p.plan.id === planId)?.fund ?? 0
  if (fund > 0) await db.planFunds.add({ id: newId(), userId: LOCAL_USER, planId, amount: -fund, day: summary.today, createdAt: Date.now() })
  await db.plans.update(planId, { status, updatedAt: Date.now() })
}

/** Clears the plan's Expedition "save" stages the fund has reached, in order. */
async function advancePlanQuest(planId: string): Promise<void> {
  for (let guard = 0; guard < 6; guard++) {
    const { summary, quests } = await snapshot()
    const plan = summary.plans.find(p => p.plan.id === planId)
    const quest = plan?.plan.questId ? quests.find(q => q.id === plan.plan.questId && q.active) : undefined
    const current = quest ? summary.mainProgress.get(quest.id)?.current : null
    if (!plan || !quest || !current || !savedStageReached(current, plan.progress)) return
    await completeQuest(quest)
  }
}

// ---- Titles and themes ----

export async function setTitle(title: string | null): Promise<void> {
  await db.players.update(LOCAL_USER, { title, updatedAt: Date.now() })
}

export async function setTheme(theme: string): Promise<void> {
  await db.players.update(LOCAL_USER, { theme, updatedAt: Date.now() })
}

// ---- Feature switches ----

export async function setFeature(key: FeatureKey, on: boolean): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  // Switching penalties back on starts a fresh count from today.
  const restart = key === 'penalties' && on ? { penaltiesSince: dayKey(new Date(), player.settings.resetHour) } : {}
  await db.players.update(LOCAL_USER, { features: { ...player.features, [key]: on }, ...restart, updatedAt: Date.now() })
  if (key === 'memories') await (await import('./memories')).ensureMemoryQuest()
}

// ---- Save file: a full copy of the game, used for backups and cloud sync ----

const SAVE_FORMAT = 'livinghud-save'
const tables = () => [db.players, db.quests, db.completions, db.rewards, db.purchases, db.savings, db.sets, db.scans, db.people, db.contacts, db.focusRuns, db.bosses, db.journal, db.surprises, db.plans, db.planFunds, db.memories, db.places]
/** The record lists a save file holds, in order. */
export const SAVE_TABLES = ['players', 'quests', 'completions', 'rewards', 'purchases', 'savings', 'sets', 'scans', 'people', 'contacts', 'focusRuns', 'bosses', 'journal', 'surprises', 'plans', 'planFunds', 'memories', 'places'] as const

/** Every record, in a stable order, so two copies of the same game serialize identically. */
export async function saveData() {
  const [players, quests, completions, rewards, purchases, savings, sets, scans, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds, memories, places] = await Promise.all(
    tables().map(t => t.toArray()),
  )
  return {
    format: SAVE_FORMAT,
    version: 10,
    players, quests, completions, rewards, purchases, savings, sets, scans, people, contacts, focusRuns, bosses, journal, surprises, plans, planFunds, memories, places,
  }
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
    await db.scans.bulkPut(data.scans ?? [])
    await db.people.bulkPut(data.people ?? [])
    await db.contacts.bulkPut(data.contacts ?? [])
    await db.focusRuns.bulkPut(data.focusRuns ?? [])
    await db.bosses.bulkPut(data.bosses ?? [])
    await db.journal.bulkPut(data.journal ?? [])
    await db.surprises.bulkPut(data.surprises ?? [])
    await db.plans.bulkPut(data.plans ?? [])
    await db.planFunds.bulkPut(data.planFunds ?? [])
    await db.memories.bulkPut(data.memories ?? [])
    await db.places.bulkPut(data.places ?? [])
  })
}

export async function resetEverything(): Promise<void> {
  await db.transaction('rw', [...tables(), db.photoCache], async () => {
    await Promise.all([...tables(), db.photoCache].map(t => t.clear()))
  })
}

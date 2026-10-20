// The only place that writes game data. Each action updates the database,
// then announces what happened on the event bus.

import {
  DAILY_TEMPLATES,
  emit,
  levelFromXp,
  questReward,
  strengthDescription,
  summarize,
  type CompletionVersion,
  type FitnessBaseline,
  type PlayerSettings,
  type Quest,
  type StatKey,
} from '../engine'
import { db, LOCAL_USER, newId } from './db'

export interface AwakeningAnswers {
  name: string
  stats: StatKey[]
  fitness: FitnessBaseline | null
  dailyTemplateIds: string[]
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
  await db.transaction('rw', db.players, db.quests, async () => {
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
  })
  emit({ type: 'player.awakened', name: answers.name, stats: answers.stats })
}

async function snapshot() {
  const player = await db.players.get(LOCAL_USER)
  if (!player) throw new Error('No player yet')
  const quests = await db.quests.where('userId').equals(LOCAL_USER).toArray()
  const completions = await db.completions.where('userId').equals(LOCAL_USER).toArray()
  return { player, quests, completions, summary: summarize(player, quests, completions, new Date()) }
}

export async function completeQuest(quest: Quest, version: CompletionVersion): Promise<void> {
  const before = await snapshot()
  const day = before.summary.today
  if (before.summary.todayDone.has(quest.id)) return

  const activeDailies = before.quests.filter(q => q.kind === 'daily' && q.active).length
  const reward = questReward(quest, version, before.player.settings.monthlyBudget, activeDailies)
  const completion = {
    id: newId(),
    userId: LOCAL_USER,
    questId: quest.id,
    stat: quest.stat,
    day,
    version,
    xp: reward.xp,
    dollars: reward.dollars,
    createdAt: Date.now(),
  }
  await db.completions.add(completion)
  emit({ type: 'quest.completed', completion, questTitle: quest.title })

  const after = await snapshot()
  const newLevel = levelFromXp(after.summary.totalXp).level
  if (newLevel > before.summary.level.level) emit({ type: 'level.up', level: newLevel })
  const budget = after.player.settings.monthlyBudget
  if (before.summary.wallet.earned < budget && after.summary.wallet.earned >= budget) {
    emit({ type: 'wallet.full', month: after.summary.wallet.month, budget })
  }
}

export async function undoQuest(quest: Quest): Promise<void> {
  const { summary } = await snapshot()
  const done = summary.todayDone.get(quest.id)
  if (!done) return
  await db.completions.delete(done.id)
  emit({ type: 'quest.undone', questId: quest.id, questTitle: quest.title })
}

// ---- Save file: protects progress while data only lives in this browser ----

const SAVE_FORMAT = 'livinghud-save'

export async function exportSave(): Promise<string> {
  const [players, quests, completions] = await Promise.all([
    db.players.toArray(),
    db.quests.toArray(),
    db.completions.toArray(),
  ])
  return JSON.stringify({ format: SAVE_FORMAT, version: 1, exportedAt: Date.now(), players, quests, completions }, null, 2)
}

export async function importSave(json: string): Promise<void> {
  const data = JSON.parse(json)
  if (data?.format !== SAVE_FORMAT || !Array.isArray(data.players)) {
    throw new Error('This is not a LivingHUD save file.')
  }
  await db.transaction('rw', db.players, db.quests, db.completions, async () => {
    await Promise.all([db.players.clear(), db.quests.clear(), db.completions.clear()])
    await db.players.bulkPut(data.players)
    await db.quests.bulkPut(data.quests ?? [])
    await db.completions.bulkPut(data.completions ?? [])
  })
}

export async function resetEverything(): Promise<void> {
  await db.transaction('rw', db.players, db.quests, db.completions, async () => {
    await Promise.all([db.players.clear(), db.quests.clear(), db.completions.clear()])
  })
}

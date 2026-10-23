// The template library players pick from during the Awakening.
// These are suggestions, not hard-coded quests: every player chooses their own.

import type { FitnessBaseline, StatKey } from './types'

export interface StatInfo {
  key: StatKey
  name: string
  area: string
}

export const STATS: StatInfo[] = [
  { key: 'STR', name: 'Strength', area: 'Fitness and posture' },
  { key: 'VIT', name: 'Vitality', area: 'Sleep, hydration, nutrition' },
  { key: 'INT', name: 'Intelligence', area: 'Learning and self-reflection' },
  { key: 'CHA', name: 'Charisma', area: 'Friends, family, dating' },
  { key: 'AGI', name: 'Agility', area: 'Discipline and life admin' },
  { key: 'WLT', name: 'Wealth', area: 'Money, career, side income' },
]

export interface DailyTemplate {
  id: string
  stat: StatKey
  title: string
  description: string
  minVersion: string
}

export const DEFAULT_FITNESS: FitnessBaseline = {
  pushups: 10,
  squats: 20,
  plankSeconds: 30,
  pullups: 0,
  gluteBridges: 10,
}

export function strengthDescription(f: FitnessBaseline): string {
  const parts = [
    `${f.pushups} pushups`,
    `${f.squats} squats`,
    `${f.plankSeconds}s plank`,
    f.pullups > 0 ? `${f.pullups} pull-ups` : null,
    `${f.gluteBridges} glute bridges`,
    '5 min posture drills (chin tucks, wall angels, dead hang)',
  ]
  return parts.filter(Boolean).join(' · ') + '. Reps can be split across the day.'
}

export const DAILY_TEMPLATES: DailyTemplate[] = [
  {
    id: 'str-routine',
    stat: 'STR',
    title: 'Strength + posture routine',
    description: '', // filled from the player's fitness test
    minVersion: 'Half the reps',
  },
  {
    id: 'str-steps',
    stat: 'STR',
    title: 'Walk 7,000 steps',
    description: 'Any walking counts. Phone step sync arrives with the native app.',
    minVersion: '3,500 steps',
  },
  {
    id: 'vit-trio',
    stat: 'VIT',
    title: 'Sleep, water, vitamins',
    description: 'Slept 7.5h+ · 8 glasses of water · took your vitamins.',
    minVersion: 'Any 2 of 3',
  },
  {
    id: 'vit-nutrition',
    stat: 'VIT',
    title: 'Nutrition checklist',
    description: 'Protein at every meal · 5 servings of veg/fruit · a fiber source · a healthy fat.',
    minVersion: '2 of 4',
  },
  {
    id: 'vit-screens',
    stat: 'VIT',
    title: 'Screens off before bed',
    description: 'No screens for 30 minutes before sleep.',
    minVersion: '15 minutes',
  },
  {
    id: 'int-learn',
    stat: 'INT',
    title: 'Learn for 30 minutes',
    description: 'A course, a book or deliberate skill practice.',
    minVersion: '10 minutes',
  },
  {
    id: 'int-journal',
    stat: 'INT',
    title: 'Reflection journal',
    description: 'What went well? What drained me? One thing to adjust tomorrow.',
    minVersion: 'One line',
  },
  {
    id: 'int-photo',
    stat: 'INT',
    title: 'Photo of the day',
    description: 'Capture one memory from today in the Life log: a photo of where you are or what you did.',
    minVersion: 'A one-line note instead',
  },
  {
    id: 'int-read',
    stat: 'INT',
    title: 'Read 10 pages',
    description: 'Any book that is not a screen.',
    minVersion: '3 pages',
  },
  {
    id: 'cha-reach',
    stat: 'CHA',
    title: 'Reach out to 1 person',
    description: 'A real message: a check-in or a plan, not a meme.',
    minVersion: 'Reply to someone',
  },
  {
    id: 'agi-reset',
    stat: 'AGI',
    title: 'Morning reset',
    description: 'Make your bed and clear one surface.',
    minVersion: 'Make the bed',
  },
  {
    id: 'agi-plan',
    stat: 'AGI',
    title: "Plan tomorrow's top 3",
    description: 'Write the three tasks that matter most tomorrow.',
    minVersion: 'Top 1',
  },
  {
    id: 'agi-tidy',
    stat: 'AGI',
    title: '15-minute tidy',
    description: 'Set a timer and reset your space.',
    minVersion: '5 minutes',
  },
  {
    id: 'wlt-side',
    stat: 'WLT',
    title: 'Side-income block',
    description: '30-60 minutes on the current stage of your side-income quest.',
    minVersion: '15 minutes',
  },
  {
    id: 'wlt-spend',
    stat: 'WLT',
    title: 'Log today’s spending',
    description: 'Write down what you spent today. About one minute.',
    minVersion: 'Biggest purchase only',
  },
  {
    id: 'wlt-career',
    stat: 'WLT',
    title: 'Career block',
    description: '30-60 minutes on a skill, portfolio or job search that earns.',
    minVersion: '15 minutes',
  },
]

/** Suggested starter set: one per chosen stat, at most 4, in this order. */
export const SUGGESTED_STARTERS = ['str-routine', 'vit-trio', 'wlt-side', 'cha-reach', 'int-learn', 'agi-reset']

export const MAX_STARTER_DAILIES = 5

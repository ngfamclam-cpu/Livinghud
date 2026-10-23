// Life log writes: entries, places and the "Photo of the day" daily quest.

import { TRAVEL_IDS, TRAVEL_XP, DAILY_TEMPLATES, dayKey, emit, featureOn, nearestPlace, photoQuestStat, photoQuestVersion, placeFromLookup, type Memory, type MemoryPhoto, type Place } from '../engine'
import { completeQuest, snapshot } from './actions'
import { db, LOCAL_USER, newId } from './db'
import { deletePhotos } from './photos'

export const PHOTO_QUEST = 'int-photo'
const PHOTO_QUEST_ID = 'quest-photo-of-the-day'

/**
 * Keeps the "Photo of the day" daily in step with the Life log switch: added
 * (once) for every player while it's on, paused while it's off. Archiving the
 * quest yourself is respected: it's only ever added if it never existed.
 */
export async function ensureMemoryQuest(): Promise<void> {
  const player = await db.players.get(LOCAL_USER)
  if (!player) return
  const on = featureOn(player, 'memories')
  const quest = await db.quests.where('userId').equals(LOCAL_USER).filter(q => q.templateId === PHOTO_QUEST).first()
  if (!quest) {
    if (!on) return
    const t = DAILY_TEMPLATES.find(t => t.id === PHOTO_QUEST)!
    const now = Date.now()
    await db.quests.put({
      // A fixed id, so two devices that both add it before syncing agree on one quest.
      id: PHOTO_QUEST_ID,
      userId: LOCAL_USER,
      kind: 'daily',
      stat: photoQuestStat(player.stats),
      title: t.title,
      description: t.description,
      minVersion: t.minVersion,
      active: true,
      templateId: PHOTO_QUEST,
      createdAt: now,
      updatedAt: now,
    })
    await db.players.update(LOCAL_USER, { memoryQuestPaused: false })
    return
  }
  // Switching the feature off pauses the quest; switching it back on resumes it,
  // but never brings back a quest you archived yourself.
  if (!on && quest.active) {
    await db.quests.update(quest.id, { active: false, updatedAt: Date.now() })
    await db.players.update(LOCAL_USER, { memoryQuestPaused: true })
  } else if (on && !quest.active && player.memoryQuestPaused) {
    await db.quests.update(quest.id, { active: true, updatedAt: Date.now() })
    await db.players.update(LOCAL_USER, { memoryQuestPaused: false })
  }
}

/** Clears, upgrades or un-clears today's photo quest to match today's entries. */
async function refreshPhotoQuest(day: string): Promise<void> {
  const { summary, quests } = await snapshot()
  if (day !== summary.today) return
  const quest = quests.find(q => q.active && q.kind === 'daily' && q.templateId === PHOTO_QUEST)
  if (!quest) return
  const entries = await db.memories.where('day').equals(day).filter(m => m.userId === LOCAL_USER).toArray()
  const version = photoQuestVersion(entries)
  const done = summary.todayDone.get(quest.id)
  if (done?.version === version) return
  if (done && (version === null || (done.version === 'full' && version === 'min'))) {
    await db.completions.delete(done.id)
    emit({ type: 'quest.undone', questId: quest.id, questTitle: quest.title })
    if (version === null) return
  } else if (done) {
    await db.completions.delete(done.id)
  }
  if (version) await completeQuest(quest, version)
}

export interface Position {
  lat: number
  lon: number
  accuracy: number
}

/** Where you are now, or null if location is off, refused or too slow. */
export function locate(timeout = 10_000, maxAgeMs = 5_000): Promise<Position | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null)
  return new Promise(resolve => {
    navigator.geolocation.getCurrentPosition(
      p => resolve({ lat: p.coords.latitude, lon: p.coords.longitude, accuracy: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout, maximumAge: maxAgeMs },
    )
  })
}

/** True if this site already has location permission (so checking won't pop up a prompt). */
export async function locationAllowed(): Promise<boolean> {
  try {
    return (await navigator.permissions.query({ name: 'geolocation' })).state === 'granted'
  } catch {
    return false
  }
}

/** Asks OpenStreetMap what's at a position. Sent only when you save an entry at a new spot. */
async function lookup(pos: Position): Promise<ReturnType<typeof placeFromLookup> | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat=${pos.lat.toFixed(6)}&lon=${pos.lon.toFixed(6)}`
    const res = await fetch(url, { headers: { 'accept-language': navigator.language || 'en' } })
    if (!res.ok) return null
    return placeFromLookup(await res.json())
  } catch {
    return null
  }
}

/** The known place at a position, or a new one named by OpenStreetMap. */
export async function placeAt(pos: Position): Promise<Place> {
  const places = await db.places.where('userId').equals(LOCAL_USER).toArray()
  const near = nearestPlace(places, pos)
  if (near) return near
  const found = await lookup(pos)
  const now = Date.now()
  const place: Place = {
    id: newId(),
    userId: LOCAL_USER,
    name: found?.name ?? `Place at ${pos.lat.toFixed(4)}, ${pos.lon.toFixed(4)}`,
    custom: false,
    lat: pos.lat,
    lon: pos.lon,
    city: found?.city ?? '',
    country: found?.country ?? '',
    countryCode: found?.countryCode ?? '',
    createdAt: now,
    updatedAt: now,
  }
  await db.places.add(place)
  return place
}

/** Is a position somewhere you haven't logged before? */
export async function isNewArea(pos: Position): Promise<boolean> {
  const places = await db.places.where('userId').equals(LOCAL_USER).toArray()
  return !nearestPlace(places, pos)
}

export async function addMemory(input: { note: string; photos: MemoryPhoto[]; placeId: string | null; at?: number }): Promise<Memory> {
  const player = await db.players.get(LOCAL_USER)
  const had = new Set((await snapshot()).summary.badges.map(b => b.id))
  const now = Date.now()
  const at = input.at ?? now
  const memory: Memory = {
    id: newId(),
    userId: LOCAL_USER,
    day: dayKey(new Date(at), player?.settings.resetHour ?? 4),
    at,
    note: input.note.trim(),
    photos: input.photos,
    placeId: input.placeId,
    createdAt: now,
    updatedAt: now,
  }
  await db.memories.add(memory)
  emit({ type: 'memory.added', photos: memory.photos.length })
  // New travel titles (they pay XP, so announce them even if no quest cleared).
  for (const b of (await snapshot()).summary.badges) {
    if (TRAVEL_IDS.has(b.id) && !had.has(b.id)) emit({ type: 'badge.earned', title: b.title, description: `${b.description} · +${TRAVEL_XP} XP` })
  }
  await refreshPhotoQuest(memory.day)
  return memory
}

export async function updateMemory(id: string, patch: Partial<Pick<Memory, 'note' | 'photos' | 'placeId'>>): Promise<void> {
  const before = await db.memories.get(id)
  if (!before) return
  const removed = patch.photos ? before.photos.filter(p => !patch.photos!.some(q => q.id === p.id)).map(p => p.id) : []
  await db.memories.update(id, { ...patch, ...(patch.note !== undefined ? { note: patch.note.trim() } : {}), updatedAt: Date.now() })
  if (removed.length) await deletePhotos(removed)
  await refreshPhotoQuest(before.day)
}

/** Deletes an entry and its photos (here and in the cloud). */
export async function deleteMemory(id: string): Promise<void> {
  const m = await db.memories.get(id)
  if (!m) return
  await db.memories.delete(id)
  await deletePhotos(m.photos.map(p => p.id))
  await refreshPhotoQuest(m.day)
}

export async function renamePlace(id: string, name: string): Promise<void> {
  const clean = name.trim().slice(0, 60)
  if (!clean) return
  await db.places.update(id, { name: clean, custom: true, updatedAt: Date.now() })
}

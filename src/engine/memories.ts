// The Life log: notes, photos and places, one page per day. Pure rules here;
// photos themselves live in the cloud and a local cache (src/db/photos.ts).

import type { Memory, Place, StatKey } from './types'

/** Saves within this distance of a known place count as that place. */
export const SAME_PLACE_METERS = 150

/** Great-circle distance in metres. */
export function distanceMeters(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const R = 6_371_000
  const rad = (d: number) => (d * Math.PI) / 180
  const dLat = rad(b.lat - a.lat)
  const dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** The closest known place within SAME_PLACE_METERS, if any. */
export function nearestPlace(places: Place[], at: { lat: number; lon: number }): Place | null {
  let best: Place | null = null
  let bestD = SAME_PLACE_METERS
  for (const p of places) {
    const d = distanceMeters(p, at)
    if (d <= bestD) {
      best = p
      bestD = d
    }
  }
  return best
}

/** How a day's entries clear "Photo of the day": a photo is the full quest, a note alone the minimum. */
export function photoQuestVersion(entries: Pick<Memory, 'note' | 'photos'>[]): 'full' | 'min' | null {
  if (entries.some(e => e.photos.length > 0)) return 'full'
  if (entries.some(e => e.note.trim().length > 0)) return 'min'
  return null
}

/** The stat the photo quest trains: INT, or the nearest fit the player chose. */
export function photoQuestStat(stats: StatKey[]): StatKey {
  return (['INT', 'CHA', 'AGI'] as StatKey[]).find(s => stats.includes(s)) ?? stats[0]
}

export interface Travel {
  places: number
  cities: number
  countries: number
}

/** Distinct places, cities and countries that have at least one memory. */
export function travelCounts(memories: Memory[], places: Place[]): Travel {
  const used = new Set(memories.map(m => m.placeId).filter(Boolean))
  const visited = places.filter(p => used.has(p.id))
  return {
    places: visited.length,
    cities: new Set(visited.filter(p => p.city).map(p => `${p.countryCode}:${p.city.toLowerCase()}`)).size,
    countries: new Set(visited.map(p => p.countryCode).filter(Boolean)).size,
  }
}

/** The day's photo of the day: the first photo of the day's first entry with one. */
export function photoOfDay(entries: Memory[]): { memory: Memory; photoId: string } | null {
  const sorted = [...entries].sort((a, b) => a.at - b.at)
  for (const m of sorted) if (m.photos.length) return { memory: m, photoId: m.photos[0].id }
  return null
}

export interface PlaceVisits {
  place: Place
  visits: number
  /** Distinct days with a memory there. */
  days: number
  lastDay: string
  photoIds: string[]
}

/** Every place with a memory, most visited first. */
export function placeVisits(memories: Memory[], places: Place[]): PlaceVisits[] {
  const out = new Map<string, PlaceVisits & { daySet: Set<string> }>()
  const byId = new Map(places.map(p => [p.id, p]))
  for (const m of [...memories].sort((a, b) => a.at - b.at)) {
    const place = m.placeId ? byId.get(m.placeId) : undefined
    if (!place) continue
    const v = out.get(place.id) ?? { place, visits: 0, days: 0, lastDay: m.day, photoIds: [], daySet: new Set<string>() }
    v.visits++
    v.daySet.add(m.day)
    v.days = v.daySet.size
    v.lastDay = m.day
    v.photoIds.push(...m.photos.map(p => p.id))
    out.set(place.id, v)
  }
  return [...out.values()].map(v => ({ place: v.place, visits: v.visits, days: v.days, lastDay: v.lastDay, photoIds: v.photoIds })).sort((a, b) => b.visits - a.visits || b.lastDay.localeCompare(a.lastDay))
}

/** Memories whose note or place matches every word of the query, newest first. */
export function searchMemories(memories: Memory[], places: Place[], query: string): Memory[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []
  const byId = new Map(places.map(p => [p.id, p]))
  return memories
    .filter(m => {
      const p = m.placeId ? byId.get(m.placeId) : undefined
      const text = `${m.note} ${p ? `${p.name} ${p.city} ${p.country}` : ''} ${m.day}`.toLowerCase()
      return words.every(w => text.includes(w))
    })
    .sort((a, b) => b.at - a.at)
}

/** A readable name from an OpenStreetMap reverse-geocode answer. */
export function placeFromLookup(data: {
  name?: string
  display_name?: string
  address?: Record<string, string | undefined>
}): { name: string; city: string; country: string; countryCode: string } {
  const a = data.address ?? {}
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.suburb ?? a.county ?? ''
  const street = a.road ? `${a.house_number ? `${a.house_number} ` : ''}${a.road}` : ''
  const local = a.neighbourhood ?? a.suburb ?? a.quarter ?? ''
  const name = data.name || (street && city ? `${street}, ${city}` : street) || local || city || data.display_name?.split(',')[0] || 'Unnamed place'
  return { name, city, country: a.country ?? '', countryCode: (a.country_code ?? '').toLowerCase() }
}

import { describe, expect, it } from 'vitest'
import {
  TRAVEL_XP,
  distanceMeters,
  nearestPlace,
  photoOfDay,
  photoQuestStat,
  photoQuestVersion,
  placeFromLookup,
  placeVisits,
  searchMemories,
  summarize,
  travelCounts,
  type Memory,
  type Place,
  type Player,
} from './index'

const place = (id: string, lat: number, lon: number, extra: Partial<Place> = {}): Place => ({
  id, userId: 'local', name: id, custom: false, lat, lon, city: 'Sydney', country: 'Australia', countryCode: 'au', createdAt: 0, updatedAt: 0, ...extra,
})
const memory = (id: string, day: string, extra: Partial<Memory> = {}): Memory => ({
  id, userId: 'local', day, at: new Date(day).getTime(), note: '', photos: [], placeId: null, createdAt: 0, updatedAt: 0, ...extra,
})
const photo = (id: string) => ({ id, width: 10, height: 10, bytes: 100 })

describe('places', () => {
  it('measures distance and matches a nearby known place', () => {
    // About 111 m per 0.001 degree of latitude.
    expect(Math.round(distanceMeters({ lat: 0, lon: 0 }, { lat: 0.001, lon: 0 }))).toBe(111)
    const home = place('home', -33.8688, 151.2093)
    expect(nearestPlace([home], { lat: -33.8693, lon: 151.2093 })?.id).toBe('home')
    expect(nearestPlace([home], { lat: -33.8788, lon: 151.2093 })).toBeNull()
  })

  it('names places from an OpenStreetMap answer', () => {
    expect(placeFromLookup({ name: 'Bondi Beach', address: { suburb: 'Bondi', city: 'Sydney', country: 'Australia', country_code: 'AU' } })).toEqual({
      name: 'Bondi Beach', city: 'Sydney', country: 'Australia', countryCode: 'au',
    })
    expect(placeFromLookup({ name: '', address: { road: 'King St', house_number: '12', town: 'Newtown' } }).name).toBe('12 King St, Newtown')
    expect(placeFromLookup({}).name).toBe('Unnamed place')
  })
})

describe('photo of the day quest', () => {
  it('is full with a photo, minimum with only a note', () => {
    expect(photoQuestVersion([])).toBeNull()
    expect(photoQuestVersion([{ note: '  ', photos: [] }])).toBeNull()
    expect(photoQuestVersion([{ note: 'Lunch with Sam', photos: [] }])).toBe('min')
    expect(photoQuestVersion([{ note: '', photos: [photo('p1')] }])).toBe('full')
  })

  it('trains INT, or the nearest stat the player chose', () => {
    expect(photoQuestStat(['STR', 'INT'])).toBe('INT')
    expect(photoQuestStat(['STR', 'CHA'])).toBe('CHA')
    expect(photoQuestStat(['STR', 'VIT'])).toBe('STR')
  })

  it("picks the day's first photo", () => {
    const later = memory('b', '2026-10-01', { at: 2, photos: [photo('p2')] })
    const earlier = memory('a', '2026-10-01', { at: 1, photos: [photo('p1')] })
    expect(photoOfDay([later, earlier])?.photoId).toBe('p1')
    expect(photoOfDay([memory('c', '2026-10-01')])).toBeNull()
  })
})

describe('travel', () => {
  const places = [place('a', 0, 0), place('b', 1, 1, { city: 'Melbourne' }), place('c', 2, 2, { city: 'Tokyo', country: 'Japan', countryCode: 'jp' }), place('unused', 3, 3)]
  const memories = [memory('1', '2026-10-01', { placeId: 'a' }), memory('2', '2026-10-02', { placeId: 'a' }), memory('3', '2026-10-02', { placeId: 'b', photos: [photo('x')] }), memory('4', '2026-10-05', { placeId: 'c' })]

  it('counts places, cities and countries with memories', () => {
    expect(travelCounts(memories, places)).toEqual({ places: 3, cities: 3, countries: 2 })
  })

  it('lists places by visits', () => {
    const v = placeVisits(memories, places)
    expect(v.map(p => [p.place.id, p.visits, p.days])).toEqual([['a', 2, 2], ['c', 1, 1], ['b', 1, 1]])
    expect(v.find(p => p.place.id === 'b')!.photoIds).toEqual(['x'])
  })

  it('pays XP for travel titles through the summary', () => {
    const player: Player = {
      id: 'p', userId: 'local', name: 'T', stats: ['INT'], fitness: null,
      settings: { monthlyBudget: 150, savingsGoal: { type: 'off', amount: 0 }, difficulty: 'normal', resetHour: 4, wakeTime: '07:00', bedTime: '23:00' },
      createdAt: new Date(2026, 9, 1, 12).getTime(), updatedAt: 0,
    }
    const now = new Date(2026, 9, 6, 12)
    const s = summarize(player, [], [], now, { memories, places })
    expect(s.travel.countries).toBe(2)
    expect(s.badges.some(b => b.id === 'globetrotter')).toBe(true)
    expect(s.totalXp).toBe(TRAVEL_XP)
    expect(summarize({ ...player, features: { memories: false } }, [], [], now, { memories, places }).totalXp).toBe(0)
  })
})

describe('search', () => {
  it('matches every word against notes and places', () => {
    const places = [place('bondi', 0, 0, { name: 'Bondi Beach' })]
    const memories = [memory('1', '2026-10-01', { note: 'Swim with Sam', placeId: 'bondi' }), memory('2', '2026-10-02', { note: 'Gym' })]
    expect(searchMemories(memories, places, 'sam bondi').map(m => m.id)).toEqual(['1'])
    expect(searchMemories(memories, places, 'gym').map(m => m.id)).toEqual(['2'])
    expect(searchMemories(memories, places, '')).toEqual([])
  })
})

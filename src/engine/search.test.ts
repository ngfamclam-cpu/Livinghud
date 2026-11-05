import { describe, expect, it } from 'vitest'
import { buildSearchDocs, searchDocs, snippetOf, type JournalEntry, type Memory, type Person, type Contact, type Transaction, type DayGoals } from './index'

const journal = (day: string, wentWell: string, answers: { question: string; answer: string }[] = []): JournalEntry => ({
  id: `j-${day}`, userId: 'local', day, wentWell, drained: '', adjust: '', mood: 4, energy: 3,
  answers: answers.map((a, i) => ({ id: `a${i}`, theme: 'brainstorm', ...a })), createdAt: new Date(`${day}T20:00:00`).getTime(), updatedAt: 0,
})

const data = {
  journal: [
    journal('2026-11-03', 'Hit a new pull-up record'),
    journal('2026-11-04', 'Quiet day', [{ question: 'What would make tomorrow easy?', answer: 'Meal prep on Sunday and an early night' }]),
  ],
  memories: [{ id: 'm1', userId: 'local', day: '2026-11-02', at: 1, note: 'Ramen with Jae after the rave', photos: [], placeId: 'p1', createdAt: 1, updatedAt: 1 } as Memory],
  places: [{ id: 'p1', userId: 'local', name: 'Ichiran', custom: false, lat: 0, lon: 0, city: 'Toronto', country: 'Canada', countryCode: 'CA', createdAt: 1, updatedAt: 1 }],
  people: [{ id: 'jae', userId: 'local', name: 'Jae', circle: 'friend', bondDays: 21, note: 'Loves techno', active: true, createdAt: 1, updatedAt: 1 } as Person],
  contacts: [{ id: 'c1', userId: 'local', personId: 'jae', kind: 'hangout', note: 'Climbing gym', day: '2026-11-01', xp: 30, createdAt: 2 } as Contact],
  transactions: [{ id: 't1', userId: 'local', day: '2026-11-02', kind: 'expense', amount: 18.5, category: 'wants', note: 'Ramen', billId: null, createdAt: 3, updatedAt: 3 } as Transaction],
  goals: [{ id: 'g1', userId: 'local', day: '2026-11-05', plannedOn: '2026-11-04', items: [{ text: 'Meal prep', done: true, doneAt: 1 }], createdAt: 4, updatedAt: 4 } as DayGoals],
}

describe('search', () => {
  const docs = buildSearchDocs(data)

  it('finds reflection answers, notes, places, people, money and goals', () => {
    expect(searchDocs(docs, 'pull-up').map(h => h.doc.kind)).toEqual(['journal'])
    expect(searchDocs(docs, 'meal prep').map(h => h.doc.kind).sort()).toEqual(['goal', 'journal'])
    expect(searchDocs(docs, 'ramen').map(h => h.doc.kind).sort()).toEqual(['memory', 'money'])
    expect(searchDocs(docs, 'toronto').map(h => h.doc.kind).sort()).toEqual(['memory', 'place'])
    expect(searchDocs(docs, 'jae').map(h => h.doc.kind).sort()).toEqual(['contact', 'memory', 'person'])
    expect(searchDocs(docs, 'climbing')[0].doc.title).toBe('Hangout with Jae')
  })

  it('needs every word, ignores case and accents, and matches dates', () => {
    expect(searchDocs(docs, 'RAMEN rave')).toHaveLength(1)
    expect(searchDocs(docs, 'ramen nothing')).toHaveLength(0)
    expect(searchDocs(docs, 'ichirán')).toHaveLength(2)
    expect(searchDocs(docs, 'november journal')).toHaveLength(2)
    expect(searchDocs(docs, 'tuesday').some(h => h.doc.day === '2026-11-03')).toBe(true)
    expect(searchDocs(docs, '   ')).toEqual([])
  })

  it('filters by kind and ranks title matches first', () => {
    expect(searchDocs(docs, 'jae', { kinds: new Set(['person']) }).map(h => h.doc.kind)).toEqual(['person'])
    expect(searchDocs(docs, 'jae')[0].doc.kind).toBe('person')
  })

  it('cuts a snippet around the match', () => {
    const long = `${'filler '.repeat(40)}the needle is here ${'more '.repeat(40)}`
    const s = snippetOf(long, ['needle'])
    expect(s).toContain('needle')
    expect(s.startsWith('…')).toBe(true)
    expect(s.length).toBeLessThan(150)
  })
})

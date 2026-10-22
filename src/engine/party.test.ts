import { describe, expect, it } from 'vitest'
import { featureOn, partyBonds, type Contact, type Person } from './index'

const person = (id: string, bondDays = 21, created = '2026-10-01'): Person => ({
  id, userId: 'local', name: id, circle: 'friend', bondDays, note: '', active: true, createdAt: new Date(`${created}T12:00:00`).getTime(), updatedAt: 0,
})
const contact = (personId: string, day: string, kind: Contact['kind'] = 'message'): Contact => ({
  id: `${personId}-${day}-${kind}`, userId: 'local', personId, kind, note: '', day, xp: 5, createdAt: 0,
})
const firstDay = (at: number) => new Date(at).toISOString().slice(0, 10)

describe('party', () => {
  it('counts days since the last contact and warns after the bond window', () => {
    const bonds = partyBonds([person('sam'), person('alex')], [contact('sam', '2026-10-20'), contact('alex', '2026-09-25')], '2026-10-22', firstDay)
    expect(bonds.map(b => [b.person.id, b.daysSince, b.weakening])).toEqual([['alex', 27, true], ['sam', 2, false]])
  })

  it('counts from when someone was added if there was never contact', () => {
    const [b] = partyBonds([person('new', 21, '2026-10-01')], [], '2026-10-22', firstDay)
    expect(b.lastDay).toBe(null)
    expect(b.daysSince).toBe(21)
    expect(b.weakening).toBe(true)
  })

  it('uses each person’s own window and counts hangouts', () => {
    const fam = person('mum', 7)
    const [b] = partyBonds([fam], [contact('mum', '2026-10-14', 'hangout'), contact('mum', '2026-10-10', 'hangout')], '2026-10-22', firstDay)
    expect(b.weakening).toBe(true)
    expect(b.hangouts).toBe(2)
  })

  it('leaves removed people out', () => {
    expect(partyBonds([{ ...person('gone'), active: false }], [], '2026-10-22', firstDay)).toEqual([])
  })

  it('has every feature on unless switched off', () => {
    expect(featureOn({}, 'party')).toBe(true)
    expect(featureOn({ features: { party: false } }, 'party')).toBe(false)
  })
})

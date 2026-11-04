import { describe, expect, it } from 'vitest'
import { QUESTION_BANK, answeredCount, dailyQuestions, journalVersion, swapQuestion, themeEngagement, type DayGoals, type JournalEntry } from './index'

const entry = (day: string, extra: Partial<JournalEntry> = {}): JournalEntry => ({
  id: day, userId: 'local', day, wentWell: '', drained: '', adjust: '', mood: 3, energy: 3, createdAt: 0, updatedAt: 0, ...extra,
})

describe('daily questions', () => {
  it('are stable for a day and change between days', () => {
    const ctx = { day: '2026-11-04', seed: 'p1', entries: [] }
    expect(dailyQuestions(ctx).map(q => q.id)).toEqual(dailyQuestions(ctx).map(q => q.id))
    expect(dailyQuestions({ ...ctx, day: '2026-11-05' }).map(q => q.id)).not.toEqual(dailyQuestions(ctx).map(q => q.id))
  })

  it('always include a brainstorm and cover different themes', () => {
    const qs = dailyQuestions({ day: '2026-11-04', seed: 'p1', entries: [] })
    expect(qs.some(q => q.theme === 'ideas')).toBe(true)
    expect(new Set(qs.map(q => q.theme)).size).toBe(qs.length)
  })

  it('follow up on yesterday, a recurring drain and a slipping goal', () => {
    const entries = [
      entry('2026-11-03', { adjust: 'Go to bed before midnight', drained: 'meetings all day' }),
      entry('2026-11-01', { drained: 'meetings again' }),
    ]
    const goals: DayGoals[] = ['2026-11-01', '2026-11-02'].map(day => ({
      id: day, userId: 'local', day, plannedOn: day, createdAt: 0, updatedAt: 0, items: [{ text: 'Send the invoice', done: false, doneAt: null }],
    }))
    const qs = dailyQuestions({ day: '2026-11-04', seed: 'p1', entries, goals })
    expect(qs[0].id).toBe('fu-adjust')
    expect(qs[0].text).toContain('Go to bed before midnight')
    expect(qs.find(q => q.id === 'pat-drain')?.text).toContain('meetings')
    expect(qs.find(q => q.id === 'pat-goal')?.text).toContain('Send the invoice')
  })

  it('learn from what you answer and skip', () => {
    const answered = (id: string) => {
      const q = QUESTION_BANK.find(x => x.id === id)!
      return { id, theme: q.theme, question: q.text, answer: 'A long, thoughtful answer about this that goes on for a while and keeps going.' }
    }
    const entries = [entry('2026-11-02', { answers: [answered('fun-best'), answered('fun-new')], skipped: ['money-worth', 'money-cut'] })]
    const e = themeEngagement(entries, '2026-11-04')
    expect(e.get('fun')).toMatchObject({ asked: 2, answered: 2 })
    expect(e.get('money')).toMatchObject({ asked: 2, answered: 0 })
    // Over many days, fun comes up more often than money.
    let fun = 0
    let money = 0
    for (let d = 10; d < 40; d++) {
      const qs = dailyQuestions({ day: `2026-12-${String((d % 28) + 1).padStart(2, '0')}`, seed: `s${d}`, entries: entries.map(x => ({ ...x, day: '2026-11-30' })) })
      fun += qs.filter(q => q.theme === 'fun').length
      money += qs.filter(q => q.theme === 'money').length
    }
    expect(fun).toBeGreaterThan(money)
  })

  it('swaps in a question not already shown', () => {
    const ctx = { day: '2026-11-04', seed: 'p1', entries: [] }
    const shown = dailyQuestions(ctx).map(q => q.id)
    const next = swapQuestion(ctx, shown, 1)
    expect(next && shown.includes(next.id)).toBe(false)
  })
})

describe('journal credit', () => {
  it('needs any three answers for the full quest', () => {
    const one = { wentWell: 'Gym', drained: '', adjust: '' }
    expect(journalVersion(one)).toBe('min')
    expect(journalVersion({ ...one, answers: [{ answer: 'x' }, { answer: 'y' }] })).toBe('full')
    expect(answeredCount({ wentWell: '', drained: '', adjust: '', answers: [{ answer: ' ' }] })).toBe(0)
  })
})

import { describe, expect, it } from 'vitest'
import type { CalendarEvent } from '../event'
import { analyzeEvent, computeSleepAssociation, groupEventsByTitle, normalizeEventTitle } from '../eventAnalysis'

function event(id: string, title: string, day: number, hour: number, minutes = 60): CalendarEvent {
  const startTime = new Date(2026, 6, 1 + day, hour).getTime()
  return {
    id,
    title,
    startTime,
    endTime: startTime + minutes * 60_000,
    color: 'sky',
    categoryId: 'sky',
    createdAt: startTime,
    updatedAt: startTime,
  }
}

describe('event analysis', () => {
  it('normalizes only whitespace and case', () => {
    expect(normalizeEventTitle('  Morning   READ  ')).toBe('morning read')
    expect(normalizeEventTitle('晨间阅读')).not.toBe(normalizeEventTitle('阅读'))
  })

  it('groups exact normalized titles and chooses the most common display variant', () => {
    const groups = groupEventsByTitle([
      event('1', 'Morning Read', 0, 8),
      event('2', ' morning read ', 1, 9),
      event('3', 'Reading', 2, 8),
    ])
    expect(groups).toHaveLength(2)
    expect(groups.find((group) => group.key === 'morning read')?.count).toBe(2)
  })

  it('computes event duration and calendar distributions', () => {
    const analysis = analyzeEvent([
      event('1', '晨间阅读', 0, 8, 30),
      event('2', '晨间阅读', 1, 8, 60),
      event('3', '晨间阅读', 2, 9, 120),
    ], '晨间阅读')
    expect(analysis?.count).toBe(3)
    expect(analysis?.totalMinutes).toBe(210)
    expect(analysis?.medianMinutes).toBe(60)
    expect(analysis?.hourly[8].count).toBe(2)
    expect(analysis?.durations.map((bucket) => bucket.count)).toEqual([0, 1, 1, 1])
  })

  it('reports insufficient sleep samples before producing a relationship', () => {
    const result = computeSleepAssociation([event('1', '晨间阅读', 0, 8)], '晨间阅读')
    expect(result.status).toBe('insufficient')
  })
})

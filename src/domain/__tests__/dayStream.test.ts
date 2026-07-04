import { describe, it, expect } from 'vitest'
import { fmtStreamTime, fmtStreamDuration, eventBarFill, buildDayStreamRows, isAllDayEvent } from '../dayStream'
import type { CalendarEvent, EventColor } from '../event'

function makeEvent(overrides: Partial<CalendarEvent> & { id?: string }): CalendarEvent {
  const now = Date.now()
  return {
    id: overrides.id ?? 'e1',
    title: overrides.title ?? '某事件',
    startTime: overrides.startTime ?? now,
    endTime: overrides.endTime ?? now + 3_600_000,
    color: overrides.color ?? 'accent',
    categoryId: overrides.categoryId ?? 'accent',
    description: overrides.description ?? '',
    createdAt: overrides.createdAt ?? now,
    updatedAt: overrides.updatedAt ?? now,
    ...overrides,
  }
}

describe('fmtStreamTime', () => {
  it('formats midnight as 00:00', () => {
    const d = new Date(2026, 3, 20, 0, 0, 0)
    expect(fmtStreamTime(d.getTime())).toBe('00:00')
  })

  it('formats noon as 12:00', () => {
    const d = new Date(2026, 3, 20, 12, 0, 0)
    expect(fmtStreamTime(d.getTime())).toBe('12:00')
  })

  it('pads single-digit hours and minutes', () => {
    const d = new Date(2026, 3, 20, 7, 5, 0)
    expect(fmtStreamTime(d.getTime())).toBe('07:05')
  })

  it('formats end of day', () => {
    const d = new Date(2026, 3, 20, 23, 59, 0)
    expect(fmtStreamTime(d.getTime())).toBe('23:59')
  })
})

describe('fmtStreamDuration', () => {
  it('formats minutes only', () => {
    expect(fmtStreamDuration(30 * 60_000)).toBe('30m')
  })

  it('formats 1 hour', () => {
    expect(fmtStreamDuration(3_600_000)).toBe('1h')
  })

  it('formats 2.5 hours', () => {
    expect(fmtStreamDuration(2.5 * 3_600_000)).toBe('2h30m')
  })

  it('formats 8 hours', () => {
    expect(fmtStreamDuration(8 * 3_600_000)).toBe('8h')
  })

  it('rounds fractional minutes', () => {
    // 15 min 200ms → 15m (rounded from 15.003)
    expect(fmtStreamDuration(15 * 60_000 + 200)).toBe('15m')
  })

  it('handles zero duration', () => {
    expect(fmtStreamDuration(0)).toBe('0m')
  })
})

describe('eventBarFill', () => {
  const colors: EventColor[] = ['accent', 'sage', 'sand', 'sky', 'rose']

  for (const color of colors) {
    it(`returns --event-${color}-fill for '${color}'`, () => {
      expect(eventBarFill(color)).toBe(`var(--event-${color}-fill)`)
    })
  }

  it('returns --cat-sleep for stone', () => {
    expect(eventBarFill('stone')).toBe('var(--cat-sleep)')
  })
})

describe('buildDayStreamRows', () => {
  it('returns empty array for empty input', () => {
    expect(buildDayStreamRows([])).toEqual([])
  })

  it('transforms a single event into a DayStreamRow', () => {
    const d = new Date(2026, 3, 20, 9, 0, 0)
    const event = makeEvent({
      id: 'e1',
      title: '晨读',
      startTime: d.getTime(),
      endTime: d.getTime() + 50 * 60_000,
      color: 'accent',
    })
    const rows = buildDayStreamRows([event])

    expect(rows).toHaveLength(1)
    const row = rows[0]
    expect(row.id).toBe('e1')
    expect(row.title).toBe('晨读')
    expect(row.startStr).toBe('09:00')
    expect(row.endStr).toBe('09:50')
    expect(row.durationStr).toBe('50m')
    expect(row.barColor).toBe('var(--event-accent-fill)')
    expect(row.sortKey).toBe(d.getTime())
    expect(row.calendarEvent).toBe(event)
  })

  it('sorts events by startTime ascending', () => {
    const base = new Date(2026, 3, 20, 0, 0, 0).getTime()
    const e1 = makeEvent({ id: 'e1', startTime: base + 3 * 3_600_000, endTime: base + 4 * 3_600_000 })
    const e2 = makeEvent({ id: 'e2', startTime: base + 1 * 3_600_000, endTime: base + 2 * 3_600_000 })
    const e3 = makeEvent({ id: 'e3', startTime: base + 2 * 3_600_000, endTime: base + 3 * 3_600_000 })

    const rows = buildDayStreamRows([e1, e2, e3])
    expect(rows.map((r) => r.id)).toEqual(['e2', 'e3', 'e1'])
  })

  it('preserves the original calendarEvent reference', () => {
    const event = makeEvent({ id: 'e-ref' })
    const [row] = buildDayStreamRows([event])
    expect(row.calendarEvent).toBe(event)
    expect(row.calendarEvent.id).toBe('e-ref')
  })

  it('handles stone color events with --cat-sleep', () => {
    const d = new Date(2026, 3, 20, 23, 0, 0)
    const event = makeEvent({
      color: 'stone',
      startTime: d.getTime(),
      endTime: d.getTime() + 8 * 3_600_000,
    })
    const [row] = buildDayStreamRows([event])
    expect(row.barColor).toBe('var(--cat-sleep)')
  })

  it('renders cross-day clipped event with clipped time', () => {
    // Simulate a sleep event clipped to a day boundary by bucketEventsByLocalDay
    const dayStart = new Date(2026, 3, 20, 0, 0, 0).getTime()
    const event = makeEvent({
      id: 'sleep-clipped',
      title: '睡眠',
      startTime: dayStart,
      endTime: dayStart + 7 * 3_600_000, // 07:00
      color: 'stone',
    })
    const [row] = buildDayStreamRows([event])
    expect(row.startStr).toBe('00:00')
    expect(row.endStr).toBe('07:00')
    expect(row.durationStr).toBe('7h')
    expect(row.barColor).toBe('var(--cat-sleep)')
  })

  it('handles empty title gracefully', () => {
    const event = makeEvent({ title: '' })
    const [row] = buildDayStreamRows([event])
    expect(row.title).toBe('')
  })

  it('defaults isAllDay to false when dayStart is omitted', () => {
    const dayStart = new Date(2026, 3, 20, 0, 0, 0).getTime()
    const event = makeEvent({ startTime: dayStart, endTime: dayStart + 86_400_000 })
    const [row] = buildDayStreamRows([event])
    expect(row.isAllDay).toBe(false)
  })

  it('marks isAllDay true when the clipped event spans the full day', () => {
    const dayStart = new Date(2026, 3, 20, 0, 0, 0).getTime()
    const event = makeEvent({ startTime: dayStart, endTime: dayStart + 86_400_000 })
    const [row] = buildDayStreamRows([event], dayStart)
    expect(row.isAllDay).toBe(true)
  })

  it('marks isAllDay false for a normal same-day event', () => {
    const dayStart = new Date(2026, 3, 20, 0, 0, 0).getTime()
    const event = makeEvent({ startTime: dayStart + 9 * 3_600_000, endTime: dayStart + 10 * 3_600_000 })
    const [row] = buildDayStreamRows([event], dayStart)
    expect(row.isAllDay).toBe(false)
  })

  it('marks isAllDay false for a cross-day event clipped to only part of the day', () => {
    const dayStart = new Date(2026, 3, 20, 0, 0, 0).getTime()
    const event = makeEvent({ startTime: dayStart, endTime: dayStart + 7 * 3_600_000 })
    const [row] = buildDayStreamRows([event], dayStart)
    expect(row.isAllDay).toBe(false)
  })
})

describe('isAllDayEvent', () => {
  const dayStart = new Date(2026, 3, 20, 0, 0, 0).getTime()

  it('is true when start/end exactly match the day boundaries', () => {
    const event = makeEvent({ startTime: dayStart, endTime: dayStart + 86_400_000 })
    expect(isAllDayEvent(event, dayStart)).toBe(true)
  })

  it('is false when start is after the day boundary', () => {
    const event = makeEvent({ startTime: dayStart + 1, endTime: dayStart + 86_400_000 })
    expect(isAllDayEvent(event, dayStart)).toBe(false)
  })

  it('is false when end is before the next day boundary', () => {
    const event = makeEvent({ startTime: dayStart, endTime: dayStart + 86_400_000 - 1 })
    expect(isAllDayEvent(event, dayStart)).toBe(false)
  })

  it('is false for a short same-day event', () => {
    const event = makeEvent({ startTime: dayStart + 8 * 3_600_000, endTime: dayStart + 9 * 3_600_000 })
    expect(isAllDayEvent(event, dayStart)).toBe(false)
  })
})

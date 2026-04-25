import { describe, it, expect } from 'vitest'
import { layoutDayEvents } from '../layout'
import type { CalendarEvent } from '../event'

// All tests use April 20 2026 (Monday) as the reference day.
const DAY = new Date(2026, 3, 20)

function ts(h: number, m = 0): number {
  return new Date(2026, 3, 20, h, m, 0, 0).getTime()
}

function makeEvent(id: string, startH: number, endH: number, startM = 0, endM = 0): CalendarEvent {
  return {
    id,
    title: id,
    startTime: ts(startH, startM),
    endTime:   ts(endH,   endM),
    color:     'accent',
    createdAt: 0,
    updatedAt: 0,
  }
}

// ── empty / single event ──────────────────────────────────

describe('empty input', () => {
  it('returns an empty array when no events are given', () => {
    expect(layoutDayEvents([], DAY)).toHaveLength(0)
  })
})

describe('single event', () => {
  it('assigns rowStart and rowEnd correctly for an 8:00-9:00 event', () => {
    const result = layoutDayEvents([makeEvent('a', 8, 9)], DAY)
    expect(result).toHaveLength(1)
    const { rowStart, rowEnd } = result[0]
    // slot 0 = 0:00-0:30 → rowStart 1; 8:00 = slot 16 → rowStart 17
    expect(rowStart).toBe(17)
    // 9:00 = slot 18 → rowEnd 19
    expect(rowEnd).toBe(19)
  })

  it('assigns columnIndex=0 and totalColumns=1 for a lone event', () => {
    const result = layoutDayEvents([makeEvent('a', 8, 9)], DAY)
    expect(result[0].columnIndex).toBe(0)
    expect(result[0].totalColumns).toBe(1)
  })

  it('guarantees at least 1 slot (rowEnd > rowStart) for a short event', () => {
    // 15-minute event
    const event: CalendarEvent = {
      id: 'short', title: 'short',
      startTime: ts(8, 0), endTime: ts(8, 15),
      color: 'accent', createdAt: 0, updatedAt: 0,
    }
    const result = layoutDayEvents([event], DAY)
    expect(result[0].rowEnd).toBeGreaterThan(result[0].rowStart)
  })
})

// ── non-overlapping events ────────────────────────────────

describe('non-overlapping events', () => {
  it('places two events in columnIndex=0 each with totalColumns=1', () => {
    const result = layoutDayEvents(
      [makeEvent('a', 8, 9), makeEvent('b', 10, 11)],
      DAY,
    )
    expect(result).toHaveLength(2)
    expect(result[0].columnIndex).toBe(0)
    expect(result[0].totalColumns).toBe(1)
    expect(result[1].columnIndex).toBe(0)
    expect(result[1].totalColumns).toBe(1)
  })

  it('events touching at a boundary do not count as overlapping', () => {
    // a ends at 9:00, b starts at 9:00 — half-open, no overlap
    const result = layoutDayEvents(
      [makeEvent('a', 8, 9), makeEvent('b', 9, 10)],
      DAY,
    )
    expect(result[0].columnIndex).toBe(0)
    expect(result[1].columnIndex).toBe(0)
    expect(result[0].totalColumns).toBe(1)
    expect(result[1].totalColumns).toBe(1)
  })
})

// ── overlapping events ────────────────────────────────────

describe('two overlapping events', () => {
  it('places them in columns 0 and 1 with totalColumns=2', () => {
    const result = layoutDayEvents(
      [makeEvent('a', 8, 10), makeEvent('b', 9, 11)],
      DAY,
    )
    const a = result.find((r) => r.event.id === 'a')!
    const b = result.find((r) => r.event.id === 'b')!
    expect(a.columnIndex).toBe(0)
    expect(b.columnIndex).toBe(1)
    expect(a.totalColumns).toBe(2)
    expect(b.totalColumns).toBe(2)
  })
})

describe('three overlapping events', () => {
  it('places them in columns 0, 1, 2 with totalColumns=3', () => {
    const result = layoutDayEvents(
      [makeEvent('a', 8, 11), makeEvent('b', 9, 11), makeEvent('c', 10, 11)],
      DAY,
    )
    const cols = result.map((r) => r.columnIndex).sort()
    expect(cols).toEqual([0, 1, 2])
    for (const r of result) expect(r.totalColumns).toBe(3)
  })
})

describe('partially overlapping chain (A-B overlap, B-C overlap, A-C do not)', () => {
  it('assigns independent totalColumns to A and C', () => {
    // A: 8-9, B: 8:30-9:30, C: 9-10
    // A overlaps B. B overlaps C. A and C do NOT overlap (A ends at 9, C starts at 9).
    const result = layoutDayEvents(
      [makeEvent('a', 8, 9), makeEvent('b', 8, 10, 30), makeEvent('c', 9, 10)],
      DAY,
    )
    const a = result.find((r) => r.event.id === 'a')!
    const b = result.find((r) => r.event.id === 'b')!
    const c = result.find((r) => r.event.id === 'c')!

    // A and B overlap → both have totalColumns=2
    expect(a.totalColumns).toBe(2)
    expect(b.totalColumns).toBe(2)
    // C only directly overlaps B → C gets totalColumns=2 (sharing B's column)
    // or totalColumns=1 if C reclaims A's now-free column.
    // The greedy algorithm places C in column 0 (reusing A's freed column).
    expect(c.columnIndex).toBe(0)
  })
})

// ── row calculation ───────────────────────────────────────

describe('row calculation', () => {
  it('midnight start: 0:00 → rowStart=1', () => {
    const result = layoutDayEvents([makeEvent('a', 0, 1)], DAY)
    expect(result[0].rowStart).toBe(1)
  })

  it('11:30 start → rowStart=24 (slot 23 + 1)', () => {
    // 11:30 = 690 minutes / 30 = 23 → rowStart 24
    const event: CalendarEvent = {
      id: 'x', title: 'x',
      startTime: ts(11, 30), endTime: ts(12, 30),
      color: 'accent', createdAt: 0, updatedAt: 0,
    }
    const result = layoutDayEvents([event], DAY)
    expect(result[0].rowStart).toBe(24)
  })

  it('event ending at 23:30 has rowEnd within grid bounds', () => {
    const result = layoutDayEvents([makeEvent('a', 22, 23, 0, 30)], DAY)
    expect(result[0].rowEnd).toBeLessThanOrEqual(49)
  })
})

// ── events outside the day are filtered out ───────────────

describe('day filtering', () => {
  it('excludes events completely outside the requested day', () => {
    const other: CalendarEvent = {
      id: 'other', title: 'other',
      startTime: new Date(2026, 3, 21, 8, 0).getTime(),
      endTime:   new Date(2026, 3, 21, 9, 0).getTime(),
      color: 'accent', createdAt: 0, updatedAt: 0,
    }
    expect(layoutDayEvents([other], DAY)).toHaveLength(0)
  })
})

// ── result order ──────────────────────────────────────────

describe('result ordering', () => {
  it('returns events sorted by startTime ascending', () => {
    const result = layoutDayEvents(
      [makeEvent('b', 10, 11), makeEvent('a', 8, 9)],
      DAY,
    )
    expect(result[0].event.id).toBe('a')
    expect(result[1].event.id).toBe('b')
  })
})

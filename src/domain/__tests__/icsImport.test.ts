import { describe, it, expect } from 'vitest'
import { parseIcs } from '../icsImport'

// ── Helpers ───────────────────────────────────────────────

/** Minimal .ics wrapping a VCALENDAR around one or more VEVENT blocks. */
function wrapVevents(vevents: string): string {
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Test//Test//EN',
    vevents,
    'END:VCALENDAR',
  ].join('\r\n')
}

function vevent(body: string): string {
  return `BEGIN:VEVENT\r\n${body}\r\nEND:VEVENT`
}

// ── parseIcs — error cases ────────────────────────────────

describe('parseIcs — error cases', () => {
  it('throws for empty string', () => {
    expect(() => parseIcs('')).toThrow()
  })

  it('throws for whitespace-only string', () => {
    expect(() => parseIcs('   \n  \n ')).toThrow()
  })

  it('throws for garbage text', () => {
    expect(() => parseIcs('this is not ics at all')).toThrow()
  })

  it('throws for missing VCALENDAR header', () => {
    expect(() => parseIcs('BEGIN:VEVENT\r\nEND:VEVENT')).toThrow()
  })
})

// ── parseIcs — happy path ─────────────────────────────────

describe('parseIcs — happy path', () => {
  it('parses a single normal UTC event', () => {
    const ics = wrapVevents(
      vevent([
        'UID:1@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
        'SUMMARY:Test Event',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].title).toBe('Test Event')
    expect(result.events[0].startTime).toBe(Date.UTC(2026, 3, 1, 10, 0, 0))
    expect(result.events[0].endTime).toBe(Date.UTC(2026, 3, 1, 11, 0, 0))
    expect(result.skippedAllDay).toBe(0)
    expect(result.skippedRecurring).toBe(0)
  })

  it('parses an event without SUMMARY — defaults to empty string', () => {
    const ics = wrapVevents(
      vevent([
        'UID:2@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].title).toBe('')
  })

  it('parses description and location when present', () => {
    const ics = wrapVevents(
      vevent([
        'UID:8@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
        'SUMMARY:With Details',
        'DESCRIPTION:Meeting notes here',
        'LOCATION:Room 42',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events[0].description).toBe('Meeting notes here')
    expect(result.events[0].location).toBe('Room 42')
  })

  it('omits description and location when absent', () => {
    const ics = wrapVevents(
      vevent([
        'UID:9@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
        'SUMMARY:Bare',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events[0].description).toBeUndefined()
    expect(result.events[0].location).toBeUndefined()
  })
})

// ── parseIcs — all-day skip ───────────────────────────────

describe('parseIcs — all-day events are skipped', () => {
  it('skips a VALUE=DATE all-day event', () => {
    // DTSTART;VALUE=DATE denotes an all-day event (no time component)
    const ics = wrapVevents(
      vevent([
        'UID:3@test',
        'DTSTART;VALUE=DATE:20260401',
        'DTEND;VALUE=DATE:20260402',
        'SUMMARY:All Day',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(0)
    expect(result.skippedAllDay).toBe(1)
    expect(result.skippedRecurring).toBe(0)
  })
})

// ── parseIcs — recurring skip ─────────────────────────────

describe('parseIcs — recurring events are skipped', () => {
  it('skips an event with RRULE', () => {
    const ics = wrapVevents(
      vevent([
        'UID:4@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
        'RRULE:FREQ=WEEKLY',
        'SUMMARY:Weekly Standup',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(0)
    expect(result.skippedAllDay).toBe(0)
    expect(result.skippedRecurring).toBe(1)
  })

  it('skips an event with RDATE', () => {
    const ics = wrapVevents(
      vevent([
        'UID:5@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
        'RDATE:20260402T100000Z',
        'SUMMARY:Has RDATE',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(0)
    expect(result.skippedRecurring).toBe(1)
  })

  it('skips an event with RECURRENCE-ID', () => {
    // A recurrence exception carries RECURRENCE-ID
    const ics = wrapVevents(
      vevent([
        'UID:6@test',
        'RECURRENCE-ID:20260401T100000Z',
        'DTSTART:20260402T100000Z',
        'DTEND:20260402T110000Z',
        'SUMMARY:Exception',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(0)
    expect(result.skippedRecurring).toBe(1)
  })
})

// ── parseIcs — missing DTEND ──────────────────────────────

describe('parseIcs — missing DTEND', () => {
  it('defaults endTime to startTime + 1 hour when DTEND is absent', () => {
    const ics = wrapVevents(
      vevent([
        'UID:7@test',
        'DTSTART:20260401T100000Z',
        'SUMMARY:No End',
      ].join('\r\n'))
    )
    const result = parseIcs(ics)
    expect(result.events).toHaveLength(1)
    expect(result.events[0].startTime).toBe(Date.UTC(2026, 3, 1, 10, 0, 0))
    expect(result.events[0].endTime).toBe(Date.UTC(2026, 3, 1, 11, 0, 0))
  })
})

// ── parseIcs — mixed events ───────────────────────────────

describe('parseIcs — mixed event types', () => {
  it('correctly counts all types in a mixed feed', () => {
    const events = [
      vevent([
        'UID:10@test',
        'DTSTART:20260401T100000Z',
        'DTEND:20260401T110000Z',
        'SUMMARY:Normal',
      ].join('\r\n')),
      vevent([
        'UID:11@test',
        'DTSTART;VALUE=DATE:20260401',
        'SUMMARY:All Day',
      ].join('\r\n')),
      vevent([
        'UID:12@test',
        'DTSTART:20260401T120000Z',
        'DTEND:20260401T130000Z',
        'RRULE:FREQ=DAILY',
        'SUMMARY:Daily',
      ].join('\r\n')),
      vevent([
        'UID:13@test',
        'DTSTART:20260402T090000Z',
        'DTEND:20260402T100000Z',
        'SUMMARY:Another Normal',
      ].join('\r\n')),
      vevent([
        'UID:14@test',
        'DTSTART:20260403T140000Z',
        'DTEND:20260403T150000Z',
        'RDATE:20260404T140000Z',
        'SUMMARY:Has RDATE',
      ].join('\r\n')),
    ]

    const ics = wrapVevents(events.join('\r\n'))
    const result = parseIcs(ics)

    expect(result.events).toHaveLength(2)      // 2 normal events
    expect(result.skippedAllDay).toBe(1)         // 1 all-day
    expect(result.skippedRecurring).toBe(2)       // 1 RRULE + 1 RDATE
  })
})

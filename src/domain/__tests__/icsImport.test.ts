import { describe, it, expect } from 'vitest'
import { parseIcs, classifyEvent, aggregateByName } from '../icsImport'
import type { CategoryId } from '../category'
import type { ImportedEvent } from '../icsImport'

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
    expect(result.skippedAllDayTitles).toEqual([])
    expect(result.skippedRecurringTitles).toEqual([])
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
    expect(result.skippedAllDayTitles).toEqual(['All Day'])
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
    expect(result.skippedRecurringTitles).toEqual(['Weekly Standup'])
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
    expect(result.skippedRecurringTitles).toEqual(['Has RDATE'])
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
    expect(result.skippedRecurringTitles).toEqual(['Exception'])
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
    expect(result.skippedAllDayTitles).toEqual(['All Day'])
    expect(result.skippedRecurringTitles).toEqual(['Daily', 'Has RDATE'])
  })
})

// ── classifyEvent ─────────────────────────────────────────

type CategoryStub = { id: CategoryId; folders: { keywords: string[] }[] }

const accent: CategoryStub = { id: 'accent', folders: [{ keywords: ['meeting', 'standup', '会议'] }] }
const sage:   CategoryStub = { id: 'sage',   folders: [{ keywords: ['email', 'review'] }] }
const sand:   CategoryStub = { id: 'sand',   folders: [{ keywords: [] }] }
const sky:    CategoryStub = { id: 'sky',    folders: [{ keywords: ['read', 'study', '学习'] }] }
const rose:   CategoryStub = { id: 'rose',   folders: [{ keywords: ['lunch', 'break', '午休'] }] }
const stone:  CategoryStub = { id: 'stone',  folders: [{ keywords: [] }] }

const allCategories = [accent, sage, sand, sky, rose, stone]

describe('classifyEvent', () => {
  it('returns matching category by case-insensitive substring', () => {
    expect(classifyEvent('Weekly Meeting', allCategories)).toBe('accent')
    expect(classifyEvent('weekly meeting', allCategories)).toBe('accent')
    expect(classifyEvent('MEETING notes', allCategories)).toBe('accent')
  })

  it('returns first match in category order when multiple categories match', () => {
    // 'meeting' matches accent first (accent comes before sage)
    expect(classifyEvent('meeting review', allCategories)).toBe('accent')
  })

  it('matches Chinese keywords', () => {
    expect(classifyEvent('项目会议', allCategories)).toBe('accent')
    expect(classifyEvent('午休时间', allCategories)).toBe('rose')
    expect(classifyEvent('学习 Rust', allCategories)).toBe('sky')
  })

  it('returns null when no keyword matches', () => {
    expect(classifyEvent('random stuff', allCategories)).toBeNull()
  })

  it('returns null for empty title', () => {
    expect(classifyEvent('', allCategories)).toBeNull()
  })

  it('returns null when all categories have empty keywords', () => {
    const noKeywords: CategoryStub[] = [
      { id: 'accent', folders: [{ keywords: [] }] },
      { id: 'stone',  folders: [{ keywords: [] }] },
    ]
    expect(classifyEvent('anything', noKeywords)).toBeNull()
  })

  it('handles undefined folders gracefully', () => {
    const cat = { id: 'accent' as CategoryId, folders: undefined as unknown as { keywords: string[] }[] }
    expect(classifyEvent('meeting', [cat])).toBeNull()
  })

  it('skips empty-string keywords', () => {
    const cat: CategoryStub = { id: 'accent', folders: [{ keywords: ['', '  ', 'real'] }] }
    expect(classifyEvent('real deal', [cat])).toBe('accent')
  })
})

// ── aggregateByName ────────────────────────────────────────

function makeEvents(titles: string[]): ImportedEvent[] {
  return titles.map((title, i) => ({
    title,
    startTime: Date.UTC(2026, 3, 1, 10, 0, 0) + i * 3_600_000, // stagger by 1h
    endTime: Date.UTC(2026, 3, 1, 11, 0, 0) + i * 3_600_000,
  }))
}

describe('aggregateByName', () => {
  it('groups events by title', () => {
    const events = makeEvents(['吃饭', '吃饭', 'coding', '吃饭', 'coding', 'coding'])
    const result = aggregateByName(events, allCategories)
    expect(result).toHaveLength(2)
    // Sorted by count desc: 吃饭(3) > coding(3) — first occurred wins tie? Actually sorting is descending by count, ties undefined.
    expect(result[0].title).toBe('吃饭')
    expect(result[0].count).toBe(3)
    expect(result[1].title).toBe('coding')
    expect(result[1].count).toBe(3)
  })

  it('sorts by count descending', () => {
    const events = makeEvents([
      'rare', 'common', 'common', 'common', 'medium', 'medium',
    ])
    const result = aggregateByName(events, allCategories)
    expect(result.map((g) => g.count)).toEqual([3, 2, 1])
  })

  it('returns single group when all events have same title', () => {
    const events = makeEvents(['same', 'same', 'same'])
    const result = aggregateByName(events, allCategories)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('same')
    expect(result[0].count).toBe(3)
  })

  it('returns one group per unique title', () => {
    const events = makeEvents(['a', 'b', 'c', 'd'])
    const result = aggregateByName(events, allCategories)
    expect(result).toHaveLength(4)
    for (const g of result) expect(g.count).toBe(1)
  })

  it('handles empty titles — grouped under empty string', () => {
    const events = makeEvents(['', '', 'has title'])
    const result = aggregateByName(events, allCategories)
    expect(result).toHaveLength(2)
    const emptyGroup = result.find((g) => g.title === '')
    expect(emptyGroup).toBeDefined()
    expect(emptyGroup!.count).toBe(2)
    expect(emptyGroup!.suggestedCategory).toBeNull() // empty title → no suggestion
  })

  it('computes keyword-based suggestions for each group', () => {
    const events = makeEvents(['Weekly Meeting', 'lunch break', 'study math', 'random stuff', 'read book'])
    const result = aggregateByName(events, allCategories)

    const meeting = result.find((g) => g.title === 'Weekly Meeting')!
    expect(meeting.suggestedCategory).toBe('accent')

    const lunch = result.find((g) => g.title === 'lunch break')!
    expect(lunch.suggestedCategory).toBe('rose')

    const study = result.find((g) => g.title === 'study math')!
    expect(study.suggestedCategory).toBe('sky')

    const random = result.find((g) => g.title === 'random stuff')!
    expect(random.suggestedCategory).toBeNull()
  })

  it('returns empty array for empty input', () => {
    const result = aggregateByName([], allCategories)
    expect(result).toEqual([])
  })

  it('preserves all events in the group for expansion/overrides', () => {
    const events = makeEvents(['meeting', 'meeting', 'meeting'])
    const result = aggregateByName(events, allCategories)
    expect(result[0].events).toHaveLength(3)
    // Events are the same objects
    expect(result[0].events[0]).toBe(events[0])
    expect(result[0].events[1]).toBe(events[1])
    expect(result[0].events[2]).toBe(events[2])
  })
})

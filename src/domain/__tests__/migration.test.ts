import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { migrateEventV1ToV2 } from '../migration'
import type { CalendarEvent, EventColor } from '../event'

type EventV1 = Omit<CalendarEvent, 'categoryId'> & { categoryId?: undefined }

function makeV1Event(overrides: Partial<EventV1> = {}): EventV1 {
  return {
    id: 'test-id',
    title: 'Test',
    startTime: 1000,
    endTime: 2000,
    color: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

// ── happy path ────────────────────────────────────────────

describe('migrateEventV1ToV2 — happy path', () => {
  it('sets categoryId to the event color', () => {
    const result = migrateEventV1ToV2(makeV1Event({ color: 'accent' }))
    expect(result.categoryId).toBe('accent')
  })

  it('preserves all original fields', () => {
    const v1 = makeV1Event({ title: 'Keep me', description: 'desc', location: 'here' })
    const result = migrateEventV1ToV2(v1)
    expect(result.id).toBe(v1.id)
    expect(result.title).toBe('Keep me')
    expect(result.startTime).toBe(v1.startTime)
    expect(result.endTime).toBe(v1.endTime)
    expect(result.createdAt).toBe(v1.createdAt)
    expect(result.updatedAt).toBe(v1.updatedAt)
    expect(result.description).toBe('desc')
    expect(result.location).toBe('here')
  })
})

// ── parameterized: all 6 valid colors ─────────────────────

describe('migrateEventV1ToV2 — all valid colors', () => {
  const validColors: EventColor[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

  for (const color of validColors) {
    it(`color '${color}' → categoryId '${color}'`, () => {
      const result = migrateEventV1ToV2(makeV1Event({ color }))
      expect(result.categoryId).toBe(color)
      expect(result.color).toBe(color)
    })
  }
})

// ── dirty data ────────────────────────────────────────────

describe('migrateEventV1ToV2 — dirty data', () => {
  beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('falls back to categoryId=stone when color is invalid', () => {
    const result = migrateEventV1ToV2(makeV1Event({ color: 'red' as EventColor }))
    expect(result.categoryId).toBe('stone')
  })

  it('also corrects color to stone when color is invalid', () => {
    const result = migrateEventV1ToV2(makeV1Event({ color: 'red' as EventColor }))
    expect(result.color).toBe('stone')
  })

  it('calls console.warn exactly once for an invalid color', () => {
    migrateEventV1ToV2(makeV1Event({ color: 'red' as EventColor }))
    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it('includes the event id and invalid color in the warning message', () => {
    migrateEventV1ToV2(makeV1Event({ id: 'bad-event', color: 'red' as EventColor }))
    const [msg] = (console.warn as ReturnType<typeof vi.spyOn>).mock.calls[0]
    expect(msg).toContain('bad-event')
    expect(msg).toContain('red')
  })

  it('preserves all other fields even when color is invalid', () => {
    const v1 = makeV1Event({ id: 'dirty', title: 'Dirty', color: 'red' as EventColor, startTime: 500 })
    const result = migrateEventV1ToV2(v1)
    expect(result.id).toBe('dirty')
    expect(result.title).toBe('Dirty')
    expect(result.startTime).toBe(500)
  })
})

// ── immutability ──────────────────────────────────────────

describe('migrateEventV1ToV2 — immutability', () => {
  it('does not mutate the input object', () => {
    const v1 = makeV1Event({ color: 'sage' })
    const originalRef = v1
    migrateEventV1ToV2(v1)
    expect(v1).toBe(originalRef)
    expect((v1 as Partial<CalendarEvent>).categoryId).toBeUndefined()
  })
})

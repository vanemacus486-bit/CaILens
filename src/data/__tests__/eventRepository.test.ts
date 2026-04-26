import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { EventRepository } from '../eventRepository'
import type { CreateEventInput } from '@/domain/event'

// Each test gets an isolated in-memory DB via fake-indexeddb.
// We open a fresh CailensDB instance per suite so IndexedDB names don't collide.
let db: CailensDB
let repo: EventRepository

const FIXED_NOW = 1_000_000
const FIXED_UUID = 'aaaaaaaa-0000-0000-0000-000000000000'
const fixedClock = { now: () => FIXED_NOW }
const fixedIdGen = { generate: () => FIXED_UUID }

function makeInput(overrides: Partial<CreateEventInput> = {}): CreateEventInput {
  return {
    title: 'Test event',
    startTime: 1000,
    endTime: 2000,
    color: 'accent',
    categoryId: 'accent',
    ...overrides,
  }
}

beforeEach(async () => {
  // Use a unique DB name per test to guarantee isolation
  db = new CailensDB()
  // @ts-expect-error — accessing private for test setup
  db.name = `cailens-test-${Math.random()}`
  repo = new EventRepository(db, fixedClock, fixedIdGen)
})

// ── create ────────────────────────────────────────────────

describe('create', () => {
  it('returns a complete event with generated id, createdAt, updatedAt', async () => {
    const result = await repo.create(makeInput())

    expect(result.id).toBe(FIXED_UUID)
    expect(result.title).toBe('Test event')
    expect(result.startTime).toBe(1000)
    expect(result.endTime).toBe(2000)
    expect(result.color).toBe('accent')
    expect(result.createdAt).toBe(FIXED_NOW)
    expect(result.updatedAt).toBe(FIXED_NOW)
  })

  it('uses the injected Clock and IdGenerator', async () => {
    const customClock = { now: () => 9999 }
    const customIdGen = { generate: () => 'custom-id' }
    const customRepo = new EventRepository(db, customClock, customIdGen)

    const result = await customRepo.create(makeInput())

    expect(result.id).toBe('custom-id')
    expect(result.createdAt).toBe(9999)
    expect(result.updatedAt).toBe(9999)
  })

  it('persists the event so it can be retrieved afterwards', async () => {
    await repo.create(makeInput())
    const found = await db.events.get(FIXED_UUID)
    expect(found).toBeDefined()
    expect(found?.title).toBe('Test event')
  })
})

// ── getById ───────────────────────────────────────────────

describe('getById', () => {
  it('returns the event when it exists', async () => {
    await repo.create(makeInput({ title: 'Find me' }))
    const result = await repo.getById(FIXED_UUID)
    expect(result?.title).toBe('Find me')
  })

  it('returns undefined when the id does not exist', async () => {
    const result = await repo.getById('nonexistent-id')
    expect(result).toBeUndefined()
  })
})

// ── getByTimeRange ────────────────────────────────────────

describe('getByTimeRange', () => {
  it('returns events fully inside the range', async () => {
    await db.events.add({
      id: '1', title: 'Inside', startTime: 200, endTime: 800,
      color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0,
    })
    const results = await repo.getByTimeRange(100, 1000)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('1')
  })

  it('does not return events fully outside the range', async () => {
    await db.events.add({
      id: '1', title: 'Outside', startTime: 2000, endTime: 3000,
      color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0,
    })
    const results = await repo.getByTimeRange(100, 1000)
    expect(results).toHaveLength(0)
  })

  it('returns events that start before range and end inside (overlap at start)', async () => {
    await db.events.add({
      id: '1', title: 'Overlap start', startTime: 50, endTime: 500,
      color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0,
    })
    const results = await repo.getByTimeRange(100, 1000)
    expect(results).toHaveLength(1)
  })

  it('returns events that start inside range and end after (overlap at end)', async () => {
    await db.events.add({
      id: '1', title: 'Overlap end', startTime: 500, endTime: 1500,
      color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0,
    })
    const results = await repo.getByTimeRange(100, 1000)
    expect(results).toHaveLength(1)
  })

  it('does not return an event whose endTime equals range start (half-open [start, end))', async () => {
    // event ends exactly at range start → no overlap
    await db.events.add({
      id: '1', title: 'Touches start', startTime: 0, endTime: 100,
      color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0,
    })
    const results = await repo.getByTimeRange(100, 1000)
    expect(results).toHaveLength(0)
  })

  it('does not return an event whose startTime equals range end', async () => {
    // event starts exactly at range end → no overlap
    await db.events.add({
      id: '1', title: 'Touches end', startTime: 1000, endTime: 2000,
      color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0,
    })
    const results = await repo.getByTimeRange(100, 1000)
    expect(results).toHaveLength(0)
  })

  it('returns results sorted by startTime ascending', async () => {
    await db.events.bulkAdd([
      { id: 'c', title: 'C', startTime: 900, endTime: 950, color: 'accent', categoryId: 'accent', createdAt: 0, updatedAt: 0 },
      { id: 'a', title: 'A', startTime: 100, endTime: 150, color: 'sage',   categoryId: 'sage',   createdAt: 0, updatedAt: 0 },
      { id: 'b', title: 'B', startTime: 500, endTime: 600, color: 'sky',    categoryId: 'sky',    createdAt: 0, updatedAt: 0 },
    ])
    const results = await repo.getByTimeRange(0, 1000)
    expect(results.map((e) => e.id)).toEqual(['a', 'b', 'c'])
  })
})

// ── update ────────────────────────────────────────────────

describe('update', () => {
  it('updates fields and refreshes updatedAt without changing createdAt', async () => {
    await repo.create(makeInput({ title: 'Original' }))

    const laterClock = { now: () => FIXED_NOW + 500 }
    const updateRepo = new EventRepository(db, laterClock, fixedIdGen)

    const result = await updateRepo.update({ id: FIXED_UUID, title: 'Updated' })

    expect(result.title).toBe('Updated')
    expect(result.createdAt).toBe(FIXED_NOW)   // unchanged
    expect(result.updatedAt).toBe(FIXED_NOW + 500)
  })

  it('throws when the event id does not exist', async () => {
    await expect(repo.update({ id: 'ghost-id', title: 'X' }))
      .rejects.toThrow('Event not found: ghost-id')
  })

  it('persists the update to the database', async () => {
    await repo.create(makeInput())
    await repo.update({ id: FIXED_UUID, title: 'Persisted update' })
    const stored = await db.events.get(FIXED_UUID)
    expect(stored?.title).toBe('Persisted update')
  })
})

// ── delete ────────────────────────────────────────────────

describe('delete', () => {
  it('removes the event from the database', async () => {
    await repo.create(makeInput())
    await repo.delete(FIXED_UUID)
    const found = await db.events.get(FIXED_UUID)
    expect(found).toBeUndefined()
  })

  it('does not throw when the id does not exist (idempotent)', async () => {
    await expect(repo.delete('nonexistent-id')).resolves.toBeUndefined()
  })
})

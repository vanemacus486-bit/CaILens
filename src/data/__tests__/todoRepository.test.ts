import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter'
import { TodoRepository } from '../todoRepository'

let db: CailensDB
let repo: TodoRepository

const FIXED_NOW = 1_000_000
const fixedClock = { now: () => FIXED_NOW }

beforeEach(async () => {
  db = new CailensDB(`cailens-test-todo-${Math.random()}`)
  const adapter = new IndexedDBAdapter(db)
  repo = new TodoRepository(adapter, fixedClock)
})

// ── create ────────────────────────────────────────────────

describe('create', () => {
  it('includes repeatPattern: null by default', async () => {
    const todo = await repo.create({ title: 'Test todo' })
    expect(todo.repeatPattern).toBe(null)
  })

  it('accepts repeatPattern: daily', async () => {
    const todo = await repo.create({ title: 'Daily', repeatPattern: 'daily' })
    expect(todo.repeatPattern).toBe('daily')
  })
})

// ── spawnRepeat ──────────────────────────────────────────

describe('spawnRepeat', () => {
  it('creates a new todo instance with status todo', async () => {
    const todo = await repo.create({ title: 'Daily exercise', repeatPattern: 'daily' })

    const spawned = await repo.spawnRepeat(todo)

    expect(spawned.status).toBe('todo')
    expect(spawned.repeatPattern).toBe('daily')
    expect(spawned.id).not.toBe(todo.id)
    expect(spawned.title).toBe('Daily exercise')

    // Original should still be 'todo'
    const original = await repo.getById(todo.id)
    expect(original?.status).toBe('todo')
  })

  it('spawned todo is included in getAll()', async () => {
    const todo = await repo.create({ title: 'Daily', repeatPattern: 'daily' })
    await repo.spawnRepeat(todo)

    const all = await repo.getAll()
    expect(all).toHaveLength(2)
    expect(all.find(t => t.id === todo.id)).toBeDefined()
    expect(all.find(t => t.id !== todo.id)).toBeDefined()
  })

  it('spawned todo has null dueDate and null completedAt', async () => {
    const todo = await repo.create({
      title: 'Daily',
      repeatPattern: 'daily',
      dueDate: 5000,
    })
    const spawned = await repo.spawnRepeat(todo)

    expect(spawned.dueDate).toBe(null)
    expect(spawned.completedAt).toBe(null)
  })

  it('preserves priority and sortOrder', async () => {
    const todo = await repo.create({
      title: 'Daily',
      priority: 'high',
      repeatPattern: 'daily',
    })
    const spawned = await repo.spawnRepeat(todo)

    expect(spawned.priority).toBe('high')
    expect(spawned.sortOrder).toBe(todo.sortOrder)
  })
})

// ── toggleComplete with repeat ──────────────────────────

describe('toggleComplete with repeatPattern', () => {
  it('marks done but does not auto-spawn (spawn is store-level)', async () => {
    const todo = await repo.create({ title: 'Daily', repeatPattern: 'daily' })
    const updated = await repo.toggleComplete(todo.id)

    expect(updated.status).toBe('done')
    expect(updated.completedAt).toBe(FIXED_NOW)

    // spawnRepeat is called by the store, not the repo
    // So getAll should still have just 1 record
    const all = await repo.getAll()
    expect(all).toHaveLength(1)
  })

  it('toggling done then todo resets completedAt', async () => {
    const todo = await repo.create({ title: 'Daily', repeatPattern: 'daily' })
    await repo.toggleComplete(todo.id)
    const undone = await repo.toggleComplete(todo.id)

    expect(undone.status).toBe('todo')
    expect(undone.completedAt).toBe(null)
  })
})

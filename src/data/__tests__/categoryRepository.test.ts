import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { CategoryRepository } from '../categoryRepository'
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter'
import { DEFAULT_CATEGORIES } from '@/domain/category'

let db:   CailensDB
let adapter: IndexedDBAdapter
let repo: CategoryRepository

beforeEach(async () => {
  db = new CailensDB(`cailens-test-${Math.random()}`)
  adapter = new IndexedDBAdapter(db)
  repo = new CategoryRepository(adapter)
})

// ── getAll ────────────────────────────────────────────────

describe('getAll', () => {
  it('returns exactly 6 categories for a fresh database', async () => {
    const result = await repo.getAll()
    expect(result).toHaveLength(6)
  })

  it('returns categories in DEFAULT_CATEGORIES order', async () => {
    const result   = await repo.getAll()
    const expected = DEFAULT_CATEGORIES.map((c) => c.id)
    expect(result.map((c) => c.id)).toEqual(expected)
  })

  it('each category has a name string', async () => {
    const result = await repo.getAll()
    result.forEach((cat) => {
      expect(typeof cat.name).toBe('string')
      expect(cat.name.length).toBeGreaterThan(0)
})
  })

  it('accent category has the correct default bilingual name', async () => {
    const result = await repo.getAll()
    const accent = result.find((c) => c.id === 'accent')!
    expect(accent.name).toBe('主要矛盾')
  })

  it('all 6 expected category ids are present', async () => {
    const result = await repo.getAll()
    const ids    = result.map((c) => c.id)
    expect(ids).toContain('accent')
    expect(ids).toContain('sage')
    expect(ids).toContain('sand')
    expect(ids).toContain('sky')
    expect(ids).toContain('rose')
    expect(ids).toContain('stone')
  })
})

// ── update ────────────────────────────────────────────────

describe('update', () => {
  it('updates the target category name and returns the updated record', async () => {
    const newName = '专注'
    const updated = await repo.update('accent', { name: newName })
    expect(updated.name).toEqual(newName)
  })

  it('persists the name change — visible in subsequent getAll', async () => {
    const newName = '专注'
    await repo.update('accent', { name: newName })
    const all    = await repo.getAll()
    const accent = all.find((c) => c.id === 'accent')!
    expect(accent.name).toBe(newName)
  })

  it('does not affect other categories when updating name', async () => {
    const before     = await repo.getAll()
    const sageBefore = before.find((c) => c.id === 'sage')!.name

    await repo.update('accent', { name: '专注' })

    const after     = await repo.getAll()
    const sageAfter = after.find((c) => c.id === 'sage')!.name
    expect(sageAfter).toEqual(sageBefore)
  })

  it('can update multiple categories independently', async () => {
    await repo.update('accent', { name: '专注' })
    await repo.update('rose', { name: '睡眠' })

    const all    = await repo.getAll()
    expect(all.find((c) => c.id === 'accent')!.name).toBe('专注')
    expect(all.find((c) => c.id === 'rose')!.name).toBe('睡眠')
  })

  it('updates folders', async () => {
    const folders = [{ id: 'f1', name: '工作', keywords: ['开会'] }]
    const updated = await repo.update('sage', { folders })
    expect(updated.folders).toEqual(folders)
  })

  it('updates weeklyBudget', async () => {
    const updated = await repo.update('sky', { weeklyBudget: 15 })
    expect(updated.weeklyBudget).toBe(15)
  })
})

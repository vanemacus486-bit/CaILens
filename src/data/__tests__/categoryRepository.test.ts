import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { CategoryRepository } from '../categoryRepository'
import { DEFAULT_CATEGORIES } from '@/domain/category'

let db:   CailensDB
let repo: CategoryRepository

beforeEach(() => {
  db = new CailensDB()
  // @ts-expect-error — accessing private for test isolation
  db.name = `cailens-test-${Math.random()}`
  repo = new CategoryRepository(db)
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

  it('each category has a bilingual name object', async () => {
    const result = await repo.getAll()
    result.forEach((cat) => {
      expect(typeof cat.name).toBe('object')
      expect(typeof cat.name.zh).toBe('string')
      expect(typeof cat.name.en).toBe('string')
      expect(cat.name.zh.length).toBeGreaterThan(0)
      expect(cat.name.en.length).toBeGreaterThan(0)
    })
  })

  it('accent category has the correct default bilingual name', async () => {
    const result = await repo.getAll()
    const accent = result.find((c) => c.id === 'accent')!
    expect(accent.name.zh).toBe('核心工作')
    expect(accent.name.en).toBe('Core Work')
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

// ── updateName ────────────────────────────────────────────

describe('updateName', () => {
  it('updates the target category and returns the updated record', async () => {
    const newName = { zh: '专注', en: 'Focus' }
    const updated = await repo.updateName('accent', newName)
    expect(updated.name).toEqual(newName)
  })

  it('persists the change — visible in subsequent getAll', async () => {
    const newName = { zh: '专注', en: 'Focus' }
    await repo.updateName('accent', newName)
    const all    = await repo.getAll()
    const accent = all.find((c) => c.id === 'accent')!
    expect(accent.name).toEqual(newName)
  })

  it('does not affect other categories', async () => {
    const before     = await repo.getAll()
    const sageBefore = before.find((c) => c.id === 'sage')!.name

    await repo.updateName('accent', { zh: '专注', en: 'Focus' })

    const after     = await repo.getAll()
    const sageAfter = after.find((c) => c.id === 'sage')!.name
    expect(sageAfter).toEqual(sageBefore)
  })

  it('can update multiple categories independently', async () => {
    await repo.updateName('accent', { zh: '专注', en: 'Focus' })
    await repo.updateName('rose',   { zh: '睡眠', en: 'Sleep' })

    const all    = await repo.getAll()
    expect(all.find((c) => c.id === 'accent')!.name).toEqual({ zh: '专注', en: 'Focus' })
    expect(all.find((c) => c.id === 'rose')!.name).toEqual({ zh: '睡眠', en: 'Sleep' })
  })
})

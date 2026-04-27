import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { SettingsRepository } from '../settingsRepository'
import { DEFAULT_SETTINGS } from '@/domain/settings'

let db:   CailensDB
let repo: SettingsRepository

beforeEach(() => {
  db = new CailensDB()
  // @ts-expect-error — accessing private for test isolation
  db.name = `cailens-test-${Math.random()}`
  repo = new SettingsRepository(db)
})

// ── get ───────────────────────────────────────────────────

describe('get', () => {
  it('returns seeded settings after DB upgrade (language: zh)', async () => {
    const result = await repo.get()
    expect(result.id).toBe('default')
    expect(result.language).toBe('zh')
  })

  it('returns DEFAULT_SETTINGS when the record has been deleted', async () => {
    await db.open()
    await db.settings.delete('default')
    const result = await repo.get()
    expect(result).toEqual(DEFAULT_SETTINGS)
  })

  it('language is a valid AppLanguage value', async () => {
    const result = await repo.get()
    expect(['zh', 'en']).toContain(result.language)
  })
})

// ── update ────────────────────────────────────────────────

describe('update', () => {
  it('updates the language field', async () => {
    await repo.update({ language: 'en' })
    const result = await repo.get()
    expect(result.language).toBe('en')
  })

  it('persists across successive get calls', async () => {
    await repo.update({ language: 'en' })
    expect((await repo.get()).language).toBe('en')
    expect((await repo.get()).language).toBe('en')
  })

  it('does not overwrite the id field', async () => {
    await repo.update({ language: 'en' })
    expect((await repo.get()).id).toBe('default')
  })

  it('returns the updated record directly', async () => {
    const returned = await repo.update({ language: 'en' })
    expect(returned.language).toBe('en')
    expect(returned.id).toBe('default')
  })

  it('can toggle language back to zh', async () => {
    await repo.update({ language: 'en' })
    await repo.update({ language: 'zh' })
    expect((await repo.get()).language).toBe('zh')
  })
})

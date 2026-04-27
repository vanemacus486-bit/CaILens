import type { AppSettings } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import type { CailensDB } from './db'
import { db as defaultDb } from './db'

export class SettingsRepository {
  private db: CailensDB

  constructor(db: CailensDB) {
    this.db = db
  }

  // Returns DEFAULT_SETTINGS if the record does not exist yet.
  async get(): Promise<AppSettings> {
    const settings = await this.db.settings.get('default')
    return settings ?? { ...DEFAULT_SETTINGS }
  }

  async update(updates: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const current = await this.get()
    const updated: AppSettings = { ...current, ...updates }
    await this.db.settings.put(updated)
    return updated
  }
}

export const settingsRepository = new SettingsRepository(defaultDb)

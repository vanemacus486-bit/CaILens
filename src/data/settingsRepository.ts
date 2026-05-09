import type { AppSettings } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class SettingsRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  // Returns DEFAULT_SETTINGS if the record does not exist yet.
  async get(): Promise<AppSettings> {
    const settings = await this.adapter.settings.get('default')
    return settings ?? { ...DEFAULT_SETTINGS }
  }

  async update(updates: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const current = await this.get()
    const updated: AppSettings = { ...current, ...updates }
    await this.adapter.settings.put(updated)
    return updated
  }
}

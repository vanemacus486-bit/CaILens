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
    if (!settings) return { ...DEFAULT_SETTINGS }
    // 兼容旧版 language: 'en' → 强制 zh
    if (settings.language !== 'zh') {
      settings.language = 'zh'
      await this.adapter.settings.put(settings)
    }
    return settings
  }

  async update(updates: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const current = await this.get()
    const updated: AppSettings = { ...current, ...updates }
    await this.adapter.settings.put(updated)
    return updated
  }
}

import type { AppSettings } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import type { StorageAdapter } from './adapters/StorageAdapter'

const VALID_LANGUAGES: string[] = ['zh', 'en', 'es', 'ar', 'fr', 'ru']

export class SettingsRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  // Returns DEFAULT_SETTINGS if the record does not exist yet.
  async get(): Promise<AppSettings> {
    const settings = await this.adapter.settings.get('default')
    if (!settings) return { ...DEFAULT_SETTINGS }
    // 语言由用户选择，仓库层只做合法性兜底：未知值回落到 zh，已知值原样保留。
    // （曾在这里把非 zh 一律改写为 zh，导致选完语言下一轮读盘又被改回去。）
    if (!VALID_LANGUAGES.includes(settings.language)) {
      settings.language = DEFAULT_SETTINGS.language
      await this.adapter.settings.put(settings)
    }
    return settings
  }

  async update(updates: Partial<Omit<AppSettings, 'id'>>): Promise<AppSettings> {
    const current = await this.get()
    const updated: AppSettings = { ...current, ...updates, updatedAt: Date.now() }
    await this.adapter.settings.put(updated)
    return updated
  }
}

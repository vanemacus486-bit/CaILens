export type AppLanguage = 'zh' | 'en'

export interface AppSettings {
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
}

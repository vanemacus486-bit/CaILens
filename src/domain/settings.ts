export type AppLanguage = 'zh' | 'en'
export type AppTheme = 'light' | 'dark'

export interface AppSettings {
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme: AppTheme
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
}

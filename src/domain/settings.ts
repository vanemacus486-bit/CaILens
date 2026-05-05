import type { AccentPreset } from './themes'

export type AppLanguage = 'zh' | 'en'
export type AppTheme = 'light' | 'dark'

export interface AppSettings {
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme?: AppTheme
  accentColor?: AccentPreset
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  accentColor: 'rust',
}

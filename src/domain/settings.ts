import type { AccentPreset } from './themes'
import type { ShortcutAction, ShortcutString } from './shortcuts'

export type AppLanguage = 'zh' | 'en'
export type AppTheme = 'light' | 'dark'

export interface AppSettings {
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme?: AppTheme
  accentColor?: AccentPreset
  shortcuts?: Partial<Record<ShortcutAction, ShortcutString>>
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  accentColor: 'rust',
}

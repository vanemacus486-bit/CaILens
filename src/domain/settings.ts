import type { AccentPreset } from './themes'
import type { ShortcutAction, ShortcutString } from './shortcuts'

export type AppLanguage = 'zh' | 'en'
export type AppTheme = 'light' | 'dark'
export type UiFont = 'default' | 'wenkai'

export interface AppSettings {
  aiEnabled?: boolean
  aiApiKey?: string
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme?: AppTheme
  accentColor?: AccentPreset
  uiFont?: UiFont
  /** 克制模式：只记录不分析 */
  restrainedMode?: boolean
  shortcuts?: Partial<Record<ShortcutAction, ShortcutString>>
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  accentColor: 'rust',
}

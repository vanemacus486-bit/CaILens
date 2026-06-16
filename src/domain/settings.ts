import type { ShortcutAction, ShortcutString } from './shortcuts'

export type AppLanguage = 'zh' | 'en'
export type AppTheme = 'light' | 'dark' | 'auto'
export type UiFont = 'default' | 'sourcehan' | 'wenkai'
export type VisualStyle = 'graphite' | 'aurora' | 'slate' | 'carbon' | 'nocturne' | 'amber'
export type FontScale = 'sm' | 'default' | 'lg' | 'xl'

export interface AppSettings {
  aiEnabled?: boolean
  aiApiKey?: string
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme?: AppTheme
  uiFont?: UiFont
  visualStyle?: VisualStyle
  fontScale?: FontScale
  shortcuts?: Partial<Record<ShortcutAction, ShortcutString>>
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  visualStyle: 'graphite',
  fontScale: 'default',
}

export function resolveTheme(theme: AppTheme | undefined, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemPrefersDark ? 'dark' : 'light'
}

export const FONT_SCALE_PX: Record<FontScale, number> = { sm: 15, default: 16, lg: 17.5, xl: 19 }

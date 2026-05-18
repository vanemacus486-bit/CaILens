import type { AccentPreset } from './themes'
import type { ShortcutAction, ShortcutString } from './shortcuts'
import type { AiModel } from './ai'
import type { AiProvider, AiUserProfile, AiSkill } from './aiChat'

export type AppLanguage = 'zh' | 'en'
export type AppTheme = 'light' | 'dark'
export type UiFont = 'default' | 'wenkai'

export interface AppSettings {
  id: 'default'   // singleton — Dexie primary key is always 'default'
  language: AppLanguage
  theme?: AppTheme
  accentColor?: AccentPreset
  uiFont?: UiFont
  shortcuts?: Partial<Record<ShortcutAction, ShortcutString>>
  aiApiKey?: string
  aiModel?: AiModel
  aiEnabled?: boolean
  aiProvider?: AiProvider
  aiEndpoint?: string
  aiTemperature?: number
  aiMaxTokens?: number
  aiUserProfile?: AiUserProfile
  aiUseProfile?: boolean
  aiCustomSystemPrompt?: string
  aiSkills?: AiSkill[]
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  accentColor: 'rust',
  aiModel: 'deepseek-chat',
  aiEnabled: false,
  aiProvider: 'deepseek',
  aiTemperature: 0.7,
  aiMaxTokens: 2000,
  aiUseProfile: true,
}

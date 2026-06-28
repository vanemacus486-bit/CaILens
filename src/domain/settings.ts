import type { ShortcutAction, ShortcutString } from './shortcuts'
import type { HygieneActivityDef } from './hygieneActivity'
import { DEFAULT_HYGIENE_ACTIVITIES } from './hygieneActivity'
import type { HabitPlan } from './habitPlan'
import type { DayMark } from './dayMark'
import type { SleepReminderSettings } from './sleepReminder'

export type AppLanguage = 'zh' | 'en' | 'es' | 'ar' | 'fr' | 'ru'
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
  /** 自定义卫生活动（哪些事件计入卫生 + 颜色）；缺省回退 DEFAULT_HYGIENE_ACTIVITIES */
  hygieneActivities?: HygieneActivityDef[]
  /** 习惯调节计划（分阶段增减某些活动时间 + 达标检测）；与 hygieneActivities 同为 settings 内用户自定义列表 */
  habitPlans?: HabitPlan[]
  /** 日期标记（右键迷你月历某天打的标记 + 备注） */
  dayMarks?: DayMark[]
  /** 就寝提醒设置 */
  sleepReminder?: SleepReminderSettings
}

export const DEFAULT_SETTINGS: AppSettings = {
  id: 'default',
  language: 'zh',
  theme: 'light',
  visualStyle: 'graphite',
  fontScale: 'default',
  hygieneActivities: [...DEFAULT_HYGIENE_ACTIVITIES],
}

export function resolveTheme(theme: AppTheme | undefined, systemPrefersDark: boolean): 'light' | 'dark' {
  if (theme === 'dark') return 'dark'
  if (theme === 'light') return 'light'
  return systemPrefersDark ? 'dark' : 'light'
}

export const FONT_SCALE_PX: Record<FontScale, number> = { sm: 15, default: 16, lg: 17.5, xl: 19 }

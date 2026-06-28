import { create } from 'zustand'
import { getSettingsRepo } from '@/data/getRepositories'
import type { AppSettings, AppLanguage, AppTheme, UiFont, VisualStyle, FontScale } from '@/domain/settings'
import type { HygieneActivityDef } from '@/domain/hygieneActivity'
import type { HabitPlan } from '@/domain/habitPlan'
import type { DayMark } from '@/domain/dayMark'
import type { EventColor } from '@/domain/event'
import type { SleepReminderSettings } from '@/domain/sleepReminder'
import { DEFAULT_SLEEP_REMINDER } from '@/domain/sleepReminder'
import { makePhase, startOfLocalDay } from '@/domain/habitPlan'
import { DEFAULT_SETTINGS, resolveTheme } from '@/domain/settings'
import type { ShortcutAction, ShortcutString } from '@/domain/shortcuts'

const THEME_KEY  = 'cailens-theme'
const FONT_KEY   = 'cailens-font'
const STYLE_KEY  = 'cailens-style'
const SCALE_KEY  = 'cailens-scale'

function applyTheme(theme: AppTheme) {
  const dark = resolveTheme(theme, window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.classList.toggle('dark', dark === 'dark')
}

function applyFont(font: UiFont) {
  document.documentElement.setAttribute('data-font', font)
}

function applyVisualStyle(style: VisualStyle) {
  document.documentElement.setAttribute('data-style', style)
}

function applyFontScale(scale: FontScale) {
  document.documentElement.setAttribute('data-scale', scale)
}

// ── 通用 localStorage ↔ DB 协调 ────────────────────────────

interface SettingSlot<T> {
  storageKey: string
  dbField: 'theme' | 'uiFont' | 'visualStyle' | 'fontScale'
  fallback: T
  apply: (value: T) => void
}

async function reconcileSlot<T>(
  settings: AppSettings,
  slot: SettingSlot<T>,
): Promise<{ settings: AppSettings; value: T }> {
  const stored = localStorage.getItem(slot.storageKey) as T | null
  const dbValue = settings[slot.dbField] as T | undefined
  const dbMissing = dbValue == null

  if (dbMissing || (stored != null && dbValue !== stored)) {
    const value = (stored ?? slot.fallback) as T
    settings = await getSettingsRepo().update({ [slot.dbField]: value } as Partial<AppSettings>)
    return { settings, value }
  }

  return { settings, value: dbValue as T }
}

// ── 系统颜色主题监听（auto 模式下跟随系统） ────────────────
let latestTheme: AppTheme = 'light'
let mqlListenerRegistered = false

// ── Store ───────────────────────────────────────────────────

interface AppSettingsState {
  settings: AppSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setLanguage: (lang: AppLanguage) => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setVisualStyle: (style: VisualStyle) => Promise<void>
  setFontScale: (scale: FontScale) => Promise<void>
  setShortcut: (action: ShortcutAction, binding: ShortcutString | null) => Promise<void>
  resetAllShortcuts: () => Promise<void>
  setUiFont: (font: UiFont) => Promise<void>
  setHygieneActivities: (activities: HygieneActivityDef[]) => Promise<void>
  createHabitPlan: (title: string) => Promise<HabitPlan>
  updateHabitPlan: (plan: HabitPlan) => Promise<void>
  deleteHabitPlan: (id: string) => Promise<void>
  addDayMark: (date: number, label: string, color?: EventColor | null) => Promise<DayMark>
  updateDayMark: (mark: DayMark) => Promise<void>
  deleteDayMark: (id: string) => Promise<void>
  setSleepReminder: (patch: Partial<SleepReminderSettings>) => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    let settings = await getSettingsRepo().get()

    const themeResult = await reconcileSlot(settings, {
      storageKey: THEME_KEY,
      dbField: 'theme',
      fallback: window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' as AppTheme : 'light' as AppTheme,
      apply: applyTheme,
    })
    settings = themeResult.settings

    const fontResult = await reconcileSlot(settings, {
      storageKey: FONT_KEY,
      dbField: 'uiFont',
      fallback: 'default' as UiFont,
      apply: applyFont,
    })
    settings = fontResult.settings

    const styleResult = await reconcileSlot(settings, {
      storageKey: STYLE_KEY,
      dbField: 'visualStyle',
      fallback: 'graphite' as VisualStyle,
      apply: applyVisualStyle,
    })
    settings = styleResult.settings

    const scaleResult = await reconcileSlot(settings, {
      storageKey: SCALE_KEY,
      dbField: 'fontScale',
      fallback: 'default' as FontScale,
      apply: applyFontScale,
    })
    settings = scaleResult.settings

    const theme = themeResult.value
    const font = fontResult.value
    const style = styleResult.value
    const scale = scaleResult.value

    localStorage.setItem(THEME_KEY, theme)
    localStorage.setItem(FONT_KEY, font)
    localStorage.setItem(STYLE_KEY, style)
    localStorage.setItem(SCALE_KEY, scale)

    latestTheme = theme

    if (!mqlListenerRegistered) {
      mqlListenerRegistered = true
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (latestTheme === 'auto') applyTheme('auto')
      })
    }

    set({ settings: { ...settings, theme, uiFont: font, visualStyle: style, fontScale: scale }, isLoaded: true })
  },

  setLanguage: async (lang) => {
    const settings = await getSettingsRepo().update({ language: lang })
    set({ settings })
  },

  setTheme: async (theme) => {
    latestTheme = theme
    const settings = await getSettingsRepo().update({ theme })
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ settings })
  },

  setVisualStyle: async (style) => {
    const settings = await getSettingsRepo().update({ visualStyle: style })
    localStorage.setItem(STYLE_KEY, style)
    applyVisualStyle(style)
    set({ settings })
  },

  setFontScale: async (scale) => {
    const settings = await getSettingsRepo().update({ fontScale: scale })
    localStorage.setItem(SCALE_KEY, scale)
    applyFontScale(scale)
    set({ settings })
  },

  setShortcut: async (action, binding) => {
    const current = await getSettingsRepo().get()
    const shortcuts = { ...(current.shortcuts ?? {}) }
    if (binding === null) {
      delete shortcuts[action]
    } else {
      shortcuts[action] = binding
    }
    const updated = await getSettingsRepo().update({
      shortcuts: Object.keys(shortcuts).length > 0 ? shortcuts : undefined,
    })
    set({ settings: updated })
  },

  resetAllShortcuts: async () => {
    const updated = await getSettingsRepo().update({ shortcuts: undefined })
    set({ settings: updated })
  },

  setUiFont: async (font) => {
    const settings = await getSettingsRepo().update({ uiFont: font })
    localStorage.setItem(FONT_KEY, font)
    applyFont(font)
    set({ settings })
  },

  setHygieneActivities: async (activities) => {
    const settings = await getSettingsRepo().update({ hygieneActivities: activities })
    set({ settings })
  },

  createHabitPlan: async (title) => {
    const now = Date.now()
    const plan: HabitPlan = {
      id: crypto.randomUUID(),
      title: title.trim() || '新习惯计划',
      status: 'active',
      startDate: startOfLocalDay(now),
      phaseLengthDays: 14,
      streams: [],
      phases: [
        makePhase(crypto.randomUUID(), '宽松'),
        makePhase(crypto.randomUUID(), '收紧'),
        makePhase(crypto.randomUUID(), '目标'),
      ],
      createdAt: now,
      updatedAt: now,
    }
    const current = (await getSettingsRepo().get()).habitPlans ?? []
    const settings = await getSettingsRepo().update({ habitPlans: [...current, plan] })
    set({ settings })
    return plan
  },

  updateHabitPlan: async (plan) => {
    const current = (await getSettingsRepo().get()).habitPlans ?? []
    const next = current.map((p) => (p.id === plan.id ? { ...plan, updatedAt: Date.now() } : p))
    const settings = await getSettingsRepo().update({ habitPlans: next })
    set({ settings })
  },

  deleteHabitPlan: async (id) => {
    const current = (await getSettingsRepo().get()).habitPlans ?? []
    const settings = await getSettingsRepo().update({ habitPlans: current.filter((p) => p.id !== id) })
    set({ settings })
  },

  addDayMark: async (date, label, color) => {
    const now = Date.now()
    const mark: DayMark = {
      id: crypto.randomUUID(),
      date,
      label: label.trim(),
      color: color ?? null,
      createdAt: now,
      updatedAt: now,
    }
    const current = (await getSettingsRepo().get()).dayMarks ?? []
    const settings = await getSettingsRepo().update({ dayMarks: [...current, mark] })
    set({ settings })
    return mark
  },

  updateDayMark: async (mark) => {
    const current = (await getSettingsRepo().get()).dayMarks ?? []
    const next = current.map((m) => (m.id === mark.id ? { ...mark, updatedAt: Date.now() } : m))
    const settings = await getSettingsRepo().update({ dayMarks: next })
    set({ settings })
  },

  deleteDayMark: async (id) => {
    const current = (await getSettingsRepo().get()).dayMarks ?? []
    const settings = await getSettingsRepo().update({ dayMarks: current.filter((m) => m.id !== id) })
    set({ settings })
  },

  setSleepReminder: async (patch) => {
    const current = (await getSettingsRepo().get()).sleepReminder ?? DEFAULT_SLEEP_REMINDER
    const next = { ...current, ...patch }
    const settings = await getSettingsRepo().update({ sleepReminder: next })
    set({ settings })
  },
}))

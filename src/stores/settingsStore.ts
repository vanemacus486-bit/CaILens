import { create } from 'zustand'
import { getSettingsRepo } from '@/data/getRepositories'
import type { AppSettings, AppTheme, UiFont } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import type { ShortcutAction, ShortcutString } from '@/domain/shortcuts'

const THEME_KEY  = 'cailens-theme'
const FONT_KEY   = 'cailens-font'

function applyTheme(theme: AppTheme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function applyFont(font: UiFont) {
  document.documentElement.setAttribute('data-font', font)
}

// ── 通用 localStorage ↔ DB 协调 ────────────────────────────

interface SettingSlot<T> {
  storageKey: string
  dbField: 'theme' | 'uiFont'
  fallback: T
  apply: (value: T) => void
}

/**
 * 协调 localStorage 与 DB 的单一设置维度。
 * 若 DB 缺失该字段，或 localStorage 与 DB 不一致，以 localStorage（或 fallback）为准写入 DB。
 * 始终将最终值回写 localStorage 并调用 apply。
 */
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

// ── Store ───────────────────────────────────────────────────

interface AppSettingsState {
  settings: AppSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setShortcut: (action: ShortcutAction, binding: ShortcutString | null) => Promise<void>
  resetAllShortcuts: () => Promise<void>
  setUiFont: (font: UiFont) => Promise<void>
  setRestrainedMode: (enabled: boolean) => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    let settings = await getSettingsRepo().get()

    // Reconcile theme, accent, font — each follows the same localStorage ↔ DB pattern
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

    // Flush final values to localStorage (ensures consistency)
    const theme = themeResult.value
    const font = fontResult.value
    localStorage.setItem(THEME_KEY, theme)
    localStorage.setItem(FONT_KEY, font)

    set({ settings: { ...settings, theme, uiFont: font }, isLoaded: true })
  },

  setTheme: async (theme) => {
    const settings = await getSettingsRepo().update({ theme })
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
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

  setRestrainedMode: async (enabled) => {
    const settings = await getSettingsRepo().update({ restrainedMode: enabled || undefined })
    set({ settings })
  },
}))

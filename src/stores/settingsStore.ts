import { create } from 'zustand'
import { settingsRepository } from '@/data/settingsRepository'
import type { AppSettings, AppLanguage, AppTheme } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'

const THEME_KEY = 'cailens-theme'

function applyTheme(theme: AppTheme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

interface AppSettingsState {
  settings: AppSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setLanguage: (lang: AppLanguage) => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    let settings = await settingsRepository.get()
    const storedTheme = localStorage.getItem(THEME_KEY) as AppTheme | null

    // Two cases where the DB theme isn't the source of truth:
    // 1. Existing DB record missing the theme field (old schema migration)
    // 2. New user: repository returned DEFAULT_SETTINGS('light'), but the
    //    inline script already detected system dark and wrote localStorage
    const dbHasTheme = !!(settings as unknown as Record<string, unknown>).theme
    const initialMismatch = storedTheme !== null && settings.theme !== storedTheme

    if (!dbHasTheme || initialMismatch) {
      const theme = storedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      settings = await settingsRepository.update({ theme })
    }

    localStorage.setItem(THEME_KEY, settings.theme)
    applyTheme(settings.theme)
    set({ settings, isLoaded: true })
  },

  setLanguage: async (lang) => {
    const settings = await settingsRepository.update({ language: lang })
    set({ settings })
  },

  setTheme: async (theme) => {
    const settings = await settingsRepository.update({ theme })
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ settings })
  },
}))

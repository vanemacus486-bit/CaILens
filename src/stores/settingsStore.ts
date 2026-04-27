import { create } from 'zustand'
import { settingsRepository } from '@/data/settingsRepository'
import type { AppSettings, AppLanguage } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'

interface AppSettingsState {
  settings: AppSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setLanguage: (lang: AppLanguage) => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    const settings = await settingsRepository.get()
    set({ settings, isLoaded: true })
  },

  setLanguage: async (lang) => {
    const settings = await settingsRepository.update({ language: lang })
    set({ settings })
  },
}))

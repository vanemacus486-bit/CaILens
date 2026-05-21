import { create } from 'zustand'
import { getSettingsRepo } from '@/data/getRepositories'
import type { AppSettings, AppLanguage, AppTheme, UiFont } from '@/domain/settings'
import { DEFAULT_SETTINGS } from '@/domain/settings'
import type { AccentPreset } from '@/domain/themes'
import type { ShortcutAction, ShortcutString } from '@/domain/shortcuts'
import type { AiModel } from '@/domain/ai'
import type { AiProvider, AiUserProfile, AiSkill } from '@/domain/aiChat'

const THEME_KEY  = 'cailens-theme'
const ACCENT_KEY = 'cailens-accent'
const FONT_KEY   = 'cailens-font'

function applyTheme(theme: AppTheme) {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
}

function applyAccent(accent: AccentPreset) {
  document.documentElement.setAttribute('data-accent', accent)
}

function applyFont(font: UiFont) {
  document.documentElement.setAttribute('data-font', font)
}

interface AppSettingsState {
  settings: AppSettings
  isLoaded: boolean
  loadSettings: () => Promise<void>
  setLanguage: (lang: AppLanguage) => Promise<void>
  setTheme: (theme: AppTheme) => Promise<void>
  setAccentColor: (accent: AccentPreset) => Promise<void>
  setShortcut: (action: ShortcutAction, binding: ShortcutString | null) => Promise<void>
  resetAllShortcuts: () => Promise<void>
  setAiApiKey: (key: string) => Promise<void>
  setAiModel: (model: AiModel) => Promise<void>
  setAiEnabled: (enabled: boolean) => Promise<void>
  setAiProvider: (provider: AiProvider) => Promise<void>
  setAiEndpoint: (endpoint: string) => Promise<void>
  setAiTemperature: (temp: number) => Promise<void>
  setAiMaxTokens: (tokens: number) => Promise<void>
  setAiUserProfile: (profile: AiUserProfile) => Promise<void>
  setAiUseProfile: (use: boolean) => Promise<void>
  setAiCustomSystemPrompt: (prompt?: string) => Promise<void>
  setAiSkills: (skills: AiSkill[]) => Promise<void>
  setUiFont: (font: UiFont) => Promise<void>
  setRestrainedMode: (enabled: boolean) => Promise<void>
}

export const useAppSettingsStore = create<AppSettingsState>()((set) => ({
  settings: DEFAULT_SETTINGS,
  isLoaded: false,

  loadSettings: async () => {
    let settings = await getSettingsRepo().get()
    const storedTheme = localStorage.getItem(THEME_KEY) as AppTheme | null

    // Two cases where the DB theme isn't the source of truth:
    // 1. Existing DB record missing the theme field (old schema migration)
    // 2. New user: repository returned DEFAULT_SETTINGS('light'), but the
    //    inline script already detected system dark and wrote localStorage
    const dbHasTheme = settings.theme !== undefined
    const initialMismatch = storedTheme !== null && settings.theme !== storedTheme

    if (!dbHasTheme || initialMismatch) {
      const theme = storedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      settings = await getSettingsRepo().update({ theme })
    }

    const theme = settings.theme ?? 'light' as AppTheme
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)

    // Accent color — same reconciliation pattern
    const storedAccent = localStorage.getItem(ACCENT_KEY) as AccentPreset | null
    if (!settings.accentColor || (storedAccent && settings.accentColor !== storedAccent)) {
      const accent = storedAccent ?? 'rust'
      settings = await getSettingsRepo().update({ accentColor: accent })
    }
    const accent = settings.accentColor ?? 'rust'
    localStorage.setItem(ACCENT_KEY, accent)
    applyAccent(accent)

    // Font — reconcile localStorage with DB
    const storedFont = localStorage.getItem(FONT_KEY) as UiFont | null
    if (!settings.uiFont || (storedFont && settings.uiFont !== storedFont)) {
      const font = storedFont ?? 'default'
      settings = await getSettingsRepo().update({ uiFont: font })
    }
    const font = settings.uiFont ?? 'default'
    localStorage.setItem(FONT_KEY, font)
    applyFont(font)

    set({ settings: { ...settings, theme, accentColor: accent, uiFont: font }, isLoaded: true })
  },

  setLanguage: async (lang) => {
    const settings = await getSettingsRepo().update({ language: lang })
    set({ settings })
  },

  setTheme: async (theme) => {
    const settings = await getSettingsRepo().update({ theme })
    localStorage.setItem(THEME_KEY, theme)
    applyTheme(theme)
    set({ settings })
  },

  setAccentColor: async (accent) => {
    const settings = await getSettingsRepo().update({ accentColor: accent })
    localStorage.setItem(ACCENT_KEY, accent)
    applyAccent(accent)
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

  setAiApiKey: async (key) => {
    const settings = await getSettingsRepo().update({ aiApiKey: key || undefined })
    set({ settings })
  },

  setAiModel: async (model) => {
    const settings = await getSettingsRepo().update({ aiModel: model })
    set({ settings })
  },

  setAiEnabled: async (enabled) => {
    const settings = await getSettingsRepo().update({ aiEnabled: enabled })
    set({ settings })
  },

  setAiProvider: async (provider: AiProvider) => {
    const settings = await getSettingsRepo().update({ aiProvider: provider })
    set({ settings })
  },

  setAiEndpoint: async (endpoint) => {
    const settings = await getSettingsRepo().update({ aiEndpoint: endpoint || undefined })
    set({ settings })
  },

  setAiTemperature: async (temp) => {
    const settings = await getSettingsRepo().update({ aiTemperature: temp })
    set({ settings })
  },

  setAiMaxTokens: async (tokens) => {
    const settings = await getSettingsRepo().update({ aiMaxTokens: tokens })
    set({ settings })
  },

  setAiUserProfile: async (profile) => {
    const settings = await getSettingsRepo().update({ aiUserProfile: profile })
    set({ settings })
  },

  setAiUseProfile: async (use) => {
    const settings = await getSettingsRepo().update({ aiUseProfile: use })
    set({ settings })
  },

  setAiCustomSystemPrompt: async (prompt) => {
    const settings = await getSettingsRepo().update({ aiCustomSystemPrompt: prompt || undefined })
    set({ settings })
  },

  setAiSkills: async (skills) => {
    const settings = await getSettingsRepo().update({ aiSkills: skills })
    set({ settings })
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

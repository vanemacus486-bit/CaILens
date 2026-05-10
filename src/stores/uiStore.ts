import { create } from 'zustand'
import type { CreateEventInput } from '@/domain/event'

export type SettingsTab = 'categories' | 'appearance' | 'data' | 'storage' | 'about'

interface UIState {
  sidebarExpanded: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  settingsDrawerOpen: boolean
  activeSettingsTab: SettingsTab
  clipboardEvent: CreateEventInput | null
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsDrawerOpen: (open: boolean) => void
  setActiveSettingsTab: (tab: SettingsTab) => void
  setClipboardEvent: (event: CreateEventInput | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: true,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  settingsDrawerOpen: false,
  activeSettingsTab: 'categories',
  clipboardEvent: null,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSettingsDrawerOpen: (open) => set({ settingsDrawerOpen: open }),
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setClipboardEvent: (event) => set({ clipboardEvent: event }),
}))

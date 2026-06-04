import { create } from 'zustand'
import type { CreateEventInput } from '@/domain/event'

export type SettingsTab = 'categories' | 'appearance' | 'data' | 'storage' | 'about' | 'shortcuts'

interface UIState {
  sidebarExpanded: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  activeSettingsTab: SettingsTab
  clipboardEvent: CreateEventInput | null
  lastFocusedEventId: string | null
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setActiveSettingsTab: (tab: SettingsTab) => void
  setClipboardEvent: (event: CreateEventInput | null) => void
  setLastFocusedEventId: (id: string | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: true,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  activeSettingsTab: 'categories',
  clipboardEvent: null,
  lastFocusedEventId: null,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setClipboardEvent: (event) => set({ clipboardEvent: event }),
  setLastFocusedEventId: (id) => set({ lastFocusedEventId: id }),
}))

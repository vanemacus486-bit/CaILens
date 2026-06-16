import { create } from 'zustand'
import type { CreateEventInput } from '@/domain/event'

export type SettingsTab =
  | 'categories'
  | 'appearance'
  | 'shortcuts'
  | 'data'
  | 'storage'
  | 'about'

interface UIState {
  sidebarExpanded: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  settingsModalOpen: boolean
  activeSettingsTab: SettingsTab
  clipboardEvent: CreateEventInput | null
  lastFocusedEventId: string | null
  quickCaptureInboxOpen: boolean
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsModalOpen: (open: boolean) => void
  setActiveSettingsTab: (tab: SettingsTab) => void
  setClipboardEvent: (event: CreateEventInput | null) => void
  setLastFocusedEventId: (id: string | null) => void
  setQuickCaptureInboxOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: true,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  settingsModalOpen: false,
  activeSettingsTab: 'categories',
  clipboardEvent: null,
  lastFocusedEventId: null,
  quickCaptureInboxOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setClipboardEvent: (event) => set({ clipboardEvent: event }),
  setLastFocusedEventId: (id) => set({ lastFocusedEventId: id }),
  setQuickCaptureInboxOpen: (open) => set({ quickCaptureInboxOpen: open }),
}))

import { create } from 'zustand'
import type { CreateEventInput } from '@/domain/event'
import type { AnchorMatch } from '@/domain/aiChat'

export type SettingsTab = 'categories' | 'appearance' | 'data' | 'storage' | 'about' | 'shortcuts' | 'ai'

interface UIState {
  sidebarExpanded: boolean
  mobileSidebarOpen: boolean
  commandPaletteOpen: boolean
  settingsDrawerOpen: boolean
  activeSettingsTab: SettingsTab
  clipboardEvent: CreateEventInput | null
  lastFocusedEventId: string | null
  aiChatDrawerOpen: boolean
  hoveredAnchor: AnchorMatch | null
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsDrawerOpen: (open: boolean) => void
  setActiveSettingsTab: (tab: SettingsTab) => void
  setClipboardEvent: (event: CreateEventInput | null) => void
  setLastFocusedEventId: (id: string | null) => void
  setAiChatDrawerOpen: (open: boolean) => void
  setHoveredAnchor: (match: AnchorMatch | null) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: true,
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  settingsDrawerOpen: false,
  activeSettingsTab: 'categories',
  clipboardEvent: null,
  lastFocusedEventId: null,
  aiChatDrawerOpen: false,
  hoveredAnchor: null,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSettingsDrawerOpen: (open) => set({ settingsDrawerOpen: open }),
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setClipboardEvent: (event) => set({ clipboardEvent: event }),
  setLastFocusedEventId: (id) => set({ lastFocusedEventId: id }),
  setAiChatDrawerOpen: (open) => set({ aiChatDrawerOpen: open }),
  setHoveredAnchor: (match) => set({ hoveredAnchor: match }),
}))

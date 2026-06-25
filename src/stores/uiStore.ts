import { create } from 'zustand'
import type { CreateEventInput } from '@/domain/event'

export type SettingsTab =
  | 'categories'
  | 'hygiene'
  | 'appearance'
  | 'shortcuts'
  | 'data'
  | 'storage'
  | 'about'
  | 'support'

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

const SIDEBAR_KEY = 'cailens.sidebarOpen'

// 默认收起：左侧面板由顶栏 ☰ 按需展开，不再常驻
function loadSidebarExpanded(): boolean {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(SIDEBAR_KEY) === 'true'
  } catch {
    return false
  }
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: loadSidebarExpanded(),
  mobileSidebarOpen: false,
  commandPaletteOpen: false,
  settingsModalOpen: false,
  activeSettingsTab: 'categories',
  clipboardEvent: null,
  lastFocusedEventId: null,
  quickCaptureInboxOpen: false,
  toggleSidebar: () => set((s) => {
    const next = !s.sidebarExpanded
    try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch { /* ignore */ }
    return { sidebarExpanded: next }
  }),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setClipboardEvent: (event) => set({ clipboardEvent: event }),
  setLastFocusedEventId: (id) => set({ lastFocusedEventId: id }),
  setQuickCaptureInboxOpen: (open) => set({ quickCaptureInboxOpen: open }),
}))

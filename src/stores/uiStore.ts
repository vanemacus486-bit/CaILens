import { create } from 'zustand'

interface UIState {
  sidebarExpanded: boolean
  mobileSidebarOpen: boolean
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: true,
  mobileSidebarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
}))

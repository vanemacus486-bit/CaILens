import { create } from 'zustand'

interface UIState {
  sidebarExpanded: boolean
  mobileSidebarOpen: boolean
  searchOpen: boolean
  toggleSidebar: () => void
  setMobileSidebarOpen: (open: boolean) => void
  setSearchOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>()((set) => ({
  sidebarExpanded: true,
  mobileSidebarOpen: false,
  searchOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
  setMobileSidebarOpen: (open) => set({ mobileSidebarOpen: open }),
  setSearchOpen: (open) => set({ searchOpen: open }),
}))

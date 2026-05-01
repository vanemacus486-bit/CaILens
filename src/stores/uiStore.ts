import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UIState {
  sidebarExpanded: boolean
  toggleSidebar: () => void
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarExpanded: true,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
    }),
    { name: 'callens-ui-state' },
  ),
)

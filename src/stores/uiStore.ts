import { create } from 'zustand'
import type { CreateEventInput } from '@/domain/event'

/**
 * 设置选项卡 key。
 *
  * 前七个是侧栏可见项（顺序见 `features/settings/settingsTabs.ts`）；
 * 其余是**隐藏子页**：从父页进入，不出现在侧栏 —— 保留是为了不丢已有功能。
 */
export type SettingsTab =
  // 侧栏可见
  | 'about'
  | 'appearance'
  | 'interface'
  | 'file'
  | 'shortcuts'
  | 'core-plugins'
  | 'third-party'
  // 隐藏子页
  | 'account'
  | 'data'
  | 'storage'
  | 'support'
  // 旧 key（历史值 / 旧调用点）
  | 'plugins'

/**
 * 打开设置且未指定页签时落在哪一页。
 *
 * 必须是 `features/settings/settingsTabs.ts` 里 `SETTINGS_TABS` 的第一项 ——
 * 用户的心智模型是「打开设置就从第一个选项卡开始」，而不是回到上次停留的页。
 * 两处的一致性由 `features/settings/__tests__/settingsTabs.test.ts` 断言。
 */
export const DEFAULT_SETTINGS_TAB: SettingsTab = 'about'

interface UIState {
  sidebarExpanded: boolean
  commandPaletteOpen: boolean
  settingsModalOpen: boolean
  activeSettingsTab: SettingsTab
  clipboardEvent: CreateEventInput | null
  lastFocusedEventId: string | null
  quickCaptureInboxOpen: boolean
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsModalOpen: (open: boolean) => void
  /**
   * 打开设置。
   *
   * 桌面端（Tauri）走独立窗口 `open_settings_window`：和主窗口平级、
   * 自带标题栏、可最小化/最大化/全屏/缩放。网页端没有多窗口能力，
   * 回落成原来的模态弹窗。
   *
   * `tab` 会同时写进本窗口的 activeSettingsTab（窗口内导航用），
   * 并作为参数传给 Rust——已存在的窗口靠 `settings:set-tab` 事件切过去。
   */
  openSettings: (tab?: SettingsTab) => Promise<void>
  setActiveSettingsTab: (tab: SettingsTab) => void
  setClipboardEvent: (event: CreateEventInput | null) => void
  setLastFocusedEventId: (id: string | null) => void
  setQuickCaptureInboxOpen: (open: boolean) => void
}

const SIDEBAR_KEY = 'cailens.sidebarOpen.v2'

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
  commandPaletteOpen: false,
  settingsModalOpen: false,
  activeSettingsTab: DEFAULT_SETTINGS_TAB,
  clipboardEvent: null,
  lastFocusedEventId: null,
  quickCaptureInboxOpen: false,
  toggleSidebar: () => set((s) => {
    const next = !s.sidebarExpanded
    try { localStorage.setItem(SIDEBAR_KEY, String(next)) } catch { /* ignore */ }
    return { sidebarExpanded: next }
  }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSettingsModalOpen: (open) => set({ settingsModalOpen: open }),
  openSettings: async (tab) => {
    // 无条件写本窗口页签：不传就是「回到第一项」，不是「保持上次」。
    const target = tab ?? DEFAULT_SETTINGS_TAB
    set({ activeSettingsTab: target })
    const { isTauriDesktop } = await import('@/lib/platform')
    if (isTauriDesktop()) {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        // 桌面独立窗口有自己的一份 store，必须把 target 传过去：
        // Rust 只在 `Some(tab)` 时 emit `settings:set-tab`，传 null 时已存在的窗口原地不动。
        await invoke('open_settings_window', { tab: target })
        return
      } catch (e) {
        console.error('[openSettings] 独立窗口打开失败，回落为弹窗', e)
      }
    }
    set({ settingsModalOpen: true })
  },
  setActiveSettingsTab: (tab) => set({ activeSettingsTab: tab }),
  setClipboardEvent: (event) => set({ clipboardEvent: event }),
  setLastFocusedEventId: (id) => set({ lastFocusedEventId: id }),
  setQuickCaptureInboxOpen: (open) => set({ quickCaptureInboxOpen: open }),
}))

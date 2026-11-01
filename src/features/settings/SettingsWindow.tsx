/**
 * # SettingsWindow — 独立设置窗口的壳
 *
 * 和 `SettingsModal` 的区别不是外观，而是**宿主**：
 * 这个组件跑在自己的 WebView 里（Tauri label = `settings`），由
 * `open_settings_window` 命令创建，因此它拥有独立的窗口生命周期——
 * 可以最小化、最大化、全屏、拖动缩放，关闭后主窗口不受影响。
 *
 * 三件事必须在这里做，缺一个就会出现「设置窗口一片空白 / 改了不生效」：
 *
 * 1. **自建标题栏**：`tauri.conf.json` 主窗口是 `decorations: false`，
 *    新窗口在 Rust 侧同样关掉了装饰，所以拖拽区 + 窗口按钮得自己画。
 * 2. **自己 bootstrap 数据层**：`main.tsx` 里 `initRepositories` 只跑在
 *    主窗口的启动流程；新窗口是同一份 bundle 的另一个实例，路由直接落在
 *    `/settings-window`，不走 `Layout`，因此**必须自己 initRepositories +
 *    加载 categories/settings/profile**，否则读 store 全是默认值。
 * 3. **自己应用主题**：`applyTheme` 是在 settingsStore 的 loadSettings 里
 *    调的；不加载就永远是浅色，深色模式下会出现一个刺眼的白色设置窗。
 *
 * 跨窗口同步：本窗口写 settings/categories/profile 时 store 会 broadcast，
 * 反过来别的窗口写了，`subscribeCrossWindowWrites` 收到后重读。
 */

import { useEffect, useState } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'
import { getAdapter } from '@/data/adapterFactory'
import { initRepositories } from '@/data/getRepositories'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useProfileStore } from '@/stores/profileStore'
import { subscribeCrossWindowWrites } from '@/lib/crossWindowSync'
import { isTauriDesktop } from '@/lib/platform'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { WindowControls } from '@/components/nav/WindowControls'
import { SettingsPage } from './SettingsPage'

/** 标题栏：整条都是拖拽区，只有按钮用 `data-tauri-drag-region={false}` 排除 */
const TITLEBAR =
  'flex-shrink-0 flex items-center gap-2 h-10 pl-3 pr-1 select-none ' +
  'border-b border-border-subtle bg-surface-raised/60'

export function SettingsWindow() {
  const [ready, setReady] = useState(false)

  // ── 数据层 bootstrap（本窗口独立于主窗口的启动流程） ──────────────
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const adapter = await getAdapter()
        initRepositories(adapter)
        await Promise.all([
          useAppSettingsStore.getState().loadSettings(),
          useCategoryStore.getState().loadCategories(),
          useProfileStore.getState().loadProfile(),
        ])
      } catch (e) {
        // 不吞异常：初始化失败时页面会停在空骨架，控制台必须留下原因
        console.error('[SettingsWindow] 初始化失败', e)
      }
      if (!cancelled) setReady(true)
    })()
    return () => { cancelled = true }
  }, [])

  // ── 别处（主窗口）改了设置 → 本窗口重读 ─────────────────────────
  useEffect(() => {
    return subscribeCrossWindowWrites((table) => {
      if (table === 'settings') void useAppSettingsStore.getState().loadSettings()
      else if (table === 'categories') void useCategoryStore.getState().loadCategories()
      else if (table === 'profile') void useProfileStore.getState().loadProfile()
    })
  }, [])

  // ── 打开时指定 tab（两条通道，缺一会丢一次） ────────────────────
  // 1. 首次建窗：Rust 把 tab 塞进 URL 的 `?tab=`。此刻 WebView 还没起来，
  //    事件发出去必丢，只能读 URL。
  // 2. 窗口已存在：Rust 走 `settings:set-tab` 事件，这里订阅。
  useEffect(() => {
    // 窗口 URL 形如 index.html#/settings-window?tab=appearance。
    // HashRouter 下查询串在 hash 内部，window.location.search 是空的，必须自己拆。
    const hash = window.location.hash
    const qIndex = hash.indexOf('?')
    if (qIndex >= 0) {
      const tab = new URLSearchParams(hash.slice(qIndex + 1)).get('tab')
      if (tab) useUIStore.getState().setActiveSettingsTab(tab as SettingsTab)
    }

    if (!isTauriDesktop()) return
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/event')
      .then(({ listen }) => listen<string>('settings:set-tab', (e) => {
        useUIStore.getState().setActiveSettingsTab(e.payload as SettingsTab)
      }))
      .then((u) => { unlisten = u })
      .catch(() => {})
    return () => unlisten?.()
  }, [])

  // 窗口标题（任务栏 / Alt+Tab 里显示的就是它）
  useEffect(() => {
    document.title = '设置 · CaILens'
  }, [])

  // Esc 关窗：弹窗时代的肌肉记忆，独立窗口里也该成立
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      const el = document.activeElement
      // 正在输入框里按 Esc 是「取消输入」，不是关窗口
      if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) return
      if (!isTauriDesktop()) return
      e.preventDefault()
      getCurrentWindow().close().catch(() => {})
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-surface-base">
      <header className={TITLEBAR} data-tauri-drag-region>
        <SettingsIcon size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
        <span className="text-xs font-sans font-medium text-text-secondary truncate">设置</span>
        <div className="flex-1" data-tauri-drag-region />
        <WindowControls fullscreenToggle />
      </header>

      <div className="flex-1 min-h-0 overflow-hidden">
        {ready ? (
          <SettingsPage />
        ) : (
          <div className="flex h-full items-center justify-center" aria-busy="true">
            <div className="flex w-full max-w-[240px] flex-col gap-2.5 px-6">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-2 animate-pulse rounded-full bg-surface-sunken"
                  style={{ animationDelay: `${i * 120}ms`, width: `${100 - i * 18}%` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

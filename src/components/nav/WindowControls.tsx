import { useEffect, useState } from 'react'
import { Minus, Square, Copy, X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { isTauriDesktop } from '@/lib/platform'

const BTN_BASE =
  'w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary transition-colors duration-200 cursor-pointer'

/**
 * 自绘窗口控制按钮（最小化 / 最大化-还原 / 关闭）。
 *
 * 仅在 Tauri 桌面端渲染——网页与 Capacitor 移动端返回 null（它们没有自绘标题栏）。
 * 配合 `tauri.conf.json` 的 `decorations: false` 与顶栏上的 `data-tauri-drag-region`，
 * 把原生标题栏那一行并入应用顶栏。无分隔线，关闭键悬停实心系统红 + 白 ✕。
 */
export function WindowControls() {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    if (!isTauriDesktop()) return
    const win = getCurrentWindow()
    let unlisten: (() => void) | undefined
    const sync = () => { win.isMaximized().then(setMaximized).catch(() => {}) }
    sync()
    win.onResized(sync).then((u) => { unlisten = u }).catch(() => {})
    return () => unlisten?.()
  }, [])

  if (!isTauriDesktop()) return null

  const win = getCurrentWindow()
  return (
    <div className="flex items-center gap-0.5 ml-1">
      <button
        type="button"
        onClick={() => { win.minimize().catch(() => {}) }}
        className={`${BTN_BASE} hover:text-text-primary hover:bg-surface-sunken`}
        aria-label="最小化"
      >
        <Minus size={16} strokeWidth={1.75} />
      </button>
      <button
        type="button"
        onClick={() => { win.toggleMaximize().catch(() => {}) }}
        className={`${BTN_BASE} hover:text-text-primary hover:bg-surface-sunken`}
        aria-label={maximized ? '还原' : '最大化'}
      >
        {maximized
          ? <Copy size={13} strokeWidth={1.75} />
          : <Square size={13} strokeWidth={1.75} />}
      </button>
      <button
        type="button"
        onClick={() => { win.close().catch(() => {}) }}
        className={`${BTN_BASE} hover:text-white hover:bg-[var(--color-bg-danger-solid)] active:text-white active:bg-[var(--color-bg-danger-solid-press)]`}
        aria-label="关闭"
      >
        <X size={16} strokeWidth={1.75} />
      </button>
    </div>
  )
}

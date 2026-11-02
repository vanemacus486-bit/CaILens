import { useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '@/i18n/useT'
import { useUIStore } from '@/stores/uiStore'
import { cn } from '@/lib/utils'
import { TAB_CONTENT, FALLBACK_TAB } from './settingsTabContent'
import { SettingsNav } from './SettingsNav'
import { useSettingsScrollReset } from './useSettingsScrollReset'

/**
 * 网页端设置弹窗。
 *
 * 侧栏、搜索、键盘导航都在 `SettingsNav` 里 —— 与桌面独立窗口的
 * `SettingsPage` 共用同一份实现，这边只负责「弹窗」这层壳。
 */
export function SettingsModal() {
  const open = useUIStore((s) => s.settingsModalOpen)
  const setOpen = useUIStore((s) => s.setSettingsModalOpen)
  const activeTab = useUIStore((s) => s.activeSettingsTab)
  const t = useT()
  const scrollRef = useSettingsScrollReset(activeTab)

  // Esc 关闭。搜索框里的 Esc 由 SettingsNav 自己处理（有输入时清空并阻止冒泡）。
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen])

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) setOpen(false)
    },
    [setOpen],
  )

  if (!open) return null

  const ActiveComponent = TAB_CONTENT[activeTab] ?? FALLBACK_TAB

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.settings')}
    >
      {/* Backdrop */}
      <div className="pointer-events-none absolute inset-0 animate-settings-fade-in bg-black/40 backdrop-blur-sm" />

      {/* Card */}
      <div
        className={cn(
          'relative flex overflow-hidden rounded-2xl border border-border-subtle bg-surface-base shadow-2xl',
          'h-[660px] w-[920px] max-h-[88vh] max-w-[92vw]',
          'animate-settings-scale-in',
        )}
      >
        <SettingsNav activeTab={activeTab} autoFocusSearch />

        <main ref={scrollRef} className="min-w-0 flex-1 overflow-y-auto bg-surface-base">
          <div key={activeTab} className="mx-auto max-w-[720px] animate-settings-fade-in px-8 py-8 max-[820px]:px-5 max-[820px]:py-6">
            <ActiveComponent />
          </div>
        </main>
      </div>
    </div>,
    document.body,
  )
}

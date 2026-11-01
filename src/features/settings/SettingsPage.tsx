import { useCallback } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { NAV_TABS } from './settingsTabs'
import { TAB_CONTENT, FALLBACK_TAB } from './settingsTabContent'

/**
 * 桌面独立窗口里的设置页（Tauri `settings` 窗口）。
 *
 * 导航结构来自 `settingsTabs.tsx` —— 与网页端弹窗共用同一份定义，
 * 避免两边各写一张表、改一处漏一处。
 */
export function SettingsPage() {
  const activeSettingsTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)

  const t = useT()
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)
  const ActiveTab = TAB_CONTENT[activeSettingsTab] ?? FALLBACK_TAB

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = NAV_TABS.findIndex((tab) => tab.key === activeSettingsTab)
      if (idx < 0) return
      let nextIdx = idx
      if (e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % NAV_TABS.length
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + NAV_TABS.length) % NAV_TABS.length
        e.preventDefault()
      }
      if (nextIdx !== idx) {
        setActiveSettingsTab(NAV_TABS[nextIdx].key)
      }
    },
    [activeSettingsTab, setActiveSettingsTab],
  )

  return (
    <div className="settings-page flex h-full bg-surface-base">
      {/* ── Sidebar navigation ── */}
      <nav
        className="settings-nav w-[220px] flex-shrink-0 border-r border-border-subtle bg-surface-base overflow-y-auto"
        onKeyDown={handleKeyDown}
        role="tablist"
        aria-orientation="vertical"
        aria-label={t('nav.settings')}
      >
        <div className="flex flex-col gap-0.5 px-2.5 pt-7 pb-6">
          <span className="px-3 pb-0.5 text-2xs font-sans font-medium uppercase tracking-wider text-text-quaternary">
            {tl('选项', 'Options')}
          </span>
          {NAV_TABS.map((tab) => {
            const active = activeSettingsTab === tab.key
            return (
              <button
                key={tab.key}
                id={`settings-tab-${tab.key}`}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSettingsTab(tab.key)}
                className={cn(
                  'w-full text-left rounded-lg transition-colors duration-200 cursor-pointer border-none',
                  'flex flex-col items-start gap-0.5',
                  'pl-3 pr-2 py-1.5',
                  active
                    ? 'bg-surface-sunken shadow-pill'
                    : 'hover:bg-surface-raised',
                )}
              >
                <span
                  className={cn(
                    'text-sm font-sans font-medium transition-colors duration-200',
                    active ? 'text-text-primary' : 'text-text-secondary',
                  )}
                >
                  {tl(tab.labelZh, tab.labelEn)}
                </span>
                <span
                  className={cn(
                    'text-xs font-sans transition-colors duration-200',
                    active ? 'text-text-tertiary' : 'text-text-tertiary opacity-60',
                  )}
                >
                  {tl(tab.descZh, tab.descEn)}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Content panel ── */}
      <main className="settings-main flex-1 overflow-y-auto min-w-0 bg-surface-base/50">
        <div
          className={cn(
            'settings-content mx-auto px-10 py-10',
            activeSettingsTab === 'appearance' ? 'max-w-5xl' : 'max-w-xl',
          )}
        >
          <div key={activeSettingsTab} className="animate-settings-fade-in">
            <ActiveTab />
          </div>
        </div>
      </main>
    </div>
  )
}

import { useT } from '@/i18n/useT'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { NAV_TABS, type TabDef } from './settingsTabs'
import { TAB_CONTENT, FALLBACK_TAB } from './settingsTabContent'

/**
 * 网页端设置弹窗。
 *
 * 导航结构来自 `settingsTabs.tsx` —— 与桌面独立窗口的 `SettingsPage`
 * 共用同一份定义，避免两边各写一张表、改一处漏一处。
 */

/* ── 简单模糊搜索 ── */

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase().replace(/\s+/g, '')
  const t = text.toLowerCase().replace(/\s+/g, '')
  if (t.includes(q)) return true
  if (q.length >= 2) {
    try {
      if (new RegExp(q.split('').join('.*')).test(t)) return true
    } catch { /* ignore */ }
  }
  return false
}

function filterTabs(tabs: readonly TabDef[], query: string): TabDef[] {
  if (!query.trim()) return [...tabs]
  return tabs.filter(
    (tab) =>
      fuzzyMatch(query, tab.labelZh) ||
      fuzzyMatch(query, tab.labelEn) ||
      fuzzyMatch(query, tab.descZh) ||
      fuzzyMatch(query, tab.descEn),
  )
}

export function SettingsModal() {
  const open = useUIStore((s) => s.settingsModalOpen)
  const setOpen = useUIStore((s) => s.setSettingsModalOpen)
  const activeTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useT()
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)

  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Filter tabs by search
  const visibleTabs = useMemo(() => filterTabs(NAV_TABS, searchQuery), [searchQuery])
  const showNoResults = searchQuery.trim().length > 0 && visibleTabs.length === 0

  // Focus search on open
  useEffect(() => {
    if (open) {
      setSearchQuery('')
      const id = setTimeout(() => searchInputRef.current?.focus(), 50)
      return () => clearTimeout(id)
    }
  }, [open])

  // Close on Escape
  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (document.activeElement === searchInputRef.current && searchQuery) {
          setSearchQuery('')
          e.preventDefault()
          return
        }
        setOpen(false)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open, setOpen, searchQuery])

  // Arrow key navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const tabs = NAV_TABS
      if (tabs.length === 0) return
      const idx = tabs.findIndex((tab) => tab.key === activeTab)
      let nextIdx = idx
      if (e.key === 'ArrowDown') {
        nextIdx = idx < 0 ? 0 : (idx + 1) % tabs.length
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        nextIdx = idx < 0 ? tabs.length - 1 : (idx - 1 + tabs.length) % tabs.length
        e.preventDefault()
      }
      if (nextIdx !== idx && nextIdx >= 0) {
        setActiveTab(tabs[nextIdx].key)
      }
    },
    [activeTab, setActiveTab],
  )

  // Backdrop click to close
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
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.settings')}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-settings-fade-in pointer-events-none" />

      {/* Card */}
      <div
        ref={cardRef}
        className={cn(
          'relative flex bg-surface-base rounded-2xl shadow-2xl overflow-hidden border border-border-subtle',
          'animate-settings-scale-in',
          'w-[840px] h-[620px] max-h-[85vh]',
        )}
      >
        {/* ── Left sidebar ── */}
        <nav
          className={cn(
            'flex-shrink-0 border-r border-border-subtle bg-surface-base',
            'flex flex-col',
            'w-[220px]',
          )}
          onKeyDown={handleKeyDown}
          role="tablist"
          aria-orientation="vertical"
        >
          {/* Search — 最上面 */}
          <div className={cn('flex-shrink-0', 'px-3 pt-4 pb-2')}>
            <div className="relative">
              <Search
                size={13}
                strokeWidth={1.75}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none"
              />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('settings.searchPlaceholder')}
                className="w-full pl-8 pr-3 py-1.5 text-xs font-sans text-text-primary bg-surface-base border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none focus:border-border-default transition-shadow duration-150"
              />
            </div>
          </div>

          {/* Tabs */}
          <div className={cn('flex-1 overflow-y-auto', 'flex flex-col gap-0.5 px-2.5 pb-5')}>
            {visibleTabs.length > 0 && (
              <div className="flex flex-col gap-0.5">
                <span className="px-3 pt-1 pb-0.5 text-2xs font-sans font-medium uppercase tracking-wider text-text-quaternary">
                  {tl('选项', 'Options')}
                </span>
                {visibleTabs.map((tab) => {
                  const active = activeTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      id={`settings-tab-${tab.key}`}
                      role="tab"
                      aria-selected={active}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'text-left rounded-lg transition-colors duration-200 cursor-pointer border-none',
                        'w-full flex flex-col items-start gap-0.5 pl-3 pr-2 py-1.5',
                        active
                          ? 'bg-surface-raised shadow-pill'
                          : 'hover:bg-surface-base',
                      )}
                    >
                      <span
                        className={cn(
                          'font-sans font-medium transition-colors duration-200',
                          'text-sm',
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
            )}

            {/* No results */}
            {showNoResults && (
              <div className="px-3 py-6 text-center">
                <p className="text-xs text-text-tertiary font-sans">
                  {t('common.noData')}
                </p>
              </div>
            )}
          </div>
        </nav>

        {/* ── Right content ── */}
        <main className={cn(
          'flex-1 overflow-y-auto min-w-0 bg-surface-base',
        )}>
          <div className={cn(
            'px-10 py-8',
          )}>
            <div key={activeTab} className="animate-settings-fade-in">
              <ActiveComponent />
            </div>
          </div>
        </main>
      </div>
    </div>,
    document.body,
  )
}

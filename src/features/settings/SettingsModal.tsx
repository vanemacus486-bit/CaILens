import { useT } from '@/i18n/useT'
import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { SettingsCategories } from './SettingsCategories'
import { SettingsHygiene } from './SettingsHygiene'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsShortcuts } from './SettingsShortcuts'
import { SettingsData } from './SettingsData'
import { SettingsStorage } from './SettingsStoragePage'
import { SettingsAbout } from './SettingsAbout'
import { SettingsSupport } from './SettingsSupport'
import { SettingsAccount } from './SettingsAccount'
import { isSponsorConfigured } from '@/lib/sponsor'

/* ── Tab 分组定义 ── */

interface TabDef {
  key: SettingsTab
  labelZh: string
  labelEn: string
  descZh: string
  descEn: string
}

// 「支持」入口：配置了真实收款 URL 才在正式构建显示；开发模式始终显示便于预览
const SHOW_SUPPORT = isSponsorConfigured() || import.meta.env.DEV

const SETTINGS_TABS: TabDef[] = [
  { key: 'account',     labelZh: '账户',     labelEn: 'Account',     descZh: '头像与名称',                  descEn: 'Avatar & name' },
  { key: 'categories',  labelZh: '分类',     labelEn: 'Categories',  descZh: '分配每周168小时',              descEn: 'Allocate 168h/week' },
  { key: 'appearance',  labelZh: '外观',     labelEn: 'Appearance',  descZh: '主题、字体与界面语言',          descEn: 'Theme, font & language' },
  { key: 'shortcuts',   labelZh: '快捷',     labelEn: 'Shortcuts',   descZh: '键盘操作绑定',                descEn: 'Keyboard bindings' },
  { key: 'data',        labelZh: '数据',     labelEn: 'Data',        descZh: '导入导出与存储',              descEn: 'Import, export & storage' },
  { key: 'about',       labelZh: '关于',     labelEn: 'About',       descZh: '版本与更新',                  descEn: 'Version & updates' },
  ...(SHOW_SUPPORT
    ? [{ key: 'support' as SettingsTab, labelZh: '支持', labelEn: 'Support', descZh: '赞助与持续更新', descEn: 'Sponsor & updates' }]
    : []),
]

const EXTENSION_TABS: TabDef[] = [
  { key: 'hygiene', labelZh: '卫生', labelEn: 'Hygiene', descZh: '自定义记录的活动与颜色', descEn: 'Tracked activities & colors' },
]

/* ── Tab → 组件映射 ── */

const TAB_CONTENT: Record<SettingsTab, React.FC> = {
  account:     SettingsAccount,
  categories: SettingsCategories,
  hygiene: SettingsHygiene,
  appearance: SettingsAppearance,
  shortcuts: SettingsShortcuts,
  data:        SettingsData,
  storage:     SettingsStorage,
  about:       SettingsAbout,
  support:     SettingsSupport,
}

/* ── 全部 tab（用于键盘导航） ── */

const ALL_TABS = [...SETTINGS_TABS, ...EXTENSION_TABS]

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

function filterTabs(tabs: TabDef[], query: string): TabDef[] {
  if (!query.trim()) return tabs
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
  const isMobile = useIsMobile()

  const t = useT()
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)

  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Filter tabs by search
  const filteredSettings = useMemo(() => filterTabs(SETTINGS_TABS, searchQuery), [searchQuery])
  const filteredExtensions = useMemo(() => filterTabs(EXTENSION_TABS, searchQuery), [searchQuery])
  const showNoResults = searchQuery.trim() && filteredSettings.length === 0 && filteredExtensions.length === 0

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
      const tabs = ALL_TABS
      if (tabs.length === 0) return
      const idx = tabs.findIndex((t) => t.key === activeTab)
      let nextIdx = idx
      if (e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % tabs.length
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + tabs.length) % tabs.length
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

  const ActiveComponent = TAB_CONTENT[activeTab] ?? SettingsCategories

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
          isMobile
            ? 'w-[95vw] h-[92vh] flex-col'
            : 'w-[840px] h-[620px] max-h-[85vh]',
        )}
      >
        {/* ── Left sidebar ── */}
        <nav
          className={cn(
            'flex-shrink-0 flex flex-col bg-surface-sunken border-r border-border-subtle',
            isMobile ? 'w-full border-r-0 border-b h-auto' : 'w-[220px]',
          )}
          onKeyDown={handleKeyDown}
          role="tablist"
          aria-orientation="vertical"
        >
          {/* Search — 最上面 */}
          <div className={cn('flex-shrink-0', isMobile ? 'px-4 pt-3 pb-2' : 'px-3 pt-4 pb-2')}>
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
          <div className={cn('flex-1 overflow-y-auto', isMobile ? 'flex gap-1 px-4 pb-2' : 'flex flex-col gap-0.5 px-2.5 pb-5')}>
            {/* ── 设置区 ── */}
            {filteredSettings.length > 0 && (
              <div className="flex flex-col gap-0.5">
                {!isMobile && (
                  <span className="px-3 pt-1 pb-0.5 text-[10px] font-sans font-medium uppercase tracking-wider text-text-quaternary">
                    {tl('设置', 'Settings')}
                  </span>
                )}
                {filteredSettings.map((tab) => {
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
                        isMobile
                          ? 'px-3 py-1 text-xs font-sans font-medium whitespace-nowrap flex-shrink-0'
                          : 'w-full flex flex-col items-start gap-0.5 pl-3 pr-2 py-1.5',
                        active
                          ? 'bg-surface-raised shadow-pill'
                          : 'hover:bg-surface-base',
                      )}
                    >
                      <span
                        className={cn(
                          'font-sans font-medium transition-colors duration-200',
                          isMobile ? 'text-xs' : 'text-sm',
                          active ? 'text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        {tl(tab.labelZh, tab.labelEn)}
                      </span>
                      {!isMobile && (
                        <span
                          className={cn(
                            'text-[11px] font-sans transition-colors duration-200',
                            active ? 'text-text-tertiary' : 'text-text-tertiary opacity-60',
                          )}
                        >
                          {tl(tab.descZh, tab.descEn)}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── 拓展区 ── */}
            {filteredExtensions.length > 0 && (
              <div className="flex flex-col gap-0.5 mt-0.5">
                {!isMobile && (
                  <span className="px-3 pt-1 pb-0.5 text-[10px] font-sans font-medium uppercase tracking-wider text-text-quaternary">
                    {tl('拓展', 'Extensions')}
                  </span>
                )}
                {filteredExtensions.map((tab) => {
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
                        isMobile
                          ? 'px-3 py-1 text-xs font-sans font-medium whitespace-nowrap flex-shrink-0'
                          : 'w-full flex flex-col items-start gap-0.5 pl-3 pr-2 py-1.5',
                        active
                          ? 'bg-surface-raised shadow-pill'
                          : 'hover:bg-surface-base',
                      )}
                    >
                      <span
                        className={cn(
                          'font-sans font-medium transition-colors duration-200',
                          isMobile ? 'text-xs' : 'text-sm',
                          active ? 'text-text-primary' : 'text-text-secondary',
                        )}
                      >
                        {tl(tab.labelZh, tab.labelEn)}
                      </span>
                      {!isMobile && (
                        <span
                          className={cn(
                            'text-[11px] font-sans transition-colors duration-200',
                            active ? 'text-text-tertiary' : 'text-text-tertiary opacity-60',
                          )}
                        >
                          {tl(tab.descZh, tab.descEn)}
                        </span>
                      )}
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
          isMobile && 'flex-1',
        )}>
          <div className={cn(
            isMobile ? 'px-5 py-5' : 'px-10 py-8',
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

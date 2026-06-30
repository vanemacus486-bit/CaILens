import { useCallback } from 'react'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import { MobileSettingsPage } from './MobileSettingsPage'
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

export function SettingsPage() {
  const isMobile = useIsMobile()
  const activeSettingsTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)

  const t = useT()
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)
  const ActiveTab = TAB_CONTENT[activeSettingsTab] ?? SettingsCategories

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = ALL_TABS.findIndex((t) => t.key === activeSettingsTab)
      let nextIdx = idx
      if (e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % ALL_TABS.length
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + ALL_TABS.length) % ALL_TABS.length
        e.preventDefault()
      }
      if (nextIdx !== idx) {
        setActiveSettingsTab(ALL_TABS[nextIdx].key)
      }
    },
    [activeSettingsTab, setActiveSettingsTab],
  )

  if (isMobile) return <MobileSettingsPage />

  return (
    <div className="flex h-full bg-surface-base">
      {/* ── Sidebar navigation ── */}
      <nav
        className="w-[220px] flex-shrink-0 border-r border-border-subtle bg-surface-base overflow-y-auto"
        onKeyDown={handleKeyDown}
        role="tablist"
        aria-orientation="vertical"
        aria-label={t('nav.settings')}
      >
        <div className="flex flex-col gap-0.5 px-2.5 pt-7 pb-6">
          {/* ── 设置区 ── */}
          <span className="px-3 pb-0.5 text-[10px] font-sans font-medium uppercase tracking-wider text-text-quaternary">
            {tl('设置', 'Settings')}
          </span>
          {SETTINGS_TABS.map((tab) => {
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
                    'text-[11px] font-sans transition-colors duration-200',
                    active ? 'text-text-tertiary' : 'text-text-tertiary opacity-60',
                  )}
                >
                  {tl(tab.descZh, tab.descEn)}
                </span>
              </button>
            )
          })}

          {/* ── 拓展区 ── */}
          <span className="px-3 pt-2 pb-0.5 text-[10px] font-sans font-medium uppercase tracking-wider text-text-quaternary">
            {tl('拓展', 'Extensions')}
          </span>
          {EXTENSION_TABS.map((tab) => {
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
                    'text-[11px] font-sans transition-colors duration-200',
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
      <main className="flex-1 overflow-y-auto min-w-0 bg-surface-base/50">
        <div className={cn('mx-auto px-10 py-10', activeSettingsTab === 'appearance' ? 'max-w-3xl' : 'max-w-xl')}>
          <div key={activeSettingsTab} className="animate-settings-fade-in">
            <ActiveTab />
          </div>
        </div>
      </main>
    </div>
  )
}

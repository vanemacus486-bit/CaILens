import { useCallback } from 'react'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { MobileSettingsPage } from './MobileSettingsPage'
import { SettingsCategories } from './SettingsCategories'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsLanguage } from './SettingsLanguage'
import { SettingsRestrained } from './SettingsRestrained'
import { SettingsData } from './SettingsData'
import { SettingsProfile } from './SettingsProfile'
import { SettingsStorage } from './SettingsStoragePage'
import { SettingsShortcuts } from './SettingsShortcuts'
import { SettingsAbout } from './SettingsAbout'
import { isTauri } from '@/data/tauriFs'

/* ── Tab 分组定义 ── */

const TAB_GROUPS: {
  labelZh: string
  labelEn: string
  tabs: {
    key: SettingsTab
    labelZh: string
    labelEn: string
    descZh: string
    descEn: string
  }[]
}[] = [
  {
    labelZh: '偏好',
    labelEn: 'Preferences',
    tabs: [
      { key: 'categories',  labelZh: '分类',   labelEn: 'Categories',   descZh: '分配每周168小时',  descEn: 'Allocate 168 hours' },
      { key: 'appearance',  labelZh: '外观',   labelEn: 'Appearance',   descZh: '主题与字体',       descEn: 'Theme & font' },
      { key: 'language',    labelZh: '语言',   labelEn: 'Language',     descZh: '界面语言',         descEn: 'Interface language' },
    ],
  },
  {
    labelZh: '高级',
    labelEn: 'Advanced',
    tabs: [
      { key: 'restrained',  labelZh: '克制模式', labelEn: 'Restrained Mode', descZh: '减少视觉刺激', descEn: 'Reduce visual noise' },
      { key: 'shortcuts',   labelZh: '快捷键',   labelEn: 'Shortcuts',     descZh: '键盘操作',       descEn: 'Keyboard actions' },
    ],
  },
  {
    labelZh: '数据',
    labelEn: 'Data',
    tabs: [
      { key: 'data',    labelZh: '数据',   labelEn: 'Data',        descZh: '导入与导出',       descEn: 'Import & export' },
      { key: 'profile',   labelZh: '档案',   labelEn: 'Profile',     descZh: '身体数据',         descEn: 'Body metrics' },
    ],
  },
  {
    labelZh: '其他',
    labelEn: 'Other',
    tabs: isTauri()
      ? [
          { key: 'storage', labelZh: '存储',   labelEn: 'Storage',     descZh: '文件存储路径',     descEn: 'File storage path' },
          { key: 'about',   labelZh: '关于',   labelEn: 'About',       descZh: '版本与变更记录',   descEn: 'Version & changelog' },
        ]
      : [
          { key: 'about',   labelZh: '关于',   labelEn: 'About',       descZh: '版本与变更记录',   descEn: 'Version & changelog' },
        ],
  },
]

/* ── Tab → 组件映射 ── */

const TAB_CONTENT: Record<SettingsTab, React.FC> = {
  categories:  SettingsCategories,
  appearance:  SettingsAppearance,
  language:    SettingsLanguage,
  restrained:  SettingsRestrained,
  data:        SettingsData,
  profile:     SettingsProfile,
  storage:     SettingsStorage,
  shortcuts:   SettingsShortcuts,
  about:       SettingsAbout,
}

/* ── 扁平化所有 tab（用于键盘导航） ── */

const ALL_TABS = TAB_GROUPS.flatMap((g) => g.tabs)

export function SettingsPage() {
  const isMobile = useIsMobile()
  const activeSettingsTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
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
        aria-label={t('设置导航', 'Settings navigation')}
      >
        <div className="px-5 pt-7 pb-3">
          <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
            {t('设置', 'Settings')}
          </h1>
        </div>

        <div className="flex flex-col gap-1 px-2.5 pb-6">
          {TAB_GROUPS.filter((group) => group.tabs.length > 0).map((group) => (
            <div key={group.labelZh} className="mb-3 last:mb-0">
              {/* Group header */}
              <div className="px-3 py-1.5 text-[10px] font-sans font-medium text-text-tertiary uppercase tracking-wider opacity-60">
                {t(group.labelZh, group.labelEn)}
              </div>

              {/* Group tabs */}
              <div className="flex flex-col gap-0.5">
                {group.tabs.map((tab) => {
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
                        {t(tab.labelZh, tab.labelEn)}
                      </span>
                      <span
                        className={cn(
                          'text-[11px] font-sans transition-colors duration-200',
                          active ? 'text-text-tertiary' : 'text-text-tertiary opacity-60',
                        )}
                      >
                        {t(tab.descZh, tab.descEn)}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* ── Divider ── */}
      <div className="w-px bg-border-subtle flex-shrink-0" />

      {/* ── Content panel ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-2xl mx-auto px-8 md:px-10 py-8">
          <div key={activeSettingsTab} className="animate-settings-fade-in">
            <ActiveTab />
          </div>
        </div>
      </main>
    </div>
  )
}

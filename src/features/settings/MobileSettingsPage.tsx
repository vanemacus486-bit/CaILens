import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { SettingsCategories } from './SettingsCategories'
import { SettingsHygiene } from './SettingsHygiene'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsShortcuts } from './SettingsShortcuts'
import { SettingsData } from './SettingsData'
import { SettingsStorage } from './SettingsStoragePage'
import { SettingsAbout } from './SettingsAbout'
import { SettingsSupport } from './SettingsSupport'
import { isTauri } from '@/data/tauriFs'
import { isSponsorConfigured } from '@/lib/sponsor'

const MOBILE_TABS: { key: SettingsTab; label: string; labelZh: string }[] = [
  { key: 'categories', label: 'Categories', labelZh: '分类' },
  { key: 'hygiene', label: 'Hygiene', labelZh: '卫生' },
  { key: 'appearance', label: 'Appearance', labelZh: '外观与语言' },
  { key: 'shortcuts',  label: 'Shortcuts', labelZh: '快捷键' },
  { key: 'data',       label: 'Data & Profile', labelZh: '数据与档案' },
  ...(isTauri() ? [{ key: 'storage' as SettingsTab, label: 'Storage', labelZh: '存储' }] : []),
  { key: 'about' as SettingsTab, label: 'About', labelZh: '关于' },
  ...(isSponsorConfigured() || import.meta.env.DEV
    ? [{ key: 'support' as SettingsTab, label: 'Support', labelZh: '支持' }]
    : []),
]

const MOBILE_TAB_CONTENT: Record<SettingsTab, React.FC> = {
  categories: SettingsCategories,
  hygiene: SettingsHygiene,
  appearance: SettingsAppearance,
  shortcuts:  SettingsShortcuts,
  data:       SettingsData,
  storage:    SettingsStorage,
  about:      SettingsAbout,
  support:    SettingsSupport,
}

export function MobileSettingsPage() {
  const navigate = useNavigate()
  const activeSettingsTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)
  const ActiveTab = MOBILE_TAB_CONTENT[activeSettingsTab] ?? SettingsCategories

  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Top bar */}
      <div
        className="flex items-center px-3 py-3 border-b border-border-subtle flex-shrink-0"
        style={{ width: '100vw' }}
      >
        <button
          onClick={() => navigate(-1)}
          className="w-10 h-10 flex items-center justify-center rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 flex-shrink-0"
          aria-label="Back"
        >
          <ArrowLeft size={20} strokeWidth={1.75} />
        </button>
        <h1 className="flex-1 text-center font-serif text-lg font-medium text-text-primary">
          {language === 'zh' ? '设置' : 'Settings'}
        </h1>
        <div className="w-10 flex-shrink-0" />
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 px-4 pt-3 pb-2 overflow-x-auto flex-shrink-0 -mx-4 px-4 scrollbar-hide">
        {MOBILE_TABS.map((tab) => {
          const active = activeSettingsTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSettingsTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 whitespace-nowrap flex-shrink-0',
                active
                  ? 'bg-surface-sunken text-text-primary shadow-pill'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
              )}
            >
              {language === 'zh' ? tab.labelZh : tab.label}
            </button>
          )
        })}
      </div>

      <div className="h-px bg-border-subtle flex-shrink-0" />

      {/* Content */}
      <div className="h-full px-4 py-4 flex-1 overflow-y-auto">
        <div key={activeSettingsTab} className="animate-settings-fade-in">
          <ActiveTab />
        </div>
      </div>
    </div>
  )
}

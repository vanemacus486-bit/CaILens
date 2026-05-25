import { ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { SettingsCategories } from './SettingsCategories'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsData } from './SettingsData'
import { SettingsStorage } from './SettingsStorage'
import { SettingsAbout } from './SettingsAbout'

const MOBILE_TABS: { key: SettingsTab; label: string; labelZh: string }[] = [
  { key: 'categories', label: 'Categories', labelZh: '分类' },
  { key: 'appearance', label: 'Appearance', labelZh: '外观' },
  { key: 'data',       label: 'Data',       labelZh: '数据' },
  { key: 'storage',    label: 'Storage',    labelZh: '存储' },
  { key: 'about',      label: 'About',      labelZh: '关于' },
]

const MOBILE_TAB_CONTENT: Record<string, React.FC> = {
  categories: SettingsCategories,
  appearance: SettingsAppearance,
  data:       SettingsData,
  storage:    SettingsStorage,
  about:      SettingsAbout,
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
        <div className="w-10 flex-shrink-0" /> {/* spacer for centering */}
      </div>

      {/* Tab bar */}
      <div className="flex gap-0.5 px-4 pt-3 pb-2 overflow-x-auto flex-shrink-0">
        {MOBILE_TABS.map((tab) => {
          const active = activeSettingsTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSettingsTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 whitespace-nowrap',
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
      <div className="px-4 py-4 flex-1 overflow-y-auto">
        <ActiveTab />
      </div>
    </div>
  )
}

import { useEffect } from 'react'
import { Drawer } from '@/components/ui/Drawer'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { SettingsCategories } from '@/features/settings/SettingsCategories'
import { SettingsAppearance } from '@/features/settings/SettingsAppearance'
import { SettingsData } from '@/features/settings/SettingsData'
import { SettingsStorage } from '@/features/settings/SettingsStorage'
import { SettingsAbout } from '@/features/settings/SettingsAbout'
import { SettingsShortcuts } from '@/features/settings/SettingsShortcuts'
import { SettingsAI } from '@/features/settings/SettingsAI'
import { cn } from '@/lib/utils'

const TABS: { key: SettingsTab; label: string; labelZh: string }[] = [
  { key: 'categories',  label: 'Categories',     labelZh: '分类' },
  { key: 'appearance',  label: 'Appearance',     labelZh: '外观' },
  { key: 'data',        label: 'Data',           labelZh: '数据' },
  { key: 'storage',     label: 'Storage',        labelZh: '存储' },
  { key: 'shortcuts',   label: 'Shortcuts',      labelZh: '快捷键' },
  { key: 'about',       label: 'About',          labelZh: '关于' },
]

const TAB_CONTENT: Record<SettingsTab, React.FC> = {
  categories: SettingsCategories,
  appearance: SettingsAppearance,
  data:       SettingsData,
  storage:    SettingsStorage,
  shortcuts:  SettingsShortcuts,
  about:      SettingsAbout,
  ai:         SettingsAI,
}

export function SettingsDrawer() {
  const settingsDrawerOpen = useUIStore((s) => s.settingsDrawerOpen)
  const setSettingsDrawerOpen = useUIStore((s) => s.setSettingsDrawerOpen)
  const activeSettingsTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)

  // Tab title
  useEffect(() => {
    document.title = language === 'zh' ? 'CaILens · 设置' : 'CaILens · Settings'
  }, [language])

  const ActiveTab = TAB_CONTENT[activeSettingsTab]

  return (
    <Drawer
      open={settingsDrawerOpen}
      onOpenChange={setSettingsDrawerOpen}
    >
      {/* Tab bar */}
      <div className="flex gap-0.5 px-5 pt-4 pb-3 overflow-x-auto flex-shrink-0">
        {TABS.map((tab) => {
          const active = activeSettingsTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveSettingsTab(tab.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none whitespace-nowrap',
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

      {/* Tab content */}
      <div className="px-5 py-5 flex-1 overflow-y-auto">
        <div key={activeSettingsTab} className="animate-settings-fade-in">
          <ActiveTab />
        </div>
      </div>
    </Drawer>
  )
}

import { useCallback } from 'react'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { cn } from '@/lib/utils'
import { MobileSettingsPage } from './MobileSettingsPage'
import { SettingsCategories } from './SettingsCategories'
import { SettingsAppearance } from './SettingsAppearance'
import { SettingsData } from './SettingsData'
import { SettingsStorage } from './SettingsStorage'
import { SettingsShortcuts } from './SettingsShortcuts'
import { SettingsAbout } from './SettingsAbout'

const TABS: { key: SettingsTab; labelZh: string; labelEn: string }[] = [
  { key: 'categories', labelZh: '分类',   labelEn: 'Categories' },
  { key: 'appearance', labelZh: '外观',   labelEn: 'Appearance' },
  { key: 'data',       labelZh: '数据',   labelEn: 'Data'       },
  { key: 'storage',    labelZh: '存储',   labelEn: 'Storage'    },
  { key: 'shortcuts',  labelZh: '快捷键', labelEn: 'Shortcuts'  },
  { key: 'about',      labelZh: '关于',   labelEn: 'About'      },
]

const TAB_CONTENT: Record<SettingsTab, React.FC> = {
  categories: SettingsCategories,
  appearance: SettingsAppearance,
  data:       SettingsData,
  storage:    SettingsStorage,
  shortcuts:  SettingsShortcuts,
  about:      SettingsAbout,
}

export function SettingsPage() {
  const isMobile = useIsMobile()
  const activeSettingsTab = useUIStore((s) => s.activeSettingsTab)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const language = useAppSettingsStore((s) => s.settings.language)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const ActiveTab = TAB_CONTENT[activeSettingsTab] ?? SettingsCategories

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const idx = TABS.findIndex((t) => t.key === activeSettingsTab)
      let nextIdx = idx
      if (e.key === 'ArrowDown') {
        nextIdx = (idx + 1) % TABS.length
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        nextIdx = (idx - 1 + TABS.length) % TABS.length
        e.preventDefault()
      }
      if (nextIdx !== idx) {
        setActiveSettingsTab(TABS[nextIdx].key)
        const btn = document.getElementById(`settings-tab-${TABS[nextIdx].key}`)
        btn?.focus()
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
        <div className="px-4 pt-6 pb-3">
          <h1 className="font-serif text-lg font-medium text-text-primary">
            {t('设置', 'Settings')}
          </h1>
        </div>
        <div className="flex flex-col gap-0.5 px-2 pb-4">
          {TABS.map((tab) => {
            const active = activeSettingsTab === tab.key
            return (
              <button
                key={tab.key}
                id={`settings-tab-${tab.key}`}
                role="tab"
                aria-selected={active}
                onClick={() => setActiveSettingsTab(tab.key)}
                className={cn(
                  'w-full text-left px-3 py-2 rounded-lg text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                  active
                    ? 'bg-surface-sunken text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
                )}
              >
                {t(tab.labelZh, tab.labelEn)}
              </button>
            )
          })}
        </div>
      </nav>

      {/* ── Divider ── */}
      <div className="w-px bg-border-subtle flex-shrink-0" />

      {/* ── Content panel ── */}
      <main className="flex-1 overflow-y-auto min-w-0">
        <div className="max-w-2xl mx-auto px-8 py-8">
          <div key={activeSettingsTab} className="animate-settings-fade-in">
            <ActiveTab />
          </div>
        </div>
      </main>
    </div>
  )
}

import { Search, Settings } from 'lucide-react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { SlideSegmented } from './SlideSegmented'
import { useDomainNav } from './domainNav'

export function TopNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const language = useAppSettingsStore((s) => s.settings.language)
  const { activeMode, navItems, handleModeChange } = useDomainNav(language)

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 复盘域内子切换：规划(/action) vs 日常(/stats)
  const reviewSubMode = location.pathname.startsWith('/action') ? 'plan' : 'daily'
  const reviewSubItems = [
    { id: 'plan'  as const, label: t('规划', 'Plan')  },
    { id: 'daily' as const, label: t('日常', 'Daily') },
  ]

  return (
    <div className="flex items-center px-6 h-[52px] flex-shrink-0 border-b border-border-subtle">
      <span className="font-serif text-[17px] font-semibold text-text-primary tracking-[-0.01em] select-none flex-shrink-0">
        CaILens
      </span>

      <div className="flex-1" />

      <div className="flex items-center gap-2 flex-shrink-0">
        {activeMode === 'review' && (
          <SlideSegmented
            items={reviewSubItems}
            value={reviewSubMode}
            onChange={(v) => navigate(v === 'plan' ? '/action' : '/stats')}
          />
        )}

        <SlideSegmented items={navItems} value={activeMode} onChange={handleModeChange} expand />

        <button
          onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken cursor-pointer transition-colors duration-200"
          aria-label="Search"
        >
          <Search size={15} strokeWidth={1.75} />
        </button>

        <button
          onClick={() => useUIStore.getState().setSettingsModalOpen(true)}
          className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
          aria-label="Settings"
        >
          <Settings size={16} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  )
}

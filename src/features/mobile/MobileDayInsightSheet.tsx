import { X } from 'lucide-react'
import { useState } from 'react'
import { cn } from '@/lib/utils'
import { DayDrawerPanelContent } from '@/features/week-view/DayDrawer'
import { MODES, MODE_LABEL_KEYS, type DrawerMode } from '@/features/week-view/drawer/DrawerModeSwitcher'
import { useT } from '@/i18n/useT'

interface MobileDayInsightSheetProps {
  selectedDateMs: number
  onClose: () => void
}

export function MobileDayInsightSheet({ selectedDateMs, onClose }: MobileDayInsightSheetProps) {
  const [mode, setMode] = useState<DrawerMode>('weather-archive')
  const t = useT()
  const date = new Date(selectedDateMs)

  return (
    <div
      className="mobile-insight-sheet-backdrop fixed inset-0 z-50 flex flex-col bg-black/35"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="mobile-insight-sheet mt-auto max-h-[88vh] min-h-[68vh] rounded-t-[28px] bg-surface-base border-t border-border-subtle overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-label={t(MODE_LABEL_KEYS[mode])}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <div>
            <div className="font-serif text-3xl leading-none text-text-primary">{date.getDate()}</div>
            <div className="mt-1 text-xs text-text-tertiary">{date.getFullYear()} / {date.getMonth() + 1}</div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center text-text-secondary bg-surface-raised active:scale-95 transition-transform"
            aria-label={t('common.close')}
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {MODES.map(({ mode: itemMode, icon: Icon }) => (
            <button
              key={itemMode}
              onClick={() => setMode(itemMode)}
              className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-full text-xs whitespace-nowrap active:scale-[0.97] transition-transform',
                mode === itemMode ? 'bg-accent text-white' : 'bg-surface-raised text-text-secondary',
              )}
              aria-pressed={mode === itemMode}
            >
              <Icon size={14} />
              {t(MODE_LABEL_KEYS[itemMode])}
            </button>
          ))}
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto bg-surface-raised/35">
          <DayDrawerPanelContent mode={mode} selectedDateMs={selectedDateMs} />
        </div>
      </div>
    </div>
  )
}

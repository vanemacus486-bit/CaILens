import { Bot, X } from 'lucide-react'
import { DrawerAIChat } from '@/features/week-view/drawer/DrawerAIChat'
import { useT } from '@/i18n/useT'

interface MobileDayInsightSheetProps {
  selectedDateMs: number
  onClose: () => void
}

export function MobileDayInsightSheet({ selectedDateMs, onClose }: MobileDayInsightSheetProps) {
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
        aria-label={t('dayDrawer.aiAssistant')}
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

        <div className="flex items-center gap-1.5 px-4 pb-3 text-xs font-medium text-accent">
          <Bot size={14} strokeWidth={1.75} />
          <span>{t('dayDrawer.aiAssistant')}</span>
        </div>

        <div className="flex-1 min-h-0 bg-surface-raised/35">
          <DrawerAIChat selectedDateMs={selectedDateMs} />
        </div>
      </div>
    </div>
  )
}

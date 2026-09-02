import { Bot, X } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { DrawerAIChat } from './drawer/DrawerAIChat'

interface DayDrawerProps {
  selectedDateMs: number
  onClose: () => void
}

export function DayDrawer({ selectedDateMs, onClose }: DayDrawerProps) {
  const t = useT()

  return (
    <div
      data-testid="day-drawer"
      className="relative flex-shrink-0 my-3 mr-3 w-[clamp(272px,22vw,320px)] min-w-[272px] max-w-[320px] animate-slide-in-from-right"
    >
      <div className="h-full flex flex-col">
        <div
          data-testid="panel-ai"
          className="flex-1 min-h-0 bg-surface-raised border border-border-subtle rounded-xl overflow-hidden flex flex-col"
        >
          <div className="flex items-center gap-1.5 px-4 py-2 flex-shrink-0">
            <Bot size={12} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
            <span className="text-[11px] font-sans font-medium text-text-tertiary tracking-wide truncate flex-1">
              {t('dayDrawer.aiAssistant')}
            </span>
            <button
              onClick={onClose}
              className="w-6 h-6 flex items-center justify-center rounded text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none flex-shrink-0"
              aria-label={t('common.close')}
            >
              <X size={12} strokeWidth={1.75} />
            </button>
          </div>

          <div key={selectedDateMs} className="flex-1 min-h-0">
            <DrawerAIChat selectedDateMs={selectedDateMs} />
          </div>
        </div>
      </div>

      <style>{`
        @media (prefers-reduced-motion: no-preference) {
          @keyframes slideInFromRight {
            from { transform: translateX(100%); }
            to   { transform: translateX(0); }
          }
          .animate-slide-in-from-right {
            animation: slideInFromRight 0.25s cubic-bezier(0.32, 0.72, 0, 1) forwards;
          }
        }
      `}</style>
    </div>
  )
}

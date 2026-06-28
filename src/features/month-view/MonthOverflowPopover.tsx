import { Popover, PopoverContent } from '@/components/ui/popover'
import { useT } from '@/i18n/useT'
import type { AppLanguage } from '@/i18n/types'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'

function fmtTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDateWithWeekday(date: Date, language: AppLanguage): string {
  const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
  return date.toLocaleDateString(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
}

interface MonthOverflowPopoverProps {
  open: boolean
  anchorEl: HTMLElement
  events: CalendarEvent[]
  date: number
  categories: Category[]
  language: AppLanguage
  onClose: () => void
  onNavigateToWeek?: (date: Date) => void
}

export function MonthOverflowPopover({
  open,
  anchorEl,
  events,
  date,
  categories,
  language,
  onClose,
  onNavigateToWeek,
}: MonthOverflowPopoverProps) {
  const t = useT()
  const dateObj = new Date(date)
  const dateLabel = fmtDateWithWeekday(dateObj, language)

  return (
    <Popover open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <PopoverContent
        className="w-72 p-3 max-h-72 overflow-y-auto"
        side="bottom"
        align="start"
        // Attach to anchor via a hack: portal the trigger next to anchor
        style={{ position: 'fixed', left: anchorEl.getBoundingClientRect().left, top: anchorEl.getBoundingClientRect().bottom + 4 }}
      >
        <div
          className="rounded-lg p-2"
        >
          {/* Date header */}
          <div className="font-serif text-sm font-medium text-text-primary mb-2">
            {dateLabel}
          </div>

          {/* Events list */}
          {events.length === 0 ? (
            <p className="font-sans text-xs text-text-tertiary italic">
              {t('month.noEvents')}
            </p>
          ) : (
            <div className="flex flex-col gap-1">
              {events.map((ev) => {
                const cat = categories.find((c) => c.id === ev.categoryId)
                const color = cat ? `var(--event-${cat.id}-fill)` : 'var(--event-accent-fill)'
                return (
                  <div
                    key={ev.id}
                    className="flex items-start gap-2 py-1"
                  >
                    <span
                      className="w-2 h-2 rounded-full mt-1 flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="min-w-0 flex-1">
                      <div
                        className="font-sans text-xs font-medium truncate"
                        style={{ color }}
                      >
                        {ev.title}
                      </div>
                      <div className="font-mono text-[11px] text-text-tertiary">
                        {fmtTime(ev.startTime)} – {fmtTime(ev.endTime)}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Navigate to week */}
          {onNavigateToWeek && (
            <button
              onClick={() => {
                onNavigateToWeek(dateObj)
                onClose()
              }}
              className={cn(
                'w-full mt-2 text-right font-sans text-xs text-text-tertiary',
                'hover:text-accent transition-colors duration-150 cursor-pointer bg-transparent border-none',
              )}
            >
              {t('month.viewWeek')}
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}

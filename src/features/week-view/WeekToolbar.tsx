import { useState } from 'react'
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addWeeks, formatMonthDay, getWeekStart, isSameDay } from '@/domain/time'
import { addDays } from 'date-fns'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useAppSettingsStore } from '@/stores/settingsStore'

interface WeekToolbarProps {
  weekStart: Date
  eventCount: number
  onPrev: () => void
  onNext: () => void
  onToday: () => void
  onShift: (direction: -1 | 1) => void
}

export function WeekToolbar({
  weekStart,
  eventCount,
  onPrev,
  onNext,
  onToday,
  onShift,
}: WeekToolbarProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const [shiftOpen, setShiftOpen] = useState(false)

  const weekEnd         = addDays(weekStart, 6)
  const rangeLabel      = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}, ${weekEnd.getFullYear()}`
  const currentWeekStart = getWeekStart(new Date(), 1)
  const isCurrentWeek   = isSameDay(weekStart, currentWeekStart)

  function handleShift(direction: -1 | 1) {
    setShiftOpen(false)
    onShift(direction)
  }

  return (
    <div className="flex items-center justify-between px-4 h-10 flex-shrink-0 border-b border-border-subtle">
      {/* Week range label */}
      <span className="font-serif text-sm text-text-secondary select-none">
        {rangeLabel}
      </span>

      {/* Navigation controls */}
      <div className="flex items-center gap-0.5">
        {/* Prev / Today / Next */}
        <button
          onClick={onPrev}
          aria-label="Previous week"
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
        >
          <ChevronLeft size={15} strokeWidth={1.75} />
        </button>

        <button
          onClick={onToday}
          disabled={isCurrentWeek}
          aria-label="This week"
          className={cn(
            'h-7 px-2.5 rounded-md text-xs font-sans transition-colors duration-200',
            isCurrentWeek
              ? 'text-text-tertiary cursor-not-allowed'
              : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised cursor-pointer',
          )}
        >
          {t('本周', 'This week')}
        </button>

        <button
          onClick={onNext}
          aria-label="Next week"
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
        >
          <ChevronRight size={15} strokeWidth={1.75} />
        </button>

        {/* Separator */}
        <div className="w-px h-4 bg-border-subtle mx-1.5" />

        {/* Bulk-shift button */}
        <Popover open={shiftOpen} onOpenChange={setShiftOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={eventCount === 0}
              aria-label="Move events to another week"
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-200',
                eventCount === 0
                  ? 'text-text-tertiary opacity-40 cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised cursor-pointer',
              )}
            >
              <ArrowLeftRight size={14} strokeWidth={1.75} />
            </button>
          </PopoverTrigger>

          <PopoverContent align="end" className="w-52 p-1.5">
            <p className="px-2.5 py-1.5 text-[11px] font-sans text-text-tertiary select-none">
              {t(`移动 ${eventCount} 个事件`, `Move ${eventCount} events`)}
            </p>
            <ShiftMenuItem
              label={t('← 移到上一周', '← Move to previous week')}
              weekLabel={formatMonthDay(addWeeks(weekStart, -1))}
              onClick={() => handleShift(-1)}
            />
            <ShiftMenuItem
              label={t('→ 移到下一周', '→ Move to next week')}
              weekLabel={formatMonthDay(addWeeks(weekStart, 1))}
              onClick={() => handleShift(1)}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

interface ShiftMenuItemProps {
  label: string
  weekLabel: string
  onClick: () => void
}

function ShiftMenuItem({ label, weekLabel, onClick }: ShiftMenuItemProps) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-sm font-sans text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer"
    >
      <span>{label}</span>
      <span className="text-xs text-text-tertiary">{weekLabel}</span>
    </button>
  )
}

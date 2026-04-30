import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { addWeeks, formatISODate, formatMonthDay, getWeekStart, isSameDay } from '@/domain/time'
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
  const navigate = useNavigate()
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const [shiftOpen, setShiftOpen] = useState(false)

  const weekEnd = addDays(weekStart, 6)
  const weekNum = getISOWeek(weekStart)
  const rangeLabel = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`
  const currentWeekStart = getWeekStart(new Date(), 1)
  const isCurrentWeek = isSameDay(weekStart, currentWeekStart)

  function handleShift(direction: -1 | 1) {
    setShiftOpen(false)
    onShift(direction)
  }

  return (
    <div className="flex items-center justify-between px-7 py-[13px] border-b border-border-subtle flex-shrink-0">
      {/* Left: Logo + tagline */}
      <div className="flex items-baseline gap-2.5 select-none">
        <span className="font-serif text-[22px] font-semibold text-text-primary tracking-[-0.01em]">
          CaILens
        </span>
        <span className="font-serif text-[13px] text-text-secondary italic">
          — time, recorded
        </span>
      </div>

      {/* Center: Navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={onPrev}
          aria-label="Previous week"
          className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
        >
          ‹
        </button>

        <div className="text-center min-w-[180px]">
          <span className="font-serif text-base font-medium text-text-primary">
            {t(`第 ${weekNum} 周`, `Week ${weekNum}`)}
          </span>
          <span className="font-mono text-xs text-text-secondary ml-2">
            {rangeLabel}
          </span>
        </div>

        <button
          onClick={onNext}
          aria-label="Next week"
          className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
        >
          ›
        </button>

        <div className="w-px h-5 bg-border-subtle mx-2" />

        <button
          onClick={onToday}
          disabled={isCurrentWeek}
          className={cn(
            'h-[30px] px-3 rounded-md text-xs font-sans font-medium transition-colors duration-200',
            isCurrentWeek
              ? 'text-text-tertiary cursor-not-allowed'
              : 'text-text-secondary bg-surface-sunken border border-border-subtle hover:text-text-primary hover:bg-surface-raised cursor-pointer',
          )}
        >
          {t('今天', 'Today')}
        </button>

        {/* Bulk-shift */}
        <Popover open={shiftOpen} onOpenChange={setShiftOpen}>
          <PopoverTrigger asChild>
            <button
              disabled={eventCount === 0}
              aria-label="Move events to another week"
              className={cn(
                'w-7 h-7 flex items-center justify-center rounded-md transition-colors duration-200',
                eventCount === 0
                  ? 'text-text-tertiary opacity-40 cursor-not-allowed'
                  : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken cursor-pointer',
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

      {/* Right: View switcher pills */}
      <div className="flex gap-1">
        <button
          onClick={() => navigate('/')}
          className={cn(
            'font-sans text-xs font-medium rounded-md px-2.5 py-[5px] transition-colors duration-200 cursor-pointer',
            'bg-accent-light border border-[#e8c4b0] text-accent',
          )}
        >
          W
        </button>
        <button
          onClick={() => navigate(`/day?date=${formatISODate(new Date())}`)}
          className="font-sans text-xs font-normal rounded-md px-2.5 py-[5px] transition-colors duration-200 cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-sunken border border-transparent"
        >
          D
        </button>
        <button
          disabled
          className="font-sans text-xs font-normal rounded-md px-2.5 py-[5px] cursor-not-allowed text-text-tertiary opacity-40 border border-transparent"
        >
          Y
        </button>
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

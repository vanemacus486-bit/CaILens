import { useCallback, useMemo, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getWeekDays, isSameDay } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { MobileEventTimeline } from '@/features/mobile/MobileEventTimeline'

interface MobileDayViewProps {
  weekStart: Date
  onWeekStartChange: (date: Date) => void
  onCreateEvent: (startTime: number, anchorEl: HTMLElement) => void
}

export function MobileDayView({ weekStart, onWeekStartChange, onCreateEvent }: MobileDayViewProps) {
  const events = useEventStore((state) => state.events)
  const language = useAppSettingsStore((state) => state.settings.language)
  const t = useT()
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const days = getWeekDays(weekStart)
    const today = new Date()
    const todayIndex = days.findIndex((day) => isSameDay(day, today))
    return Math.max(0, todayIndex)
  })
  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const selectedDate = days[selectedDayIndex]
  const dayStart = new Date(selectedDate)
  dayStart.setHours(0, 0, 0, 0)
  const dayStartMs = dayStart.getTime()
  const dayEndMs = dayStartMs + 86_400_000
  const locale = LANGUAGE_LOCALE[language]
  const dayEvents = useMemo(() => events
    .filter((event) => event.startTime < dayEndMs && event.endTime > dayStartMs)
    .sort((a, b) => a.startTime - b.startTime), [events, dayEndMs, dayStartMs])
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null)

  const moveDay = useCallback((direction: -1 | 1) => {
    const nextIndex = selectedDayIndex + direction
    if (nextIndex >= 0 && nextIndex < 7) {
      setSelectedDayIndex(nextIndex)
      return
    }
    const nextWeek = new Date(weekStart)
    nextWeek.setDate(nextWeek.getDate() + direction * 7)
    onWeekStartChange(nextWeek)
    setSelectedDayIndex(direction > 0 ? 0 : 6)
  }, [onWeekStartChange, selectedDayIndex, weekStart])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])

  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start || start.id !== event.pointerId) return
    const horizontal = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (Math.abs(horizontal) >= 52 && Math.abs(horizontal) > Math.abs(vertical) * 1.25) {
      moveDay(horizontal < 0 ? 1 : -1)
    }
  }, [moveDay])

  const handleCreate = useCallback((anchorEl: HTMLElement) => {
    const now = new Date()
    const start = new Date(selectedDate)
    const currentMinutes = now.getHours() * 60 + now.getMinutes()
    const roundedMinutes = Math.min(23 * 60 + 30, Math.ceil(currentMinutes / 30) * 30)
    const startMinutes = isSameDay(selectedDate, now) ? roundedMinutes : 9 * 60
    start.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0)
    onCreateEvent(start.getTime(), anchorEl)
  }, [onCreateEvent, selectedDate])

  return (
    <div className="mobile-day-canvas">
      <div className="mobile-week-strip" aria-label="选择日期">
        {days.map((day, index) => {
          const selected = index === selectedDayIndex
          const today = isSameDay(day, new Date())
          return (
            <button
              key={day.getTime()}
              type="button"
              onClick={() => setSelectedDayIndex(index)}
              className={cn(selected && 'is-selected', today && 'is-today')}
            >
              <span>{new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(day)}</span>
              <strong>{day.getDate()}</strong>
            </button>
          )
        })}
      </div>
      <div className="mobile-day-scroll" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <MobileEventTimeline
          date={selectedDate}
          events={dayEvents}
          emptyAction={(
            <button type="button" className="mobile-empty-create" onClick={(event) => handleCreate(event.currentTarget)}>
              <Plus size={15} />{t('week.addRecord')}
            </button>
          )}
        />
      </div>
      <button type="button" className="mobile-quick-capture" onClick={(event) => handleCreate(event.currentTarget)} aria-label="快速添加记录">
        <Plus size={18} /><span>{t('week.addRecord')}</span>
      </button>
    </div>
  )
}

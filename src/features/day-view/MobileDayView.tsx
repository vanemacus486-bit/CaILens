import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getWeekDays, isSameDay, formatWeekday } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { EventCard } from '@/components/calendar/EventCard'

interface MobileDayViewProps {
  weekStart: Date
  onWeekStartChange: (d: Date) => void
}

export function MobileDayView({ weekStart, onWeekStartChange }: MobileDayViewProps) {
  const events = useEventStore((s) => s.events)
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const days = getWeekDays(weekStart)
    const today = new Date()
    for (let i = 0; i < 7; i++) {
      if (isSameDay(days[i], today)) return i
    }
    return 0
  })

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const selectedDate = days[selectedDayIndex]
  const dayStartMs = selectedDate.getTime()
  const dayEndMs = dayStartMs + 86_400_000

  const dayEvents = useMemo(() => {
    return events
      .filter(e => e.startTime < dayEndMs && e.endTime > dayStartMs)
      .sort((a, b) => a.startTime - b.startTime)
  }, [events, dayStartMs, dayEndMs])

  // Touch swipe
  const touchStartX = useRef(0)
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) > 50) {
      if (diff > 0 && selectedDayIndex > 0) {
        setSelectedDayIndex(selectedDayIndex - 1)
      } else if (diff < 0 && selectedDayIndex < 6) {
        setSelectedDayIndex(selectedDayIndex + 1)
      } else if (diff < 0 && selectedDayIndex === 6) {
        const nextWeek = new Date(weekStart)
        nextWeek.setDate(nextWeek.getDate() + 7)
        onWeekStartChange(nextWeek)
        setSelectedDayIndex(0)
      } else if (diff > 0 && selectedDayIndex === 0) {
        const prevWeek = new Date(weekStart)
        prevWeek.setDate(prevWeek.getDate() - 7)
        onWeekStartChange(prevWeek)
        setSelectedDayIndex(6)
      }
    }
  }, [selectedDayIndex, weekStart, onWeekStartChange])

  return (
    <div className="flex flex-col h-full bg-surface-base">
      {/* Date strip */}
      <div className="flex items-center border-b border-border-subtle px-2 py-2 gap-1 flex-shrink-0">
        {days.map((day, i) => {
          const isSelected = i === selectedDayIndex
          const today = isSameDay(day, new Date())
          return (
            <button
              key={i}
              onClick={() => setSelectedDayIndex(i)}
              className={cn(
                'flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors duration-200 min-w-0',
                isSelected
                  ? 'bg-accent text-white'
                  : today
                    ? 'bg-surface-sunken text-accent'
                    : 'text-text-secondary hover:bg-surface-sunken',
              )}
            >
              <span className="font-sans text-[10px] uppercase tracking-wider opacity-70">
                {formatWeekday(day, 'short')}
              </span>
              <span className="font-mono text-sm font-medium mt-0.5">{day.getDate()}</span>
            </button>
          )
        })}
      </div>

      {/* Event list */}
      <div
        className="flex-1 overflow-y-auto px-3 py-4"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {dayEvents.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="font-serif text-sm text-text-tertiary italic">这一天没有记录</p>
          </div>
        ) : (
          dayEvents.map(event => {
            const cat = categories.find((c) => c.id === event.categoryId)
            return (
              <EventCard
                key={event.id}
                event={event}
                category={cat}
                language={language}
                compact
              />
            )
          })
        )}
      </div>
    </div>
  )
}

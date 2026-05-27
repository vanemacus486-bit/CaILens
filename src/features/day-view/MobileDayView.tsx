import { useCallback, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { getWeekDays, isSameDay, formatWeekday } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import { EVENT_COLOR_CLASSES } from '@/components/calendar/eventColors'
import { useEventStore } from '@/stores/eventStore'

interface MobileDayViewProps {
  weekStart: Date
  onWeekStartChange: (d: Date) => void
}

function fmtTimeHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function MobileDayView({ weekStart, onWeekStartChange }: MobileDayViewProps) {
  const events = useEventStore((s) => s.events)
      // Track which day of the week is selected (0=Monday...6=Sunday)
  const [selectedDayIndex, setSelectedDayIndex] = useState(() => {
    const today = new Date()
    const days = getWeekDays(weekStart)
    for (let i = 0; i < 7; i++) {
      if (isSameDay(days[i], today)) return i
    }
    return 0
  })

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])
  const selectedDate = days[selectedDayIndex]

  const dayStartMs = selectedDate.getTime()
  const dayEndMs = dayStartMs + 86_400_000

  // Filter events for selected day
  const dayEvents = useMemo(() => {
    return events
      .filter(e => e.startTime < dayEndMs && e.endTime > dayStartMs)
      .sort((a, b) => a.startTime - b.startTime)
  }, [events, dayStartMs, dayEndMs])

  // Handle touch swipe
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
        // Go to next week
        const nextWeek = new Date(weekStart)
        nextWeek.setDate(nextWeek.getDate() + 7)
        onWeekStartChange(nextWeek)
        setSelectedDayIndex(0)
      } else if (diff > 0 && selectedDayIndex === 0) {
        // Go to previous week
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
          const isToday = isSameDay(day, new Date())
          return (
            <button
              key={i}
              onClick={() => setSelectedDayIndex(i)}
              className={cn(
                'flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors duration-200 min-w-0',
                isSelected
                  ? 'bg-accent text-white'
                  : isToday
                    ? 'bg-surface-sunken text-accent'
                    : 'text-text-secondary hover:bg-surface-sunken',
              )}
            >
              <span className="font-sans text-[10px] uppercase tracking-wider opacity-70">
                {formatWeekday(day, 'short')}
              </span>
              <span className="font-mono text-sm font-medium mt-0.5">
                {day.getDate()}
              </span>
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
            <p className="font-serif text-sm text-text-tertiary italic">
              {'这一天没有记录'}
            </p>
          </div>
        ) : (
          dayEvents.map(event => (
            <MobileEventCard key={event.id} event={event} />
          ))
        )}
      </div>
    </div>
  )
}

// ── MobileEventCard ──────────────────────────────────────

function MobileEventCard({ event }: { event: CalendarEvent }) {
  const { text } = EVENT_COLOR_CLASSES[event.color]
    return (
    <div className="flex items-start gap-3 py-2.5 border-b border-border-subtle last:border-b-0">
      {/* Time on the left */}
      <div className="flex-shrink-0 w-14 text-right pt-0.5">
        <span className="font-mono text-xs text-text-secondary">
          {fmtTimeHM(event.startTime)}
        </span>
        <span className="font-mono text-xs-alt text-text-tertiary block">
          {fmtTimeHM(event.endTime)}
        </span>
      </div>

      {/* Colored dot */}
      <div className="flex-shrink-0 pt-1.5">
        <span
          className={cn(
            'w-2.5 h-2.5 rounded-full block',
          )}
          style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
        />
      </div>

      {/* Event title + description */}
      <div className="flex-1 min-w-0">
        <p className={cn('font-serif text-sm text-text-primary leading-snug', text)}>
          {event.title || <span className="opacity-50 italic">{'无标题'}</span>}
        </p>
        {event.description && (
          <p className="font-serif text-xs-alt text-text-secondary italic mt-0.5 leading-relaxed line-clamp-2">
            {event.description}
          </p>
        )}
      </div>

      {/* Category color bar */}
      <div
        className="flex-shrink-0 w-1 self-stretch rounded-full ml-1"
        style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
      />
    </div>
  )
}

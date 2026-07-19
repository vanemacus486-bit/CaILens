import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { List, Plus, Clock, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { getWeekDays, isSameDay, formatWeekday, formatISODate } from '@/domain/time'
import { getWeekStart } from '@/domain/time'
import { parseISO } from 'date-fns'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { MobileEventEditor, type MobileEditorDefaults } from './MobileEventEditor'
import { MobileDayStream } from './MobileDayStream'
import { MobileDayInsightSheet } from './MobileDayInsightSheet'

// ── Constants ─────────────────────────────────────────────────

const PX_PER_MINUTE = 1   // 60px per hour → 1px per minute
const HOUR_HEIGHT = 60    // px
const HOURS = Array.from({ length: 24 }, (_, i) => i)

// ── Helpers ───────────────────────────────────────────────────

function parseDateParam(param: string | null): Date {
  if (!param) return new Date()
  try { return parseISO(param) } catch { return new Date() }
}

function nextHalfHour(): number {
  const now = new Date()
  const minutes = now.getMinutes()
  const roundedMinutes = minutes < 30 ? 30 : 0
  const addHours = minutes < 30 ? 0 : 1
  now.setHours(now.getHours() + addHours, roundedMinutes, 0, 0)
  return now.getTime()
}

function dayBounds(date: Date): { start: number; end: number } {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return { start: d.getTime(), end: d.getTime() + 86_400_000 }
}

function minutesFromDayStart(ts: number, dayStart: number): number {
  return Math.max(0, (ts - dayStart) / 60_000)
}

// ── Mode persistence ──────────────────────────────────────────

type DayMode = 'timeline' | 'stream'

function getSavedMode(): DayMode {
  if (typeof window === 'undefined') return 'timeline'
  return (localStorage.getItem('cailens-mobile-day-mode') as DayMode) ?? 'timeline'
}

function saveMode(mode: DayMode): void {
  localStorage.setItem('cailens-mobile-day-mode', mode)
}

// ── Event block ───────────────────────────────────────────────

interface EventBlockProps {
  event: CalendarEvent
  dayStart: number
  onTap: (event: CalendarEvent) => void
}

const COLOR_STYLE: Record<EventColor, { bg: string; text: string }> = {
  accent: { bg: 'var(--event-accent-bg)', text: 'var(--event-accent-text)' },
  sage:   { bg: 'var(--event-sage-bg)',   text: 'var(--event-sage-text)' },
  sand:   { bg: 'var(--event-sand-bg)',   text: 'var(--event-sand-text)' },
  sky:    { bg: 'var(--event-sky-bg)',    text: 'var(--event-sky-text)' },
  rose:   { bg: 'var(--event-rose-bg)',   text: 'var(--event-rose-text)' },
  stone:  { bg: 'var(--event-stone-bg)',  text: 'var(--event-stone-text)' },
}

function EventBlock({ event, dayStart, onTap }: EventBlockProps) {
  const topMin = minutesFromDayStart(event.startTime, dayStart)
  const durMin = Math.max(15, (event.endTime - event.startTime) / 60_000)
  const colors = COLOR_STYLE[event.color] ?? COLOR_STYLE.accent

  return (
    <div
      className="absolute left-12 right-2 rounded-md px-2 py-0.5 cursor-pointer overflow-hidden active:opacity-70 transition-opacity"
      style={{
        top: topMin * PX_PER_MINUTE,
        height: durMin * PX_PER_MINUTE,
        backgroundColor: colors.bg,
        color: colors.text,
        minHeight: 22,
      }}
      onClick={(e) => { e.stopPropagation(); onTap(event) }}
    >
      <p className="text-xs font-medium leading-tight truncate">{event.title}</p>
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────

export function MobileDayPage() {
  const [params, setParams] = useSearchParams()

  const selectedDate = useMemo(() => parseDateParam(params.get('date')), [params])
  const weekStart = useMemo(() => getWeekStart(selectedDate, 1), [selectedDate])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])

  const events = useEventStore((s) => s.events)

  // Load events for this week
  const loadWeek = useEventStore((s) => s.loadWeek)
  useEffect(() => { loadWeek(weekStart) }, [weekStart, loadWeek])

  const { start: dayStart } = dayBounds(selectedDate)
  const dayEnd = dayStart + 86_400_000

  const dayEvents = useMemo(
    () => events.filter((e) => e.startTime < dayEnd && e.endTime > dayStart),
    [events, dayStart, dayEnd],
  )

  // Touch swipe
  const touchStartX = useRef(0)

  const goToDate = useCallback((date: Date) => {
    setParams({ date: formatISODate(date) })
  }, [setParams])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current
    if (Math.abs(diff) < 50) return
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + (diff < 0 ? 1 : -1))
    goToDate(next)
  }, [selectedDate, goToDate])

  // Editor state — editorKey changes on each open to remount the inner form
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [editorDefaults, setEditorDefaults] = useState<MobileEditorDefaults>({ startTime: 0, endTime: 0 })
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>()
  const [insightOpen, setInsightOpen] = useState(false)

  const openCreate = useCallback((startMs: number) => {
    const endMs = startMs + 30 * 60_000
    setEditorDefaults({ startTime: startMs, endTime: endMs })
    setEditingEvent(undefined)
    setEditorKey((k) => k + 1)
    setEditorOpen(true)
  }, [])

  const openEdit = useCallback((event: CalendarEvent) => {
    setEditorDefaults({ startTime: event.startTime, endTime: event.endTime, color: event.color })
    setEditingEvent(event)
    setEditorKey((k) => k + 1)
    setEditorOpen(true)
  }, [])

  useEffect(() => {
    const openEventId = params.get('openEvent')
    if (!openEventId || dayEvents.length === 0) return
    const event = dayEvents.find((e) => e.id === openEventId)
    if (event) openEdit(event)
  }, [params, dayEvents, openEdit])

  const handleSlotTap = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const y = e.clientY - rect.top
    const minutes = Math.floor(y / PX_PER_MINUTE / 30) * 30  // snap to 30-min
    const startMs = dayStart + minutes * 60_000
    openCreate(startMs)
  }, [dayStart, openCreate])

  // Scroll to current hour on mount
  const scrollRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!scrollRef.current) return
    const hour = new Date().getHours()
    scrollRef.current.scrollTop = Math.max(0, (hour - 2) * HOUR_HEIGHT)
  }, [selectedDate])

  const today = new Date()

  // ── Day mode toggle ──────────────────────────────────────
  const [dayMode, setDayMode] = useState<DayMode>(getSavedMode)

  const toggleMode = useCallback(() => {
    setDayMode((prev) => {
      const next = prev === 'timeline' ? 'stream' : 'timeline'
      saveMode(next)
      return next
    })
  }, [])

  return (
    <div className="flex flex-col h-full bg-surface-base overflow-hidden">

      {/* 7-day date strip (only in timeline mode) */}
      {dayMode === 'timeline' && (
      <div className="flex items-center border-b border-border-subtle px-2 py-2 gap-1 flex-shrink-0">
        {weekDays.map((day, i) => {
          const isSelected = isSameDay(day, selectedDate)
          const isToday = isSameDay(day, today)
          return (
            <button
              key={i}
              onClick={() => goToDate(day)}
              className={cn(
                'flex-1 flex flex-col items-center py-1.5 rounded-lg transition-colors duration-150 min-w-0',
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
              <span className="font-mono text-sm font-medium mt-0.5">{day.getDate()}</span>
            </button>
          )
        })}
      </div>
      )}

      {/* Mode toggle */}
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-border-subtle flex-shrink-0">
        <button
          onClick={toggleMode}
          className="flex items-center gap-1.5 text-xs font-medium"
        >
          <span
            className={cn(
              'px-2 py-0.5 rounded-full transition-colors',
              dayMode === 'timeline'
                ? 'bg-accent text-white'
                : 'text-text-secondary',
            )}
          >
            <Clock size={12} className="inline mr-1" />
            时间轴
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded-full transition-colors',
              dayMode === 'stream'
                ? 'bg-accent text-white'
                : 'text-text-secondary',
            )}
          >
            <List size={12} className="inline mr-1" />
            流水
          </span>
        </button>
        <button
          onClick={() => setInsightOpen(true)}
          className="w-8 h-8 rounded-full flex items-center justify-center text-text-secondary bg-surface-raised"
          aria-label="Day insights"
        >
          <Sparkles size={14} />
        </button>
      </div>

      {/* Timeline mode */}
      {dayMode === 'timeline' && (
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Inner: 24h grid */}
        <div
          className="relative"
          style={{ height: HOUR_HEIGHT * 24 }}
          onClick={handleSlotTap}
        >
          {/* Hour lines */}
          {HOURS.map((h) => (
            <div
              key={h}
              className="absolute left-0 right-0 flex items-start pointer-events-none"
              style={{ top: h * HOUR_HEIGHT }}
            >
              <span className="w-10 text-right text-[10px] text-text-tertiary pr-2 leading-none -mt-1.5 select-none">
                {h === 0 ? '' : `${h}:00`}
              </span>
              <div className="flex-1 border-t border-border-subtle" />
            </div>
          ))}

          {/* Half-hour lines (lighter) */}
          {HOURS.map((h) => (
            <div
              key={`h${h}`}
              className="absolute left-10 right-0 border-t border-border-subtle/40 pointer-events-none"
              style={{ top: h * HOUR_HEIGHT + 30 }}
            />
          ))}

          {/* Events */}
          {dayEvents.map((event) => (
            <EventBlock
              key={event.id}
              event={event}
              dayStart={dayStart}
              onTap={openEdit}
            />
          ))}

          {/* Current time indicator */}
          {isSameDay(selectedDate, today) && (() => {
            const now = new Date()
            const mins = now.getHours() * 60 + now.getMinutes()
            return (
              <div
                className="absolute left-10 right-0 flex items-center pointer-events-none z-10"
                style={{ top: mins * PX_PER_MINUTE }}
              >
                <div className="w-2 h-2 rounded-full bg-accent -ml-1" />
                <div className="flex-1 h-px bg-accent" />
              </div>
            )
          })()}
        </div>

        {/* Empty state */}
        {dayEvents.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="font-serif text-sm text-text-tertiary italic">这一天没有记录</p>
          </div>
        )}
      </div>
      )}

      {/* Stream mode */}
      {dayMode === 'stream' && (
        <MobileDayStream
          selectedDate={selectedDate}
          onEditEvent={openEdit}
          onCreateEvent={openCreate}
        />
      )}

      {/* FAB */}
      <button
        onClick={() => openCreate(nextHalfHour())}
        className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-accent shadow-lg flex items-center justify-center active:scale-90 transition-transform"
        style={{ marginBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <Plus className="text-white" size={24} />
      </button>

      {/* Editor */}
      <MobileEventEditor
        key={editorKey}
        open={editorOpen}
        defaults={editorDefaults}
        editingEvent={editingEvent}
        onClose={() => setEditorOpen(false)}
      />
      {insightOpen && (
        <MobileDayInsightSheet selectedDateMs={dayStart} onClose={() => setInsightOpen(false)} />
      )}
    </div>
  )
}

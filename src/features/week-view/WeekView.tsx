import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { addWeeks, getWeekDays, isEventOnDay, formatISODate, parseISODate, getWeekStart } from '@/domain/time'
import type { CalendarEvent, EventColor, CreateEventInput, UpdateEventInput } from '@/domain/event'
import { fireAndForget } from '@/lib/fireAndForget'
import { translate } from '@/i18n/useT'
import { Loader2, AlertCircle } from 'lucide-react'
import { DayColumn } from '@/components/calendar/DayColumn'
import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useWeekFromURL } from './hooks/useWeekFromURL'
import type { DragState } from './hooks/useEventDrag'
import { WeekDateHeader } from './WeekDateHeader'
import { WeekToolbar } from './WeekToolbar'
import { EventDetailCard } from './EventDetailCard'
import { WeekEmptyState } from './WeekEmptyState'
import { MonthView } from '@/features/month-view/MonthView'
import { FloatingEventCard } from '@/features/quick-log/FloatingEventCard'
import { MobileDayView } from '@/features/day-view/MobileDayView'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { saveSession, useScrollSave, useScrollRestore } from '@/hooks/useSessionRestore'
import type { CardState } from './types'

const EMPTY: CalendarEvent[] = []

export function WeekView() {
  const { weekStart, setWeekStart } = useWeekFromURL()
  const [searchParams, setSearchParams] = useSearchParams()

  const events             = useEventStore((s) => s.events)
  const isLoading          = useEventStore((s) => s.isLoading)
  const loadError          = useEventStore((s) => s.loadError)
  const loadWeek           = useEventStore((s) => s.loadWeek)
  const loadAllEvents      = useEventStore((s) => s.loadAllEvents)
  const createEvent        = useEventStore((s) => s.createEvent)
  const updateEvent        = useEventStore((s) => s.updateEvent)
  const deleteEvent        = useEventStore((s) => s.deleteEvent)
  const duplicateEvent     = useEventStore((s) => s.duplicateEvent)

  const language = useAppSettingsStore((s) => s.settings.language)

    // View mode: derived from URL (single source of truth — no useState)
  const viewMode = (searchParams.get('view') as 'week' | 'month' | null) ?? 'week'

  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null)

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view')
    if (dateParam && viewParam === 'month') {
      const parsed = parseISODate(dateParam)
      return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
    }
    return new Date()
  })

  // Sync selectedDay from URL when AppHeader changes month navigation
  useEffect(() => {
    const viewParam = searchParams.get('view')
    const dateParam = searchParams.get('date')
    if (viewParam === 'month' && dateParam) {
      const parsed = parseISODate(dateParam)
      if (!isNaN(parsed.getTime())) {
        setSelectedDay(new Date(parsed.getFullYear(), parsed.getMonth(), 1))
      }
    }
  }, [searchParams])

  const [highlightedDayMs, setHighlightedDayMs] = useState<number | null>(null)

  // Parse ?highlight=<date> from URL on mount or param change
  useEffect(() => {
    const highlightParam = searchParams.get('highlight')
    if (highlightParam) {
      const parsed = parseISODate(highlightParam)
      const ms = parsed.getTime()
      setHighlightedDayMs(ms)
      // Auto-clear after 2.5s and remove from URL
      const timer = setTimeout(() => {
        setHighlightedDayMs(null)
        setSearchParams((prev) => {
          const next = new URLSearchParams(prev)
          next.delete('highlight')
          return next
        }, { replace: true })
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [searchParams, setSearchParams])

  // Handle navigation from MonthView overflow popover: go to week view + highlight day
  const handleNavigateToWeek = useCallback((date: Date) => {
    const ws = getWeekStart(date, 1)
    setWeekStart(ws)
    setSearchParams(
      { week: formatISODate(ws), highlight: formatISODate(date) },
      { replace: true },
    )
  }, [setWeekStart, setSearchParams])

  const [cardState, setCardState] = useState<CardState>({ mode: 'none' })
  const [activeDragState, setActiveDragState] = useState<DragState>({ phase: 'idle', ghostStyle: null })

  // FloatingEventCard state (unified create/edit)
  const [floatingCard, setFloatingCard] = useState<{
    open: boolean
    anchorEl: HTMLElement | null
    times: { start: number; end: number } | null
    color: EventColor
    editingEvent: CalendarEvent | undefined
  }>({
    open: false, anchorEl: null, times: null, color: 'accent', editingEvent: undefined,
  })

  const cardStateRef = useRef(cardState)
  cardStateRef.current = cardState

  const handledOpenEventRef = useRef<string | null>(null)

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const day of days) map.set(day.getTime(), [])
    for (const event of events) {
      for (const day of days) {
        if (isEventOnDay(event, day)) {
          map.get(day.getTime())!.push(event)
        }
      }
    }
    return map
  }, [events, days])

  useEffect(() => { fireAndForget(loadWeek(weekStart), 'load week') }, [weekStart, loadWeek])

  // Load all events for recent-pills & autocomplete
  useEffect(() => { fireAndForget(loadAllEvents(), 'load all events') }, [loadAllEvents])

  // Tab title
  useEffect(() => {
    const year = weekStart.getFullYear()
    const weekNum = getISOWeek(weekStart)
    document.title = translate('week.titleWithWeek', language, year, weekNum)
  }, [weekStart, language])

  // ── (standard week computation removed) ──

  // Handle ?openEvent=<id> from search navigation
  useEffect(() => {
    const openEventId = searchParams.get('openEvent')
    if (!openEventId || events.length === 0) return
    if (handledOpenEventRef.current === openEventId) return
    handledOpenEventRef.current = openEventId

    const event = events.find((e) => e.id === openEventId)
    if (!event) {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('openEvent')
        return next
      }, { replace: true })
      return
    }

    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-event-id="${openEventId}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        setHighlightedEventId(openEventId)
        setTimeout(() => setHighlightedEventId(null), 2500)
        setCardState({ mode: 'detail', event, anchorEl: el })
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('openEvent')
        return next
      }, { replace: true })
    })
  }, [events, searchParams, setSearchParams])

  // Auto-close cards if the active event is no longer in the store
  useEffect(() => {
    if (cardState.mode !== 'none') {
      const still = events.find((e) => e.id === cardState.event.id)
      if (!still) setCardState({ mode: 'none' })
    }
    if (floatingCard.open && floatingCard.editingEvent) {
      const still = events.find((e) => e.id === floatingCard.editingEvent!.id)
      if (!still) setFloatingCard((prev) => ({ ...prev, open: false }))
    }
  }, [cardState, floatingCard.open, floatingCard.editingEvent, events])

  const selectedEventId =
    cardState.mode !== 'none' ? cardState.event.id
    : floatingCard.open && floatingCard.editingEvent ? floatingCard.editingEvent.id
    : null

  const isMobile = useIsMobile()
  const [mobileViewMode, setMobileViewMode] = useState<'day' | 'week'>('day')

  const justClosedCardRef = useRef(false)

  const closeCard = useCallback(() => {
    justClosedCardRef.current = true
    setCardState({ mode: 'none' })
  }, [])

  const handleFloatingCardClose = useCallback(() => {
    justClosedCardRef.current = true
    setFloatingCard((prev) => ({ ...prev, open: false }))
  }, [])

  const handleSlotClick = useCallback((startTime: number, slotEl: HTMLElement) => {
    if (justClosedCardRef.current) {
      justClosedCardRef.current = false
      return
    }
    if (cardState.mode !== 'none') return

    setFloatingCard({
      open: true,
      anchorEl: slotEl,
      times: { start: startTime, end: startTime + 60 * 60_000 },
      color: 'accent',
      editingEvent: undefined,
    })
  }, [cardState.mode])


  const handleEventClick = useCallback((event: CalendarEvent, el: HTMLElement) => {
    useUIStore.getState().setLastFocusedEventId(event.id)

    setCardState({ mode: 'detail', event, anchorEl: el })
  }, [])

  const handleDetailDelete = useCallback(() => {
    if (cardState.mode !== 'detail') return
    fireAndForget(deleteEvent(cardState.event.id), 'delete event (detail)')
    closeCard()
  }, [cardState, deleteEvent, closeCard])

  const handleColorChange = useCallback((eventId: string, color: EventColor) => {
    fireAndForget(updateEvent({ id: eventId, color, categoryId: color }), 'update event color')
  }, [updateEvent])

  const handleContextEdit = useCallback((event: CalendarEvent, anchorEl: HTMLElement) => {
    setFloatingCard({
      open: true,
      anchorEl,
      times: { start: event.startTime, end: event.endTime },
      color: event.color,
      editingEvent: event,
    })
  }, [])

  const handleContextDelete = useCallback((eventId: string) => {
    fireAndForget(deleteEvent(eventId), 'delete event (context)')
    const cs = cardStateRef.current
    if (cs.mode !== 'none' && cs.event.id === eventId) {
      setCardState({ mode: 'none' })
    }
  }, [deleteEvent])

  const handleResize = useCallback((eventId: string, newStartTime: number, newEndTime: number) => {
    fireAndForget(updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime }), 'resize event')
  }, [updateEvent])

  const handleDragMove = useCallback((eventId: string, newStartTime: number, newEndTime: number) => {
    fireAndForget(updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime }), 'drag move event')
  }, [updateEvent])

  const handleDragStart = useCallback(() => {
    if (cardStateRef.current.mode !== 'none') {
      setCardState({ mode: 'none' })
    }
    setFloatingCard((prev) => ({ ...prev, open: false }))
  }, [])

  const handleDuplicate = useCallback((eventId: string) => {
    fireAndForget(duplicateEvent(eventId), 'duplicate event')
  }, [duplicateEvent])

  const handleDragStateChange = useCallback((ds: DragState) => {
    setActiveDragState(ds)
  }, [])

  const handleDragToEdge = useCallback((
    eventId: string, newStartTime: number, newEndTime: number, direction: -1 | 1,
  ) => {
    fireAndForget(
      (async () => {
        await updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime })
        setWeekStart(addWeeks(weekStart, direction))
      })(),
      'drag to edge',
    )
  }, [updateEvent, weekStart, setWeekStart])

  // ── FloatingEventCard handlers ──────────────────────────

  const handleFloatingCardSave = useCallback(async (input: CreateEventInput): Promise<string> => {
    const event = await createEvent(input)
    return event.id
  }, [createEvent])

  const handleFloatingCardUpdate = useCallback(async (input: UpdateEventInput) => {
    await updateEvent(input)
  }, [updateEvent])

  const handleFloatingCardDelete = useCallback(async (id: string) => {
    await deleteEvent(id)
  }, [deleteEvent])

  // 记录并继续：保持卡片打开，用上一条的结束时间开下一条
  const handleFloatingCardContinue = useCallback((nextStart: number, nextEnd: number, color: EventColor) => {
    setFloatingCard((prev) => ({
      ...prev,
      open: true,
      times: { start: nextStart, end: nextEnd },
      color,
      editingEvent: undefined,
    }))
  }, [])

  const gridRef = useRef<HTMLDivElement>(null)

  // Session state: save week + view, restore scroll
  useEffect(() => {
    saveSession({ weekStart: weekStart.getTime(), view: 'week' })
  }, [weekStart])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useScrollSave(scrollContainerRef, 'week')
  useScrollRestore(scrollContainerRef, 'week')

  return (
    <>
      <WeekToolbar
        weekStart={weekStart}
        onPrev={() => {
          if (viewMode === 'month') {
            setSelectedDay(new Date(selectedDay.getFullYear(), selectedDay.getMonth() - 1, 1))
          } else {
            setWeekStart(addWeeks(weekStart, -1))
          }
        }}
        onNext={() => {
          if (viewMode === 'month') {
            setSelectedDay(new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 1))
          } else {
            setWeekStart(addWeeks(weekStart, 1))
          }
        }}
        mobileViewMode={isMobile ? mobileViewMode : undefined}
        onMobileViewModeChange={isMobile ? setMobileViewMode : undefined}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-surface-raised border border-border-subtle rounded-2xl shadow-lg m-3">
        {viewMode === 'week' && !(isMobile && mobileViewMode === 'day') && (
          <WeekDateHeader days={days} highlightedDayMs={highlightedDayMs} onDayClick={handleNavigateToWeek} />
        )}

        {viewMode === 'month' ? (
          <MonthView onNavigateToWeek={handleNavigateToWeek} monthDate={selectedDay} />
        ) : isMobile && mobileViewMode === 'day' ? (
          <MobileDayView weekStart={weekStart} onWeekStartChange={setWeekStart} />
        ) : (
        <div ref={scrollContainerRef} className="relative flex-1 min-h-0 max-md:overflow-x-auto overflow-y-auto">
          {isLoading ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
            </div>
          ) : loadError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
              <AlertCircle className="h-10 w-10 text-color-text-danger" />
              <p className="font-sans text-sm text-text-secondary max-w-md text-center">{loadError}</p>
              <button
                onClick={() => loadWeek(weekStart)}
                className="inline-flex items-center justify-center rounded-lg bg-accent text-white px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer"
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              <div ref={gridRef} className="h-full grid min-w-[540px]" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)', touchAction: 'manipulation' }}>
                <TimeGrid />
                {days.map((day) => (
                  <DayColumn
                    key={day.getTime()}
                    date={day}
                    events={eventsByDay.get(day.getTime()) ?? EMPTY}
                    selectedEventId={selectedEventId}
                    highlightedEventId={highlightedEventId}
                    highlightedDayMs={highlightedDayMs}
                    weekDays={days}
                    gridRef={gridRef}
                    onSlotClick={handleSlotClick}
                    onEventClick={handleEventClick}
                    onColorChange={handleColorChange}
                    onEdit={handleContextEdit}
                    onDuplicate={handleDuplicate}
                    onDelete={handleContextDelete}
                    onDragMove={handleDragMove}
                    onDragToEdge={handleDragToEdge}
                    onDragStart={handleDragStart}
                    onDragStateChange={handleDragStateChange}
                    onResize={handleResize}
                  />
                ))}
                {activeDragState.ghostStyle && (
                  <div
                    className="absolute pointer-events-none z-40 rounded-md opacity-80"
                    style={{
                      left: activeDragState.ghostStyle.left,
                      top: activeDragState.ghostStyle.top,
                      width: activeDragState.ghostStyle.width,
                      height: activeDragState.ghostStyle.height,
                      backgroundColor: 'var(--accent)',
                    }}
                  />
                )}
              </div>
              {events.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <WeekEmptyState />
                </div>
              )}
            </>
          )}
        </div>
        )}
      </div>

      {cardState.mode === 'detail' && (
        <EventDetailCard
          event={cardState.event}
          anchorEl={cardState.anchorEl}
          onEdit={() => {
            const ev = cardState.event
            const anchor = cardState.anchorEl
            closeCard()
            setFloatingCard({
              open: true,
              anchorEl: anchor,
              times: { start: ev.startTime, end: ev.endTime },
              color: ev.color,
              editingEvent: ev,
            })
          }}
          onDelete={handleDetailDelete}
          onClose={closeCard}
        />
      )}

      {floatingCard.open && floatingCard.times && floatingCard.anchorEl && (
        <FloatingEventCard
          key={`${floatingCard.times.start}-${floatingCard.editingEvent?.id ?? 'new'}`}
          open={floatingCard.open}
          anchorEl={floatingCard.anchorEl}
          defaultTimes={floatingCard.times}
          defaultColor={floatingCard.color}
          editingEvent={floatingCard.editingEvent}
          onClose={handleFloatingCardClose}
          onSave={handleFloatingCardSave}
          onUpdate={handleFloatingCardUpdate}
          onDelete={handleFloatingCardDelete}
          onContinue={handleFloatingCardContinue}
        />
      )}
    </>
  )
}

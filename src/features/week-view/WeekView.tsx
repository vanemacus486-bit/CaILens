import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useOutletContext } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { addWeeks, getWeekDays, getWeekStart, isEventOnDay, formatISODate, parseISODate } from '@/domain/time'
import type { CalendarEvent, EventColor, CreateEventInput, UpdateEventInput } from '@/domain/event'
import type { DefaultTimes } from '@/domain/quickLog'
import { fireAndForget } from '@/lib/fireAndForget'
import { Loader2, AlertCircle } from 'lucide-react'
import { DayColumn } from '@/components/calendar/DayColumn'
import { StandardWeekColumn } from '@/components/calendar/StandardWeekColumn'
import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { useWeekFromURL } from './hooks/useWeekFromURL'
import type { DragState } from './hooks/useEventDrag'
import { WeekDateHeader } from './WeekDateHeader'
import { WeekToolbar } from './WeekToolbar'
import { EventDetailCard } from './EventDetailCard'
import { EventEditCard } from './EventEditCard'
import { WeekEmptyState } from './WeekEmptyState'
import { DayEventStream } from '@/features/day-view/DayEventStream'
import { MonthView } from '@/features/month-view/MonthView'
import { QuickLogDialog } from '@/features/quick-log/QuickLogDialog'
import { MobileDayView } from '@/features/day-view/MobileDayView'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { saveSession, useScrollSave, useScrollRestore } from '@/hooks/useSessionRestore'
import { computeStandardWeek, mergeConsecutiveBuckets } from '@/domain/standardWeek'
import type { MergedBlock } from '@/domain/standardWeek'
import type { CardState, DraftPreview } from './types'

const EMPTY: CalendarEvent[] = []
const MS_DAY = 24 * 60 * 60 * 1000
const MS_WEEK = 7 * MS_DAY

export function WeekView() {
  const { weekStart, setWeekStart } = useWeekFromURL()
  const [searchParams, setSearchParams] = useSearchParams()
  const { onQuickLog } = useOutletContext<{ onQuickLog: () => void }>()

  const events             = useEventStore((s) => s.events)
  const isLoading          = useEventStore((s) => s.isLoading)
  const loadError          = useEventStore((s) => s.loadError)
  const loadWeek           = useEventStore((s) => s.loadWeek)
  const createEvent        = useEventStore((s) => s.createEvent)
  const updateEvent        = useEventStore((s) => s.updateEvent)
  const deleteEvent        = useEventStore((s) => s.deleteEvent)
  const duplicateEvent     = useEventStore((s) => s.duplicateEvent)
  const allEvents          = useEventStore((s) => s.allEvents)
  const loadAllEvents      = useEventStore((s) => s.loadAllEvents)

  const language           = useAppSettingsStore((s) => s.settings.language)

  // Standard week state
  const [isStandardWeek, setIsStandardWeek] = useState(false)
  const [standardWeekRange, setStandardWeekRange] = useState<'4w' | '12w' | 'all'>('all')
  const [hideSleep, setHideSleep] = useState(false)

  // View mode: derived from URL (single source of truth — no useState)
  const viewMode = (searchParams.get('view') as 'week' | 'month' | 'day' | null) ?? 'week'

  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const dateParam = searchParams.get('date')
    const viewParam = searchParams.get('view')
    if (dateParam) {
      const parsed = parseISODate(dateParam)
      // For month mode, normalise to the 1st of the month
      if (viewParam === 'month') {
        return new Date(parsed.getFullYear(), parsed.getMonth(), 1)
      }
      return parsed
    }
    return new Date()
  })



  const handleViewModeChange = useCallback((mode: 'week' | 'month' | 'day') => {
    const next = new URLSearchParams(searchParams)
    if (mode === 'day') {
      const d = new Date()
      setSelectedDay(d)
      next.set('view', 'day')
      next.set('date', formatISODate(d))
    } else if (mode === 'month') {
      const now = new Date()
      const d = new Date(now.getFullYear(), now.getMonth(), 1)
      setSelectedDay(d)
      next.set('view', 'month')
      next.set('date', formatISODate(d))
    }
    // week mode: delete view/date, URL defaults to week
    if (mode !== 'day' && mode !== 'month') {
      next.delete('view')
      next.delete('date')
    }
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const handleDayChange = useCallback((date: Date) => {
    setSelectedDay(date)
    setSearchParams({ view: 'day', date: formatISODate(date) }, { replace: true })
  }, [setSearchParams])

  const handleMonthChange = useCallback((monthStart: Date) => {
    setSelectedDay(monthStart)
    setSearchParams({ view: 'month', date: formatISODate(monthStart) }, { replace: true })
  }, [setSearchParams])

  const [cardState,    setCardState]    = useState<CardState>({ mode: 'none' })
  const [draftPreview, setDraftPreview] = useState<DraftPreview | null>(null)
  const [activeDragState, setActiveDragState] = useState<DragState>({ phase: 'idle', ghostStyle: null })

  // QuickLogDialog state (replaces InlineEventCard)
  const [quickLogOpen, setQuickLogOpen] = useState(false)
  const [quickLogTimes, setQuickLogTimes] = useState<DefaultTimes | null>(null)
  const [quickLogColor, setQuickLogColor] = useState<EventColor>('accent')
  const [quickLogEditEvent, setQuickLogEditEvent] = useState<Pick<CalendarEvent, 'id' | 'title' | 'description' | 'location' | 'color' | 'startTime' | 'endTime'> | null>(null)

  const cardStateRef = useRef(cardState)
  cardStateRef.current = cardState

  const handledOpenEventRef = useRef<string | null>(null)

  const days = useMemo(() => getWeekDays(weekStart), [weekStart])

  // Merge draft preview into the event being edited so the block moves in real-time.
  const effectiveEvents = useMemo(
    () => events.map((e) =>
      cardState.mode === 'edit' && e.id === cardState.event.id && draftPreview
        ? { ...e, ...draftPreview }
        : e,
    ),
    [events, cardState, draftPreview],
  )

  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const day of days) map.set(day.getTime(), [])
    for (const event of effectiveEvents) {
      for (const day of days) {
        if (isEventOnDay(event, day)) {
          map.get(day.getTime())!.push(event)
        }
      }
    }
    return map
  }, [effectiveEvents, days])

  useEffect(() => { fireAndForget(loadWeek(weekStart), 'load week') }, [weekStart, loadWeek])

  // Tab title
  useEffect(() => {
    const year = weekStart.getFullYear()
    const weekNum = getISOWeek(weekStart)
    document.title = language === 'zh'
      ? `CaILens · ${year} 第 ${weekNum} 周`
      : `CaILens · ${year} W${weekNum}`
  }, [weekStart, language])

  // Load all events when entering standard week mode.
  useEffect(() => {
    if (isStandardWeek) {
      loadAllEvents()
    }
  }, [isStandardWeek, loadAllEvents])

  // Compute week range bounds based on the selected range.
  const standardWeekRangeBounds = useMemo(() => {
    const now = Date.now()
    const currentWeekStart = getWeekStart(new Date(), 1).getTime()
    switch (standardWeekRange) {
      case '4w':
        return { start: currentWeekStart - 3 * MS_WEEK, end: currentWeekStart + MS_WEEK }
      case '12w':
        return { start: currentWeekStart - 11 * MS_WEEK, end: currentWeekStart + MS_WEEK }
      case 'all':
        return { start: 0, end: now + MS_DAY }
    }
  }, [standardWeekRange])

  // Compute standard week data.
  const standardWeekData = useMemo(() => {
    if (!isStandardWeek || allEvents.length === 0) return null
    return computeStandardWeek({
      events: allEvents,
      weekRangeStart: standardWeekRangeBounds.start,
      weekRangeEnd: standardWeekRangeBounds.end,
      excludeCategoryIds: hideSleep ? new Set(['stone']) : undefined,
    })
  }, [isStandardWeek, allEvents, standardWeekRangeBounds, hideSleep])

  // Merge consecutive buckets into blocks, grouped by weekday.
  const standardWeekBlocks = useMemo(() => {
    if (!standardWeekData) return null
    const merged = mergeConsecutiveBuckets(standardWeekData.buckets)
    const groups: MergedBlock[][] = [[], [], [], [], [], [], []]
    for (const block of merged) {
      groups[block.weekday]?.push(block)
    }
    return groups
  }, [standardWeekData])

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
        setCardState({ mode: 'detail', event, anchorEl: el })
      }
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        next.delete('openEvent')
        return next
      }, { replace: true })
    })
  }, [events, searchParams, setSearchParams])

  // Auto-close if the active event is no longer in the store (week changed, etc.)
  useEffect(() => {
    if (cardState.mode !== 'none') {
      const still = events.find((e) => e.id === cardState.event.id)
      if (!still) {
        setCardState({ mode: 'none' })
        setDraftPreview(null)
      }
    }
  }, [cardState, events])

  const selectedEventId = cardState.mode !== 'none' ? cardState.event.id : null

  const isMobile = useIsMobile()
  const [mobileViewMode, setMobileViewMode] = useState<'day' | 'week'>('day')

  const justClosedCardRef = useRef(false)

  const closeCard = useCallback(() => {
    justClosedCardRef.current = true
    setCardState({ mode: 'none' })
    setDraftPreview(null)
  }, [])

  const handleSlotClick = useCallback((startTime: number, _slotEl: HTMLElement) => {
    if (isStandardWeek) return
    if (justClosedCardRef.current) {
      justClosedCardRef.current = false
      return
    }
    if (cardState.mode !== 'none') return

    // Open QuickLogDialog for new event creation
    setQuickLogTimes({ start: startTime, end: startTime + 60 * 60_000 })
    setQuickLogColor('stone')
    setQuickLogEditEvent(null)
    setQuickLogOpen(true)
  }, [cardState.mode, isStandardWeek])

  const handleEventClick = useCallback((event: CalendarEvent, _el: HTMLElement) => {
    useUIStore.getState().setLastFocusedEventId(event.id)
    useAiChatStore.getState().addCalendarContext([{
      id: event.id,
      type: 'event',
      eventId: event.id,
      eventTitle: event.title || undefined,
      eventDescription: event.description || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      categoryId: event.color,
    }])
    setDraftPreview(null)

    // Open QuickLogDialog in edit mode
    setQuickLogTimes({ start: event.startTime, end: event.endTime })
    setQuickLogColor(event.color)
    setQuickLogEditEvent({
      id: event.id, title: event.title,
      description: event.description, location: event.location,
      color: event.color, startTime: event.startTime, endTime: event.endTime,
    })
    setQuickLogOpen(true)
  }, [])

  const handleEdit = useCallback(() => {
    setCardState((prev) =>
      prev.mode === 'detail'
        ? { mode: 'edit', event: prev.event, isNewlyCreated: false, anchorEl: prev.anchorEl }
        : prev,
    )
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
    setDraftPreview(null)
    setCardState({ mode: 'edit', event, isNewlyCreated: false, anchorEl })
  }, [])

  const handleContextDelete = useCallback((eventId: string) => {
    fireAndForget(deleteEvent(eventId), 'delete event (context)')
    const cs = cardStateRef.current
    if (cs.mode !== 'none' && cs.event.id === eventId) {
      setCardState({ mode: 'none' })
      setDraftPreview(null)
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
      setDraftPreview(null)
    }
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

  const handleSave = useCallback((updates: UpdateEventInput) => {
    fireAndForget(updateEvent(updates), 'save event')
  }, [updateEvent])

  const handleEditDelete = useCallback(() => {
    if (cardState.mode !== 'edit') return
    fireAndForget(deleteEvent(cardState.event.id), 'delete event (edit)')
  }, [cardState, deleteEvent])

  const handleEditClose = useCallback(() => {
    closeCard()
  }, [closeCard])

  const handleEditCancel = useCallback(() => {
    closeCard()
  }, [closeCard])

  // ── QuickLogDialog handlers ──────────────────────────────

  const handleQuickLogSave = useCallback(async (input: CreateEventInput): Promise<string> => {
    const event = await createEvent(input)
    return event.id
  }, [createEvent])

  const handleQuickLogUpdate = useCallback(async (input: UpdateEventInput) => {
    await updateEvent(input)
  }, [updateEvent])

  const handleQuickLogDelete = useCallback(async (id: string) => {
    await deleteEvent(id)
  }, [deleteEvent])

  const handleQuickLogOpenChange = useCallback((open: boolean) => {
    setQuickLogOpen(open)
    if (!open) {
      setQuickLogTimes(null)
      setQuickLogEditEvent(null)
    }
  }, [])

  // Reverse Anchoring: opacity mute
  const hoveredAnchor = useUIStore((s) => s.hoveredAnchor)

  useEffect(() => {
    document.querySelectorAll('[data-event-id]').forEach((el) => {
      el.classList.remove('opacity-40')
    })

    if (!hoveredAnchor) return

    if (hoveredAnchor.type === 'category') {
      document.querySelectorAll('[data-event-id]').forEach((el) => {
        el.classList.add('opacity-40')
      })
      document.querySelectorAll(`[data-event-category="${hoveredAnchor.categoryId}"]`).forEach((el) => {
        el.classList.remove('opacity-40')
      })
    } else if (hoveredAnchor.type === 'event' && hoveredAnchor.eventTitle) {
      document.querySelectorAll('[data-event-id]').forEach((el) => {
        const eventId = el.getAttribute('data-event-id')
        const event = events.find((e) => e.id === eventId)
        if (!event || event.title !== hoveredAnchor.eventTitle) {
          el.classList.add('opacity-40')
        }
      })
    }
  }, [hoveredAnchor, events])

  const gridRef = useRef<HTMLDivElement>(null)

  // Session state: save week + view, restore scroll
  useEffect(() => {
    saveSession({ weekStart: weekStart.getTime(), view: 'week' })
  }, [weekStart])

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  useScrollSave(scrollContainerRef, 'week')
  useScrollRestore(scrollContainerRef, 'week')

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0">
        <header>
        <WeekToolbar
          weekStart={weekStart}
          onPrev={() => {
            if (viewMode === 'month') {
              setSelectedDay(new Date(selectedDay.getFullYear(), selectedDay.getMonth() - 1, 1))
            } else if (viewMode === 'day') {
              setSelectedDay(new Date(selectedDay.getTime() - 86_400_000))
            } else {
              setWeekStart(addWeeks(weekStart, -1))
            }
          }}
          onNext={() => {
            if (viewMode === 'month') {
              setSelectedDay(new Date(selectedDay.getFullYear(), selectedDay.getMonth() + 1, 1))
            } else if (viewMode === 'day') {
              setSelectedDay(new Date(selectedDay.getTime() + 86_400_000))
            } else {
              setWeekStart(addWeeks(weekStart, 1))
            }
          }}
          onToday={() => {
            if (!isStandardWeek) setWeekStart(getWeekStart(new Date(), 1))
            // Scroll to current time at ~1/3 viewport
            requestAnimationFrame(() => {
              const grid = gridRef.current
              if (!grid) return
              const now = new Date()
              const minutesSinceMidnight = now.getHours() * 60 + now.getMinutes()
              const totalMinutes = 24 * 60
              const proportion = minutesSinceMidnight / totalMinutes
              const targetScroll = proportion * grid.scrollHeight - grid.clientHeight / 3
              grid.parentElement?.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' })
            })
          }}
          onQuickLog={onQuickLog}
          viewMode={viewMode}
          onViewModeChange={handleViewModeChange}
          mobileViewMode={isMobile ? mobileViewMode : undefined}
          onMobileViewModeChange={isMobile ? setMobileViewMode : undefined}
          isStandardWeek={isStandardWeek}
          onToggleStandardWeek={() => setIsStandardWeek((v) => !v)}
          standardWeekRange={standardWeekRange}
          onStandardWeekRangeChange={setStandardWeekRange}
          hideSleep={hideSleep}
          onHideSleepChange={setHideSleep}
          standardWeekSpanWeeks={standardWeekData?.spanWeeks ?? 0}
        />
        {(isMobile && mobileViewMode === 'day') ? null : (
          isStandardWeek ? null : <WeekDateHeader days={days} onDayClick={handleDayChange} />
        )}
        </header>

        {viewMode === 'month' ? (
          <MonthView monthStart={selectedDay} onDayChange={handleDayChange} onMonthChange={handleMonthChange} />
        ) : viewMode === 'day' ? (
          <DayEventStream dayStart={selectedDay} onDayChange={handleDayChange} />
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
              {isStandardWeek ? (
                /* Standard week grid */
                <>
                  <div ref={gridRef} className="h-full grid min-w-[540px]" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)' }}>
                    <TimeGrid />
                    {[0, 1, 2, 3, 4, 5, 6].map((wd) => (
                      <StandardWeekColumn
                        key={wd}
                        weekday={wd}
                        blocks={standardWeekBlocks?.[wd] ?? []}
                        spanWeeks={standardWeekData?.spanWeeks ?? 0}
                        language={language}
                      />
                    ))}
                  </div>
                  {standardWeekData && standardWeekData.spanWeeks < 3 && (
                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-surface-raised border border-border-default rounded-lg px-4 py-2 shadow-lg">
                      <p className="font-sans text-xs text-text-secondary text-center">
                        {t(
                          `仅 ${standardWeekData.spanWeeks} 周数据 · 标准周可能不准确`,
                          `Only ${standardWeekData.spanWeeks} week(s) of data · Standard week may be inaccurate`,
                        )}
                      </p>
                    </div>
                  )}
                </>
              ) : (
                /* Real week grid */
                <>
                  <div ref={gridRef} className="h-full grid min-w-[540px]" style={{ gridTemplateColumns: 'var(--time-column-width) repeat(7, 1fr)', touchAction: 'manipulation' }}>
                    <TimeGrid />
                    {days.map((day) => (
                      <DayColumn
                        key={day.getTime()}
                        date={day}
                        events={eventsByDay.get(day.getTime()) ?? EMPTY}
                        selectedEventId={selectedEventId}
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
            </>
          )}
        </div>
        )}
      </div>

      {cardState.mode === 'detail' && (
        <EventDetailCard
          event={cardState.event}
          anchorEl={cardState.anchorEl}
          onEdit={handleEdit}
          onDelete={handleDetailDelete}
          onClose={closeCard}
        />
      )}

      {cardState.mode === 'edit' && (
        <EventEditCard
          event={cardState.event}
          isNewlyCreated={cardState.isNewlyCreated}
          anchorEl={cardState.anchorEl}
          onSave={handleSave}
          onDelete={handleEditDelete}
          onClose={handleEditClose}
          onCancel={handleEditCancel}
          onDraftChange={setDraftPreview}
        />
      )}

      {quickLogOpen && quickLogTimes && (
        <QuickLogDialog
          open={quickLogOpen}
          onOpenChange={handleQuickLogOpenChange}
          defaultTimes={quickLogTimes}
          defaultColor={quickLogColor}
          onSave={handleQuickLogSave}
          editingEvent={quickLogEditEvent ?? undefined}
          onUpdate={handleQuickLogUpdate}
          onDelete={handleQuickLogDelete}
        />
      )}
    </>
  )
}

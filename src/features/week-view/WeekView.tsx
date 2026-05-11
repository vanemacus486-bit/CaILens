import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams, useOutletContext } from 'react-router-dom'
import { addWeeks, getWeekDays, getWeekStart, isEventOnDay } from '@/domain/time'
import type { CalendarEvent, EventColor, UpdateEventInput } from '@/domain/event'
import { fireAndForget } from '@/lib/fireAndForget'
import { Loader2, AlertCircle } from 'lucide-react'
import { DayColumn } from '@/components/calendar/DayColumn'
import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useEventStore } from '@/stores/eventStore'
import { useUIStore } from '@/stores/uiStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { useWeekFromURL } from './hooks/useWeekFromURL'
import { WeekDateHeader } from './WeekDateHeader'
import { WeekToolbar } from './WeekToolbar'
import { EventDetailCard } from './EventDetailCard'
import { EventEditCard } from './EventEditCard'
import { WeekEmptyState } from './WeekEmptyState'
import { MobileDayView } from '@/features/day-view/MobileDayView'
import { useIsMobile } from '@/hooks/useMediaQuery'
import type { CardState, DraftPreview } from './types'

const EMPTY: CalendarEvent[] = []

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

  const [cardState,    setCardState]    = useState<CardState>({ mode: 'none' })
  const [draftPreview, setDraftPreview] = useState<DraftPreview | null>(null)

  // Ref so context-menu handlers don't need cardState as a dependency
  // (keeps the callbacks stable across card open/close cycles).
  const cardStateRef = useRef(cardState)
  cardStateRef.current = cardState

  // Prevent the openEvent effect from re-firing for the same event ID
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

  // ── Derived ──────────────────────────────────────────

  const selectedEventId = cardState.mode !== 'none' ? cardState.event.id : null

  // ── Mobile view mode ──────────────────────────────────

  const isMobile = useIsMobile()
  const [mobileViewMode, setMobileViewMode] = useState<'day' | 'week'>('day')

  // ── Helpers ───────────────────────────────────────────

  // Set to true whenever a card closes so the very next slot-click is swallowed.
  // Needed because Popover's onPointerDownOutside (pointerdown) and the slot's
  // onClick (click) are parts of the same pointer gesture. Without this, React 18
  // batching can flush the card-close state update before onClick fires, making
  // the closure guard in handleSlotClick see mode === 'none' and create an event.
  const justClosedCardRef = useRef(false)

  const closeCard = useCallback(() => {
    justClosedCardRef.current = true
    setCardState({ mode: 'none' })
    setDraftPreview(null)
  }, [])

  // ── Slot click: create blank event → edit card ────────

  // Guard against creating a new event when a card is already open.
  // Because onPointerDownOutside fires on pointerdown and slot onClick fires
  // on click (later), this callback still sees the pre-update cardState from
  // its closure — returning early prevents accidental double-create.
  const handleSlotClick = useCallback((startTime: number, slotEl: HTMLElement) => {
    // Swallow the click that immediately follows closing a card — they're part
    // of the same pointer gesture (pointerdown closed the card, click hits here).
    if (justClosedCardRef.current) {
      justClosedCardRef.current = false
      return
    }
    if (cardState.mode !== 'none') return

    void createEvent({
      title: '', startTime, endTime: startTime + 60 * 60_000,
      color: 'stone', categoryId: 'stone',
    }).then((newEvent) => {
      setCardState({ mode: 'edit', event: newEvent, isNewlyCreated: true, anchorEl: slotEl })
    }).catch((err) => { console.error('[fire-and-forget] create event:', err) })
  }, [cardState.mode, createEvent])

  // ── Event click: open detail card + inject context ────

  const handleEventClick = useCallback((event: CalendarEvent, el: HTMLElement) => {
    useUIStore.getState().setLastFocusedEventId(event.id)
    // Inject event as calendar context
    useAiChatStore.getState().addCalendarContext([{
      id: event.id,
      type: 'event',
      eventId: event.id,
      eventTitle: event.title || undefined,
      startTime: event.startTime,
      endTime: event.endTime,
      categoryId: event.color,
    }])
    setDraftPreview(null)
    setCardState({ mode: 'detail', event, anchorEl: el })
  }, [])

  // ── Detail card actions ───────────────────────────────

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

  // ── Context-menu actions (stable refs, no cardState dep) ─

  const handleColorChange = useCallback((eventId: string, color: EventColor) => {
    fireAndForget(updateEvent({ id: eventId, color, categoryId: color }), 'update event color')
  }, [updateEvent])

  // Jump straight to edit card (skips detail card).
  const handleContextEdit = useCallback((event: CalendarEvent, anchorEl: HTMLElement) => {
    setDraftPreview(null)
    setCardState({ mode: 'edit', event, isNewlyCreated: false, anchorEl })
  }, [])

  // Delete via context menu. Uses ref so cardState isn't a dep (keeps this stable).
  const handleContextDelete = useCallback((eventId: string) => {
    fireAndForget(deleteEvent(eventId), 'delete event (context)')
    const cs = cardStateRef.current
    if (cs.mode !== 'none' && cs.event.id === eventId) {
      setCardState({ mode: 'none' })
      setDraftPreview(null)
    }
  }, [deleteEvent])

  // ── Resize handler ───────────────────────────────────

  const handleResize = useCallback((eventId: string, newStartTime: number, newEndTime: number) => {
    fireAndForget(updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime }), 'resize event')
  }, [updateEvent])

  // ── Drag handlers ────────────────────────────────────

  // Persist the new position after drag-end. Fire-and-forget is fine:
  // Dexie writes are fast enough (~5 ms) that the brief snap-back is imperceptible.
  const handleDragMove = useCallback((eventId: string, newStartTime: number, newEndTime: number) => {
    fireAndForget(updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime }), 'drag move event')
  }, [updateEvent])

  // Close any open card when a drag begins so the card doesn't float detached.
  const handleDragStart = useCallback(() => {
    if (cardStateRef.current.mode !== 'none') {
      setCardState({ mode: 'none' })
      setDraftPreview(null)
    }
  }, [])

  // ── Duplicate ────────────────────────────────────────

  const handleDuplicate = useCallback((eventId: string) => {
    fireAndForget(duplicateEvent(eventId), 'duplicate event')
  }, [duplicateEvent])

  // ── Cross-week drag ──────────────────────────────────

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

  // ── Edit card actions ────────────────────────────────

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

  // ── Reverse Anchoring: opacity mute ────────────────────

  const hoveredAnchor = useUIStore((s) => s.hoveredAnchor)

  useEffect(() => {
    // Remove dimming from all events
    document.querySelectorAll('[data-event-id]').forEach((el) => {
      el.classList.remove('opacity-40')
    })

    if (!hoveredAnchor) return

    if (hoveredAnchor.type === 'category') {
      // Dim all events, then restore matching ones
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

  // ── Render ───────────────────────────────────────────

  // gridRef is attached to the full calendar grid (time col + 7 day cols).
  // useDragToMove uses it to measure column widths for X snapping.
  const gridRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0">
        <header>
        <WeekToolbar
          weekStart={weekStart}
          onPrev={() => setWeekStart(addWeeks(weekStart, -1))}
          onNext={() => setWeekStart(addWeeks(weekStart, 1))}
          onToday={() => setWeekStart(getWeekStart(new Date(), 1))}
          onQuickLog={onQuickLog}
          mobileViewMode={isMobile ? mobileViewMode : undefined}
          onMobileViewModeChange={isMobile ? setMobileViewMode : undefined}
        />
        {(isMobile && mobileViewMode === 'day') ? null : (
          <WeekDateHeader days={days} />
        )}
        </header>

        {/* Calendar grid / Mobile day view */}
        {isMobile && mobileViewMode === 'day' ? (
          <MobileDayView weekStart={weekStart} onWeekStartChange={setWeekStart} />
        ) : (
        <div className="relative flex-1 min-h-0 max-md:overflow-x-auto">
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
                    onResize={handleResize}
                  />
                ))}
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

      {/* ── Cards (rendered in portals by Radix Popover) ─── */}

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
    </>
  )
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addWeeks, getWeekDays, getWeekStart, isEventOnDay } from '@/domain/time'
import type { CalendarEvent, EventColor, UpdateEventInput } from '@/domain/event'
import { DayColumn } from '@/components/calendar/DayColumn'
import { TimeGrid } from '@/components/calendar/TimeGrid'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useWeekFromURL } from './hooks/useWeekFromURL'
import { WeekDateHeader } from './WeekDateHeader'
import { WeekToolbar } from './WeekToolbar'
import { EventDetailCard } from './EventDetailCard'
import { EventEditCard } from './EventEditCard'
import type { CardState, DraftPreview } from './types'

const EMPTY: CalendarEvent[] = []

export function WeekView() {
  const { weekStart, setWeekStart } = useWeekFromURL()

  const events             = useEventStore((s) => s.events)
  const loadWeek           = useEventStore((s) => s.loadWeek)
  const createEvent        = useEventStore((s) => s.createEvent)
  const updateEvent        = useEventStore((s) => s.updateEvent)
  const deleteEvent        = useEventStore((s) => s.deleteEvent)
  const shiftCurrentWeek   = useEventStore((s) => s.shiftCurrentWeek)
  const loadCategories     = useCategoryStore((s) => s.loadCategories)
  const loadSettings       = useAppSettingsStore((s) => s.loadSettings)

  // アプリ起動時に categories と settings を一度だけロード
  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [cardState,    setCardState]    = useState<CardState>({ mode: 'none' })
  const [draftPreview, setDraftPreview] = useState<DraftPreview | null>(null)

  // Ref so context-menu handlers don't need cardState as a dependency
  // (keeps the callbacks stable across card open/close cycles).
  const cardStateRef = useRef(cardState)
  cardStateRef.current = cardState

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
          break
        }
      }
    }
    return map
  }, [effectiveEvents, days])

  useEffect(() => { void loadWeek(weekStart) }, [weekStart, loadWeek])

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
      setCardState({ mode: 'edit', event: newEvent, anchorEl: slotEl, isNewlyCreated: true })
    })
  }, [cardState.mode, createEvent])

  // ── Event click: open detail card ────────────────────

  const handleEventClick = useCallback((event: CalendarEvent, el: HTMLElement) => {
    setDraftPreview(null)
    setCardState({ mode: 'detail', event, anchorEl: el })
  }, [])

  // ── Detail card actions ───────────────────────────────

  const handleEdit = useCallback(() => {
    setCardState((prev) =>
      prev.mode === 'detail'
        ? { mode: 'edit', event: prev.event, anchorEl: prev.anchorEl, isNewlyCreated: false }
        : prev,
    )
  }, [])

  const handleDetailDelete = useCallback(() => {
    if (cardState.mode !== 'detail') return
    void deleteEvent(cardState.event.id)
    closeCard()
  }, [cardState, deleteEvent, closeCard])

  // ── Context-menu actions (stable refs, no cardState dep) ─

  const handleColorChange = useCallback((eventId: string, color: EventColor) => {
    void updateEvent({ id: eventId, color })
  }, [updateEvent])

  // Jump straight to edit card (skips detail card).
  const handleContextEdit = useCallback((event: CalendarEvent, anchorEl: HTMLElement) => {
    setDraftPreview(null)
    setCardState({ mode: 'edit', event, anchorEl, isNewlyCreated: false })
  }, [])

  // Delete via context menu. Uses ref so cardState isn't a dep (keeps this stable).
  const handleContextDelete = useCallback((eventId: string) => {
    void deleteEvent(eventId)
    const cs = cardStateRef.current
    if (cs.mode !== 'none' && cs.event.id === eventId) {
      setCardState({ mode: 'none' })
      setDraftPreview(null)
    }
  }, [deleteEvent])

  // ── Resize handler ───────────────────────────────────

  const handleResize = useCallback((eventId: string, newStartTime: number, newEndTime: number) => {
    void updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime })
  }, [updateEvent])

  // ── Drag handlers ────────────────────────────────────

  // Persist the new position after drag-end. Fire-and-forget is fine:
  // Dexie writes are fast enough (~5 ms) that the brief snap-back is imperceptible.
  const handleDragMove = useCallback((eventId: string, newStartTime: number, newEndTime: number) => {
    void updateEvent({ id: eventId, startTime: newStartTime, endTime: newEndTime })
  }, [updateEvent])

  // Close any open card when a drag begins so the card doesn't float detached.
  const handleDragStart = useCallback(() => {
    if (cardStateRef.current.mode !== 'none') {
      setCardState({ mode: 'none' })
      setDraftPreview(null)
    }
  }, [])

  // ── Bulk shift ───────────────────────────────────────

  const handleShift = useCallback(async (direction: -1 | 1) => {
    await shiftCurrentWeek(direction)
    setWeekStart(addWeeks(weekStart, direction))
  }, [shiftCurrentWeek, weekStart, setWeekStart])

  // ── Edit card actions ────────────────────────────────

  const handleSave = useCallback((updates: UpdateEventInput) => {
    void updateEvent(updates)  // fire-and-forget; store updates async
  }, [updateEvent])

  const handleEditDelete = useCallback(() => {
    if (cardState.mode !== 'edit') return
    void deleteEvent(cardState.event.id)
  }, [cardState, deleteEvent])

  const handleEditClose = useCallback(() => {
    closeCard()
  }, [closeCard])

  const handleEditCancel = useCallback(() => {
    closeCard()
  }, [closeCard])

  // ── Render ───────────────────────────────────────────

  // gridRef is attached to the full calendar grid (time col + 7 day cols).
  // useDragToMove uses it to measure column widths for X snapping.
  const gridRef = useRef<HTMLDivElement>(null)

  return (
    <>
      <div className="flex-1 flex flex-col min-w-0">
        <WeekToolbar
          weekStart={weekStart}
          eventCount={events.length}
          onPrev={() => setWeekStart(addWeeks(weekStart, -1))}
          onNext={() => setWeekStart(addWeeks(weekStart, 1))}
          onToday={() => setWeekStart(getWeekStart(new Date(), 1))}
          onShift={handleShift}
        />
        <WeekDateHeader days={days} />

        {/* Calendar grid fills remaining height. 24 hours distributed evenly
            via CSS grid 1fr rows — no fixed px, no scrolling. */}
        <div ref={gridRef} className="flex-1 min-h-0 grid grid-cols-[80px_repeat(7,1fr)]">
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
              onDelete={handleContextDelete}
              onDragMove={handleDragMove}
              onDragStart={handleDragStart}
              onResize={handleResize}
            />
          ))}
        </div>
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
          anchorEl={cardState.anchorEl}
          isNewlyCreated={cardState.isNewlyCreated}
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

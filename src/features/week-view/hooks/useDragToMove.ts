import { useCallback, useEffect, useRef, useState } from 'react'
import { isSameDay, moveTimestampToDay } from '@/domain/time'
import { TIME_COLUMN_WIDTH_PX } from '@/features/week-view/constants'

/** Minimum pointer movement (px) before a press becomes a drag. */
const DRAG_THRESHOLD = 5
const DAY_MINUTES    = 24 * 60

interface UseDragToMoveParams {
  eventId:           string
  originalStartTime: number
  originalEndTime:   number
  /** Root DOM element of the event block (used for direct style mutation). */
  eventBlockRef:     React.RefObject<HTMLElement | null>
  /**
   * The 7 days shown in the current week view. Passed so the hook can convert
   * an X pixel offset into a target day index (cross-column drag).
   */
  weekDays:          Date[]
  /**
   * Ref to the full calendar grid container (80 px time column + 7 day columns).
   * Used to measure column widths for X snapping.
   */
  gridRef:           React.RefObject<HTMLElement | null>
  onDragStart:       () => void
  onDragEnd:         (newStartTime: number, newEndTime: number) => void
  onDragCancel:      () => void
}

interface UseDragToMoveResult {
  onPointerDown: (e: React.PointerEvent) => void
  isDragging:    boolean
  /** True while dragging or just after; EventBlock reads this in onClick to suppress card open. */
  wasDragging:   React.MutableRefObject<boolean>
}

/**
 * Encapsulates drag-to-move logic for an event block.
 *
 * State machine: idle → pending (pointerdown, < 5 px) → dragging (> 5 px) → idle
 *
 * Visual feedback is done via direct DOM style mutation (transform, opacity, zIndex)
 * to avoid 60 fps React re-renders. React state updates only happen twice per drag:
 * at drag-start and drag-end.
 *
 * Cross-column (cross-day) drag: X pixel offset is converted to a target day index
 * at drag-end; Y offset is snapped to 30-minute slots within that day.
 */
export function useDragToMove({
  originalStartTime,
  originalEndTime,
  eventBlockRef,
  weekDays,
  gridRef,
  onDragStart,
  onDragEnd,
  onDragCancel,
}: UseDragToMoveParams): UseDragToMoveResult {
  const [isDragging, setIsDragging] = useState(false)

  // ── Per-drag mutable refs (no React renders) ─────────────────

  type DragState = 'idle' | 'pending' | 'dragging'
  const dragStateRef     = useRef<DragState>('idle')
  const startPointerXRef = useRef(0)
  const startPointerYRef = useRef(0)
  const currentDeltaYRef = useRef(0)
  const wasDragging      = useRef(false)

  // ── Latest-value refs for callbacks and params ───────────────

  const onDragStartRef  = useRef(onDragStart)
  const onDragEndRef    = useRef(onDragEnd)
  const onDragCancelRef = useRef(onDragCancel)
  onDragStartRef.current  = onDragStart
  onDragEndRef.current    = onDragEnd
  onDragCancelRef.current = onDragCancel

  const originalStartRef    = useRef(originalStartTime)
  const originalEndRef      = useRef(originalEndTime)
  originalStartRef.current  = originalStartTime
  originalEndRef.current    = originalEndTime

  const weekDaysRef = useRef(weekDays)
  weekDaysRef.current = weekDays

  // Pre-compute which column index this event currently lives in.
  const originalDayIndexRef = useRef(0)
  const idx = weekDays.findIndex((d) => isSameDay(d, new Date(originalStartTime)))
  originalDayIndexRef.current = Math.max(0, idx)

  // ── Snap calculation (stable, uses refs only) ────────────────

  /**
   * Given the final pixel delta (both axes) and the pointer's final X position,
   * computes snapped newStartTime / newEndTime.
   *
   * Y axis  → snap to 30-minute slots within the target day.
   * X axis  → map pointer X to a day index (0–6), clamp to week boundaries.
   */
  const computeSnapped = useCallback(
    (
      deltaY:      number,
      finalPointerX: number,
    ): { newStartTime: number; newEndTime: number } | null => {
      const el = eventBlockRef.current
      if (!el) return null

      // ── Y: time-of-day delta ─────────────────────────────────

      // Parent chain: EventBlock → inner-grid-div → DayColumn outer div
      const dayColumnEl  = el.parentElement?.parentElement
      const columnHeight = dayColumnEl?.getBoundingClientRect().height ?? 0
      if (columnHeight === 0) return null

      const pixelsPerMinute  = columnHeight / DAY_MINUTES
      const deltaMinutes     = deltaY / pixelsPerMinute
      const snappedYMinutes  = Math.round(deltaMinutes / 30) * 30
      const snappedYMs       = snappedYMinutes * 60_000

      // ── X: target day index ──────────────────────────────────

      const days    = weekDaysRef.current
      let targetIdx = originalDayIndexRef.current  // default: same column

      const gridEl = gridRef.current
      if (gridEl && days.length > 0) {
        const gridRect   = gridEl.getBoundingClientRect()
        // Subtract the fixed 80 px time-label column on the left.
        const relativeX  = finalPointerX - gridRect.left - TIME_COLUMN_WIDTH_PX
        const colWidth   = (gridRect.width - TIME_COLUMN_WIDTH_PX) / days.length
        if (colWidth > 0) {
          targetIdx = Math.floor(relativeX / colWidth)
          targetIdx = Math.max(0, Math.min(days.length - 1, targetIdx))
        }
      }

      const targetDay = days[targetIdx]
      if (!targetDay) return null

      // ── Combine: move to new day + apply Y delta ─────────────

      const origStart = originalStartRef.current
      const origEnd   = originalEndRef.current
      const duration  = origEnd - origStart

      let newStart = moveTimestampToDay(origStart, targetDay) + snappedYMs
      let newEnd   = moveTimestampToDay(origEnd,   targetDay) + snappedYMs

      // Clamp to target day's boundaries
      const dayStart = new Date(
        targetDay.getFullYear(), targetDay.getMonth(), targetDay.getDate(), 0, 0, 0, 0,
      ).getTime()
      const dayEnd = dayStart + 24 * 60 * 60_000

      if (newStart < dayStart) { newStart = dayStart;      newEnd = dayStart + duration }
      if (newEnd   > dayEnd)   { newEnd   = dayEnd;        newStart = dayEnd  - duration }

      return { newStartTime: newStart, newEndTime: newEnd }
    },
    [eventBlockRef, gridRef],
  )

  // ── DOM helpers ──────────────────────────────────────────────

  const clearDragStyles = useCallback(() => {
    const el = eventBlockRef.current
    if (!el) return
    el.style.transform = ''
    el.style.opacity   = ''
    el.style.zIndex    = ''
  }, [eventBlockRef])

  // ── Main pointer-down handler ────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return   // left button only

    dragStateRef.current     = 'pending'
    startPointerXRef.current = e.clientX
    startPointerYRef.current = e.clientY
    currentDeltaYRef.current = 0
    wasDragging.current      = false

    // Pointer capture: guarantees pointermove / pointerup reach this element
    // even when the pointer moves fast outside the event block.
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    const cleanup = () => {
      document.removeEventListener('pointermove',   onMove)
      document.removeEventListener('pointerup',     onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown',       onKey)
      document.body.classList.remove('dragging-event')
      dragStateRef.current = 'idle'
    }

    const onMove = (ev: PointerEvent) => {
      const deltaY = ev.clientY - startPointerYRef.current
      const deltaX = ev.clientX - startPointerXRef.current

      if (dragStateRef.current === 'pending') {
        // Wait until the pointer has moved enough to confirm intent.
        if (Math.abs(deltaY) < DRAG_THRESHOLD && Math.abs(deltaX) < DRAG_THRESHOLD) return

        dragStateRef.current = 'dragging'
        wasDragging.current  = true
        document.body.classList.add('dragging-event')
        onDragStartRef.current()
        setIsDragging(true)

        const el = eventBlockRef.current
        if (el) { el.style.opacity = '0.85'; el.style.zIndex = '50' }
      }

      if (dragStateRef.current === 'dragging') {
        currentDeltaYRef.current = deltaY
        const el = eventBlockRef.current
        if (el) el.style.transform = `translate(${deltaX}px, ${deltaY}px)`
      }
    }

    const onUp = (ev: PointerEvent) => {
      const wasDraggingNow = dragStateRef.current === 'dragging'
      cleanup()

      if (wasDraggingNow) {
        clearDragStyles()
        const result = computeSnapped(currentDeltaYRef.current, ev.clientX)
        if (result) onDragEndRef.current(result.newStartTime, result.newEndTime)
        setIsDragging(false)
      }
      // If still pending (never dragged past threshold): do nothing —
      // the browser will fire a click event naturally.
    }

    const onCancel = () => {
      const wasDraggingNow = dragStateRef.current === 'dragging'
      cleanup()
      if (wasDraggingNow) { clearDragStyles(); onDragCancelRef.current(); setIsDragging(false) }
    }

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && dragStateRef.current === 'dragging') {
        clearDragStyles()
        onDragCancelRef.current()
        setIsDragging(false)
        cleanup()
      }
    }

    document.addEventListener('pointermove',   onMove)
    document.addEventListener('pointerup',     onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown',       onKey)

    // Stop propagation to prevent DayColumn slot / ContextMenu from reacting
    // to the same pointerdown. Do NOT preventDefault — that would break contextmenu.
    e.stopPropagation()
  }, [computeSnapped, clearDragStyles, eventBlockRef])

  // Safety: remove dragging class if the component unmounts mid-drag.
  useEffect(() => () => { document.body.classList.remove('dragging-event') }, [])

  return { onPointerDown: handlePointerDown, isDragging, wasDragging }
}

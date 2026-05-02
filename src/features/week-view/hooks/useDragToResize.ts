import { useCallback, useEffect, useRef } from 'react'

/** Minimum Y movement (px) before pending → resizing. */
const RESIZE_THRESHOLD = 3

interface UseDragToResizeParams {
  edge:              'top' | 'bottom'
  eventId:           string          // not used internally; caller closes over it
  originalStartTime: number
  originalEndTime:   number
  eventBlockRef:     React.RefObject<HTMLElement | null>
  columnDate:        Date            // the day of the column this event block is rendered in
  onResizeStart:     () => void
  onResizeEnd:       (newStartTime: number, newEndTime: number) => void
  onResizeCancel:    () => void
}

interface UseDragToResizeResult {
  onPointerDown: (e: React.PointerEvent) => void
}

/**
 * Encapsulates resize logic for a single edge (top = startTime, bottom = endTime).
 *
 * Visual feedback: a 2 px accent-coloured indicator line is injected directly
 * into the DayColumn DOM and repositioned on every pointermove — no React renders
 * during the drag.
 *
 * Snapping: 30-minute grid. Only constraint: end must be ≥ 30 min after start.
 * Day boundaries no longer constrain resize — events can extend across days.
 */
export function useDragToResize({
  edge,
  originalStartTime,
  originalEndTime,
  eventBlockRef,
  columnDate,
  onResizeStart,
  onResizeEnd,
  onResizeCancel,
}: UseDragToResizeParams): UseDragToResizeResult {
  // ── Latest-value refs ────────────────────────────────────

  const originalStartRef  = useRef(originalStartTime)
  const originalEndRef    = useRef(originalEndTime)
  const columnDateRef     = useRef(columnDate)
  originalStartRef.current = originalStartTime
  originalEndRef.current   = originalEndTime
  columnDateRef.current    = columnDate

  const onResizeStartRef  = useRef(onResizeStart)
  const onResizeEndRef    = useRef(onResizeEnd)
  const onResizeCancelRef = useRef(onResizeCancel)
  onResizeStartRef.current  = onResizeStart
  onResizeEndRef.current    = onResizeEnd
  onResizeCancelRef.current = onResizeCancel

  // ── Per-resize state ─────────────────────────────────────

  type ResizeState = 'idle' | 'pending' | 'resizing'
  const resizeStateRef   = useRef<ResizeState>('idle')
  const startPointerYRef = useRef(0)
  const indicatorRef     = useRef<HTMLDivElement | null>(null)

  // ── Main handler ─────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return

    resizeStateRef.current   = 'pending'
    startPointerYRef.current = e.clientY

    // Pointer capture guarantees pointermove/pointerup reach us even if the
    // pointer leaves the tiny 6 px handle area.
    const target = e.currentTarget as HTMLElement
    target.setPointerCapture(e.pointerId)

    // ── Inner helpers (close over edge and refs) ──────────

    /**
     * Converts a raw pointerY to a snapped new time pair.
     * Returns null if geometry is unavailable.
     */
    const getSnapped = (pointerY: number) => {
      const el = eventBlockRef.current
      if (!el) return null

      // EventBlock → inner-grid-div → DayColumn outer div (position: relative)
      const dayColumnEl = el.parentElement?.parentElement as HTMLElement | undefined
      if (!dayColumnEl) return null
      const rect = dayColumnEl.getBoundingClientRect()
      if (rect.height === 0) return null

      const origStart = originalStartRef.current
      const origEnd   = originalEndRef.current
      const colDate   = columnDateRef.current

      // Day boundaries based on the column day, not the event's start day
      const dayStart = new Date(
        colDate.getFullYear(), colDate.getMonth(), colDate.getDate(), 0, 0, 0, 0,
      ).getTime()

      const relY      = pointerY - rect.top
      const rawMin    = (relY / rect.height) * 24 * 60
      let snappedMin  = Math.round(rawMin / 30) * 30

      let newStart: number, newEnd: number

      if (edge === 'top') {
        // Top edge: moves startTime; endTime is fixed.
        // Clamp: start must be at least 30 min before end.
        const maxStartMin = Math.round((origEnd - dayStart) / 60_000) - 30
        snappedMin = Math.min(snappedMin, maxStartMin)
        newStart   = dayStart + snappedMin * 60_000
        newEnd     = origEnd
      } else {
        // Bottom edge: moves endTime; startTime is fixed.
        // Clamp: end must be at least 30 min after start.
        const minEndMin = Math.round((origStart - dayStart) / 60_000) + 30
        snappedMin = Math.max(snappedMin, minEndMin)
        newStart   = origStart
        newEnd     = dayStart + snappedMin * 60_000
      }

      return { snappedMin, dayColumnEl: dayColumnEl as HTMLElement, newStart, newEnd }
    }

    /** Positions the indicator line (creates it on first call). */
    const setIndicator = (dayColumnEl: HTMLElement, snappedMin: number) => {
      if (!indicatorRef.current) {
        const line        = document.createElement('div')
        line.style.cssText = [
          'position:absolute', 'left:0', 'right:0',
          'height:2px',
          'background:var(--accent)',
          'z-index:30',
          'pointer-events:none',
        ].join(';')
        dayColumnEl.appendChild(line)
        indicatorRef.current = line
      }
      indicatorRef.current.style.top = `${(snappedMin / (24 * 60)) * 100}%`
    }

    const cleanup = () => {
      document.removeEventListener('pointermove',   onMove)
      document.removeEventListener('pointerup',     onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown',       onKey)
      document.body.classList.remove('resizing-event')
      indicatorRef.current?.remove()
      indicatorRef.current      = null
      resizeStateRef.current    = 'idle'
    }

    const onMove = (ev: PointerEvent) => {
      if (resizeStateRef.current === 'pending') {
        if (Math.abs(ev.clientY - startPointerYRef.current) < RESIZE_THRESHOLD) return
        resizeStateRef.current = 'resizing'
        document.body.classList.add('resizing-event')
        onResizeStartRef.current()
      }
      if (resizeStateRef.current === 'resizing') {
        const snap = getSnapped(ev.clientY)
        if (snap) setIndicator(snap.dayColumnEl, snap.snappedMin)
      }
    }

    const onUp = (ev: PointerEvent) => {
      const wasResizing = resizeStateRef.current === 'resizing'
      cleanup()
      if (wasResizing) {
        const snap = getSnapped(ev.clientY)
        if (snap) onResizeEndRef.current(snap.newStart, snap.newEnd)
      }
      // If still pending: do nothing — click fires naturally (but is stopped by
      // the resize handle's own onClick: stopPropagation).
    }

    const onCancel = () => {
      const wasResizing = resizeStateRef.current === 'resizing'
      cleanup()
      if (wasResizing) onResizeCancelRef.current()
    }

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape' && resizeStateRef.current === 'resizing') {
        onResizeCancelRef.current()
        cleanup()
      }
    }

    document.addEventListener('pointermove',   onMove)
    document.addEventListener('pointerup',     onUp)
    document.addEventListener('pointercancel', onCancel)
    document.addEventListener('keydown',       onKey)

    // Prevent bubbling to the event block's drag handler and to any ContextMenu.
    e.stopPropagation()
  }, [edge, eventBlockRef])

  // Safety: clean up if the component unmounts while a resize is in progress.
  useEffect(() => () => {
    indicatorRef.current?.remove()
    indicatorRef.current = null
    document.body.classList.remove('resizing-event')
  }, [])

  return { onPointerDown: handlePointerDown }
}

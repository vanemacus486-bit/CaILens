import { useCallback, useEffect, useRef } from 'react'

/** Minimum Y movement (px) before pending → resizing. */
const RESIZE_THRESHOLD = 8

/** Snap grid in minutes — 15-minute granularity. */
const SNAP_MINUTES = 15

/** Minutes in one day. */
const MINUTES_PER_DAY = 24 * 60

interface UseDragToResizeParams {
  eventId:           string          // not used internally; caller closes over it
  originalStartTime: number
  originalEndTime:   number
  eventBlockRef:     React.RefObject<HTMLElement | null>
  gridRef:           React.RefObject<HTMLElement | null>
  columnDate:        Date            // the day of the column this event block is rendered in
  onResizeStart:     () => void
  onResizeEnd:       (newStartTime: number, newEndTime: number) => void
  onResizeCancel:    () => void
}

interface UseDragToResizeResult {
  onPointerDown: (e: React.PointerEvent) => void
}

/**
 * Gets the day index (0-based, in visibleDateRange) for a DayColumn element
 * by traversing up to the WeekGrid and finding its position among siblings.
 * Returns -1 if not found (index 0 is TimeGrid, DayColumns start at 1).
 */
function getDayColumnIndex(dayColumnEl: HTMLElement): number {
  const grid = dayColumnEl.parentElement
  if (!grid) return -1
  const children = Array.from(grid.children)
  const idx = children.indexOf(dayColumnEl)
  return idx >= 1 ? idx - 1 : -1
}

/**
 * Measures the width (px) of the time label column at the left edge of the grid.
 */
function measureTimeColumnWidth(grid: HTMLElement): number {
  const firstDayCol = grid.children[1] as HTMLElement | undefined
  if (!firstDayCol) return 80
  const gridRect = grid.getBoundingClientRect()
  const colRect = firstDayCol.getBoundingClientRect()
  return colRect.left - gridRect.left
}

/** Formats a UTC timestamp as "HH:MM". */
function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/**
 * Encapsulates resize logic for the bottom edge (adjusts endTime).
 *
 * Visual feedback:
 * - A 2 px accent-coloured indicator line in the source DayColumn (no React renders).
 * - When the event extends past midnight, a ghost block is injected into the
 *   WeekGrid (gridRef) showing the overflow portion in the next day's column,
 *   with an end-time label.
 *
 * Snapping: 15-minute grid. Minimum event duration: 15 min.
 */
export function useDragToResize({
  originalStartTime,
  originalEndTime,
  eventBlockRef,
  gridRef,
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
  const resizeStateRef     = useRef<ResizeState>('idle')
  const startPointerYRef   = useRef(0)
  const indicatorRef       = useRef<HTMLDivElement | null>(null)
  /** Grid-level ghost for cross-midnight overflow (single div, re-created on each frame). */
  const gridGhostRef       = useRef<HTMLDivElement | null>(null)

  // ── Helpers ──────────────────────────────────────────────

  /** Returns "dayStart" for the column's date (00:00 local). */
  function getDayStart(colDate: Date): number {
    return new Date(
      colDate.getFullYear(), colDate.getMonth(), colDate.getDate(), 0, 0, 0, 0,
    ).getTime()
  }

  /**
   * Injects / repositions a ghost block in the WeekGrid when the event
   * extends past midnight. The ghost appears in the NEXT day's column
   * starting from 00:00, with height proportional to the overflow.
   * Removes the ghost when snappedMin ≤ MINUTES_PER_DAY.
   */
  function renderGridGhost(
    snappedMin: number,
    endTime: number,
  ) {
    // Clean up previous ghost (same or different position)
    gridGhostRef.current?.remove()
    gridGhostRef.current = null

    // Not crossing midnight → nothing to render
    if (snappedMin <= MINUTES_PER_DAY) return

    const grid = gridRef.current
    if (!grid) return

    const gridRect = grid.getBoundingClientRect()
    if (gridRect.height === 0) return

    // Find the source DayColumn to compute its index
    const el = eventBlockRef.current
    if (!el) return
    const dayColumnEl = el.parentElement?.parentElement as HTMLElement | undefined
    if (!dayColumnEl) return

    const dayIndex = getDayColumnIndex(dayColumnEl)
    if (dayIndex < 0) return

    const dayCount = 7  // always 7 columns
    const overflowMin = snappedMin - MINUTES_PER_DAY

    // Compute next-day ghost position
    const timeColW = measureTimeColumnWidth(grid)
    const columnWidth = (gridRect.width - timeColW) / dayCount
    const nextDayIndex = Math.min(dayIndex + 1, dayCount - 1)
    const overflowPct = Math.min(overflowMin / MINUTES_PER_DAY, 1)

    const ghostLeft = timeColW + nextDayIndex * columnWidth
    const ghostTop  = 0  // starts at midnight = top of column
    const ghostWidth  = columnWidth
    const ghostHeight = overflowPct * gridRect.height

    // Position relative to the grid's own bounding rect.
    // The grid child's absolute positioning anchors to the nearest positioned
    // ancestor (scrollContainer with position:relative). Since the grid starts
    // at the same top as the scrollContainer, left/top relative to the grid
    // are the same as relative to the positioned ancestor.
    const ghost = document.createElement('div')
    ghost.style.cssText = [
      'position:absolute',
      'pointer-events:none',
      'z-index:40',
      `left:${ghostLeft}px`,
      `top:${ghostTop}px`,
      `width:${ghostWidth}px`,
      `height:${Math.max(ghostHeight, 18)}px`,
      'background:var(--accent)',
      'opacity:0.20',
      'border-radius:6px 6px 0 0',
      'border:2px solid var(--accent)',
      'border-bottom:none',
      'box-sizing:border-box',
      'display:flex',
      'align-items:flex-end',
      'justify-content:flex-end',
      'padding:3px 5px',
    ].join(';')

    // End-time label
    const label = document.createElement('span')
    label.textContent = fmtTime(endTime)
    label.style.cssText = [
      'font-size:11px',
      'font-family:monospace',
      'color:var(--accent)',
      'font-weight:700',
      'line-height:1',
      'text-shadow:0 0 4px rgba(0,0,0,0.3)',
    ].join(';')
    ghost.appendChild(label)

    grid.appendChild(ghost)
    gridGhostRef.current = ghost
  }

  // ── Main handler ─────────────────────────────────────────

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return

    resizeStateRef.current   = 'pending'
    startPointerYRef.current = e.clientY

    // Pointer capture guarantees pointermove/pointerup reach us even if the
    // pointer leaves the tiny handle area.
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
      const colDate   = columnDateRef.current

      const dayStart  = getDayStart(colDate)

      const relY      = pointerY - rect.top
      const rawMin    = (relY / rect.height) * MINUTES_PER_DAY
      let snappedMin  = Math.round(rawMin / SNAP_MINUTES) * SNAP_MINUTES

      // Bottom edge: moves endTime; startTime is fixed.
      // Clamp: end must be at least SNAP_MINUTES min after start.
      const minEndMin = Math.round((origStart - dayStart) / 60_000) + SNAP_MINUTES
      snappedMin = Math.max(snappedMin, minEndMin)
      const newStart = origStart
      const newEnd   = dayStart + snappedMin * 60_000

      return { snappedMin, newStart, newEnd }
    }

    /** Positions the indicator line (creates it on first call).
     *  When across midnight, clamps to column bottom (100%). */
    const setIndicator = (snappedMin: number) => {
      const el = eventBlockRef.current
      if (!el) return
      const dayColumnEl = el.parentElement?.parentElement as HTMLElement | undefined
      if (!dayColumnEl) return

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
      const pct = Math.min(snappedMin / MINUTES_PER_DAY, 1) * 100
      indicatorRef.current.style.top = `${pct}%`
    }

    const cleanup = () => {
      document.removeEventListener('pointermove',   onMove)
      document.removeEventListener('pointerup',     onUp)
      document.removeEventListener('pointercancel', onCancel)
      document.removeEventListener('keydown',       onKey)
      document.body.classList.remove('resizing-event')
      indicatorRef.current?.remove()
      indicatorRef.current = null
      gridGhostRef.current?.remove()
      gridGhostRef.current = null
      resizeStateRef.current = 'idle'
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
        if (snap) {
          setIndicator(snap.snappedMin)
          renderGridGhost(snap.snappedMin, snap.newEnd)
        }
      }
    }

    const onUp = (ev: PointerEvent) => {
      const wasResizing = resizeStateRef.current === 'resizing'
      cleanup()
      if (wasResizing) {
        const snap = getSnapped(ev.clientY)
        if (snap) onResizeEndRef.current(snap.newStart, snap.newEnd)
      }
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
  }, [eventBlockRef, gridRef])

  // Safety: clean up if the component unmounts while a resize is in progress.
  useEffect(() => () => {
    indicatorRef.current?.remove()
    indicatorRef.current = null
    gridGhostRef.current?.remove()
    gridGhostRef.current = null
    document.body.classList.remove('resizing-event')
  }, [])

  return { onPointerDown: handlePointerDown }
}

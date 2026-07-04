// ── Pure math for the mobile drag/scrub time ruler ─────────────
// No React, no DOM — the component owns gesture wiring, this owns the numbers.

const MINUTE_MS = 60_000

/** Convert a horizontal drag distance in px to a signed, unsnapped minute delta. */
export function pxToMinutesDelta(deltaPx: number, pxPerMinute: number): number {
  if (pxPerMinute <= 0) return 0
  return deltaPx / pxPerMinute
}

/** Snap a minute value to the nearest multiple of `step` minutes (default 5). */
export function snapMinutes(minutes: number, step = 5): number {
  if (step <= 0) return Math.round(minutes)
  return Math.round(minutes / step) * step
}

/** Apply a px drag distance to a base timestamp, snapping the result to `step` minutes. */
export function applyDragToTimestamp(baseTs: number, deltaPx: number, pxPerMinute: number, step = 5): number {
  const snappedMinutes = snapMinutes(pxToMinutesDelta(deltaPx, pxPerMinute), step)
  return baseTs + snappedMinutes * MINUTE_MS
}

/** Clamp a timestamp to an inclusive [min, max] range. */
export function clampTimestamp(ts: number, min: number, max: number): number {
  return Math.min(Math.max(ts, min), max)
}

export interface RulerTick {
  /** Offset in px from the ruler's center — negative = earlier, positive = later. */
  offsetPx: number
  /** True for on-the-hour marks (taller, labeled); false for minor ticks. */
  isMajor: boolean
  /** "HH:00" label, only set for major ticks. */
  label?: string
}

/**
 * Generate the tick marks visible on a horizontal ruler centered on `centerTs`,
 * spaced every `minorStepMinutes` (default 5) with a labeled major tick each hour.
 */
export function generateRulerTicks(
  centerTs: number,
  pxPerMinute: number,
  viewportWidthPx: number,
  minorStepMinutes = 5,
): RulerTick[] {
  if (pxPerMinute <= 0 || viewportWidthPx <= 0 || minorStepMinutes <= 0) return []

  const halfWidthMinutes = viewportWidthPx / 2 / pxPerMinute
  const edgeOffset = Math.ceil(halfWidthMinutes / minorStepMinutes) * minorStepMinutes

  const ticks: RulerTick[] = []
  for (let offset = -edgeOffset; offset <= edgeOffset; offset += minorStepMinutes) {
    const d = new Date(centerTs + offset * MINUTE_MS)
    const isMajor = d.getMinutes() === 0
    ticks.push({
      offsetPx: offset * pxPerMinute,
      isMajor,
      label: isMajor ? `${String(d.getHours()).padStart(2, '0')}:00` : undefined,
    })
  }
  return ticks
}

export type RulerEdge = 'start' | 'end'

/**
 * Apply a drag adjustment to whichever edge (start or end) is currently
 * active, keeping the other edge fixed and enforcing a minimum duration of
 * `step` minutes so start/end can never cross.
 *
 * Always pass the start/end values captured at drag-start (not the previous
 * frame's result) — the caller recomputes from the gesture's total
 * displacement each move, so snapping never drifts across a single drag.
 */
export function adjustEdgeTime(
  startTs: number,
  endTs: number,
  activeEdge: RulerEdge,
  deltaPx: number,
  pxPerMinute: number,
  step = 5,
): { startTime: number; endTime: number } {
  const minDurationMs = step * MINUTE_MS

  if (activeEdge === 'start') {
    const dragged = applyDragToTimestamp(startTs, deltaPx, pxPerMinute, step)
    return { startTime: Math.min(dragged, endTs - minDurationMs), endTime: endTs }
  }

  const dragged = applyDragToTimestamp(endTs, deltaPx, pxPerMinute, step)
  return { startTime: startTs, endTime: Math.max(dragged, startTs + minDurationMs) }
}

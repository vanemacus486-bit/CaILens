import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { generateRulerTicks, adjustEdgeTime, type RulerEdge } from '@/domain/timeRuler'

/** px per minute of ruler travel — tune visually against the reference look. */
const PX_PER_MINUTE = 4

interface TimeRulerPickerProps {
  startTime: number
  endTime: number
  /** Which edge the ruler currently adjusts — the parent decides this (e.g. tapping the start/end number). */
  activeEdge: RulerEdge
  onChange: (next: { startTime: number; endTime: number }) => void
  disabled?: boolean
}

/**
 * Horizontal drag-to-scrub time ruler. A fixed center indicator marks the
 * "selected" instant; dragging slides the tick strip underneath it (drag
 * left = later, drag right = earlier — same convention as the day-swipe
 * gesture already used in MobileDayPage).
 */
export function TimeRulerPicker({ startTime, endTime, activeEdge, onChange, disabled = false }: TimeRulerPickerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  useEffect(() => {
    const measure = () => setContainerWidth(containerRef.current?.clientWidth ?? 0)
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  const [isDragging, setIsDragging] = useState(false)
  const [followPx, setFollowPx] = useState(0)
  // Snapshot of start/end taken at drag-start — state (not a ref) because
  // it's read during render to freeze tick generation; refs can't be read
  // during render.
  const [dragBase, setDragBase] = useState({ startTime, endTime })
  const dragStartXRef = useRef(0)

  // While idle, ticks are centered on the live prop value. While dragging,
  // generation is frozen on the gesture's starting value — only the CSS
  // transform moves, so the drag doesn't get double-applied (once by
  // regenerating ticks, once by the transform).
  const liveBaseTs = activeEdge === 'start' ? startTime : endTime
  const tickCenterTs = isDragging
    ? (activeEdge === 'start' ? dragBase.startTime : dragBase.endTime)
    : liveBaseTs

  const ticks = useMemo(
    () => generateRulerTicks(tickCenterTs, PX_PER_MINUTE, containerWidth),
    [tickCenterTs, containerWidth],
  )

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    dragStartXRef.current = e.clientX
    setDragBase({ startTime, endTime })
    setIsDragging(true)
    setFollowPx(0)
  }, [disabled, startTime, endTime])

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    const follow = e.clientX - dragStartXRef.current
    setFollowPx(follow)
    // Direct-manipulation follow is the negative of the semantic time delta:
    // dragging left (follow < 0) should move the active edge LATER.
    const next = adjustEdgeTime(
      dragBase.startTime,
      dragBase.endTime,
      activeEdge,
      -follow,
      PX_PER_MINUTE,
    )
    onChange(next)
  }, [isDragging, activeEdge, onChange, dragBase])

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return
    e.currentTarget.releasePointerCapture(e.pointerId)
    setIsDragging(false)
    setFollowPx(0)
  }, [isDragging])

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative h-14 overflow-hidden touch-none select-none',
        disabled && 'opacity-40 pointer-events-none',
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      {/* Tick strip — follows the finger 1:1 during a drag, eases back to rest otherwise */}
      <div
        className="absolute inset-y-0 left-1/2"
        style={{
          transform: `translateX(${followPx}px)`,
          transition: isDragging ? 'none' : 'transform 150ms ease-out',
        }}
      >
        {ticks.map((tick) => (
          <div
            key={tick.offsetPx}
            className="absolute bottom-4 flex flex-col items-center -translate-x-1/2"
            style={{ left: tick.offsetPx }}
          >
            <div className={cn('w-px bg-text-tertiary/50', tick.isMajor ? 'h-5' : 'h-2.5')} />
            {tick.label && (
              <span className="mt-1 text-[9px] font-mono text-text-tertiary whitespace-nowrap">
                {tick.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Fixed center indicator — the instant currently under the pointer */}
      <div className="absolute left-1/2 top-0 h-8 w-0.5 -translate-x-1/2 bg-accent rounded-full pointer-events-none" />
    </div>
  )
}

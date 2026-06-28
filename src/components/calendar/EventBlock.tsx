import React, { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

import type { PositionedEvent } from '@/domain/layout'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { MAX_OVERLAP_COLUMNS } from '@/features/week-view/constants'
import { useEventDrag, type DragState } from '@/features/week-view/hooks/useEventDrag'
import { useDragToResize } from '@/features/week-view/hooks/useDragToResize'
import {
  ContextMenu, ContextMenuContent, ContextMenuItem,
  ContextMenuSeparator, ContextMenuTrigger,
} from '@/components/ui/context-menu'

export function colSpan(columnIndex: number, totalColumns: number) {
  const colsPerEvent = Math.max(1, Math.floor(MAX_OVERLAP_COLUMNS / totalColumns))
  return {
    gridColumnStart: columnIndex * colsPerEvent + 1,
    gridColumnEnd:   Math.min(columnIndex * colsPerEvent + colsPerEvent + 1, MAX_OVERLAP_COLUMNS + 1),
  }
}

/** Minimum readable height for any event block (px). Short blocks overflow
 *  into adjacent grid rows — accepted "slight overlap". */
const MIN_BLOCK_PX = 22

// ── Category color mapping (EventColor → tokens) ───────────

const CAT_FILL: Record<EventColor, string> = {
  accent: 'var(--cat-major)',
  sage:   'var(--cat-minor)',
  sand:   'var(--cat-chore)',
  sky:    'var(--cat-growth)',
  rose:   'var(--cat-leisure)',
  stone:  'var(--cat-sleep)',
}

const CAT_BG: Record<EventColor, string> = {
  accent: 'var(--cat-major-bg)',
  sage:   'var(--cat-minor-bg)',
  sand:   'var(--cat-chore-bg)',
  sky:    'var(--cat-growth-bg)',
  rose:   'var(--cat-leisure-bg)',
  stone:  'var(--cat-sleep-bg)',
}

// ── EventBlock Props ──────────────────────────────────────

interface EventBlockProps {
  positioned:         PositionedEvent
  columnDate:         Date
  onClick:            (event: CalendarEvent, el: HTMLElement) => void
  onColorChange:      (eventId: string, color: EventColor) => void
  onEdit:             (event: CalendarEvent, anchorEl: HTMLElement) => void
  onDuplicate:        (eventId: string) => void
  onDelete:           (eventId: string) => void
  onDragMove:         (eventId: string, newStartTime: number, newEndTime: number) => void
  onDragToEdge:       (eventId: string, newStartTime: number, newEndTime: number, direction: -1 | 1) => void
  onDragStart:        () => void
  onDragStateChange?: (dragState: DragState) => void
  onResize:           (eventId: string, newStartTime: number, newEndTime: number) => void
  weekDays:           Date[]
  gridRef:            React.RefObject<HTMLElement | null>
  isCardOpen?:        boolean
  highlightedEventId?: string | null
  onTypedEdit?:       (event: CalendarEvent, el: HTMLElement) => void
}

function fmtHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const EventBlock = React.memo(function EventBlock({
  positioned, columnDate, onClick, onColorChange, onEdit, onDuplicate, onDelete,
  onDragMove, onDragStart, onDragStateChange, onResize, weekDays, gridRef,
  isCardOpen = false, highlightedEventId,
  onTypedEdit,
}: EventBlockProps) {
  const { event, rowStart, rowEnd, columnIndex, totalColumns, startsBeforeDay, endsAfterDay } = positioned
  const { gridColumnStart, gridColumnEnd } = colSpan(columnIndex, totalColumns)

  const divRef = useRef<HTMLDivElement>(null)
  const [blockH, setBlockH] = useState(0)

  // Measure actual rendered height; short blocks get min-height so they're
  // always at least MIN_BLOCK_PX tall (even if grid row is ~9px).
  useEffect(() => {
    const el = divRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const h = entry.contentBoxSize?.[0]?.blockSize ?? entry.contentRect.height
        if (h !== blockH) setBlockH(h)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  })

  const { onPointerDown: onDragPointerDown, dragState, isDragging, wasDragging } = useEventDrag({
    event,
    visibleDateRange: weekDays,
    gridRef,
    onDragStart,
    onCommit: (eventId, start, end) => onDragMove(eventId, start, end),
    onCancel: () => {},
  })

  useEffect(() => {
    onDragStateChange?.(dragState)
  }, [dragState, onDragStateChange])

  const showResizeHandles = blockH >= 18

  const bottomResize = useDragToResize({
    eventId: event.id,
    originalStartTime: event.startTime,
    originalEndTime:   event.endTime,
    eventBlockRef:     divRef,
    gridRef,
    columnDate,
    onResizeStart:     onDragStart,
    onResizeEnd: (s, e) => onResize(event.id, s, e),
    onResizeCancel: () => {},
  })

  // Segment duration on this column's day
  const dayStartMs = new Date(columnDate.getFullYear(), columnDate.getMonth(), columnDate.getDate()).getTime()
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000
  const segStart = Math.max(event.startTime, dayStartMs)
  const segEnd = Math.min(event.endTime, dayEndMs)

  const roundedClass = !startsBeforeDay && !endsAfterDay ? ''
    : !startsBeforeDay ? 'rounded-t-md'
    : !endsAfterDay ? 'rounded-b-md'
    : ''

  const catFill = CAT_FILL[event.color]
  const catBg   = CAT_BG[event.color]

  // Adaptive content visibility by measured block height
  const showFull = blockH >= 40
  const showDescription = blockH >= 50
  const showCompact = blockH >= 28 && blockH < 40

  // Shared icon for meal/sleep typed events
  const typedIcon = event.typedData?.type === 'meal'
    ? '🍚'
    : event.typedData?.type === 'sleep'
      ? '🌙'
      : null

  const iconHandler = typedIcon
    ? {
        onClick: (e: React.MouseEvent) => {
          e.stopPropagation()
          onTypedEdit?.(event, e.currentTarget as HTMLElement)
        },
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            e.stopPropagation()
            onTypedEdit?.(event, e.currentTarget as HTMLElement)
          }
        },
      }
    : null

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={divRef}
          role="button"
          tabIndex={0}
          data-event-id={event.id}
          data-event-category={event.categoryId}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onClick(event, e.currentTarget as HTMLElement)
            }
            if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) {
              e.preventDefault()
              e.currentTarget.dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, clientX: 0, clientY: 0 }))
            }
            if (e.key === 'Delete') {
              e.preventDefault()
              onDelete(event.id)
            }
          }}
          className={cn(
            'relative overflow-hidden select-none my-[1px]',
            'transition-colors duration-200 z-10 hover:z-30',
            roundedClass,
            isDragging
              ? 'cursor-grabbing'
              : isCardOpen
                ? 'cursor-default z-20'
                : highlightedEventId === event.id
                  ? 'cursor-grab animate-search-highlight'
                  : 'cursor-grab',
          )}
          style={{
            gridRowStart: rowStart,
            gridRowEnd:   rowEnd,
            gridColumnStart,
            gridColumnEnd,
            minHeight: MIN_BLOCK_PX,
            borderLeft:       `3px solid ${catFill}`,
            backgroundColor:  catBg,
            padding:          '4px 6px',
            borderRadius:     'var(--radius-s)',
            opacity:          isDragging ? 0.85 : 1,
            zIndex:           isDragging ? 50   : undefined,
            transform:        isCardOpen ? 'translateY(-3px)' : 'translateY(0)',
            boxShadow:        isCardOpen ? 'var(--shadow-card-float)' : 'none',
            transition:       'transform 250ms var(--ease-spring), box-shadow 250ms ease-out, opacity 200ms ease-out',
          }}
          onPointerDown={onDragPointerDown}
          onClick={(e) => {
            e.stopPropagation()
            if (wasDragging.current) { wasDragging.current = false; return }
            onClick(event, e.currentTarget as HTMLElement)
          }}
        >
          {/* ── Content: adaptive by measured height ── */}
          {(() => {
            // Not yet measured, or very short block: title only
            if (blockH === 0 || !showCompact && !showFull) {
              return (
                <div className="flex items-center gap-1 min-w-0 h-full">
                  {iconHandler && (
                    <span
                      className="flex-shrink-0 cursor-pointer text-[10px] leading-none opacity-60 hover:opacity-100 transition-opacity"
                      title={`点击编辑${event.typedData?.type === 'meal' ? '饮食' : '睡眠'}详情`}
                      {...iconHandler}
                    >{typedIcon}</span>
                  )}
                  <p
                    className="flex-1 font-ui truncate min-w-0 leading-tight"
                    style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}
                  >
                    {event.title || <span className="opacity-50 italic">Untitled</span>}
                  </p>
                </div>
              )
            }

            // Compact: single row, title left + time right (28–40px)
            if (showCompact) {
              return (
                <div className="flex items-center gap-1 min-w-0">
                  {iconHandler && (
                    <span
                      className="flex-shrink-0 cursor-pointer text-[10px] leading-none opacity-60 hover:opacity-100 transition-opacity"
                      title={`点击编辑${event.typedData?.type === 'meal' ? '饮食' : '睡眠'}详情`}
                      {...iconHandler}
                    >{typedIcon}</span>
                  )}
                  <p
                    className="flex-1 font-ui truncate min-w-0 leading-tight"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}
                  >
                    {event.title || <span className="opacity-50 italic">Untitled</span>}
                  </p>
                  {!startsBeforeDay && !endsAfterDay && (
                    <span
                      className="flex-shrink-0 leading-tight whitespace-nowrap"
                      style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)' }}
                    >
                      {`${fmtHM(segStart)} – ${fmtHM(segEnd)}`}
                    </span>
                  )}
                </div>
              )
            }

            // Full: title row + time row + optional description (≥40px)
            return (
              <>
                <div className="flex items-center gap-1 min-w-0">
                  {iconHandler && (
                    <span
                      className="flex-shrink-0 cursor-pointer text-[10px] leading-none opacity-60 hover:opacity-100 transition-opacity"
                      title={`点击编辑${event.typedData?.type === 'meal' ? '饮食' : '睡眠'}详情`}
                      {...iconHandler}
                    >{typedIcon}</span>
                  )}
                  <p
                    className="flex-1 truncate min-w-0 leading-tight"
                    style={{ fontSize: 13, fontWeight: 600, color: 'var(--ink)', fontFamily: 'var(--font-ui)' }}
                  >
                    {event.title || <span className="opacity-50 italic">Untitled</span>}
                  </p>
                </div>

                {showFull && !startsBeforeDay && !endsAfterDay && (
                  <p
                    className="leading-tight"
                    style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--ink-2)', marginTop: 2 }}
                  >
                    {`${fmtHM(segStart)} – ${fmtHM(segEnd)}`}
                  </p>
                )}

                {showDescription && event.description && (
                  <div
                    className="leading-tight truncate"
                    style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 2 }}
                  >
                    {event.description}
                  </div>
                )}


              </>
            )
          })()}

          {/* Bottom resize handle — adaptive height; thinner on short blocks
              so it doesn't swallow click-to-open. */}
          {showResizeHandles && (
            <div
              className={cn(
                'absolute bottom-0 left-0 right-0 cursor-ns-resize z-20',
                blockH >= 40 ? 'h-3' : 'h-1.5',
              )}
              onPointerDown={bottomResize.onPointerDown}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        <div className="flex items-center gap-1.5 px-2.5 py-2">
          {EVENT_COLORS.map((c) => (
            <button
              key={c}
              aria-label={c}
              onClick={() => onColorChange(event.id, c)}
              className={cn(
                'w-5 h-5 rounded-full flex-shrink-0 transition-transform duration-200',
                'hover:scale-110',
                event.color === c
                  ? 'ring-2 ring-[var(--ink)] ring-offset-1 ring-offset-[var(--surface)] scale-110'
                  : '',
              )}
              style={{ backgroundColor: CAT_FILL[c] }}
            />
          ))}
        </div>

        <ContextMenuSeparator />

        <ContextMenuItem onSelect={() => onEdit(event, divRef.current!)}>Edit</ContextMenuItem>
        <ContextMenuItem onSelect={() => onDuplicate(event.id)}>Duplicate</ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => onDelete(event.id)} className="text-color-text-danger focus:text-color-text-danger">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

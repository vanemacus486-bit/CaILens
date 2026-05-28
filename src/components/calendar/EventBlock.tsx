import React, { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'

import type { PositionedEvent } from '@/domain/layout'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { MAX_OVERLAP_COLUMNS } from '@/features/week-view/constants'
import { useEventDrag, type DragState } from '@/features/week-view/hooks/useEventDrag'
import { useDragToResize } from '@/features/week-view/hooks/useDragToResize'
import { EVENT_COLOR_CLASSES } from './eventColors'
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
  /** Called when a resize completes; same signature as onDragMove. */
  onResize:           (eventId: string, newStartTime: number, newEndTime: number) => void
  weekDays:           Date[]
  gridRef:            React.RefObject<HTMLElement | null>
  isCardOpen?:        boolean
  highlightedEventId?: string | null
  /** 类型化事件角标点击 */
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
  const { bg, text } = EVENT_COLOR_CLASSES[event.color]
  const { gridColumnStart, gridColumnEnd } = colSpan(columnIndex, totalColumns)

  const divRef = useRef<HTMLDivElement>(null)

  const { onPointerDown: onDragPointerDown, dragState, isDragging, wasDragging } = useEventDrag({
    event,
    visibleDateRange: weekDays,
    gridRef,
    onDragStart,
    onCommit: (eventId, start, end) => onDragMove(eventId, start, end),
    onCancel: () => {},
  })

  // Report drag state changes upward for ghost rendering.
  useEffect(() => {
    onDragStateChange?.(dragState)
  }, [dragState, onDragStateChange])

  // Show resize handles only for events ≥ 60 minutes. Shorter events
  // don't have enough height for usable handles.
  const showResizeHandles = (event.endTime - event.startTime) >= 60 * 60_000

  const topResize = useDragToResize({
    edge: 'top', eventId: event.id,
    originalStartTime: event.startTime,
    originalEndTime:   event.endTime,
    eventBlockRef:     divRef,
    gridRef,
    columnDate,
    onResizeStart:     onDragStart,   // reuse: closes any open card
    onResizeEnd: (s, e) => onResize(event.id, s, e),
    onResizeCancel: () => {},
  })

  const bottomResize = useDragToResize({
    edge: 'bottom', eventId: event.id,
    originalStartTime: event.startTime,
    originalEndTime:   event.endTime,
    eventBlockRef:     divRef,
    gridRef,
    columnDate,
    onResizeStart:     onDragStart,
    onResizeEnd: (s, e) => onResize(event.id, s, e),
    onResizeCancel: () => {},
  })

  // Segment duration on this column's day — for cross-day events this may be
  // much shorter than the full event, so we base the compact decision on it.
  const dayStartMs = new Date(columnDate.getFullYear(), columnDate.getMonth(), columnDate.getDate()).getTime()
  const dayEndMs = dayStartMs + 24 * 60 * 60 * 1000
  const segStart = Math.max(event.startTime, dayStartMs)
  const segEnd = Math.min(event.endTime, dayEndMs)
  const isCompact = (segEnd - segStart) / 60_000 <= 60

  const roundedClass = !startsBeforeDay && !endsAfterDay ? 'rounded-md'
    : !startsBeforeDay ? 'rounded-t-md'
    : !endsAfterDay ? 'rounded-b-md'
    : ''

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
            'relative px-2 py-1 overflow-hidden select-none rounded-md my-[2px]',
            'transition-colors duration-200 z-10',
            event.description ? 'border-l-[5px]' : 'border-l-[3px]',
            roundedClass, bg, text,
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
            opacity: isDragging ? 0.85 : 1,
            zIndex:  isDragging ? 50   : undefined,
            borderLeftColor: `var(--event-${event.color}-fill)`,
            transform: isCardOpen ? 'translateY(-3px)' : 'translateY(0)',
            boxShadow: isCardOpen ? 'var(--shadow-card-float)' : 'none',
            transition: 'transform 250ms var(--ease-spring), box-shadow 250ms ease-out, opacity 200ms ease-out',
          }}
          onPointerDown={onDragPointerDown}
          onClick={(e) => {
            e.stopPropagation()
            if (wasDragging.current) { wasDragging.current = false; return }
            onClick(event, e.currentTarget as HTMLElement)
          }}
        >
          {/* Top resize handle */}
          {showResizeHandles && (
            <div
              className="absolute top-0 left-0 right-0 h-5 cursor-ns-resize z-20"
              onPointerDown={topResize.onPointerDown}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Continue-from-above indicator */}
          {startsBeforeDay && (
            <div className="flex items-center gap-0.5 mb-0.5 opacity-60">
              <span className="text-xs-alt leading-none text-current">▲</span>
              <span className="text-xs-alt leading-none text-current opacity-70">{fmtHM(event.startTime).split(':')[0]}h</span>
            </div>
          )}

          {/* Event content */}
          <div className="flex items-center gap-1">
            {/* 类型化事件角标 */}
            {event.typedData?.type === 'meal' && (
              <span
                className="flex-shrink-0 cursor-pointer text-[10px] leading-none opacity-60 hover:opacity-100 transition-opacity"
                title="点击编辑饮食详情"
                onClick={(e) => {
                  e.stopPropagation()
                  onTypedEdit?.(event, e.currentTarget as HTMLElement)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onTypedEdit?.(event, e.currentTarget as HTMLElement)
                  }
                }}
              >🍚</span>
            )}
            {event.typedData?.type === 'sleep' && (
              <span
                className="flex-shrink-0 cursor-pointer text-[10px] leading-none opacity-60 hover:opacity-100 transition-opacity"
                title="点击编辑睡眠详情"
                onClick={(e) => {
                  e.stopPropagation()
                  onTypedEdit?.(event, e.currentTarget as HTMLElement)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    e.stopPropagation()
                    onTypedEdit?.(event, e.currentTarget as HTMLElement)
                  }
                }}
              >🌙</span>
            )}
            <p className={cn('flex-1 font-sans font-normal leading-tight truncate min-w-0', isCompact ? 'text-body-xs' : 'text-xs')}>
              {event.title || <span className="opacity-50 italic">Untitled</span>}
            </p>
          </div>
          {!isCompact && !(startsBeforeDay && endsAfterDay) && (
            <p className="text-xs-alt opacity-80 font-mono leading-tight mt-0.5">
              {startsBeforeDay
                ? `– ${fmtHM(segEnd)}`
                : endsAfterDay
                  ? `${fmtHM(segStart)} –`
                  : `${fmtHM(segStart)} – ${fmtHM(segEnd)}`}
            </p>
          )}
          {!isCompact && event.description && (
            <div className="text-xs-alt opacity-70 leading-tight mt-0.5 line-clamp-1 font-sans">
              {event.description}
            </div>
          )}

          {/* Continue-to-below indicator */}
          {endsAfterDay && (
            <div className="flex items-center gap-0.5 mt-0.5 opacity-60">
              <span className="text-xs-alt leading-none text-current">▼</span>
              <span className="text-xs-alt leading-none text-current opacity-70">{fmtHM(event.endTime).split(':')[0]}h</span>
            </div>
          )}

          {/* Bottom resize handle */}
          {showResizeHandles && (
            <div
              className="absolute bottom-0 left-0 right-0 h-5 cursor-ns-resize z-20"
              onPointerDown={bottomResize.onPointerDown}
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      </ContextMenuTrigger>

      <ContextMenuContent>
        {/* Inline colour swatches — one click, no submenu */}
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
                  ? 'ring-2 ring-text-primary ring-offset-1 ring-offset-surface-raised scale-110'
                  : '',
              )}
              style={{ backgroundColor: `var(--event-${c}-text)` }}
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

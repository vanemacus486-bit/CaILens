import React, { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { PositionedEvent } from '@/domain/layout'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { MAX_OVERLAP_COLUMNS } from '@/features/week-view/constants'
import { useDragToMove } from '@/features/week-view/hooks/useDragToMove'
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
  positioned:    PositionedEvent
  onClick:       (event: CalendarEvent, el: HTMLElement) => void
  onColorChange: (eventId: string, color: EventColor) => void
  onEdit:        (event: CalendarEvent, anchorEl: HTMLElement) => void
  onDelete:      (eventId: string) => void
  onDragMove:    (eventId: string, newStartTime: number, newEndTime: number) => void
  onDragStart:   () => void
  /** Called when a resize completes; same signature as onDragMove. */
  onResize:      (eventId: string, newStartTime: number, newEndTime: number) => void
  weekDays:      Date[]
  gridRef:       React.RefObject<HTMLElement | null>
  isCardOpen?:   boolean
}

function fmtHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export const EventBlock = React.memo(function EventBlock({
  positioned, onClick, onColorChange, onEdit, onDelete,
  onDragMove, onDragStart, onResize, weekDays, gridRef, isCardOpen = false,
}: EventBlockProps) {
  const { event, rowStart, rowEnd, columnIndex, totalColumns } = positioned
  const { bg, text, border } = EVENT_COLOR_CLASSES[event.color]
  const { gridColumnStart, gridColumnEnd } = colSpan(columnIndex, totalColumns)

  const divRef = useRef<HTMLDivElement>(null)

  const { onPointerDown: onDragPointerDown, isDragging, wasDragging } = useDragToMove({
    eventId:           event.id,
    originalStartTime: event.startTime,
    originalEndTime:   event.endTime,
    eventBlockRef:     divRef,
    weekDays,
    gridRef,
    onDragStart,
    onDragEnd: (start, end) => onDragMove(event.id, start, end),
    onDragCancel: () => {},
  })

  // Show resize handles only for events ≥ 60 minutes. Shorter events
  // don't have enough height for usable handles.
  const showResizeHandles = (event.endTime - event.startTime) >= 60 * 60_000

  const topResize = useDragToResize({
    edge: 'top', eventId: event.id,
    originalStartTime: event.startTime,
    originalEndTime:   event.endTime,
    eventBlockRef:     divRef,
    onResizeStart:     onDragStart,   // reuse: closes any open card
    onResizeEnd: (s, e) => onResize(event.id, s, e),
    onResizeCancel: () => {},
  })

  const bottomResize = useDragToResize({
    edge: 'bottom', eventId: event.id,
    originalStartTime: event.startTime,
    originalEndTime:   event.endTime,
    eventBlockRef:     divRef,
    onResizeStart:     onDragStart,
    onResizeEnd: (s, e) => onResize(event.id, s, e),
    onResizeCancel: () => {},
  })

  const durationMinutes = (event.endTime - event.startTime) / 60_000
  const isCompact = durationMinutes < 30
  const isMedium  = durationMinutes >= 30 && durationMinutes < 60

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={divRef}
          className={cn(
            // `relative` is required for absolute-positioned resize handles
            'relative rounded-md px-1.5 py-0.5 overflow-hidden select-none',
            'border-l-2 transition-colors duration-200 z-10',
            bg, text, border,
            isDragging
              ? 'cursor-grabbing'
              : isCardOpen
                ? 'cursor-grab brightness-90 ring-1 ring-inset ring-current/30'
                : 'cursor-grab hover:brightness-95',
          )}
          style={{
            gridRowStart: rowStart,
            gridRowEnd:   rowEnd,
            gridColumnStart,
            gridColumnEnd,
            opacity: isDragging ? 0.85 : 1,
            zIndex:  isDragging ? 50   : undefined,
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
              className="absolute top-0 left-0 right-0 h-1.5 cursor-ns-resize z-20"
              onPointerDown={topResize.onPointerDown}
              onClick={(e) => e.stopPropagation()}
            />
          )}

          {/* Event content */}
          <p className={cn('font-serif font-normal leading-tight truncate', isCompact ? 'text-[11px]' : 'text-xs')}>
            {event.title || <span className="opacity-50 italic">Untitled</span>}
          </p>
          {!isCompact && (
            <p className="text-[10px] opacity-80 font-mono leading-tight mt-0.5">
              {fmtHM(event.startTime)}{!isMedium && ` – ${fmtHM(event.endTime)}`}
            </p>
          )}
          {!isCompact && !isMedium && event.description && (
            <p className="text-[10px] opacity-70 leading-tight mt-0.5 line-clamp-1 font-sans">
              {event.description}
            </p>
          )}

          {/* Bottom resize handle */}
          {showResizeHandles && (
            <div
              className="absolute bottom-0 left-0 right-0 h-1.5 cursor-ns-resize z-20"
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
                'w-3 h-3 rounded-full flex-shrink-0 transition-transform duration-150',
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
        <ContextMenuItem onSelect={() => onDelete(event.id)} className="text-rose-500 focus:text-rose-500">
          Delete
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
})

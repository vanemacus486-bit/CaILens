import React, { useMemo } from 'react'
import { layoutDayEvents } from '@/domain/layout'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { getDayStart, isToday } from '@/domain/time'
import { EventBlock } from './EventBlock'
import { CurrentTimeLine } from './CurrentTimeLine'
import { MAX_OVERLAP_COLUMNS, TOTAL_SLOTS } from '@/features/week-view/constants'

const SLOT_STYLE_HOUR  = 'border-t border-border-subtle cursor-pointer hover:bg-surface-sunken/20'
const SLOT_STYLE_HALF  = 'cursor-pointer hover:bg-surface-sunken/20'

const SLOT_INDICES = Array.from({ length: TOTAL_SLOTS }, (_, i) => i)

const GRID_STYLE = {
  gridTemplateRows:    `repeat(${TOTAL_SLOTS}, 1fr)`,
  gridTemplateColumns: `repeat(${MAX_OVERLAP_COLUMNS}, 1fr)`,
} as const

interface DayColumnProps {
  date:            Date
  events:          CalendarEvent[]
  selectedEventId: string | null
  weekDays:        Date[]
  gridRef:         React.RefObject<HTMLElement | null>
  onSlotClick:     (startTime: number, slotEl: HTMLElement) => void
  onEventClick:    (event: CalendarEvent, el: HTMLElement) => void
  onColorChange:   (eventId: string, color: EventColor) => void
  onEdit:          (event: CalendarEvent, anchorEl: HTMLElement) => void
  onDuplicate:     (eventId: string) => void
  onDelete:        (eventId: string) => void
  onDragMove:      (eventId: string, newStartTime: number, newEndTime: number) => void
  onDragToEdge:    (eventId: string, newStartTime: number, newEndTime: number, direction: -1 | 1) => void
  onDragStart:     () => void
  onResize:        (eventId: string, newStartTime: number, newEndTime: number) => void
}

function slotToTimestamp(slotIndex: number, dayStart: number): number {
  return dayStart + slotIndex * 30 * 60_000
}

function DayColumnInner({
  date, events, selectedEventId, weekDays, gridRef,
  onSlotClick, onEventClick, onColorChange, onEdit, onDuplicate, onDelete,
  onDragMove, onDragToEdge, onDragStart, onResize,
}: DayColumnProps) {
  const today    = isToday(date.getTime())
  const dayStart = getDayStart(date)

  const positioned = useMemo(
    () => layoutDayEvents(events, date),
    [events, date],
  )

  return (
    <div className="h-full border-r border-border-subtle relative">
      {today && <CurrentTimeLine />}

      <div className="absolute inset-0 grid" style={GRID_STYLE}>
        {SLOT_INDICES.map((i) => {
          const ts = slotToTimestamp(i, dayStart)
          const nextTs = ts + 30 * 60_000
          const label = `${String(new Date(ts).getHours()).padStart(2, '0')}:${String(new Date(ts).getMinutes()).padStart(2, '0')} – ${String(new Date(nextTs).getHours()).padStart(2, '0')}:${String(new Date(nextTs).getMinutes()).padStart(2, '0')}`
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={label}
              className={i % 2 === 0 ? SLOT_STYLE_HOUR : SLOT_STYLE_HALF}
              style={{ gridColumn: `1 / ${MAX_OVERLAP_COLUMNS + 1}`, gridRow: i + 1 }}
              onClick={(e) => onSlotClick(ts, e.currentTarget as HTMLElement)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onSlotClick(ts, e.currentTarget as HTMLElement)
                }
              }}
            />
          )
        })}

        {positioned.map((pe) => (
          <EventBlock
            key={pe.event.id}
            positioned={pe}
            columnDate={date}
            onClick={onEventClick}
            onColorChange={onColorChange}
            onEdit={onEdit}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onDragMove={onDragMove}
            onDragToEdge={onDragToEdge}
            onDragStart={onDragStart}
            onResize={onResize}
            weekDays={weekDays}
            gridRef={gridRef}
            isCardOpen={pe.event.id === selectedEventId}
          />
        ))}
      </div>
    </div>
  )
}

export const DayColumn = React.memo(DayColumnInner, (prev, next) =>
  prev.date.getTime()    === next.date.getTime()    &&
  prev.events            === next.events             &&
  prev.selectedEventId   === next.selectedEventId    &&
  prev.weekDays          === next.weekDays            &&
  prev.gridRef           === next.gridRef             &&
  prev.onSlotClick       === next.onSlotClick        &&
  prev.onEventClick      === next.onEventClick       &&
  prev.onColorChange     === next.onColorChange      &&
  prev.onEdit            === next.onEdit             &&
  prev.onDuplicate       === next.onDuplicate        &&
  prev.onDelete          === next.onDelete           &&
  prev.onDragMove        === next.onDragMove         &&
  prev.onDragToEdge      === next.onDragToEdge       &&
  prev.onDragStart       === next.onDragStart        &&
  prev.onResize          === next.onResize,
)

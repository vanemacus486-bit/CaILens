import React, { useMemo } from 'react'
import { layoutDayEvents } from '@/domain/layout'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { getDayStart, isToday } from '@/domain/time'
import { computeDayGaps, type DayGap } from '@/domain/gaps'
import { EventBlock } from './EventBlock'
import { CurrentTimeLine } from './CurrentTimeLine'
import { MAX_OVERLAP_COLUMNS, TOTAL_SLOTS } from '@/features/week-view/constants'

const SLOT_STYLE_HOUR = 'cursor-pointer hover:bg-surface-sunken/20'
const SLOT_STYLE_HALF = 'cursor-pointer hover:bg-surface-sunken/20'

const SLOT_INDICES = Array.from({ length: TOTAL_SLOTS }, (_, i) => i)

const GRID_STYLE = {
  gridTemplateRows:    `repeat(${TOTAL_SLOTS}, 1fr)`,
  gridTemplateColumns: `repeat(${MAX_OVERLAP_COLUMNS}, 1fr)`,
} as const

const EMPTY_GAPS: DayGap[] = []

/** 将 UTC ms 时间戳转换为当天 CSS grid 的 1-based row 位置（15 分钟每槽） */
function timeToGridRow(timestamp: number, dayStartMs: number): number {
  const minutesFromDayStart = Math.max(0, Math.min(1440, (timestamp - dayStartMs) / 60_000))
  return Math.floor(minutesFromDayStart / 15) + 1
}

/** 格式化时间为 HH:MM */
function fmtGapTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

interface DayColumnProps {
  date:              Date
  events:            CalendarEvent[]
  selectedEventId:   string | null
  highlightedEventId: string | null
  highlightedDayMs?: number | null
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
  onDragStateChange?: (dragState: import('@/features/week-view/hooks/useEventDrag').DragState) => void
  onResize:        (eventId: string, newStartTime: number, newEndTime: number) => void
  onTypedEdit?:    (event: CalendarEvent, el: HTMLElement) => void
  /** 幽灵间隙块点击回调（不传则不计算、不渲染） */
  onGapClick?:     (gapStart: number, gapEnd: number, anchorEl: HTMLElement) => void
}

function slotToTimestamp(slotIndex: number, dayStart: number): number {
  return dayStart + slotIndex * 15 * 60_000
}

function DayColumnInner({
  date, events, selectedEventId, highlightedEventId, highlightedDayMs, weekDays, gridRef,
  onSlotClick, onEventClick, onColorChange, onEdit, onDuplicate, onDelete,
  onDragMove, onDragToEdge, onDragStart, onDragStateChange, onResize,
  onTypedEdit, onGapClick,
}: DayColumnProps) {
  const today    = isToday(date.getTime())
  const dayStart = getDayStart(date)
  const dayEnd   = dayStart + 24 * 60 * 60_000

  const positioned = useMemo(
    () => layoutDayEvents(events, date),
    [events, date],
  )

  // ── Ghost gaps ───────────────────────────────────
  const gaps = useMemo(() => {
    if (!onGapClick) return EMPTY_GAPS
    return computeDayGaps(events, dayStart, dayEnd, {
      nowMs: Date.now(),
      minGapMs: 30 * 60_000,
    })
  }, [events, dayStart, dayEnd, onGapClick])

  const isHighlighted = highlightedDayMs != null && date.getTime() === highlightedDayMs

  return (
    <div
      className={`h-full border-r relative transition-shadow duration-300 ${isHighlighted ? 'ring-2 ring-accent ring-inset' : ''}`}
      style={{
        borderRightColor: 'var(--line)',
        borderRightStyle: 'solid',
        borderRightWidth: 1,
        backgroundColor: today ? 'var(--surface-raised)' : undefined,
      }}
    >
      {today && <CurrentTimeLine />}

      <div className="absolute inset-0 grid" style={GRID_STYLE}>
        {SLOT_INDICES.map((i) => {
          const ts = slotToTimestamp(i, dayStart)
          const nextTs = ts + 15 * 60_000
          const label = `${String(new Date(ts).getHours()).padStart(2, '0')}:${String(new Date(ts).getMinutes()).padStart(2, '0')} – ${String(new Date(nextTs).getHours()).padStart(2, '0')}:${String(new Date(nextTs).getMinutes()).padStart(2, '0')}`
          return (
            <div
              key={i}
              role="button"
              tabIndex={0}
              aria-label={label}
              className={
                i % 4 === 0 ? SLOT_STYLE_HOUR
                : i % 4 === 2 ? SLOT_STYLE_HALF
                : SLOT_STYLE_HALF
              }
              style={{
                gridColumn: `1 / ${MAX_OVERLAP_COLUMNS + 1}`,
                gridRow: i + 1,
                ...(i % 4 === 0
                  ? { borderTop: '1px solid var(--line)' }
                  : i % 4 === 2
                    ? { borderTop: '1px solid color-mix(in srgb, var(--line) 50%, transparent)' }
                    : undefined),
              }}
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
            onDragStateChange={onDragStateChange}
            onResize={onResize}
            onTypedEdit={onTypedEdit}
            weekDays={weekDays}
            gridRef={gridRef}
            isCardOpen={pe.event.id === selectedEventId}
            highlightedEventId={highlightedEventId}
          />
        ))}

        {/* Ghost blocks: unrecorded time gaps */}
        {onGapClick && gaps.map((gap) => {
          const gRowStart = timeToGridRow(gap.start, dayStart)
          const gRowEnd   = timeToGridRow(gap.end, dayStart)
          const gapHeightPct = ((gap.end - gap.start) / (24 * 60 * 60_000)) * 100
          const showText = gapHeightPct >= 28
          return (
            <div
              key={`gap-${gap.start}`}
              role="button"
              tabIndex={0}
              aria-label={`${fmtGapTime(gap.start)} → ${fmtGapTime(gap.end)}`}
              className="relative overflow-hidden select-none cursor-pointer z-[5] transition-all duration-200 ease-out"
              style={{
                gridRowStart: gRowStart,
                gridRowEnd: Math.max(gRowStart + 1, gRowEnd),
                gridColumn: `1 / ${MAX_OVERLAP_COLUMNS + 1}`,
                margin: '1px 2px',
                borderRadius: 'var(--radius-s)',
                border: '1px dashed var(--border-default)',
                opacity: 0.45,
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                const el = e.currentTarget
                el.style.opacity = '1'
                el.style.borderColor = 'var(--accent)'
                el.style.backgroundColor = 'color-mix(in srgb, var(--accent) 6%, transparent)'
              }}
              onMouseLeave={(e) => {
                const el = e.currentTarget
                el.style.opacity = '0.45'
                el.style.borderColor = 'var(--border-default)'
                el.style.backgroundColor = 'transparent'
              }}
              onClick={(e) => {
                e.stopPropagation()
                onGapClick(gap.start, gap.end, e.currentTarget as HTMLElement)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  e.stopPropagation()
                  onGapClick(gap.start, gap.end, e.currentTarget as HTMLElement)
                }
              }}
            >
              {showText ? (
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    lineHeight: 1,
                  }}
                >
                  {`${fmtGapTime(gap.start)} → ${fmtGapTime(gap.end)}`}
                </span>
              ) : (
                <span
                  className="absolute inset-0 flex items-center justify-center"
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: 10,
                    color: 'var(--text-tertiary)',
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export const DayColumn = React.memo(DayColumnInner, (prev, next) =>
  prev.date.getTime()      === next.date.getTime()      &&
  prev.events              === next.events               &&
  prev.selectedEventId     === next.selectedEventId      &&
  prev.highlightedEventId  === next.highlightedEventId   &&
  prev.highlightedDayMs   === next.highlightedDayMs    &&
  prev.weekDays            === next.weekDays              &&
  prev.gridRef             === next.gridRef               &&
  prev.onSlotClick       === next.onSlotClick        &&
  prev.onEventClick      === next.onEventClick       &&
  prev.onColorChange     === next.onColorChange      &&
  prev.onEdit            === next.onEdit             &&
  prev.onDuplicate       === next.onDuplicate        &&
  prev.onDelete          === next.onDelete           &&
  prev.onDragMove        === next.onDragMove         &&
  prev.onDragToEdge      === next.onDragToEdge       &&
  prev.onDragStart       === next.onDragStart        &&
  prev.onDragStateChange === next.onDragStateChange   &&
  prev.onResize          === next.onResize            &&
  prev.onTypedEdit       === next.onTypedEdit         &&
  prev.onGapClick        === next.onGapClick,
)

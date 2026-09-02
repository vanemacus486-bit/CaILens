import { useMemo, useState } from 'react'
import { Clock3, MapPin, Pencil } from 'lucide-react'
import type { CalendarEvent } from '@/domain/event'
import { isSameDay } from '@/domain/time'

interface MobileEventTimelineProps {
  date: Date
  events: CalendarEvent[]
  onEdit?: (event: CalendarEvent) => void
  emptyAction?: React.ReactNode
}

type TimelineItem =
  | { kind: 'event'; minute: number; event: CalendarEvent }
  | { kind: 'now'; minute: number }

interface PositionedTimelineItem {
  item: TimelineItem
  gap: number
  endMinute: number
}

export function MobileEventTimeline({ date, events, onEdit, emptyAction }: MobileEventTimelineProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const dayStart = useMemo(() => {
    const value = new Date(date)
    value.setHours(0, 0, 0, 0)
    return value.getTime()
  }, [date])
  const items = useMemo<TimelineItem[]>(() => {
    const next: TimelineItem[] = events
      .map((event) => ({
        kind: 'event' as const,
        minute: Math.max(0, Math.min(1_440, (event.startTime - dayStart) / 60_000)),
        event,
      }))
      .sort((a, b) => a.minute - b.minute)
    if (isSameDay(date, new Date())) {
      const now = new Date()
      next.push({ kind: 'now', minute: now.getHours() * 60 + now.getMinutes() })
      next.sort((a, b) => a.minute - b.minute)
    }
    return next
  }, [date, dayStart, events])
  const layoutItems = useMemo(() => items.reduce<PositionedTimelineItem[]>((positioned, item) => {
    const previousMinute = positioned.at(-1)?.endMinute ?? 0
    const endMinute = item.kind === 'event'
      ? Math.max(item.minute, Math.min(1_440, (item.event.endTime - dayStart) / 60_000))
      : item.minute
    return [...positioned, {
      item,
      gap: Math.max(8, Math.min(72, (item.minute - previousMinute) * 0.22)),
      endMinute,
    }]
  }, []), [dayStart, items])

  if (events.length === 0) {
    return (
      <div className="mobile-timeline-empty">
        <span className="mobile-timeline-empty-mark" />
        <p>这一天没有记录</p>
        <span>添加一条记录，开始还原今天的时间去向。</span>
        {emptyAction}
      </div>
    )
  }

  return (
    <div className="mobile-event-timeline" role="list" aria-label="当天事件时间轴">
      <div className="mobile-event-timeline-spine" />
      {layoutItems.map(({ item, gap }) => {
        if (item.kind === 'now') {
          return (
            <div key="now" className="mobile-current-time" style={{ marginTop: gap }}>
              <span>{formatClock(dayStart + item.minute * 60_000)}</span>
              <i />
            </div>
          )
        }

        const { event } = item
        const selected = selectedId === event.id
        const durationMinutes = Math.max(1, Math.round((event.endTime - event.startTime) / 60_000))
        return (
          <article
            key={event.id}
            role="listitem"
            className={selected ? 'mobile-timeline-event is-selected' : 'mobile-timeline-event'}
            style={{ marginTop: gap, '--mobile-event-color': `var(--event-${event.color}-fill)` } as React.CSSProperties}
          >
            <button
              type="button"
              className="mobile-timeline-event-main"
              onClick={() => setSelectedId((current) => current === event.id ? null : event.id)}
              aria-expanded={selected}
            >
              <span className="mobile-timeline-event-time">
                <strong>{formatClock(event.startTime)}</strong>
                <small>{formatClock(event.endTime)}</small>
              </span>
              <span className="mobile-timeline-event-dot" />
              <span className="mobile-timeline-event-copy">
                <strong>{event.title || '无标题事件'}</strong>
                <small>{formatDuration(durationMinutes)}</small>
              </span>
            </button>
            {selected && (
              <div className="mobile-timeline-event-detail">
                {event.description && <p>{event.description}</p>}
                <div className="mobile-timeline-event-meta">
                  <span><Clock3 size={13} />{formatDuration(durationMinutes)}</span>
                  {event.location && <span><MapPin size={13} />{event.location}</span>}
                </div>
                {onEdit && (
                  <button type="button" onClick={() => onEdit(event)}>
                    <Pencil size={14} />立即编辑
                  </button>
                )}
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}

function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(timestamp))
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} 分钟`
  const hours = Math.floor(minutes / 60)
  const remainder = minutes % 60
  return remainder === 0 ? `${hours} 小时` : `${hours} 小时 ${remainder} 分钟`
}

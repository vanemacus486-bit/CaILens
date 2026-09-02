import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Plus, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { formatISODate, formatWeekday, getWeekDays, getWeekStart, isSameDay } from '@/domain/time'
import { parseISO } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import { MobileEventEditor, type MobileEditorDefaults } from './MobileEventEditor'
import { MobileDayInsightSheet } from './MobileDayInsightSheet'
import { MobileEventTimeline } from './MobileEventTimeline'
import { fireAndForget } from '@/lib/fireAndForget'

function parseDateParam(param: string | null): Date {
  if (!param) return new Date()
  try { return parseISO(param) } catch { return new Date() }
}

function nextHalfHour(date: Date): number {
  const result = new Date(date)
  const now = new Date()
  if (isSameDay(result, now)) result.setHours(now.getHours(), now.getMinutes(), 0, 0)
  const minutes = result.getMinutes()
  result.setMinutes(minutes < 30 ? 30 : 0, 0, 0)
  if (minutes >= 30) result.setHours(result.getHours() + 1)
  return result.getTime()
}

export function MobileDayPage() {
  const [params, setParams] = useSearchParams()
  const selectedDate = useMemo(() => parseDateParam(params.get('date')), [params])
  const weekStart = useMemo(() => getWeekStart(selectedDate, 1), [selectedDate])
  const weekDays = useMemo(() => getWeekDays(weekStart), [weekStart])
  const events = useEventStore((state) => state.events)
  const loadWeek = useEventStore((state) => state.loadWeek)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorKey, setEditorKey] = useState(0)
  const [editorDefaults, setEditorDefaults] = useState<MobileEditorDefaults>({ startTime: 0, endTime: 0 })
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | undefined>()
  const [insightOpen, setInsightOpen] = useState(false)
  const pointerStart = useRef<{ id: number; x: number; y: number } | null>(null)

  useEffect(() => { fireAndForget(loadWeek(weekStart), 'load mobile week') }, [loadWeek, weekStart])

  const dayStart = useMemo(() => {
    const date = new Date(selectedDate)
    date.setHours(0, 0, 0, 0)
    return date.getTime()
  }, [selectedDate])
  const dayEvents = useMemo(() => events
    .filter((event) => event.startTime < dayStart + 86_400_000 && event.endTime > dayStart)
    .sort((a, b) => a.startTime - b.startTime), [dayStart, events])

  const goToDate = useCallback((date: Date) => setParams({ date: formatISODate(date) }), [setParams])
  const openCreate = useCallback((startTime = nextHalfHour(selectedDate)) => {
    setEditorDefaults({ startTime, endTime: startTime + 30 * 60_000 })
    setEditingEvent(undefined)
    setEditorKey((key) => key + 1)
    setEditorOpen(true)
  }, [selectedDate])
  const openEdit = useCallback((event: CalendarEvent) => {
    setEditorDefaults({ startTime: event.startTime, endTime: event.endTime, color: event.color })
    setEditingEvent(event)
    setEditorKey((key) => key + 1)
    setEditorOpen(true)
  }, [])

  useEffect(() => {
    const openEventId = params.get('openEvent')
    if (!openEventId) return
    const event = dayEvents.find((item) => item.id === openEventId)
    if (event) openEdit(event)
  }, [dayEvents, openEdit, params])

  const handlePointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    pointerStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY }
    event.currentTarget.setPointerCapture(event.pointerId)
  }, [])
  const handlePointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start || start.id !== event.pointerId) return
    const horizontal = event.clientX - start.x
    const vertical = event.clientY - start.y
    if (Math.abs(horizontal) < 52 || Math.abs(horizontal) <= Math.abs(vertical) * 1.25) return
    const next = new Date(selectedDate)
    next.setDate(next.getDate() + (horizontal < 0 ? 1 : -1))
    goToDate(next)
  }, [goToDate, selectedDate])

  return (
    <div className="mobile-day-canvas">
      <div className="mobile-week-strip" aria-label="选择日期">
        {weekDays.map((day) => (
          <button
            key={day.getTime()}
            type="button"
            onClick={() => goToDate(day)}
            className={cn(isSameDay(day, selectedDate) && 'is-selected', isSameDay(day, new Date()) && 'is-today')}
          >
            <span>{formatWeekday(day, 'short')}</span>
            <strong>{day.getDate()}</strong>
          </button>
        ))}
      </div>
      <div className="mobile-day-tools">
        <div><span>当天时间轴</span><strong>{dayEvents.length} 条记录</strong></div>
        <button type="button" onClick={() => setInsightOpen(true)} aria-label="日复盘"><Sparkles size={15} /></button>
      </div>
      <div className="mobile-day-scroll" onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
        <MobileEventTimeline
          date={selectedDate}
          events={dayEvents}
          onEdit={openEdit}
          emptyAction={<button type="button" className="mobile-empty-create" onClick={() => openCreate()}><Plus size={15} />添加记录</button>}
        />
      </div>
      <button type="button" className="mobile-quick-capture" onClick={() => openCreate()} aria-label="添加记录">
        <Plus size={18} /><span>快速记录</span>
      </button>
      <MobileEventEditor
        key={editorKey}
        open={editorOpen}
        defaults={editorDefaults}
        editingEvent={editingEvent}
        onClose={() => setEditorOpen(false)}
      />
      {insightOpen && <MobileDayInsightSheet selectedDateMs={dayStart} onClose={() => setInsightOpen(false)} />}
    </div>
  )
}

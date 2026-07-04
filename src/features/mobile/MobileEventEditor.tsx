import { useCallback, useEffect, useRef, useState } from 'react'
import { Clock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { classifyEvent } from '@/domain/icsImport'
import { useCategoryStore } from '@/stores/categoryStore'
import { EVENT_COLORS, type CalendarEvent, type CreateEventInput, type EventColor } from '@/domain/event'
import { getCategoryById, type CategoryId } from '@/domain/category'
import { isAllDayEvent } from '@/domain/dayStream'
import type { RulerEdge } from '@/domain/timeRuler'
import { TimeRulerPicker } from './TimeRulerPicker'

// ── Helpers ──────────────────────────────────────────────────

function tsToTimeStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function timeStrToTs(base: number, timeStr: string): number {
  const [h, m] = timeStr.split(':').map(Number)
  const d = new Date(base)
  d.setHours(h, m, 0, 0)
  return d.getTime()
}

function localMidnight(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

const WEEKDAY_ZH = ['日', '一', '二', '三', '四', '五', '六']

/** "今天" / "明天" / "昨天" / "星期几" + the short month-day date. */
function formatEditorDate(ts: number): { relative: string; full: string } {
  const d = new Date(ts)
  const diffDays = Math.round((localMidnight(ts) - localMidnight(Date.now())) / 86_400_000)
  const relative =
    diffDays === 0 ? '今天' :
    diffDays === 1 ? '明天' :
    diffDays === -1 ? '昨天' :
    `星期${WEEKDAY_ZH[d.getDay()]}`
  return { relative, full: `${d.getMonth() + 1}月${d.getDate()}日` }
}

const COLOR_BG: Record<EventColor, string> = {
  accent: 'bg-[var(--color-accent-bg)]',
  sage:   'bg-[var(--color-sage-bg)]',
  sand:   'bg-[var(--color-sand-bg)]',
  sky:    'bg-[var(--color-sky-bg)]',
  rose:   'bg-[var(--color-rose-bg)]',
  stone:  'bg-[var(--color-stone-bg)]',
}

const COLOR_RING: Record<EventColor, string> = {
  accent: 'ring-[var(--color-accent-fill)]',
  sage:   'ring-[var(--color-sage-fill)]',
  sand:   'ring-[var(--color-sand-fill)]',
  sky:    'ring-[var(--color-sky-fill)]',
  rose:   'ring-[var(--color-rose-fill)]',
  stone:  'ring-[var(--color-stone-fill)]',
}

// ── Types ─────────────────────────────────────────────────────

export interface MobileEditorDefaults {
  startTime: number
  endTime: number
  color?: EventColor
}

interface MobileEventEditorProps {
  open: boolean
  defaults: MobileEditorDefaults
  editingEvent?: CalendarEvent
  onClose: () => void
}

// ── Component ─────────────────────────────────────────────────

export function MobileEventEditor({ open, defaults, editingEvent, onClose }: MobileEventEditorProps) {
  const categories = useCategoryStore((s) => s.categories)
  const createEvent = useEventStore((s) => s.createEvent)
  const updateEvent = useEventStore((s) => s.updateEvent)
  const deleteEvent = useEventStore((s) => s.deleteEvent)

  const isEditing = !!editingEvent

  // Lazy initialization — this component remounts when the key changes (see parent)
  const [title, setTitle] = useState(() => editingEvent?.title ?? '')
  const [color, setColor] = useState<EventColor>(() => editingEvent?.color ?? defaults.color ?? 'accent')
  const [startTime, setStartTime] = useState(() => editingEvent?.startTime ?? defaults.startTime)
  const [endTime, setEndTime] = useState(() => editingEvent?.endTime ?? defaults.endTime)
  const [isAllDay, setIsAllDay] = useState(() =>
    editingEvent ? isAllDayEvent(editingEvent, localMidnight(editingEvent.startTime)) : false,
  )
  const [activeEdge, setActiveEdge] = useState<RulerEdge>('start')
  const [precisionMode, setPrecisionMode] = useState(false)
  const [categoryExpanded, setCategoryExpanded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100)
  }, [open])

  // Auto-classify color from title
  const handleTitleChange = useCallback((v: string) => {
    setTitle(v)
    if (!isEditing) {
      const classified = classifyEvent(v, categories)
      if (classified) setColor(classified as EventColor)
    }
  }, [categories, isEditing])

  const toggleAllDay = useCallback(() => {
    setIsAllDay((prev) => {
      const next = !prev
      if (next) {
        const dayStart = localMidnight(startTime)
        setStartTime(dayStart)
        setEndTime(dayStart + 86_400_000)
      } else {
        setEndTime(startTime + 30 * 60_000)
      }
      return next
    })
  }, [startTime])

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const finalEnd = endTime <= startTime ? startTime + 30 * 60_000 : endTime
      const categoryId = color as CategoryId

      if (isEditing && editingEvent) {
        await updateEvent({ id: editingEvent.id, title: title.trim(), startTime, endTime: finalEnd, color, categoryId })
      } else {
        const input: CreateEventInput = { title: title.trim(), startTime, endTime: finalEnd, color, categoryId }
        await createEvent(input)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }, [title, startTime, endTime, color, editingEvent, isEditing, createEvent, updateEvent, onClose])

  const handleDelete = useCallback(async () => {
    if (!editingEvent) return
    setSaving(true)
    try {
      await deleteEvent(editingEvent.id)
      onClose()
    } finally {
      setSaving(false)
    }
  }, [editingEvent, deleteEvent, onClose])

  const { relative: dateRelative, full: dateFull } = formatEditorDate(startTime)
  const category = getCategoryById(categories, color as CategoryId)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 flex flex-col bg-surface-base transition-transform duration-250 ease-out',
        open ? 'translate-y-0' : 'translate-y-full',
      )}
      style={{ paddingTop: 'env(safe-area-inset-top, 12px)' }}
    >
      <div className="flex-1 overflow-y-auto px-6 pt-6 pb-28 flex flex-col items-center gap-5">
        {/* Title */}
        <input
          ref={inputRef}
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
          placeholder="做了什么？"
          className="w-full bg-transparent text-xl font-medium text-text-primary placeholder:text-text-tertiary outline-none text-center"
        />

        {/* Category chip — tap to expand the full swatch row */}
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setCategoryExpanded((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-raised active:scale-95 transition-transform"
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: `var(--event-${color}-fill)` }} />
            <span className="text-xs text-text-secondary">{category?.name ?? ''}</span>
          </button>
          {categoryExpanded && (
            <div className="flex gap-2.5 pt-1">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => { setColor(c); setCategoryExpanded(false) }}
                  className={cn(
                    'w-7 h-7 rounded-full transition-all duration-150',
                    COLOR_BG[c],
                    color === c && `ring-2 ring-offset-2 ring-offset-surface-base ${COLOR_RING[c]}`,
                  )}
                />
              ))}
            </div>
          )}
        </div>

        {/* Date */}
        <div className="text-center">
          <p className="text-sm font-semibold text-text-primary tracking-wide">{dateRelative}</p>
          <p className="text-xs text-text-tertiary mt-0.5">{dateFull}</p>
        </div>

        {/* Big time range */}
        <div className="flex items-center justify-center gap-3 font-mono">
          <button
            type="button"
            onClick={() => setActiveEdge('start')}
            className={cn(
              'text-4xl font-semibold tabular-nums transition-opacity',
              activeEdge === 'start' || isAllDay ? 'text-text-primary' : 'text-text-primary/45',
            )}
          >
            {isAllDay ? '全天' : tsToTimeStr(startTime)}
          </button>
          {!isAllDay && (
            <>
              <span className="text-2xl text-text-tertiary">→</span>
              <button
                type="button"
                onClick={() => setActiveEdge('end')}
                className={cn(
                  'text-4xl font-semibold tabular-nums transition-opacity',
                  activeEdge === 'end' ? 'text-text-primary' : 'text-text-primary/45',
                )}
              >
                {tsToTimeStr(endTime)}
              </button>
            </>
          )}
        </div>

        {/* Drag ruler */}
        {!isAllDay && (
          <div className="w-full">
            <TimeRulerPicker
              startTime={startTime}
              endTime={endTime}
              activeEdge={activeEdge}
              onChange={({ startTime: s, endTime: e }) => { setStartTime(s); setEndTime(e) }}
            />
          </div>
        )}

        {/* Mode toggles: precision native input fallback, all-day */}
        <div className="flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => setPrecisionMode((v) => !v)}
            disabled={isAllDay}
            className={cn(
              'p-2 rounded-full transition-colors disabled:opacity-30',
              precisionMode ? 'bg-surface-raised text-text-primary' : 'text-text-tertiary',
            )}
          >
            <Clock size={16} />
          </button>
          <button
            type="button"
            onClick={toggleAllDay}
            className={cn(
              'p-2 rounded-full transition-colors',
              isAllDay ? 'bg-surface-raised text-text-primary' : 'text-text-tertiary',
            )}
          >
            <CalendarDays size={16} />
          </button>
        </div>

        {/* Precision fallback — native time inputs */}
        {precisionMode && !isAllDay && (
          <div className="flex items-center gap-3 w-full">
            <input
              type="time"
              value={tsToTimeStr(startTime)}
              onChange={(e) => setStartTime(timeStrToTs(startTime, e.target.value))}
              className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
            />
            <span className="text-text-tertiary">—</span>
            <input
              type="time"
              value={tsToTimeStr(endTime)}
              onChange={(e) => setEndTime(timeStrToTs(startTime, e.target.value))}
              className="flex-1 bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-primary outline-none"
            />
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div
        className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-5 py-3 border-t border-border-subtle bg-surface-base"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 12px)' }}
      >
        <button onClick={onClose} className="text-sm text-text-secondary px-2 py-2">取消</button>
        {isEditing && (
          <button
            onClick={() => setShowConfirmDelete(true)}
            disabled={saving}
            className="text-sm font-medium text-[var(--color-danger)] px-2 py-2 disabled:opacity-50"
          >
            删除
          </button>
        )}
        <button
          onClick={handleSave}
          disabled={saving || !title.trim()}
          className="text-sm font-semibold text-white bg-accent px-5 py-2.5 rounded-full active:scale-95 transition-all disabled:opacity-40"
        >
          {saving ? '保存中…' : isEditing ? '保存' : '记录'}
        </button>
      </div>

      {/* Delete confirm overlay */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 flex items-end justify-center bg-black/40">
          <div className="bg-surface-base rounded-t-2xl w-full px-5 py-6 space-y-3" style={{ paddingBottom: 'env(safe-area-inset-bottom, 24px)' }}>
            <p className="text-center text-sm text-text-secondary">确认删除这条记录？</p>
            <button
              onClick={handleDelete}
              disabled={saving}
              className="w-full py-3 rounded-xl text-sm font-semibold text-white bg-[var(--color-danger)] active:scale-95 transition-all"
            >
              确认删除
            </button>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="w-full py-3 rounded-xl text-sm font-medium text-text-secondary bg-surface-sunken active:scale-95 transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

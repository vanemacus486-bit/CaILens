import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'
import { classifyEvent } from '@/domain/icsImport'
import { useCategoryStore } from '@/stores/categoryStore'
import { EVENT_COLORS, type CalendarEvent, type CreateEventInput, type EventColor } from '@/domain/event'
import type { CategoryId } from '@/domain/category'

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
  const [startStr, setStartStr] = useState(() =>
    tsToTimeStr(editingEvent?.startTime ?? defaults.startTime),
  )
  const [endStr, setEndStr] = useState(() =>
    tsToTimeStr(editingEvent?.endTime ?? defaults.endTime),
  )
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

  const setDurationFromStart = useCallback((minutes: number) => {
    const startTs = timeStrToTs(defaults.startTime, startStr)
    const endTs = startTs + minutes * 60_000
    setEndStr(tsToTimeStr(endTs))
  }, [startStr, defaults.startTime])

  const handleSave = useCallback(async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const baseDay = editingEvent?.startTime ?? defaults.startTime
      const startTs = timeStrToTs(baseDay, startStr)
      const endTs   = timeStrToTs(baseDay, endStr)
      const finalEnd = endTs <= startTs ? startTs + 30 * 60_000 : endTs

      const categoryId = color as unknown as CategoryId

      if (isEditing && editingEvent) {
        await updateEvent({ id: editingEvent.id, title: title.trim(), startTime: startTs, endTime: finalEnd, color, categoryId })
      } else {
        const input: CreateEventInput = { title: title.trim(), startTime: startTs, endTime: finalEnd, color, categoryId }
        await createEvent(input)
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }, [title, startStr, endStr, color, defaults, editingEvent, isEditing, createEvent, updateEvent, onClose])

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

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 transition-opacity duration-200',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Sheet */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 bg-surface-base rounded-t-2xl shadow-2xl transition-transform duration-250 ease-out',
          open ? 'translate-y-0' : 'translate-y-full',
        )}
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-border-subtle" />
        </div>

        <div className="px-5 pb-4 space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-secondary">
              {isEditing ? '编辑记录' : '新建记录'}
            </span>
            <button onClick={onClose} className="text-text-tertiary text-xs px-2 py-1">取消</button>
          </div>

          {/* Title */}
          <input
            ref={inputRef}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
            placeholder="做了什么？"
            className="w-full bg-surface-raised rounded-xl px-4 py-3 text-base text-text-primary placeholder:text-text-tertiary outline-none focus:ring-2 focus:ring-accent/40"
          />

          {/* Color swatches */}
          <div className="flex gap-2.5">
            {EVENT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={cn(
                  'flex-1 h-8 rounded-lg transition-all duration-150',
                  COLOR_BG[c],
                  color === c && `ring-2 ring-offset-2 ring-offset-surface-base ${COLOR_RING[c]}`,
                )}
              />
            ))}
          </div>

          {/* Time row */}
          <div className="flex items-center gap-3">
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-text-tertiary">开始</span>
              <input
                type="time"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-primary outline-none w-full"
              />
            </div>
            <span className="text-text-tertiary mt-4">—</span>
            <div className="flex-1 flex flex-col gap-1">
              <span className="text-xs text-text-tertiary">结束</span>
              <input
                type="time"
                value={endStr}
                onChange={(e) => setEndStr(e.target.value)}
                className="bg-surface-raised rounded-lg px-3 py-2 text-sm text-text-primary outline-none w-full"
              />
            </div>
          </div>

          {/* Duration quick chips */}
          {!isEditing && (
            <div className="flex gap-2">
              {[15, 30, 60, 90].map((min) => (
                <button
                  key={min}
                  onClick={() => setDurationFromStart(min)}
                  className="flex-1 text-xs py-1.5 rounded-lg bg-surface-sunken text-text-secondary hover:bg-surface-raised active:scale-95 transition-all"
                >
                  {min < 60 ? `${min}分` : `${min / 60}时`}
                </button>
              ))}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            {isEditing && (
              <button
                onClick={() => setShowConfirmDelete(true)}
                disabled={saving}
                className="px-4 py-3 rounded-xl text-sm font-medium text-[var(--color-danger)] bg-surface-sunken active:scale-95 transition-all disabled:opacity-50"
              >
                删除
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving || !title.trim()}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-accent text-white active:scale-95 transition-all disabled:opacity-40"
            >
              {saving ? '保存中…' : isEditing ? '保存' : '记录'}
            </button>
          </div>
        </div>
      </div>

      {/* Delete confirm overlay */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-60 flex items-end justify-center">
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
    </>
  )
}

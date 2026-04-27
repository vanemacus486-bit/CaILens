import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarEvent, EventColor, UpdateEventInput } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { isSameDay } from '@/domain/time'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { DraftPreview } from './types'

// ── Constants ─────────────────────────────────────────────

const INPUT = cn(
  'w-full px-2.5 py-1.5 rounded-xl text-sm font-sans',
  'bg-surface-sunken border border-border-subtle',
  'text-text-primary placeholder:text-text-tertiary',
  'focus:outline-none focus:border-border-default transition-colors duration-150',
)

// ── Helpers ───────────────────────────────────────────────

function tsToStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function strToTs(date: Date, s: string): number {
  const [h, m] = s.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0).getTime()
}

function getError(startStr: string, endStr: string, date: Date): string | null {
  if (!startStr || !endStr) return 'Set start and end times'
  const s = strToTs(date, startStr)
  const e = strToTs(date, endStr)
  if (isNaN(s) || isNaN(e)) return 'Invalid time'
  if (e <= s)               return 'End must be after start'
  if (!isSameDay(s, e))     return 'Must be on the same day'
  return null
}

function pushDraft(
  startStr: string, endStr: string, color: EventColor, date: Date,
  onChange: (d: DraftPreview | null) => void,
) {
  if (!startStr || !endStr) return
  const s = strToTs(date, startStr)
  const e = strToTs(date, endStr)
  if (isNaN(s) || isNaN(e)) return
  if (e > s && isSameDay(s, e)) onChange({ startTime: s, endTime: e, color })
  else onChange(null)
}

// ── Component ─────────────────────────────────────────────

interface EventEditCardProps {
  event:          CalendarEvent
  anchorEl:       HTMLElement
  isNewlyCreated: boolean
  onSave:         (updates: UpdateEventInput) => void
  onDelete:       () => void
  onClose:        () => void
  onCancel:       () => void
  onDraftChange:  (draft: DraftPreview | null) => void
}

export function EventEditCard({
  event, anchorEl, isNewlyCreated,
  onSave, onDelete, onClose, onCancel, onDraftChange,
}: EventEditCardProps) {
  const localDate = new Date(event.startTime)

  const categories = useCategoryStore((s) => s.categories)
  const language   = useAppSettingsStore((s) => s.settings.language)

  const [title,      setTitle]      = useState(event.title)
  const [startStr,   setStartStr]   = useState(tsToStr(event.startTime))
  const [endStr,     setEndStr]     = useState(tsToStr(event.endTime))
  // categoryId と color は常に同値（CategoryId === EventColor）
  const [categoryId, setCategoryId] = useState<CategoryId>(event.categoryId)
  const [desc,       setDesc]       = useState(event.description ?? '')
  const [loc,        setLoc]        = useState(event.location ?? '')
  const [error,      setError]      = useState<string | null>(null)

  const titleRef   = useRef<HTMLInputElement>(null)
  const virtualRef = useRef<HTMLElement | null>(null)
  virtualRef.current = anchorEl

  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      titleRef.current?.focus()
      titleRef.current?.select()
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => () => onDraftChange(null), [onDraftChange])

  useEffect(() => {
    pushDraft(tsToStr(event.startTime), tsToStr(event.endTime), event.color, localDate, onDraftChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save / discard ────────────────────────────────────

  const doSave = () => {
    onSave({
      id:          event.id,
      title:       title.trim(),
      startTime:   strToTs(localDate, startStr),
      endTime:     strToTs(localDate, endStr),
      color:       categoryId as EventColor,
      categoryId,
      description: desc.trim() || undefined,
      location:    loc.trim()  || undefined,
    })
  }

  const handleClose = () => {
    if (title.trim() === '') {
      onDelete()
    } else {
      const err = getError(startStr, endStr, localDate)
      if (err) { setError(err); return }
      doSave()
    }
    onClose()
  }

  const handleCancel = () => {
    if (isNewlyCreated) onDelete()
    onCancel()
  }

  // ── Draft updates ────────────────────────────────────

  const handleStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value; setStartStr(s); setError(null)
    pushDraft(s, endStr, categoryId as EventColor, localDate, onDraftChange)
  }
  const handleEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value; setEndStr(s); setError(null)
    pushDraft(startStr, s, categoryId as EventColor, localDate, onDraftChange)
  }

  const handleCategory = (id: CategoryId) => {
    setCategoryId(id)
    pushDraft(startStr, endStr, id as EventColor, localDate, onDraftChange)
  }

  // ── Render ───────────────────────────────────────────

  return (
    <Popover open>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <PopoverAnchor virtualRef={virtualRef as any} />

      <PopoverContent
        side="right"
        className="w-80 p-0"
        onPointerDownOutside={handleClose}
        onEscapeKeyDown={handleCancel}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4 flex flex-col gap-3">
          {/* Title */}
          <input
            ref={titleRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleClose() } }}
            placeholder="Title"
            className={cn(INPUT, 'font-serif text-base')}
          />

          {/* Time range */}
          <div className="flex gap-2">
            <input type="time" value={startStr} onChange={handleStart} className={cn(INPUT, 'font-mono flex-1')} />
            <input type="time" value={endStr}   onChange={handleEnd}   className={cn(INPUT, 'font-mono flex-1')} />
          </div>

          {error && <p className="text-xs text-rose-500 -mt-1 font-sans">{error}</p>}

          {/* 分类选择器（颜色 + 名称，点击选中） */}
          <div className="flex flex-col gap-1">
            {categories.map((cat) => {
              const isSelected = cat.id === categoryId
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategory(cat.id)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-1.5 rounded-lg text-left',
                    'transition-colors duration-150',
                    isSelected
                      ? 'bg-surface-raised'
                      : 'hover:bg-surface-raised',
                  )}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `var(--event-${cat.id}-bg)`,
                             outline: isSelected ? `2px solid var(--event-${cat.id}-text)` : 'none',
                             outlineOffset: '1px' }}
                  />
                  <span className="text-sm font-sans text-text-primary">
                    {cat.name[language]}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Notes */}
          <textarea
            value={desc} onChange={(e) => setDesc(e.target.value)}
            placeholder="Add a note…" rows={2}
            className={cn(INPUT, 'font-serif resize-none min-h-[56px]')}
          />

          {/* Location */}
          <input
            type="text" value={loc} onChange={(e) => setLoc(e.target.value)}
            placeholder="Add a location…"
            className={cn(INPUT, 'font-serif')}
          />

          {/* Delete */}
          <div className="pt-1 border-t border-border-subtle">
            <Button
              variant="ghost" size="sm" onClick={() => { onDelete(); onClose() }}
              className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1.5 px-2 h-8"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

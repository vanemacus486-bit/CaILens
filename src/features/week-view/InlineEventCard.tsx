import { useEffect, useRef, useState, useCallback } from 'react'
import { addDays } from 'date-fns'
import { cn } from '@/lib/utils'
import type { CalendarEvent, EventColor, UpdateEventInput } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { DraftPreview } from './types'

function tsToStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function strToTs(date: Date, s: string): number {
  const [h, m] = s.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0).getTime()
}

function isNextDayEnd(startStr: string, endStr: string): boolean {
  if (!startStr || !endStr) return false
  return endStr <= startStr
}

function pushDraft(
  startStr: string, endStr: string, color: EventColor, date: Date,
  onChange: (d: DraftPreview | null) => void,
) {
  if (!startStr || !endStr) return
  const s = strToTs(date, startStr)
  const endDate = isNextDayEnd(startStr, endStr) ? addDays(date, 1) : date
  const e = strToTs(endDate, endStr)
  if (isNaN(s) || isNaN(e)) return
  if (e > s) onChange({ startTime: s, endTime: e, color })
  else onChange(null)
}

const inputCls =
  'w-full font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-2 py-1.5 focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150'

const textareaCls =
  'w-full font-serif text-sm text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-3 py-2 focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150 placeholder:text-text-tertiary resize-none'

interface InlineEventCardProps {
  event: CalendarEvent
  isNewlyCreated: boolean
  anchorEl: HTMLElement
  containerEl: HTMLElement
  onSave: (updates: UpdateEventInput) => void
  onDelete: () => void
  onClose: () => void
  onDraftChange: (draft: DraftPreview | null) => void
}

export function InlineEventCard({
  event, isNewlyCreated, anchorEl, containerEl,
  onSave, onDelete, onClose, onDraftChange,
}: InlineEventCardProps) {
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const localDate = new Date(event.startTime)
  const [title, setTitle] = useState(event.title)
  const [startStr, setStartStr] = useState(tsToStr(event.startTime))
  const [endStr, setEndStr] = useState(tsToStr(event.endTime))
  const [categoryId, setCategoryId] = useState<CategoryId>(event.categoryId)
  const [desc, setDesc] = useState(event.description ?? '')
  const [location, setLocation] = useState(event.location ?? '')
  const [error, setError] = useState<string | null>(null)
  const [cardStyle, setCardStyle] = useState<React.CSSProperties>({})
  const [visible, setVisible] = useState(false)

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // Calculate position relative to the container
  useEffect(() => {
    const anchorRect = anchorEl.getBoundingClientRect()
    const containerRect = containerEl.getBoundingClientRect()

    const top = anchorRect.bottom - containerRect.top + 4
    const left = anchorRect.left - containerRect.left
    const width = anchorRect.width

    setCardStyle({
      position: 'absolute',
      top: `${top}px`,
      left: `${left}px`,
      width: `${Math.max(width, 240)}px`,
      zIndex: 30,
    })

    // Trigger enter animation
    requestAnimationFrame(() => setVisible(true))
  }, [anchorEl, containerEl])

  // Autofocus title for newly created events
  useEffect(() => {
    if (isNewlyCreated) {
      requestAnimationFrame(() => {
        titleRef.current?.focus()
        titleRef.current?.select()
      })
    }
  }, [isNewlyCreated])

  // Push initial draft for real-time preview
  useEffect(() => {
    pushDraft(tsToStr(event.startTime), tsToStr(event.endTime), event.color, localDate, onDraftChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => onDraftChange(null), [onDraftChange])

  // Click outside to close
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (cardRef.current && !cardRef.current.contains(e.target as Node) &&
          !anchorEl.contains(e.target as Node)) {
        doSaveAndClose()
      }
    }
    // Delay adding listener so the opening click doesn't immediately close
    const timer = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, startStr, endStr, categoryId, desc, location])

  // Escape to close
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        doSaveAndClose()
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, startStr, endStr, categoryId, desc, location])

  const doSave = useCallback(() => {
    const endDate = isNextDayEnd(startStr, endStr) ? addDays(localDate, 1) : localDate
    onSave({
      id: event.id,
      title: title.trim(),
      startTime: strToTs(localDate, startStr),
      endTime: strToTs(endDate, endStr),
      color: categoryId as EventColor,
      categoryId,
      description: desc.trim() || undefined,
      location: location.trim() || undefined,
    })
  }, [title, startStr, endStr, categoryId, desc, location, event.id, localDate, onSave])

  const doSaveAndClose = useCallback(() => {
    if (isNewlyCreated && title.trim() === '') {
      onDelete()
      onClose()
      return
    }
    if (title.trim() === '') {
      onClose()
      return
    }
    const endDate = isNextDayEnd(startStr, endStr) ? addDays(localDate, 1) : localDate
    const s = strToTs(localDate, startStr)
    const e = strToTs(endDate, endStr)
    if (isNaN(s) || isNaN(e) || e <= s) {
      // Invalid time — just close without saving
      onClose()
      return
    }
    doSave()
    onClose()
  }, [isNewlyCreated, title, startStr, endStr, categoryId, desc, location, event.id, localDate, onSave, onDelete, onClose])

  const descRef = useRef<HTMLTextAreaElement>(null)

  // Handle title Enter key: save, then move focus to description
  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSave()
      requestAnimationFrame(() => descRef.current?.focus())
    }
  }

  // Handle desc Enter key (save + close)
  const handleDescKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && desc.trim()) {
      e.preventDefault()
      doSave()
      onClose()
    }
  }

  // Push draft updates
  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value; setStartStr(s); setError(null)
    pushDraft(s, endStr, categoryId as EventColor, localDate, onDraftChange)
  }
  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value; setEndStr(s); setError(null)
    pushDraft(startStr, s, categoryId as EventColor, localDate, onDraftChange)
  }

  const handleCategory = (id: CategoryId) => {
    setCategoryId(id)
    pushDraft(startStr, endStr, id as EventColor, localDate, onDraftChange)
  }

  return (
    <div
      ref={cardRef}
      className={cn(
        'rounded-lg border border-border-default shadow-dialog overflow-hidden',
        'transition-all duration-200 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-1',
      )}
      style={cardStyle}
    >
      {/* Color strip + content */}
      <div className="flex">
        <div
          className="w-1 flex-shrink-0 rounded-l-lg"
          style={{ backgroundColor: `var(--event-${categoryId}-fill)` }}
        />

        <div className="flex-1 p-4 bg-surface-raised flex flex-col gap-3 min-w-0">
          {/* Title */}
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder={t('事件标题', 'Event title')}
            className={cn(
              'font-serif text-base font-semibold text-text-primary bg-transparent border-none',
              'resize-none placeholder:text-text-tertiary/60',
              'focus-visible:outline-none',
            )}
            rows={1}
          />

          {/* Time + Category row */}
          <div className="flex gap-3 items-center">
            <input
              type="time"
              value={startStr}
              onChange={handleStartChange}
              className={cn(inputCls, 'w-20')}
            />
            <span className="text-text-tertiary text-xs">–</span>
            <input
              type="time"
              value={endStr}
              onChange={handleEndChange}
              className={cn(inputCls, 'w-20')}
            />

            {/* Category pills */}
            <div className="flex gap-1 ml-auto">
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => handleCategory(c.id)}
                  className={cn(
                    'w-5 h-5 rounded-full transition-all duration-200 cursor-pointer',
                    categoryId === c.id ? 'ring-2 ring-offset-1 ring-current scale-110' : 'opacity-50 hover:opacity-80',
                  )}
                  style={{
                    backgroundColor: `var(--event-${c.id}-fill)`,
                    color: `var(--event-${c.id}-fill)`,
                    ['--ring-color' as string]: `var(--event-${c.id}-fill)`,
                  }}
                  title={language === 'zh' ? c.name.zh : c.name.en}
                />
              ))}
            </div>
          </div>

          {error && (
            <p className="font-sans text-xs text-color-text-danger">{error}</p>
          )}

          {/* Description */}
          <textarea
            ref={descRef}
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            onKeyDown={handleDescKeyDown}
            placeholder={t('描述 — 可选，写什么都行', 'Description — optional, write anything')}
            className={cn(textareaCls, 'min-h-[60px]')}
            rows={3}
          />

          {/* Location */}
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('地点（可选）', 'Location (optional)')}
            className={cn(
              'w-full font-sans text-xs text-text-secondary bg-surface-sunken border border-border-subtle rounded-md px-3 py-1.5',
              'focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150',
              'placeholder:text-text-tertiary/60',
            )}
          />

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-1">
            <button
              onClick={() => {
                if (isNewlyCreated) onDelete()
                onClose()
              }}
              className="font-sans text-xs text-text-tertiary hover:text-text-secondary px-2 py-1 rounded-md hover:bg-surface-sunken transition-colors duration-150 cursor-pointer"
            >
              {t('取消', 'Cancel')}
            </button>
            <button
              onClick={() => { doSave(); onClose() }}
              className="font-sans text-xs font-medium text-white bg-accent hover:bg-accent-hover px-3 py-1 rounded-md transition-colors duration-150 cursor-pointer"
            >
              {t('保存', 'Save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CalendarEvent, EventColor, UpdateEventInput } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { isSameDay } from '@/domain/time'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { DraftPreview } from './types'

// ── Helpers ───────────────────────────────────────────────

function tsToStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function strToTs(date: Date, s: string): number {
  const [h, m] = s.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0).getTime()
}

function fmtDateHeader(date: Date, language: 'zh' | 'en'): string {
  const weekdays = { zh: ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] }
  const months = { zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'], en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] }
  const wd = weekdays[language][date.getDay()]
  const d = date.getDate()
  const m = months[language][date.getMonth()]
  return language === 'zh' ? `${m}${d}日 ${wd}` : `${wd}, ${m} ${d}`
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
  isNewlyCreated: boolean
  onSave:         (updates: UpdateEventInput) => void
  onDelete:       () => void
  onClose:        () => void
  onCancel:       () => void
  onDraftChange:  (draft: DraftPreview | null) => void
}

export function EventEditCard({
  event, isNewlyCreated,
  onSave, onDelete, onClose, onCancel, onDraftChange,
}: EventEditCardProps) {
  const localDate = new Date(event.startTime)

  const categories = useCategoryStore((s) => s.categories)
  const language   = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const [title,      setTitle]      = useState(event.title)
  const [startStr,   setStartStr]   = useState(tsToStr(event.startTime))
  const [endStr,     setEndStr]     = useState(tsToStr(event.endTime))
  const [categoryId, setCategoryId] = useState<CategoryId>(event.categoryId)
  const [desc,       setDesc]       = useState(event.description ?? '')
  const [error,      setError]      = useState<string | null>(null)

  const titleRef = useRef<HTMLTextAreaElement>(null)
  const cardRef  = useRef<HTMLDivElement>(null)

  function getError(startStr: string, endStr: string, date: Date): string | null {
    if (!startStr || !endStr) return t('请设置开始和结束时间', 'Set start and end times')
    const s = strToTs(date, startStr)
    const e = strToTs(date, endStr)
    if (isNaN(s) || isNaN(e)) return t('无效时间', 'Invalid time')
    if (e <= s)               return t('结束时间必须在开始时间之后', 'End must be after start')
    if (!isSameDay(s, e))     return t('必须在同一天', 'Must be on the same day')
    return null
  }

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

  // Close on click outside the card
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        handleClose()
      }
    }
    // Delay to avoid capturing the click that opened the card
    const id = setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => { clearTimeout(id); document.removeEventListener('click', handleClick) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, startStr, endStr, categoryId, desc])

  // Close on Escape
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { handleCancel() }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, startStr, endStr, categoryId, desc])

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
      location:    undefined,
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

  const handleTitle = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTitle(e.target.value)
  }

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

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Dimmed backdrop */}
      <div
        className="absolute inset-0 bg-surface-base opacity-60"
        onClick={handleClose}
      />

      {/* Card */}
      <div
        ref={cardRef}
        className="relative bg-surface-raised border border-border-default rounded-lg shadow-[0_8px_32px_rgba(40,36,31,0.12)] w-[420px] px-7 py-7 flex flex-col gap-4"
      >
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <div className="font-serif text-[17px] font-medium text-text-primary">
              {fmtDateHeader(localDate, language)}
            </div>
            <div className="font-mono text-xs text-accent mt-[3px]">
              {startStr} – {endStr}
            </div>
          </div>
          <button
            onClick={handleCancel}
            className="text-text-tertiary hover:text-text-primary transition-colors duration-200 cursor-pointer p-1 leading-none text-lg"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="h-px bg-border-subtle -mx-1" />

        {/* Prompt */}
        <div className="font-serif text-sm text-text-secondary italic">
          {t('你在做什么？', 'What were you doing?')}
        </div>

        {/* Title textarea */}
        <textarea
          ref={titleRef}
          value={title}
          onChange={handleTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleClose() }
          }}
          placeholder={t('例如：重构 useTimeBlock hook', 'e.g. Refactored useTimeBlock hook')}
          className={cn(
            'w-full font-sans text-sm text-text-primary',
            'bg-surface-sunken border border-border-subtle rounded-md',
            'px-3 py-2.5 resize-none h-[72px] outline-none',
            'focus:border-border-default transition-colors duration-150',
            'placeholder:text-text-tertiary',
          )}
        />

        {/* Time range */}
        <div className="flex gap-2">
          <input
            type="time"
            value={startStr}
            onChange={handleStart}
            className={cn(
              'flex-1 font-mono text-xs text-text-primary',
              'bg-surface-sunken border border-border-subtle rounded-md',
              'px-2.5 py-2 outline-none focus:border-border-default transition-colors duration-150',
            )}
          />
          <input
            type="time"
            value={endStr}
            onChange={handleEnd}
            className={cn(
              'flex-1 font-mono text-xs text-text-primary',
              'bg-surface-sunken border border-border-subtle rounded-md',
              'px-2.5 py-2 outline-none focus:border-border-default transition-colors duration-150',
            )}
          />
        </div>

        {error && <p className="text-xs text-rose-500 -mt-2 font-sans">{error}</p>}

        {/* Category chips */}
        {categories.length > 0 && (
          <div>
            <div className="text-[11px] font-sans font-semibold uppercase tracking-[0.1em] text-text-tertiary mb-2.5 select-none">
              {t('分类', 'Category')}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => {
                const isSelected = cat.id === categoryId
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategory(cat.id)}
                    className={cn(
                      'flex items-center gap-1.5 font-sans text-xs rounded-md px-2.5 py-[5px] cursor-pointer transition-colors duration-150',
                      isSelected
                        ? 'ring-1 ring-inset'
                        : 'border border-border-subtle hover:bg-surface-sunken',
                    )}
                    style={{
                      backgroundColor: isSelected ? `var(--event-${cat.id}-bg)` : 'transparent',
                      borderColor: isSelected ? `var(--event-${cat.id}-fill)` : undefined,
                      color: isSelected ? `var(--event-${cat.id}-text)` : 'var(--text-primary)',
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `var(--event-${cat.id}-fill)` }}
                    />
                    {cat.name[language]}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Optional note */}
        <div>
          <div className="text-[11px] font-sans font-semibold uppercase tracking-[0.1em] text-text-tertiary mb-2 select-none">
            {t('添加备注', 'Add a note')}{' '}
            <span className="normal-case tracking-normal font-normal">({t('可选', 'optional')})</span>
          </div>
          <input
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={t('关于这段时间的一个想法…', 'A quick thought about this block…')}
            className={cn(
              'w-full font-sans text-[13px] text-text-primary',
              'bg-surface-sunken border border-border-subtle rounded-md',
              'px-3 py-2 outline-none',
              'focus:border-border-default transition-colors duration-150',
              'placeholder:text-text-tertiary',
            )}
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-1">
          <button
            onClick={handleCancel}
            className="font-sans text-[13px] font-normal text-text-secondary bg-transparent border border-border-subtle rounded-md px-4 py-2 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            {t('取消', 'Cancel')}
          </button>
          <button
            onClick={handleClose}
            className="font-sans text-[13px] font-medium text-white bg-accent border-none rounded-md px-5 py-2 cursor-pointer hover:bg-accent-hover transition-colors duration-200"
          >
            {t('记录', 'Log it')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { DefaultTimes } from '@/domain/quickLog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { CreateEventInput, UpdateEventInput, CalendarEvent } from '@/domain/event'

function tsToStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function strToTs(date: Date, s: string): number {
  const [h, m] = s.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0).getTime()
}

const timeCls =
  'flex-1 font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-2.5 py-2 focus:border-border-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 transition-colors duration-150'

const fieldCls =
  'w-full font-sans text-sm text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-3 py-2 focus:border-border-default focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/50 transition-colors duration-150 placeholder:text-text-tertiary'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTimes: DefaultTimes
  defaultColor: EventColor
  onSave: (input: CreateEventInput) => Promise<string>
  /** When set, dialog enters edit mode — pre-fills fields, saves via onUpdate */
  editingEvent?: Pick<CalendarEvent, 'id' | 'title' | 'description' | 'location' | 'color' | 'startTime' | 'endTime'>
  onUpdate?: (input: UpdateEventInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}

export function QuickLogDialog({
  open, onOpenChange, defaultTimes, defaultColor, onSave,
  editingEvent, onUpdate, onDelete,
}: Props) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useCallback((zh: string, en: string) => language === 'zh' ? zh : en, [language])
  const today = useMemo(() => new Date(), [])

  // Remount inner form on each open to reset state from fresh defaults
  const [mountKey, setMountKey] = useState(0)
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open && !wasOpen.current) setMountKey((k) => k + 1)
    wasOpen.current = open
  }, [open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <Form
        key={mountKey}
        defaultTimes={defaultTimes}
        defaultColor={defaultColor}
        onSave={onSave}
        onClose={() => onOpenChange(false)}
        t={t}
        today={today}
        editingEvent={editingEvent}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </Dialog>
  )
}

function Form({
  defaultTimes, defaultColor, onSave, onClose, t, today,
  editingEvent, onUpdate, onDelete,
}: {
  defaultTimes: DefaultTimes
  defaultColor: EventColor
  onSave: (input: CreateEventInput) => Promise<string>
  onClose: () => void
  t: (zh: string, en: string) => string
  today: Date
  editingEvent?: Pick<CalendarEvent, 'id' | 'title' | 'description' | 'location' | 'color' | 'startTime' | 'endTime'>
  onUpdate?: (input: UpdateEventInput) => Promise<void>
  onDelete?: (id: string) => Promise<void>
}) {
  const isEditing = !!editingEvent
  const [title, setTitle] = useState(editingEvent?.title ?? '')
  const [startStr, setStartStr] = useState(() => editingEvent ? tsToStr(editingEvent.startTime) : tsToStr(defaultTimes.start))
  const [endStr, setEndStr] = useState(() => editingEvent ? tsToStr(editingEvent.endTime) : tsToStr(defaultTimes.end))
  const [color, setColor] = useState<EventColor>(editingEvent?.color ?? defaultColor)
  const [desc, setDesc] = useState(editingEvent?.description ?? '')
  const [location, setLocation] = useState(editingEvent?.location ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { requestAnimationFrame(() => titleRef.current?.focus()) }, [])

  const trimmed = title.trim()

  const weekdayNames = useMemo(() => ['周日', '周一', '周二', '周三', '周四', '周五', '周六'], [])
  const dateHeader = useMemo(() => {
    const d = new Date(today)
    return `${d.getMonth() + 1}月${d.getDate()}日 ${weekdayNames[d.getDay()]} · ${startStr}–${endStr}`
  }, [today, startStr, endStr, weekdayNames])

  const categoryLabels = useMemo(() => ({
    accent: { zh: '主要矛盾', en: 'Core' },
    sage: { zh: '次要矛盾', en: 'Tasks' },
    sand: { zh: '庶务时间', en: 'Chores' },
    sky: { zh: '个人提升', en: 'Growth' },
    rose: { zh: '休息娱乐', en: 'Leisure' },
    stone: { zh: '睡眠时长', en: 'Sleep' },
  } as const), [])
  const timeErr = startStr && endStr
    ? (() => {
        const s = strToTs(today, startStr); const e = strToTs(today, endStr)
        if (isNaN(s) || isNaN(e)) return t('无效时间', 'Invalid time')
        if (e <= s) return t('结束必须在开始之后', 'End must be after start')
        return null
      })()
    : null
  const canSave = trimmed.length > 0 && timeErr === null && !saving

  // Full save — create (create mode) or update (edit mode)
  const doFullSave = useCallback(async () => {
    if (!canSave) return
    setSaving(true); setError(null)
    try {
      if (isEditing && onUpdate && editingEvent) {
        await onUpdate({
          id: editingEvent.id,
          title: trimmed,
          startTime: strToTs(today, startStr),
          endTime: strToTs(today, endStr),
          color, categoryId: color,
          description: desc.trim() || undefined,
          location: location.trim() || undefined,
        })
      } else {
        await onSave({
          title: trimmed, startTime: strToTs(today, startStr),
          endTime: strToTs(today, endStr), color, categoryId: color,
          description: desc.trim() || undefined, location: location.trim() || undefined,
        })
      }
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('保存失败', 'Save failed'))
    } finally { setSaving(false) }
  }, [canSave, isEditing, editingEvent, onUpdate, trimmed, startStr, endStr, color, desc, location, today, onSave, onClose, t])

  const handleDelete = useCallback(() => {
    if (editingEvent && onDelete) {
      onDelete(editingEvent.id)
      onClose()
    }
  }, [editingEvent, onDelete, onClose])

  const handleTitleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    // Enter: full save (Shift+Enter would just be a regular character in a single-line input)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doFullSave()
    }
  }, [doFullSave])

  // Arrow key navigation within the category button group
  const handleCategoryKeyDown = useCallback((e: React.KeyboardEvent, currentIdx: number) => {
    const cols = 3
    let next = -1
    if (e.key === 'ArrowRight') next = currentIdx + 1
    else if (e.key === 'ArrowLeft') next = currentIdx - 1
    else if (e.key === 'ArrowDown') next = currentIdx + cols
    else if (e.key === 'ArrowUp') next = currentIdx - cols
    else return // not an arrow key

    e.preventDefault()
    if (next >= 0 && next < EVENT_COLORS.length) {
      // Focus the next button in the DOM
      const buttons = (e.currentTarget as HTMLElement).closest('[data-category-grid]')
        ?.querySelectorAll<HTMLButtonElement>('[data-category-btn]')
      if (buttons && buttons[next]) buttons[next].focus()
    }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const target = e.target as HTMLElement
    const inInput = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement

    // Number keys 1-6: select category (only when NOT in a text input)
    if (e.key >= '1' && e.key <= '6' && !e.altKey && !e.ctrlKey && !e.metaKey && !inInput) {
      e.preventDefault()
      const idx = Number(e.key) - 1
      if (EVENT_COLORS[idx]) setColor(EVENT_COLORS[idx])
      return
    }

    // Alt+1..6: always works (backup)
    if (e.altKey && e.key >= '1' && e.key <= '6') {
      e.preventDefault()
      const idx = Number(e.key) - 1
      if (EVENT_COLORS[idx]) setColor(EVENT_COLORS[idx])
      return
    }

    // Enter in textarea: save
    if (e.key === 'Enter' && !e.shiftKey && inInput && target instanceof HTMLTextAreaElement) {
      e.preventDefault()
      doFullSave()
      return
    }

    // Escape: close
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
      return
    }

    // Tab: focus trap within the dialog
    if (e.key === 'Tab') {
      // First check if Radix built-in trap already handles this — the event
      // will only reach us if Radix didn't consume it.
      const container = e.currentTarget
      const focusable = container.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
  }, [doFullSave, onClose])

  return (
    <DialogContent className="min-w-[420px] max-w-[480px] p-0 gap-0 [&>.absolute]:hidden" onKeyDown={handleKeyDown}>
      <DialogTitle className="sr-only">{t('快速记录', 'Quick Log')}</DialogTitle>

      {/* Title bar */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3">
        <div>
          <p className="font-sans text-sm font-semibold text-text-primary leading-tight">
            {isEditing ? t('编辑事件', 'Edit Event') : t('新建事件', 'New Event')}
          </p>
          <p className="font-sans text-xs text-text-secondary mt-0.5">{dateHeader}</p>
        </div>
        <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer" aria-label={t('关闭', 'Close')}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 2l10 10M12 2l-10 10"/></svg>
        </button>
      </div>

      <div className="h-px bg-border-subtle mx-6" />

      <div className="px-6 pt-4 pb-4 flex flex-col gap-4">
        {/* Event name */}
        <div className="flex flex-col gap-1.5">
          <label className="font-sans text-sm font-medium text-text-primary">{t('你在做什么？', 'What are you doing?')}</label>
          <input ref={titleRef} value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleTitleKeyDown}
            placeholder={t('输入事件名…', 'Enter event name…')}
            className="w-full font-serif text-[17px] text-text-primary bg-transparent border-0 outline-none placeholder:text-text-tertiary"
          />
        </div>

        {/* Time inputs */}
        <div className="flex items-center gap-2">
          <input type="time" value={startStr}
            onChange={(e) => { setStartStr(e.target.value); setError(null) }}
            className={timeCls} aria-label={t('开始时间', 'Start time')} />
          <span className="text-text-tertiary text-xs font-sans">{t('至', 'to')}</span>
          <input type="time" value={endStr}
            onChange={(e) => { setEndStr(e.target.value); setError(null) }}
            className={timeCls} aria-label={t('结束时间', 'End time')} />
        </div>
        {timeErr && trimmed.length > 0 && (
          <p className="text-xs text-color-text-danger -mt-2 font-sans">{timeErr}</p>
        )}

        {/* Category grid: 2×3 */}
        <div className="flex flex-col gap-2">
          <span className="font-sans text-xs text-text-tertiary tracking-wide">{t('分类', 'Category')}</span>
          <div className="grid grid-cols-3 gap-2" data-category-grid>
            {EVENT_COLORS.map((c, i) => {
              const sel = c === color
              const label = categoryLabels[c]
              return (
                <button key={c}
                  data-category-btn
                  onClick={() => setColor(c)}
                  onKeyDown={(e) => handleCategoryKeyDown(e, i)}
                  className={cn(
                    'relative h-9 rounded-md flex items-center gap-2 px-2.5 cursor-pointer transition-all duration-200 font-sans text-sm',
                    sel
                      ? 'text-white'
                      : 'text-text-secondary hover:brightness-95',
                  )}
                  style={{ backgroundColor: sel ? `var(--event-${c}-text)` : `var(--event-${c}-bg)` }}
                >
                  {/* Color dot */}
                  <span className={cn(
                    'w-2.5 h-2.5 rounded-full flex-shrink-0',
                    sel && 'bg-white/70'
                  )} style={{ backgroundColor: sel ? undefined : `var(--event-${c}-fill)` }} />
                  {/* Label */}
                  <span className="flex-1 text-left truncate leading-none">{t(label.zh, label.en)}</span>
                  {/* Number badge */}
                  <span className={cn(
                    'font-mono text-[10px] leading-none',
                    sel ? 'text-white/50' : 'text-text-quaternary'
                  )}>{i + 1}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Notes & Location (always visible) */}
        <div className="flex flex-col gap-3">
          <label className="font-sans text-xs text-text-tertiary">{t('添加备注 (可选)', 'Notes (optional)')}</label>
          <textarea ref={descRef} value={desc} rows={2}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={t('备注…', 'A quick note…')}
            className={cn(fieldCls, 'resize-none')} />
          <input value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('地点…', 'Location…')} className={fieldCls} />
        </div>
      </div>

      <div className="h-px bg-border-subtle" />

      {/* Footer */}
      <div className="flex items-center justify-end gap-2 px-6 pt-3 pb-5">
        {error && <p className="text-xs text-color-text-danger font-sans flex-1">{error}</p>}
        {isEditing && (
          <button onClick={handleDelete} disabled={saving}
            className="font-sans text-xs font-normal text-color-text-danger hover:text-color-text-danger/80 px-2 py-2 rounded-md cursor-pointer transition-colors duration-200 disabled:opacity-40"
          >{t('删除', 'Delete')}</button>
        )}
        <div className="flex-1" />
        <button onClick={onClose} disabled={saving}
          className="font-sans text-sm font-normal text-text-secondary bg-surface-sunken rounded-md px-4 py-2 cursor-pointer hover:bg-border-subtle transition-colors duration-200 disabled:opacity-40"
        >{t('取消', 'Cancel')}</button>
        <button onClick={doFullSave} disabled={!canSave}
          className="font-sans text-sm font-medium text-white bg-accent rounded-md px-5 py-2 cursor-pointer hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
        >{saving ? t('保存中…', 'Saving…') : (isEditing ? t('保存修改', 'Save') : t('保存', 'Save'))}</button>
      </div>
    </DialogContent>
  )
}

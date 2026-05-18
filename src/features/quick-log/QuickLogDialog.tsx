import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { DefaultTimes } from '@/domain/quickLog'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import type { CreateEventInput } from '@/domain/event'

function tsToStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function strToTs(date: Date, s: string): number {
  const [h, m] = s.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m, 0, 0).getTime()
}

const timeCls =
  'flex-1 font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-2.5 py-2 focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150'

const fieldCls =
  'w-full font-sans text-sm text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-3 py-2 focus:border-border-default focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent transition-colors duration-150 placeholder:text-text-tertiary'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultTimes: DefaultTimes
  defaultColor: EventColor
  onSave: (input: CreateEventInput) => Promise<string>
  onUpdate?: (id: string, description: string, location: string) => Promise<void>
}

export function QuickLogDialog({
  open, onOpenChange, defaultTimes, defaultColor, onSave, onUpdate,
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
        onUpdate={onUpdate}
        onClose={() => onOpenChange(false)}
        t={t}
        today={today}
      />
    </Dialog>
  )
}

function Form({
  defaultTimes, defaultColor, onSave, onUpdate, onClose, t, today,
}: {
  defaultTimes: DefaultTimes
  defaultColor: EventColor
  onSave: (input: CreateEventInput) => Promise<string>
  onUpdate?: (id: string, description: string, location: string) => Promise<void>
  onClose: () => void
  t: (zh: string, en: string) => string
  today: Date
}) {
  const [title, setTitle] = useState('')
  const [startStr, setStartStr] = useState(() => tsToStr(defaultTimes.start))
  const [endStr, setEndStr] = useState(() => tsToStr(defaultTimes.end))
  const [color, setColor] = useState<EventColor>(defaultColor)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [desc, setDesc] = useState('')
  const [location, setLocation] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eventId, setEventId] = useState<string | null>(null) // set after first save

  const titleRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { requestAnimationFrame(() => titleRef.current?.focus()) }, [])

  const trimmed = title.trim()
  const timeErr = startStr && endStr
    ? (() => {
        const s = strToTs(today, startStr); const e = strToTs(today, endStr)
        if (isNaN(s) || isNaN(e)) return t('无效时间', 'Invalid time')
        if (e <= s) return t('结束必须在开始之后', 'End must be after start')
        return null
      })()
    : null
  const canSave = trimmed.length > 0 && timeErr === null && !saving

  // Phase 1: create event on title Enter, keep dialog open, focus desc
  const doCreate = useCallback(async () => {
    if (!canSave) return
    setSaving(true); setError(null)
    try {
      const id = await onSave({
        title: trimmed, startTime: strToTs(today, startStr),
        endTime: strToTs(today, endStr), color, categoryId: color,
        description: undefined, location: undefined,
      })
      setEventId(id)
      // Open details and focus description
      setDetailsOpen(true)
      requestAnimationFrame(() => descRef.current?.focus())
    } catch (err) {
      setError(err instanceof Error ? err.message : t('保存失败', 'Save failed'))
    } finally { setSaving(false) }
  }, [canSave, trimmed, startStr, endStr, color, today, onSave, t])

  // Phase 2: update description and close
  const doUpdateAndClose = useCallback(async () => {
    if (eventId && onUpdate) {
      try {
        await onUpdate(eventId, desc.trim(), location.trim())
      } catch { /* ignore */ }
    }
    onClose()
  }, [eventId, onUpdate, desc, location, onClose])

  // Full save (from button click) — create with all fields
  const doFullSave = useCallback(async () => {
    if (!canSave) return
    setSaving(true); setError(null)
    try {
      await onSave({
        title: trimmed, startTime: strToTs(today, startStr),
        endTime: strToTs(today, endStr), color, categoryId: color,
        description: desc.trim() || undefined, location: location.trim() || undefined,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : t('保存失败', 'Save failed'))
    } finally { setSaving(false) }
  }, [canSave, trimmed, startStr, endStr, color, desc, location, today, onSave, onClose, t])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.altKey && e.key >= '1' && e.key <= '6') {
      e.preventDefault()
      const idx = Number(e.key) - 1
      if (EVENT_COLORS[idx]) setColor(EVENT_COLORS[idx])
    } else if (e.key === 'Enter' && !e.shiftKey) {
      if (e.target instanceof HTMLTextAreaElement) {
        // Enter in description: update and close
        e.preventDefault()
        doUpdateAndClose()
      } else {
        // Enter in title: create and focus description
        e.preventDefault()
        if (eventId) {
          // Already created, just update and close
          doUpdateAndClose()
        } else {
          doCreate()
        }
      }
    } else if (e.key === 'Escape') {
      // Esc always closes; if event was created, it stays
      if (eventId) {
        doUpdateAndClose()
      } else {
        onClose()
      }
    }
  }, [doCreate, doUpdateAndClose, eventId, onClose])

  return (
    <DialogContent className="max-w-md p-0 gap-0" onKeyDown={handleKeyDown}>
      <DialogTitle className="sr-only">{t('快速记录', 'Quick Log')}</DialogTitle>
      <div className="px-6 pt-6 pb-4 flex flex-col gap-4">
        <input ref={titleRef} value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t('你在做什么？', 'What were you doing?')}
          className="w-full font-serif text-[17px] text-text-primary bg-transparent border-0 outline-none placeholder:text-text-tertiary"
        />
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
        <div className="flex items-center gap-1.5">
          {EVENT_COLORS.map((c, i) => {
            const sel = c === color
            return (
              <button key={c} onClick={() => setColor(c)} title={`Alt+${i + 1}`}
                className={cn(
                  'w-7 h-7 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-200',
                  sel ? 'ring-1 ring-inset ring-offset-1' : 'hover:scale-110',
                )}
                style={{ backgroundColor: sel ? `var(--event-${c}-bg)` : `var(--event-${c}-fill)` }}
              >
                {sel && (
                  <span className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: `var(--event-${c}-fill)` }} />
                )}
              </button>
            )
          })}
          <span className="ml-2 font-mono text-[10px] text-text-tertiary tracking-wider">Alt+1..6</span>
        </div>
      </div>
      <div className="h-px bg-border-subtle" />
      <button onClick={() => setDetailsOpen(!detailsOpen)}
        className="w-full flex items-center gap-2 px-6 py-2.5 font-sans text-xs text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer"
      >
        <span className={cn('transition-transform duration-200', detailsOpen && 'rotate-90')}>▸</span>
        {t('详情', 'Details')}
      </button>
      <div style={{ maxHeight: detailsOpen ? '200px' : '0px', overflow: 'hidden', transition: 'max-height 200ms ease-out' }}>
        <div className="px-6 pb-4 flex flex-col gap-3">
          <textarea ref={descRef} value={desc} rows={2}
            onChange={(e) => setDesc(e.target.value)}
            placeholder={t('备注…', 'A quick note…')}
            className={cn(fieldCls, 'resize-none')} />
          <input value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t('地点…', 'Location…')} className={fieldCls} />
        </div>
      </div>
      <div className="flex items-center justify-between px-6 pb-5 pt-3">
        <div className="flex-1">
          {error && <p className="text-xs text-color-text-danger font-sans">{error}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <button onClick={onClose} disabled={saving}
            className="font-sans text-sm font-normal text-text-secondary bg-transparent border border-border-subtle rounded-md px-4 py-2 cursor-pointer hover:bg-surface-sunken transition-colors duration-200 disabled:opacity-40"
          >{t('取消', 'Cancel')}</button>
          <button onClick={doFullSave} disabled={!canSave}
            className="font-sans text-sm font-medium text-white bg-accent border-none rounded-md px-5 py-2 cursor-pointer hover:bg-accent-hover transition-colors duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
          >{saving ? t('保存中…', 'Saving…') : t('记录', 'Log it')}</button>
        </div>
      </div>
    </DialogContent>
  )
}

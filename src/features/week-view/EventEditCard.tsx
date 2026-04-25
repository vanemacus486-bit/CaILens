import { useEffect, useRef, useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { CalendarEvent, EventColor, UpdateEventInput } from '@/domain/event'
import { isSameDay } from '@/domain/time'
import type { DraftPreview } from './types'

// ── Constants ─────────────────────────────────────────────

const COLORS: EventColor[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

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
  onClose:        () => void   // called after save or delete-then-close
  onCancel:       () => void   // called on Esc (discard or delete-if-new)
  onDraftChange:  (draft: DraftPreview | null) => void
}

export function EventEditCard({
  event, anchorEl, isNewlyCreated,
  onSave, onDelete, onClose, onCancel, onDraftChange,
}: EventEditCardProps) {
  const localDate = new Date(event.startTime)

  const [title, setTitle]       = useState(event.title)
  const [startStr, setStartStr] = useState(tsToStr(event.startTime))
  const [endStr, setEndStr]     = useState(tsToStr(event.endTime))
  const [color, setColor]       = useState<EventColor>(event.color)
  const [desc, setDesc]         = useState(event.description ?? '')
  const [loc, setLoc]           = useState(event.location ?? '')
  const [error, setError]       = useState<string | null>(null)

  const titleRef   = useRef<HTMLInputElement>(null)
  const virtualRef = useRef<HTMLElement | null>(null)
  virtualRef.current = anchorEl

  // Autofocus + select title on open
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      titleRef.current?.focus()
      titleRef.current?.select()
    })
    return () => cancelAnimationFrame(raf)
  }, [])

  // Clear draft when unmounting
  useEffect(() => () => onDraftChange(null), [onDraftChange])

  // Send initial draft
  useEffect(() => {
    pushDraft(tsToStr(event.startTime), tsToStr(event.endTime), event.color, localDate, onDraftChange)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Save / discard logic ──────────────────────────────

  const doSave = () => {
    onSave({
      id:          event.id,
      title:       title.trim(),
      startTime:   strToTs(localDate, startStr),
      endTime:     strToTs(localDate, endStr),
      color,
      description: desc.trim() || undefined,
      location:    loc.trim()  || undefined,
    })
  }

  // Called when clicking outside (auto-save path)
  const handleClose = () => {
    if (title.trim() === '') {
      onDelete()   // fire-and-forget (store updates async)
    } else {
      const err = getError(startStr, endStr, localDate)
      if (err) { setError(err); return }  // keep open
      doSave()
    }
    onClose()
  }

  // Called on Esc (discard path)
  const handleCancel = () => {
    if (isNewlyCreated) onDelete()  // discard: remove the just-created stub
    onCancel()
  }

  // ── Draft updates ────────────────────────────────────

  const handleStart = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value; setStartStr(s); setError(null)
    pushDraft(s, endStr, color, localDate, onDraftChange)
  }
  const handleEnd = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = e.target.value; setEndStr(s); setError(null)
    pushDraft(startStr, s, color, localDate, onDraftChange)
  }
  const handleColor = (c: EventColor) => {
    setColor(c); pushDraft(startStr, endStr, c, localDate, onDraftChange)
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

          {/* Colour picker */}
          <div className="flex gap-1.5 items-center">
            {COLORS.map((c) => (
              <button
                key={c} onClick={() => handleColor(c)} aria-label={c}
                className={cn(
                  'w-5 h-5 rounded-full border-2 transition-transform duration-150 flex-shrink-0',
                  color === c ? 'scale-125' : 'border-transparent scale-100',
                )}
                style={{
                  backgroundColor: `var(--event-${c}-bg)`,
                  borderColor: color === c ? `var(--event-${c}-text)` : 'transparent',
                }}
              />
            ))}
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

          {/* Delete (no confirmation needed in edit mode) */}
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

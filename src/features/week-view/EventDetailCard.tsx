import { useRef, useState } from 'react'
import { MapPin, Trash2, Pencil } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import type { CalendarEvent } from '@/domain/event'

interface EventDetailCardProps {
  event:    CalendarEvent
  anchorEl: HTMLElement
  onEdit:   () => void
  onDelete: () => void
  onClose:  () => void
}

const WEEKDAYS = ['日', '一', '二', '三', '四', '五', '六']

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDateLine(startTs: number, endTs: number): string {
  const s = new Date(startTs)
  const e = new Date(endTs)
  const datePart = `${s.getMonth() + 1}月${s.getDate()}日 星期${WEEKDAYS[s.getDay()]}`
  const sameDay = s.getFullYear() === e.getFullYear() && s.getMonth() === e.getMonth() && s.getDate() === e.getDate()
  if (sameDay) {
    return `${datePart} · ${fmtTime(startTs)} – ${fmtTime(endTs)}`
  }
  return `${datePart} ${fmtTime(startTs)} – ${e.getMonth() + 1}月${e.getDate()}日 ${fmtTime(endTs)}`
}

export function EventDetailCard({ event, anchorEl, onEdit, onDelete, onClose }: EventDetailCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl

  const isEmpty = !event.title.trim()

  return (
    <>
      <Popover open>
        <PopoverAnchor virtualRef={virtualRef} />

        <PopoverContent
          side="right"
          className="w-64 p-0 max-md:!w-[calc(100vw-1rem)] max-md:max-w-64 overflow-hidden"
          onPointerDownOutside={onClose}
          onEscapeKeyDown={onClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-4 flex flex-col gap-2.5">
            {/* Title row: color dot + title + icon actions */}
            <div className="flex items-start gap-2.5">
              <span
                className="w-3 h-3 rounded-sm flex-shrink-0 mt-[3px]"
                style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
              />
              <p className={`flex-1 text-[16px] font-serif leading-snug min-w-0 ${isEmpty ? 'text-text-tertiary italic' : 'text-text-primary font-medium'}`}>
                {isEmpty ? '(无标题)' : event.title}
              </p>
              <div className="flex items-center gap-0.5 flex-shrink-0 -mt-0.5 -mr-1">
                <button
                  onClick={onEdit}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors"
                  title="编辑"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setShowConfirm(true)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-color-text-danger hover:bg-surface-sunken transition-colors"
                  title="删除"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* Date / time */}
            <p className="text-[12px] text-text-secondary font-sans leading-relaxed pl-[22px]">
              {fmtDateLine(event.startTime, event.endTime)}
            </p>

            {/* Description */}
            {event.description && (
              <p className="text-[13px] text-text-secondary line-clamp-3 font-sans leading-relaxed pl-[22px]">
                {event.description}
              </p>
            )}

            {/* Location */}
            {event.location && (
              <div className="flex items-start gap-1.5 text-xs text-text-secondary pl-[22px]">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-text-tertiary" />
                <span className="line-clamp-1">{event.location}</span>
              </div>
            )}
          </div>
        </PopoverContent>
      </Popover>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除事件？</AlertDialogTitle>
            <AlertDialogDescription>
              {isEmpty
                ? '此事件将被永久删除。'
                : `"${event.title}" 将被永久删除。`
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-color-text-danger text-white"
            >
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

import { useRef, useState } from 'react'
import { MapPin, Trash2, Pencil } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/domain/event'

interface EventDetailCardProps {
  event:    CalendarEvent
  anchorEl: HTMLElement
  onEdit:   () => void
  onDelete: () => void
  onClose:  () => void
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function EventDetailCard({ event, anchorEl, onEdit, onDelete, onClose }: EventDetailCardProps) {
  const [showConfirm, setShowConfirm] = useState(false)

  // Stable ref pointing to the anchor element — Radix reads this for positioning.
  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl

  const isEmpty = !event.title.trim()

  const d = new Date(event.startTime)
  const dateStr = `${d.getMonth() + 1}月${d.getDate()}日`
  const weekdayStr = d.toLocaleDateString('zh-CN', { weekday: 'long' })

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
          <div className="flex">
            {/* Colored accent strip — matches event category color */}
            <div
              className="w-1 flex-shrink-0"
              style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
            />

            <div className="flex-1 p-4 flex flex-col gap-3">
              {/* Title */}
              <p className={`text-[16px] font-serif leading-snug ${isEmpty ? 'text-text-tertiary italic' : 'text-text-primary font-medium'}`}>
                {isEmpty ? '(无标题)' : event.title}
              </p>

              {/* Date + Weekday — e.g. "3月15日 星期六" */}
              <p className="text-[13px] text-text-secondary font-sans leading-none">
                {dateStr} {weekdayStr}
              </p>

              {/* Time range — start | end in mono */}
              <div className="flex items-baseline gap-1.5">
                <span className="font-mono text-sm font-semibold text-accent tabular-nums tracking-tight">
                  {fmtTime(event.startTime)}
                </span>
                <span className="text-text-tertiary text-xs">–</span>
                <span className="font-mono text-sm text-text-secondary tabular-nums tracking-tight">
                  {fmtTime(event.endTime)}
                </span>
              </div>

              {/* Description */}
              {event.description && (
                <p className="text-sm text-text-secondary line-clamp-3 font-sans leading-relaxed">
                  {event.description}
                </p>
              )}

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-1.5 text-xs text-text-secondary">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-text-tertiary" />
                  <span className="line-clamp-1">{event.location}</span>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-border-subtle">
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowConfirm(true)}
                  className="text-color-text-danger hover:bg-surface-sunken gap-1.5 px-2 h-8"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  删除
                </Button>

                <Button variant="default" size="sm" onClick={onEdit} className="h-8 gap-1.5">
                  <Pencil className="h-3.5 w-3.5" />
                  编辑
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete confirmation — rendered outside Popover to avoid z-index issues */}
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

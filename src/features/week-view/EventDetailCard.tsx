import { useRef, useState } from 'react'
import { MapPin, Trash2 } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/domain/event'
import { useAppSettingsStore } from '@/stores/settingsStore'

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
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const [showConfirm, setShowConfirm] = useState(false)

  // Stable ref pointing to the anchor element — Radix reads this for positioning.
  // useRef<HTMLElement>(null!) avoids union with null so the type matches
  // Radix's RefObject<Measurable>. The initial value is never read before assignment.
  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl

  const isEmpty = !event.title.trim()

  return (
    <>
      <Popover open>
        {/* virtualRef positions the Popover relative to the event block */}
        <PopoverAnchor virtualRef={virtualRef} />

        <PopoverContent
          side="right"
          className="w-64 p-0 max-md:!w-[calc(100vw-1rem)] max-md:max-w-64"
          onPointerDownOutside={onClose}
          onEscapeKeyDown={onClose}
          // Prevent Radix from auto-closing (we handle it ourselves)
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="p-4 flex flex-col gap-2.5">
            {/* Title */}
            <p className={`text-base font-serif leading-snug ${isEmpty ? 'text-text-tertiary italic' : 'text-text-primary'}`}>
              {isEmpty ? t('(无标题)', '(Untitled)') : event.title}
            </p>

            {/* Time */}
            <p className="text-xs text-text-secondary font-mono">
              {fmtTime(event.startTime)} – {fmtTime(event.endTime)}
            </p>

            {/* Colour dot */}
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0"
                style={{ backgroundColor: `var(--event-${event.color}-text)` }}
              />
              <span className="text-xs text-text-tertiary capitalize font-sans">{event.color}</span>
            </div>

            {/* Notes */}
            {event.description && (
              <p className="text-sm text-text-secondary line-clamp-2 font-sans leading-snug">
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
            <div className="flex items-center justify-between pt-2 border-t border-border-subtle mt-0.5">
              <Button
                variant="ghost" size="sm"
                onClick={() => setShowConfirm(true)}
                className="text-rose-500 hover:text-rose-600 hover:bg-rose-50 gap-1.5 px-2 h-8"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('删除', 'Delete')}
              </Button>
              <Button variant="default" size="sm" onClick={onEdit} className="h-8">
                {t('编辑', 'Edit')}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Delete confirmation — rendered outside Popover to avoid z-index issues */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('删除事件？', 'Delete event?')}</AlertDialogTitle>
            <AlertDialogDescription>
              {isEmpty
                ? t('此事件将被永久删除。', 'This event will be permanently deleted.')
                : t(`"${event.title}" 将被永久删除。`, `"${event.title}" will be permanently deleted.`)
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('取消', 'Cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-rose-500 hover:bg-rose-600 text-white"
            >
              {t('删除', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

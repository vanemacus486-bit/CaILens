import { useRef, useState } from 'react'
import { MapPin, Trash2, Sparkles } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { CalendarEvent } from '@/domain/event'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useAiChatStore } from '@/stores/aiChatStore'
import { useUIStore } from '@/stores/uiStore'

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
          <div className="flex">
            {/* Colored accent strip */}
            <div
              className="w-[3px] flex-shrink-0"
              style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
            />

            <div className="flex-1 p-4 flex flex-col gap-3">
              {/* Title */}
              <p className={`text-[16px] font-serif leading-snug ${isEmpty ? 'text-text-tertiary italic' : 'text-text-primary'}`}>
                {isEmpty ? t('(无标题)', '(Untitled)') : event.title}
              </p>

              {/* Time */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm text-accent font-medium tracking-tight">
                  {fmtTime(event.startTime)}
                </span>
                <span className="text-text-tertiary text-xs">–</span>
                <span className="font-mono text-sm text-text-secondary tracking-tight">
                  {fmtTime(event.endTime)}
                </span>
              </div>

              {/* Colour indicator — dot + label */}
              <div className="flex items-center gap-1.5">
                <span
                  className="inline-block w-2 h-2 rounded-full flex-shrink-0"
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
              <div className="flex items-center justify-between pt-2.5 border-t border-border-subtle mt-0.5">
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => setShowConfirm(true)}
                    className="text-color-text-danger hover:bg-surface-sunken gap-1.5 px-2 h-8"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t('删除', 'Delete')}
                  </Button>
                  <Button
                    variant="ghost" size="sm"
                    onClick={() => {
                      useAiChatStore.getState().addCalendarContext([{
                        id: event.id,
                        type: 'event',
                        eventId: event.id,
                        eventTitle: event.title || undefined,
                        startTime: event.startTime,
                        endTime: event.endTime,
                        categoryId: event.color,
                      }])
                      useUIStore.getState().setAiChatDrawerOpen(true)
                    }}
                    className="text-text-secondary hover:bg-surface-sunken gap-1.5 px-2 h-8"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    {t('AI', 'Ask AI')}
                  </Button>
                </div>
                <Button variant="default" size="sm" onClick={onEdit} className="h-8">
                  {t('编辑', 'Edit')}
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
              className="bg-color-text-danger text-white"
            >
              {t('删除', 'Delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

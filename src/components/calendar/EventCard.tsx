import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'

export interface EventCardProps {
  event: CalendarEvent
  category?: Category
  /** Compact mobile variant */
  compact?: boolean
  /** Hover state for extra actions */
  hovered?: boolean
  onNotes?: () => void
}

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtShortDuration(ms: number): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + 'h'
  return Math.round(ms / 60_000) + 'm'
}

function catFill(cat: Category | undefined): string {
  if (!cat) return 'var(--text-tertiary)'
  if (cat.id === 'stone') return 'var(--cat-sleep)'
  return `var(--event-${cat.id}-fill)`
}

/** Shared event card — desktop or compact mobile variant */
export function EventCard({ event, category, compact, hovered, onNotes }: { event: CalendarEvent; category?: Category; language?: 'zh' | 'en'; compact?: boolean; hovered?: boolean; onNotes?: () => void }) {
  const hasNotes = !!event.description?.trim()
  const displayStart = event.startTime
  const displayEnd = Math.min(event.endTime, event.startTime + 86_400_000)
  const durationMs = displayEnd - displayStart

  if (compact) {
    // Mobile compact card
    return (
      <div
        className={cn(
          'flex items-start gap-3 py-2.5 border-b border-border-subtle last:border-b-0',
          hovered && 'bg-surface-sunken/40',
        )}
      >
        <div className="flex-shrink-0 w-14 text-right pt-0.5">
          <span className="font-mono text-xs text-text-secondary">{fmtTime(displayStart)}</span>
          <span className="font-mono text-xs-alt text-text-tertiary block">{fmtTime(displayEnd)}</span>
        </div>

        <div className="flex-shrink-0 pt-1.5">
          <span className="w-2 h-2 rounded-full block" style={{ backgroundColor: catFill(category) }} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-serif text-sm text-text-primary leading-snug">
            {event.title || <span className="opacity-50 italic text-text-tertiary">无标题</span>}
          </p>
          {event.description && (
            <p className="font-serif text-xs-alt text-text-secondary italic mt-0.5 leading-relaxed line-clamp-2">
              {event.description}
            </p>
          )}
        </div>

        <div className="flex-shrink-0 w-1 self-stretch rounded-full ml-1" style={{ backgroundColor: catFill(category) }} />
      </div>
    )
  }

  // Desktop card
  return (
    <div
      className={cn(
        'group py-2.5 px-2 -mx-2 rounded-lg transition-colors duration-150 cursor-pointer',
        hovered ? 'bg-surface-sunken/60' : 'hover:bg-surface-sunken/30',
      )}
      onMouseEnter={onNotes}
      onMouseLeave={() => {}}
    >
      <div className="flex items-baseline gap-2 pl-2">
        {/* Time range */}
        <span className="font-mono text-[13px] font-medium text-text-secondary tabular-nums">
          {fmtTime(displayStart)} – {fmtTime(displayEnd)}
        </span>

        {/* Duration */}
        <span className="font-mono text-[12px] text-text-tertiary ml-auto tabular-nums">
          · {fmtShortDuration(durationMs)}
        </span>
      </div>

      <div className="flex items-start gap-2 mt-0.5 pl-2">
        {/* Category accent */}
        <div className="w-[2px] rounded-full mt-0.5 flex-shrink-0" style={{ backgroundColor: catFill(category) }} />

        {/* Title + category label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-[15px] font-semibold text-text-primary leading-snug truncate">
              {event.title || <span className="italic font-normal opacity-50 text-text-tertiary">无标题</span>}
            </span>
            {category && (
              <span className="text-[10px] text-text-tertiary font-sans flex-shrink-0">
                {category.name}
              </span>
            )}
          </div>

          {/* Notes */}
          {hasNotes ? (
            <div className="font-serif text-[13px] text-text-secondary leading-[1.65] mt-2 whitespace-pre-wrap line-clamp-3 italic">
              {event.description}
            </div>
          ) : (
            <div className="font-serif text-[11px] text-text-tertiary/0 group-hover:text-text-tertiary/50 italic mt-1.5 transition-colors duration-200">
              添加备注…
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

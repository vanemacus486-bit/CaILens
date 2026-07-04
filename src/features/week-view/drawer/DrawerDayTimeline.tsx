/**
 * # DrawerDayTimeline — DayDrawer 日视图模式
 *
 * 竖向连接时间轴：事件按开始时间顺序排成一条线，圆形图标节点 + 虚线连接，
 * 节点间距不按时长比例。只读，无拖拽/新建/点击详情。
 * 仅当选中日期是今天时，额外插入一个"现在"标记行。
 */

import { useMemo } from 'react'
import { Moon, Utensils, Droplets } from 'lucide-react'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useCurrentTime } from '@/lib/hooks/useCurrentTime'
import { isEventOnDay, isToday } from '@/domain/time'
import type { CalendarEvent, EventColor } from '@/domain/event'
import { useT } from '@/i18n/useT'

// ── Color map ───────────────────────────────────────────

const COLOR_STYLE: Record<EventColor, { bg: string; text: string }> = {
  accent: { bg: 'var(--event-accent-bg)', text: 'var(--event-accent-text)' },
  sage:   { bg: 'var(--event-sage-bg)',   text: 'var(--event-sage-text)' },
  sand:   { bg: 'var(--event-sand-bg)',   text: 'var(--event-sand-text)' },
  sky:    { bg: 'var(--event-sky-bg)',    text: 'var(--event-sky-text)' },
  rose:   { bg: 'var(--event-rose-bg)',   text: 'var(--event-rose-text)' },
  stone:  { bg: 'var(--event-stone-bg)',  text: 'var(--event-stone-text)' },
}

// ── Icon by typed key ─────────────────────────────────────

function iconForEvent(typedKey: CalendarEvent['typedKey']): React.ReactNode {
  switch (typedKey) {
    case 'sleep':   return <Moon size={15} strokeWidth={1.75} />
    case 'meal':    return <Utensils size={15} strokeWidth={1.75} />
    case 'hygiene': return <Droplets size={15} strokeWidth={1.75} />
    default:        return null
  }
}

// ── Time formatting (matches DrawerHistoryArchive.tsx convention) ──

function formatClockTime(ts: number, language: string): string {
  return new Date(ts).toLocaleTimeString(
    language === 'zh' ? 'zh-CN' : 'en-US',
    { hour: '2-digit', minute: '2-digit', hour12: language !== 'zh' },
  )
}

// ── Empty state ─────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-8">
      <p className="font-serif text-sm text-text-tertiary italic">{message}</p>
    </div>
  )
}

// ── Row: single event node ───────────────────────────────

function EventRow({ event, language }: { event: CalendarEvent; language: string }) {
  const colors = COLOR_STYLE[event.color] ?? COLOR_STYLE.accent

  return (
    <div className="relative z-10 flex items-start gap-3">
      <div
        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: colors.bg, color: colors.text }}
      >
        {iconForEvent(event.typedKey)}
      </div>
      <div className="flex flex-col min-w-0 pt-1">
        <span className="text-[11px] font-mono text-text-tertiary tabular-nums leading-tight">
          {formatClockTime(event.startTime, language)}
        </span>
        <span className="text-sm font-medium text-text-primary leading-snug truncate">
          {event.title}
        </span>
      </div>
    </div>
  )
}

// ── Row: "now" marker ─────────────────────────────────────

function NowRow({ nowMs, language, label }: { nowMs: number; language: string; label: string }) {
  return (
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
      </div>
      <span className="text-[11px] font-mono text-accent tabular-nums">
        {label} {formatClockTime(nowMs, language)}
      </span>
    </div>
  )
}

// ── Main component ──────────────────────────────────────

interface DrawerDayTimelineProps {
  selectedDateMs: number
}

type TimelineEntry =
  | { kind: 'event'; event: CalendarEvent }
  | { kind: 'now' }

export function DrawerDayTimeline({ selectedDateMs }: DrawerDayTimelineProps) {
  const events = useEventStore((s) => s.events)
  const language = useAppSettingsStore((s) => s.settings.language)
  const now = useCurrentTime()
  const t = useT()

  const day = useMemo(() => new Date(selectedDateMs), [selectedDateMs])

  const dayEvents = useMemo(
    () =>
      events
        .filter((e) => isEventOnDay(e, day))
        .sort((a, b) => a.startTime - b.startTime),
    [events, day],
  )

  const showNow = isToday(selectedDateMs) && dayEvents.length > 0

  const entries = useMemo<TimelineEntry[]>(() => {
    const list: TimelineEntry[] = dayEvents.map((event) => ({ kind: 'event', event }))
    if (!showNow) return list
    const idx = dayEvents.findIndex((e) => e.startTime > now)
    const insertAt = idx === -1 ? list.length : idx
    list.splice(insertAt, 0, { kind: 'now' })
    return list
  }, [dayEvents, showNow, now])

  if (dayEvents.length === 0) {
    return <EmptyState message={t('dayDrawer.timelineEmpty')} />
  }

  return (
    <div className="px-5 pb-5">
      <div className="relative flex flex-col gap-5">
        <div className="absolute left-4 top-4 bottom-4 border-l border-dashed border-border-subtle pointer-events-none" />
        {entries.map((entry) =>
          entry.kind === 'event' ? (
            <EventRow key={entry.event.id} event={entry.event} language={language} />
          ) : (
            <NowRow key="now" nowMs={now} language={language} label={t('dayDrawer.now')} />
          ),
        )}
      </div>
    </div>
  )
}

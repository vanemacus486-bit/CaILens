import { useEffect, useMemo, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatWeekday, isToday, getWeekStart, formatISODate } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

// ── Helpers ──────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDuration(ms: number, language: 'zh' | 'en'): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + (language === 'zh' ? 'h' : 'h')
  const mins = Math.round(ms / 60_000)
  return `${mins}${language === 'zh' ? '分钟' : 'min'}`
}

function fmtShortDuration(ms: number): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + 'h'
  return Math.round(ms / 60_000) + 'm'
}

function fmtFullDate(date: Date, language: 'zh' | 'en'): string {
  const months = language === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return language === 'zh'
    ? `${date.getFullYear()}年${months[date.getMonth()]}${date.getDate()}日`
    : `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

// ── Category stack bar colours ───────────────────────────

function catFill(cat: Category | undefined): string {
  if (!cat) return 'var(--text-tertiary)'
  if (cat.id === 'stone') return '#7a9aaa'
  return `var(--event-${cat.id}-fill)`
}

function catBg(cat: Category | undefined): string {
  if (!cat) return 'var(--surface-sunken)'
  if (cat.id === 'stone') return '#e2e8ed'
  return `var(--event-${cat.id}-bg)`
}

function catText(cat: Category | undefined): string {
  if (!cat) return 'var(--text-tertiary)'
  if (cat.id === 'stone') return '#5a7a8a'
  return `var(--event-${cat.id}-text)`
}

// ═══════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════

interface DayEventStreamProps {
  dayStart: Date
  /** Called when the parent should navigate to a new day */
  onDayChange: (day: Date) => void
}

export function DayEventStream({ dayStart, onDayChange }: DayEventStreamProps) {
  const rangeEvents   = useEventStore((s) => s.rangeEvents)
  const loadRange     = useEventStore((s) => s.loadRange)
  const events        = useEventStore((s) => s.events) // week events for weekly avg
  const categories    = useCategoryStore((s) => s.categories)
  const language      = useAppSettingsStore((s) => s.settings.language)
    const navigate      = useNavigate()
    const dayStartMs = dayStart.getTime()
  const dayEndMs   = dayStartMs + 86_400_000

  // Load events for this day
  useEffect(() => {
    fireAndForget(loadRange(dayStartMs, dayEndMs), 'load day range')
  }, [dayStartMs, dayEndMs, loadRange])



  // ── Day events ──────────────────────────────────────────

  const dayEvents = useMemo(() => {
    return rangeEvents
      .filter((e) => e.startTime < dayEndMs && e.endTime > dayStartMs)
      .sort((a, b) => a.startTime - b.startTime)
  }, [rangeEvents, dayStartMs, dayEndMs])

  // ── Day stats ───────────────────────────────────────────

  const dayStats = useMemo(() => {
    if (dayEvents.length === 0) return null
    const totalMs = dayEvents.reduce((acc, e) => {
      const s = Math.max(e.startTime, dayStartMs)
      const en = Math.min(e.endTime, dayEndMs)
      return acc + Math.max(0, en - s)
    }, 0)

    // per-category time (deduplicated via computeWeekStats-like logic)
    // Use simple aggregation since events in a day rarely overlap
    const byCat = new Map<CategoryId, number>()
    for (const e of dayEvents) {
      const s = Math.max(e.startTime, dayStartMs)
      const en = Math.min(e.endTime, dayEndMs)
      const dur = Math.max(0, en - s)
      byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + dur)
    }

    return { totalMs, byCat }
  }, [dayEvents, dayStartMs, dayEndMs])

  // ── Weekly average (for comparison) ─────────────────────

  const weeklyAvgMs = useMemo(() => {
    if (events.length === 0) return null
    // Group events by day of the week
    const weekStart = dayStartMs - (dayStart.getDay() === 0 ? 6 : dayStart.getDay() - 1) * 86_400_000
    const weekEnd = weekStart + 7 * 86_400_000
    const dailyTotals: number[] = []
    for (let d = weekStart; d < weekEnd; d += 86_400_000) {
      const dayTotal = events
        .filter((e) => e.startTime < d + 86_400_000 && e.endTime > d)
        .reduce((acc, e) => acc + Math.max(0, Math.min(e.endTime, d + 86_400_000) - Math.max(e.startTime, d)), 0)
      if (dayTotal > 0) dailyTotals.push(dayTotal)
    }
    if (dailyTotals.length === 0) return null
    return dailyTotals.reduce((a, b) => a + b, 0) / dailyTotals.length
  }, [events, dayStartMs])

  // ── Hover state for "add note" ──────────────────────────

  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  const weekNum = getISOWeek(dayStart)
  const today = isToday(dayStartMs)

  // Inline ref for "back to today" scroll
  const streamRef = useRef<HTMLDivElement>(null)

  // ── Event click (placeholder for future use) ─────────────────
  const handleEventClick = (_event: CalendarEvent) => {
    // no-op for now
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div ref={streamRef} className="h-full overflow-y-auto py-6 px-3 md:px-7">
      {/* ═══════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════ */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-serif text-[26px] font-semibold text-text-primary tracking-[-0.02em] leading-tight">
            {formatWeekday(dayStart, 'long')}
          </div>
          <div className="font-serif text-[14px] text-text-secondary italic mt-1">
            {fmtFullDate(dayStart, language)}{' · '}{`第 ${weekNum} 周`}
          </div>
        </div>
        {/* Prev / Next day + week toggle */}
        <div className="flex gap-2 items-center flex-shrink-0">
          <button
            onClick={() => onDayChange(new Date(dayStartMs - 86_400_000))}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-2.5 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            ‹ {formatWeekday(new Date(dayStartMs - 86_400_000), 'short')}
          </button>
          {today ? (
            <span className="font-sans text-xs text-accent font-medium px-2.5 py-1">
              {'今天'}
            </span>
          ) : (
            <button
              onClick={() => onDayChange(new Date())}
              className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-2.5 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
            >
              {formatWeekday(new Date(), 'short')} ›
            </button>
          )}
          <div className="w-px h-4 bg-border-subtle mx-1" />
          <button
            onClick={() => {
              const weekStart = getWeekStart(dayStart, 1)
              navigate(`/?week=${formatISODate(weekStart)}`)
            }}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-2.5 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            {'周'}
          </button>

        </div>
      </div>

      {/* ═══════════════════════════════════════════════════
          DAY OVERVIEW
          ═══════════════════════════════════════════════════ */}
      {dayStats && dayEvents.length > 0 && (
        <div className="mb-8">
          {/* Big total */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[40px] font-light text-text-primary tracking-[-0.03em] leading-none">
              {(dayStats.totalMs / 3_600_000).toFixed(1)}
            </span>
            <span className="font-serif text-sm text-text-tertiary">
              {'小时'}
            </span>
          </div>

          {/* Subtitle */}
          <div className="font-serif text-[13px] text-text-secondary italic mt-1">
            {'有效投入 · 共 '}
            {dayEvents.length}
            {' 项记录'}
            {weeklyAvgMs !== null && (
              <>
                {' · '}
                {dayStats.totalMs > weeklyAvgMs ? (
                  <span className="text-[var(--color-text-positive)]">
                    ↑ {'高于周均'}
                  </span>
                ) : (
                  <span className="text-[var(--color-text-warning)]">
                    ↓ {'低于周均'}
                  </span>
                )}
                {' '}
                <span className="text-text-tertiary">
                  {fmtDuration(weeklyAvgMs, language)}
                </span>
              </>
            )}
          </div>

          {/* Category stack bar */}
          {dayStats.byCat.size > 0 && (
            <div className="mt-5">
              <div className="flex h-[6px] rounded-full overflow-hidden">
                {Array.from(dayStats.byCat.entries())
                  .sort(([, a], [, b]) => b - a)
                  .map(([catId, dur]) => {
                    const cat = categories.find((c) => c.id === catId)
                    const pct = (dur / dayStats!.totalMs) * 100
                    if (pct < 2) return null
                    return (
                      <div
                        key={catId}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: catFill(cat),
                          opacity: 0.7,
                        }}
                      />
                    )
                  })}
              </div>

              {/* Legend */}
              <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-3">
                {Array.from(dayStats.byCat.entries())
                  .sort(([, a], [, b]) => b - a)
                  .map(([catId, dur]) => {
                    const cat = categories.find((c) => c.id === catId)
                    if (!cat) return null
                    return (
                      <div key={catId} className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: catFill(cat) }}
                        />
                        <span className="font-sans text-[11px] text-text-secondary">
                          {cat.name[language]}
                        </span>
                        <span className="font-mono text-[10px] text-text-tertiary">
                          {fmtShortDuration(dur)}
                        </span>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════
          EVENT LIST
          ═══════════════════════════════════════════════════ */}
      {dayEvents.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="font-serif text-sm text-text-tertiary italic">
            {'这一天没有记录'}
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {dayEvents.map((event) => {
            const cat = categories.find((c) => c.id === event.categoryId)
            const isHovered = hoveredEventId === event.id
            const hasNotes = !!event.description?.trim()
            // Clamp to day boundaries for display
            const displayStart = Math.max(event.startTime, dayStartMs)
            const displayEnd = Math.min(event.endTime, dayEndMs)
            const displayDuration = displayEnd - displayStart

            return (
              <div
                key={event.id}
                data-event-id={event.id}
                data-event-category={event.categoryId}
                className={`group grid grid-cols-[52px_4px_1fr_48px] gap-x-3 py-2.5 px-2 -mx-2 rounded-lg transition-colors duration-150 cursor-pointer ${
                  isHovered ? 'bg-surface-sunken/60' : ''
                }`}
                onMouseEnter={() => setHoveredEventId(event.id)}
                onMouseLeave={() => setHoveredEventId(null)}
                onClick={() => handleEventClick(event)}
              >
                {/* ── Col 1: Time ── */}
                <div className="text-right pt-0.5">
                  <div className="font-mono text-[14px] font-medium text-text-primary leading-none">
                    {fmtTime(displayStart)}
                  </div>
                  <div className="font-mono text-[10px] text-text-tertiary leading-none mt-1">
                    {fmtTime(displayEnd)}
                  </div>
                </div>

                {/* ── Col 2: Color bar ── */}
                <div className="flex items-start pt-0.5">
                  <div
                    className="w-[4px] rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: catFill(cat),
                      height: hasNotes ? '100%' : '1.25rem',
                      minHeight: '20px',
                    }}
                  />
                </div>

                {/* ── Col 3: Event name + tag + notes ── */}
                <div className="min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="font-serif text-[15px] font-semibold text-text-primary truncate leading-snug">
                      {event.title || <span className="italic font-normal opacity-50 text-text-tertiary">{'无标题'}</span>}
                    </span>
                    {cat && (
                      <span
                        className="font-sans text-[9px] font-medium px-1.5 py-0.5 rounded-sm flex-shrink-0 leading-none mt-0.5"
                        style={{
                          backgroundColor: catBg(cat),
                          color: catText(cat),
                        }}
                      >
                        {cat.name[language]}
                      </span>
                    )}
                  </div>

                  {/* Notes */}
                  {hasNotes ? (
                    <div
                      className="font-serif text-[13px] text-text-secondary leading-[1.65] mt-2 whitespace-pre-wrap line-clamp-3"
                      style={{ fontStyle: 'italic' }}
                    >
                      {event.description}
                    </div>
                  ) : (
                    <div
                      className={`font-serif text-[11px] text-text-tertiary/0 group-hover:text-text-tertiary/50 italic mt-1.5 transition-colors duration-200 ${
                        isHovered ? 'text-text-tertiary/50' : ''
                      }`}
                    >
                      {'添加备注…'}
                    </div>
                  )}
                </div>

                {/* ── Col 4: Duration ── */}
                <div className="text-right pt-0.5">
                  <div className="font-mono text-[13px] text-text-secondary leading-none">
                    {fmtShortDuration(displayDuration)}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}


    </div>
  )
}

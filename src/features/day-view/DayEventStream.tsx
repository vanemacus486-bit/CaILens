import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getISOWeek } from 'date-fns'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatWeekday, isToday, getWeekStart, formatISODate } from '@/domain/time'
import type { Category, CategoryId } from '@/domain/category'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { EventCard } from '@/components/calendar/EventCard'

// ── Helpers ──────────────────────────────────────────────

function fmtShortDuration(ms: number): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + 'h'
  return Math.round(ms / 60_000) + 'm'
}

function fmtDuration(ms: number, language: 'zh' | 'en'): string {
  const hours = ms / 3_600_000
  if (hours >= 1) return hours.toFixed(1) + (language === 'zh' ? 'h' : 'h')
  const mins = Math.round(ms / 60_000)
  return `${mins}${language === 'zh' ? '分钟' : 'min'}`
}

function fmtFullDate(date: Date, language: 'zh' | 'en'): string {
  const months = language === 'zh'
    ? ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']
    : ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  return language === 'zh'
    ? `${date.getFullYear()}年${months[date.getMonth()]}${date.getDate()}日`
    : `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

function catFill(cat: Category | undefined): string {
  if (!cat) return 'var(--text-tertiary)'
  if (cat.id === 'stone') return 'var(--cat-sleep)'
  return `var(--event-${cat.id}-fill)`
}

// ── Component ────────────────────────────────────────────

interface DayEventStreamProps {
  dayStart: Date
  onDayChange: (day: Date) => void
}

export function DayEventStream({ dayStart, onDayChange }: DayEventStreamProps) {
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const loadRange = useEventStore((s) => s.loadRange)
  const events = useEventStore((s) => s.events) // week events for weekly avg
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const navigate = useNavigate()
  const dayStartMs = dayStart.getTime()
  const dayEndMs = dayStartMs + 86_400_000

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

    const byCat = new Map<CategoryId, number>()
    for (const e of dayEvents) {
      const s = Math.max(e.startTime, dayStartMs)
      const en = Math.min(e.endTime, dayEndMs)
      const dur = Math.max(0, en - s)
      byCat.set(e.categoryId, (byCat.get(e.categoryId) ?? 0) + dur)
    }

    return { totalMs, byCat }
  }, [dayEvents, dayStartMs, dayEndMs])

  // ── Weekly average ──────────────────────────────────────

  const weeklyAvgMs = useMemo(() => {
    if (events.length === 0) return null
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

  // ── Hover state ─────────────────────────────────────────

  const [hoveredEventId, setHoveredEventId] = useState<string | null>(null)

  const weekNum = getISOWeek(dayStart)
  const today = isToday(dayStartMs)

  return (
    <div className="h-full overflow-y-auto py-6 px-3 md:px-7">
      {/* ── HEADER ─────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="font-serif text-[26px] font-semibold text-text-primary tracking-[-0.02em] leading-tight">
            {formatWeekday(dayStart, 'long')}
          </div>
          <div className="font-serif text-[14px] text-text-secondary italic mt-1">
            {fmtFullDate(dayStart, language)}{' · '}{`第 ${weekNum} 周`}
          </div>
        </div>
        {/* Navigation */}
        <div className="flex gap-2 items-center flex-shrink-0">
          <button
            onClick={() => onDayChange(new Date(dayStartMs - 86_400_000))}
            className="font-sans text-xs text-text-secondary bg-transparent border border-border-subtle rounded-md px-2.5 py-1 cursor-pointer hover:bg-surface-sunken transition-colors duration-200"
          >
            ‹ {formatWeekday(new Date(dayStartMs - 86_400_000), 'short')}
          </button>
          {today ? (
            <span className="font-sans text-xs text-accent font-medium px-2.5 py-1">今天</span>
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
            周
          </button>
        </div>
      </div>

      {/* ── DAY OVERVIEW ───────────────────────────────── */}
      {dayStats && dayEvents.length > 0 && (
        <div className="mb-8">
          {/* Total hours */}
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-[40px] font-light text-text-primary tracking-[-0.03em] leading-none">
              {(dayStats.totalMs / 3_600_000).toFixed(1)}
            </span>
            <span className="font-serif text-sm text-text-tertiary">小时</span>
          </div>

          {/* Subtitle */}
          <div className="font-serif text-[13px] text-text-secondary italic mt-1">
            有效投入 · 共 {dayEvents.length} 项记录
            {weeklyAvgMs !== null && (
              <>
                {' · '}
                {dayStats.totalMs > weeklyAvgMs ? (
                  <span className="text-[var(--color-text-positive)]">↑ 高于周均</span>
                ) : (
                  <span className="text-[var(--color-text-warning)]">↓ 低于周均</span>
                )}
                {' '}
                <span className="text-text-tertiary">{fmtDuration(weeklyAvgMs, language)}</span>
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
                          {cat.name}
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

      {/* ── EVENT LIST ─────────────────────────────────── */}
      {dayEvents.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <p className="font-serif text-sm text-text-tertiary italic">这一天没有记录</p>
        </div>
      ) : (
        <div className="space-y-0.5">
          {dayEvents.map((event) => {
            const cat = categories.find((c) => c.id === event.categoryId)
            return (
              <EventCard
                key={event.id}
                event={event}
                category={cat}
                language={language}
                hovered={hoveredEventId === event.id}
                onNotes={() => setHoveredEventId(event.id)}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

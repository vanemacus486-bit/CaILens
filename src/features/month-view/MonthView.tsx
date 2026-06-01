import { useEffect, useMemo, useState } from 'react'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatWeekday, isToday } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import type { Category, CategoryId } from '@/domain/category'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

// ── Helpers ──────────────────────────────────────────────

function fmtShortHours(ms: number): string {
  const h = ms / 3_600_000
  return h >= 1 ? h.toFixed(1) + 'h' : Math.round(ms / 60_000) + 'm'
}

function fmtMonth(date: Date, language: 'zh' | 'en'): string {
  const monthsZh = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const pool = language === 'zh' ? monthsZh : monthsEn
  return pool[date.getMonth()]
}

// ── Category colour helpers ──────────────────────────────

function catFill(cat: Category | undefined): string {
  if (!cat) return 'var(--text-tertiary)'
  if (cat.id === 'stone') return '#7a9aaa'
  return `var(--event-${cat.id}-fill)`
}

// ═══════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════

interface MonthViewProps {
  monthStart: Date
  /** Navigate to a specific day (double-click a cell → switch to day view). */
  onDayChange: (day: Date) => void
  /** Change the displayed month without switching view mode. */
  onMonthChange: (monthStart: Date) => void
}

export function MonthView({ monthStart, onDayChange, onMonthChange }: MonthViewProps) {
  const rangeEvents   = useEventStore((s) => s.rangeEvents)
  const loadRange     = useEventStore((s) => s.loadRange)
  const categories    = useCategoryStore((s) => s.categories)
  const language      = useAppSettingsStore((s) => s.settings.language)
      // Click feedback state: briefly highlights the clicked cell
  const [clickedKey, setClickedKey] = useState<number | null>(null)

  const year = monthStart.getFullYear()
  const month = monthStart.getMonth()

  // Month boundaries
  const monthStartMs = new Date(year, month, 1).getTime()
  const monthEndMs = new Date(year, month + 1, 1).getTime()

  // Load events for the month
  useEffect(() => {
    fireAndForget(loadRange(monthStartMs, monthEndMs), 'load month range')
  }, [monthStartMs, monthEndMs, loadRange])

  // ── Calendar grid data ─────────────────────────────────

  const gridData = useMemo(() => {
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    // Monday-first: convert JS getDay() (0=Sun) to Monday-based index (0=Mon)
    const jsDay = new Date(year, month, 1).getDay() // 0=Sun, 1=Mon, ...
    const mondayFirstIndex = jsDay === 0 ? 6 : jsDay - 1 // 0=Mon, ..., 6=Sun

    // Compute leading filler days (from previous month) to align with Monday-first headers
    const cells: Array<{ date: Date; isCurrentMonth: boolean; dayEvents: CalendarEvent[] }> = []
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = mondayFirstIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i)
      cells.push({ date: d, isCurrentMonth: false, dayEvents: [] })
    }

    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const dayStart = d.getTime()
      const dayEnd = dayStart + 86_400_000
      const dayEvents = rangeEvents.filter(
        (e) => e.startTime < dayEnd && e.endTime > dayStart,
      )
      cells.push({ date: d, isCurrentMonth: true, dayEvents })
    }

    // Trailing filler days (to fill 6 rows = 42 cells)
    while (cells.length < 42) {
      const last = cells[cells.length - 1].date
      const next = new Date(last.getTime() + 86_400_000)
      cells.push({ date: next, isCurrentMonth: false, dayEvents: [] })
    }

    return cells
  }, [year, month, rangeEvents])

  // ── Day-of-week header labels ─────────────────────────

  const dayHeaders = useMemo(() => {
    const base = new Date(2026, 0, 5) // Monday
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base.getTime() + i * 86_400_000)
      return {
        short: formatWeekday(d, 'short'),
        isWeekend: i >= 5,
      }
    })
  }, [])

  // ── Navigation ─────────────────────────────────────────

  const handlePrevMonth = () => {
    onMonthChange(new Date(year, month - 1, 1))
  }

  const handleNextMonth = () => {
    onMonthChange(new Date(year, month + 1, 1))
  }

  const handleToday = () => {
    const now = new Date()
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  // Week range string
  const weekRangeStr = useMemo(() => {
    const firstWeek = Math.ceil((new Date(year, month, 1).getDate() + new Date(year, month, 1).getDay()) / 7)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const lastWeek = Math.ceil((lastDay + new Date(year, month, 1).getDay()) / 7)
    return `${firstWeek}–${lastWeek}`
  }, [year, month])

  return (
    <div className="h-full overflow-y-auto py-6 px-3 md:px-7">
      {/* ═══════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <button
            onClick={handlePrevMonth}
            className="font-sans text-lg text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer leading-none bg-transparent border-none"
          >
            ‹
          </button>
          <div>
            <div className="font-serif text-[13px] text-text-tertiary italic leading-none mb-1">
              {year}
            </div>
            <div className="font-serif text-[30px] font-semibold text-text-primary tracking-[-0.02em] leading-tight">
              {fmtMonth(monthStart, language)}
            </div>
            <div className="font-serif text-[13px] text-text-secondary italic mt-1">
              {language === 'zh'
                ? `${fmtMonth(monthStart, 'en')} · 第 ${weekRangeStr} 周 · 共 ${new Date(year, month + 1, 0).getDate()} 天`
                : `${fmtMonth(monthStart, 'zh')} · W${weekRangeStr} · ${new Date(year, month + 1, 0).getDate()} days`}
            </div>
          </div>
          <button
            onClick={handleNextMonth}
            className="font-sans text-lg text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer leading-none bg-transparent border-none self-start mt-8"
          >
            ›
          </button>
        </div>

        {/* Back to today */}
        <button
          onClick={handleToday}
          className="font-sans text-xs text-text-secondary border border-border-subtle rounded-md px-3 py-1.5 cursor-pointer hover:bg-surface-sunken transition-colors duration-200 bg-transparent"
        >
          {'回到本月'}
        </button>
      </div>



      {/* ═══════════════════════════════════════════════════
          CALENDAR GRID
          ═══════════════════════════════════════════════════ */}
      <div>
        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayHeaders.map(({ short, isWeekend }) => (
            <div
              key={short}
              className="font-sans text-[10px] font-medium text-center py-1.5 uppercase tracking-wider"
              style={{ color: isWeekend ? 'var(--accent)' : 'var(--text-tertiary)' }}
            >
              {short}
            </div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 border-t border-l border-border-subtle/50">
          {gridData.map((cell, i) => {
            const today = cell.isCurrentMonth && isToday(cell.date.getTime())
            const isWeekend = cell.date.getDay() === 0 || cell.date.getDay() === 6
            const hasEvents = cell.dayEvents.length > 0

            // Compute total time for the day
            let dayTotalMs = 0
            const dayCats = new Set<CategoryId>()
            const catDur = new Map<CategoryId, number>()
            for (const e of cell.dayEvents) {
              const s = Math.max(e.startTime, cell.date.getTime())
              const en = Math.min(e.endTime, cell.date.getTime() + 86_400_000)
              const dur = Math.max(0, en - s)
              dayTotalMs += dur
              dayCats.add(e.categoryId)
              catDur.set(e.categoryId, (catDur.get(e.categoryId) ?? 0) + dur)
            }

            // Top event (most time spent) — exclude sleep
            const activeEvents = cell.dayEvents.filter((e) => e.categoryId !== 'stone')
            const topEvent = activeEvents.length > 0
              ? [...activeEvents].sort(
                  (a, b) =>
                    Math.min(b.endTime, cell.date.getTime() + 86_400_000) - Math.max(b.startTime, cell.date.getTime()) -
                    (Math.min(a.endTime, cell.date.getTime() + 86_400_000) - Math.max(a.startTime, cell.date.getTime())),
                )[0]
              : null

            // Main event category colour for cell background
            const mainCatColor = topEvent
              ? (() => {
                  const cat = categories.find((c) => c.id === topEvent.categoryId)
                  if (!cat || cat.id === 'stone') return null
                  return catFill(cat)
                })()
              : null

            return (
              <div
                key={i}
                className={`border-r border-b border-border-subtle/50 min-h-[82px] p-1.5 transition-colors duration-150 select-none
                  ${cell.isCurrentMonth ? 'hover:bg-surface-sunken/60 cursor-pointer' : ''}
                  ${today ? 'bg-accent-light/30' : ''}
                  ${clickedKey === i ? 'ring-1 ring-inset ring-accent/30 bg-accent-light/15' : ''}
                `}
                style={mainCatColor && cell.isCurrentMonth && !today ? {
                  background: `linear-gradient(135deg, ${mainCatColor}08, transparent 60%)`,
                } : undefined}
                onClick={() => {
                  if (cell.isCurrentMonth) {
                    setClickedKey(i)
                    setTimeout(() => setClickedKey(null), 300)
                  }
                }}
                onDoubleClick={() => {
                  if (cell.isCurrentMonth) {
                    onDayChange(cell.date)
                  }
                }}
              >
                {/* Row 1: Date + hours */}
                <div className="flex items-start justify-between mb-0.5">
                  <span
                    className={`font-serif text-[12px] leading-none
                      ${today ? 'font-semibold text-accent' : ''}
                      ${!cell.isCurrentMonth ? 'text-text-tertiary/40' : cell.isCurrentMonth && isWeekend && !today ? 'text-text-tertiary' : 'text-text-primary'}
                    `}
                  >
                    {cell.date.getDate()}
                    {today && (
                      <span className="inline-block w-1 h-1 rounded-full bg-accent ml-0.5 align-middle" />
                    )}
                  </span>
                  {cell.isCurrentMonth && hasEvents && (
                    <span className="font-mono text-[9px] text-text-tertiary leading-none mt-0.5">
                      {fmtShortHours(dayTotalMs)}
                    </span>
                  )}
                  {cell.isCurrentMonth && !hasEvents && (
                    <span className="font-mono text-[9px] text-text-tertiary/40 leading-none mt-0.5">
                      —
                    </span>
                  )}
                </div>

                {/* Row 2: Top event name */}
                <div className="mb-0.5" style={{ minHeight: '1.15em' }}>
                  {cell.isCurrentMonth && topEvent && (
                    <div className="font-serif text-[10px] text-text-primary leading-snug truncate">
                      {topEvent.title}
                    </div>
                  )}
                  {cell.isCurrentMonth && !topEvent && !hasEvents && (
                    <div className="font-serif text-[10px] text-text-tertiary/40 italic leading-snug truncate">
                      {'未记录'}
                    </div>
                  )}
                  {cell.isCurrentMonth && !topEvent && hasEvents && (
                    /* Only sleep — show nothing */
                    <div className="invisible text-[10px] leading-snug">·</div>
                  )}
                </div>

                {/* Row 3: Category dots */}
                {cell.isCurrentMonth && dayCats.size > 0 && (
                  <div className="flex gap-0.5 mb-0.5 flex-wrap">
                    {[...dayCats].slice(0, 6).map((catId) => {
                      const cat = categories.find((c) => c.id === catId)
                      return (
                        <span
                          key={catId}
                          className="w-[5px] h-[5px] rounded-full block flex-shrink-0"
                          style={{ backgroundColor: catFill(cat) }}
                        />
                      )
                    })}
                  </div>
                )}

                {/* Row 4: Mini stack bar */}
                {cell.isCurrentMonth && catDur.size > 0 && (
                  <div className="flex h-[3px] rounded-full overflow-hidden">
                    {[...catDur.entries()]
                      .sort(([, a], [, b]) => b - a)
                      .map(([catId, dur]) => {
                        const cat = categories.find((c) => c.id === catId)
                        const pct = (dur / dayTotalMs) * 100
                        if (pct < 5) return null
                        return (
                          <div
                            key={catId}
                            style={{
                              width: `${pct}%`,
                              backgroundColor: catFill(cat),
                              opacity: 0.6,
                            }}
                          />
                        )
                      })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

    </div>
  )
}

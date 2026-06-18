import { useEffect, useMemo } from 'react'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatWeekday, isToday } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import type { Category } from '@/domain/category'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

// ── Helpers ──────────────────────────────────────────────

function fmtMonth(date: Date, language: 'zh' | 'en'): string {
  const monthsZh = ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月']
  const monthsEn = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  const pool = language === 'zh' ? monthsZh : monthsEn
  return pool[date.getMonth()]
}

function fmtTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function catFill(cat: Category | undefined): string {
  if (!cat) return 'var(--text-tertiary)'
  if (cat.id === 'stone') return 'var(--cat-sleep)'
  return `var(--event-${cat.id}-fill)`
}

/** 单元格最多显示几条事件，多出折叠为「另外 N 项」 */
const MAX_EVENTS = 6

// ═══════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════

interface MonthViewProps {
  monthStart: Date
  /** Navigate to a specific day (click a cell → switch to day view). */
  onDayChange: (day: Date) => void
  /** Change the displayed month without switching view mode. */
  onMonthChange: (monthStart: Date) => void
  /** Hide the built-in header (desktop uses the shared CalendarHeader instead). */
  hideHeader?: boolean
}

export function MonthView({ monthStart, onDayChange, onMonthChange, hideHeader = false }: MonthViewProps) {
  const rangeEvents   = useEventStore((s) => s.rangeEvents)
  const loadRange     = useEventStore((s) => s.loadRange)
  const categories    = useCategoryStore((s) => s.categories)
  const language      = useAppSettingsStore((s) => s.settings.language)

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
    const jsDay = new Date(year, month, 1).getDay()
    const mondayFirstIndex = jsDay === 0 ? 6 : jsDay - 1

    const cells: Array<{ date: Date; isCurrentMonth: boolean; dayEvents: CalendarEvent[] }> = []
    const prevMonthDays = new Date(year, month, 0).getDate()
    for (let i = mondayFirstIndex - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthDays - i)
      cells.push({ date: d, isCurrentMonth: false, dayEvents: [] })
    }

    // Current month days — events sorted chronologically
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(year, month, day)
      const dayStart = d.getTime()
      const dayEnd = dayStart + 86_400_000
      // 按「当天开始」的事件归入此格 —— 跨夜事件留在起始日，避免 23:00 排到次日顶部
      const dayEvents = rangeEvents
        .filter((e) => e.startTime >= dayStart && e.startTime < dayEnd)
        .sort((a, b) => a.startTime - b.startTime)
      cells.push({ date: d, isCurrentMonth: true, dayEvents })
    }

    // Trailing filler days (fill 6 rows = 42 cells)
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

  const handlePrevMonth = () => onMonthChange(new Date(year, month - 1, 1))
  const handleNextMonth = () => onMonthChange(new Date(year, month + 1, 1))
  const handleToday = () => {
    const now = new Date()
    onMonthChange(new Date(now.getFullYear(), now.getMonth(), 1))
  }

  const weekRangeStr = useMemo(() => {
    const firstWeek = Math.ceil((new Date(year, month, 1).getDate() + new Date(year, month, 1).getDay()) / 7)
    const lastDay = new Date(year, month + 1, 0).getDate()
    const lastWeek = Math.ceil((lastDay + new Date(year, month, 1).getDay()) / 7)
    return `${firstWeek}–${lastWeek}`
  }, [year, month])

  return (
    <div className="h-full flex flex-col overflow-hidden px-2 md:px-3 pt-1 pb-2">
      {/* ── HEADER（桌面端由共享 CalendarHeader 接管，此处隐藏） ── */}
      {!hideHeader && (
        <div className="flex items-center justify-between mb-6 flex-shrink-0 px-1">
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrevMonth}
              className="font-sans text-lg text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer leading-none bg-transparent border-none"
            >
              ‹
            </button>
            <div>
              <div className="font-serif text-[13px] text-text-tertiary italic leading-none mb-1">{year}</div>
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
          <button
            onClick={handleToday}
            className="font-sans text-xs text-text-secondary border border-border-subtle rounded-md px-3 py-1.5 cursor-pointer hover:bg-surface-sunken transition-colors duration-200 bg-transparent"
          >
            回到本月
          </button>
        </div>
      )}

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 flex-shrink-0">
        {dayHeaders.map(({ short, isWeekend }) => (
          <div
            key={short}
            className="font-sans text-[11px] font-medium text-center py-2 uppercase tracking-wider"
            style={{ color: isWeekend ? 'var(--accent)' : 'var(--text-tertiary)' }}
          >
            {short}
          </div>
        ))}
      </div>

      {/* ── Calendar grid（事件列表式，6 行等分铺满高度，溢出折叠「另外 N 项」）── */}
      <div className="flex-1 min-h-0 grid grid-cols-7 grid-rows-6 border-t border-l border-border-subtle/50">
        {gridData.map((cell, i) => {
          const today = cell.isCurrentMonth && isToday(cell.date.getTime())
          const shown = cell.dayEvents.slice(0, MAX_EVENTS)
          const overflow = cell.dayEvents.length - shown.length

          return (
            <div
              key={i}
              onClick={() => { if (cell.isCurrentMonth) onDayChange(cell.date) }}
              className={`border-r border-b border-border-subtle/50 min-h-0 px-2 py-1.5 flex flex-col gap-y-0.5 overflow-hidden transition-colors duration-150 select-none
                ${cell.isCurrentMonth ? 'cursor-pointer hover:bg-surface-sunken/50' : 'bg-surface-sunken/20'}
                ${today ? 'bg-accent-light/25' : ''}
              `}
            >
              {/* 日期 */}
              <div className="flex items-center mb-1 flex-shrink-0">
                {today ? (
                  <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 rounded-full bg-accent text-white font-serif text-[13px] font-semibold leading-none">
                    {cell.date.getDate()}
                  </span>
                ) : (
                  <span className={`font-serif text-[14px] leading-none ${cell.isCurrentMonth ? 'text-text-primary' : 'text-text-tertiary/40'}`}>
                    {cell.date.getDate()}
                  </span>
                )}
              </div>

              {/* 事件列表 */}
              {shown.map((e) => {
                const cat = categories.find((c) => c.id === e.categoryId)
                return (
                  <div key={e.id} className="flex items-center gap-1.5 leading-none min-w-0 py-px">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: catFill(cat) }}
                    />
                    <span className="font-mono text-[11px] text-text-secondary flex-shrink-0 tabular-nums">{fmtTime(e.startTime)}</span>
                    <span className="font-sans text-[12px] text-text-primary truncate">{e.title}</span>
                  </div>
                )
              })}

              {/* 溢出 */}
              {overflow > 0 && (
                <div className="font-sans text-[11px] text-text-tertiary pl-0.5 leading-tight mt-px">
                  {language === 'zh' ? `另外 ${overflow} 项` : `+${overflow} more`}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

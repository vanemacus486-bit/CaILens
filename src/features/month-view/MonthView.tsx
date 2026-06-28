import { useEffect, useMemo, useState } from 'react'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatWeekday, isToday } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import { MonthOverflowPopover } from './MonthOverflowPopover'

// ── Helpers ──────────────────────────────────────────────

function fmtTime(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── Component ─────────────────────────────────────────────

export function MonthView({
  onNavigateToWeek,
  monthDate,
}: {
  onNavigateToWeek?: (date: Date) => void
  monthDate: Date
}) {
  const language      = useAppSettingsStore((s) => s.settings.language)
  const events        = useEventStore((s) => s.rangeEvents)
  const categories    = useCategoryStore((s) => s.categories)
  const loadRange     = useEventStore((s) => s.loadRange)
  const t = useT()

  // ── 受控月份 ──
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const year       = monthStart.getFullYear()
  const month      = monthStart.getMonth()
  const monthStartMs = monthStart.getTime()
  const monthEndMs   = new Date(year, month + 1, 1).getTime() - 1

  // ── 加载当月事件 ──
  useEffect(() => {
    fireAndForget(loadRange(monthStartMs, monthEndMs), 'load month range')
  }, [loadRange, monthStartMs, monthEndMs])

  // ── Calendar grid ──────────────────────────────────────
  const firstDayDow = monthStart.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const weekdayHeaders: string[] = []
  for (let i = 0; i < 7; i++) {
    const isoDow = i === 0 ? 6 : i - 1
    const d = new Date(2025, 0, 6 + isoDow)
    weekdayHeaders.push(formatWeekday(d, 'short'))
  }

  // 按日分组事件
  const eventsByDay = useMemo(() => {
    const map = new Map<number, CalendarEvent[]>()
    for (const e of events) {
      const eDate = new Date(e.startTime)
      const key = eDate.getFullYear() * 10000 + (eDate.getMonth() + 1) * 100 + eDate.getDate()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(e)
    }
    return map
  }, [events])

  // Grid cells: 5 rows × 7 cols
  const cells = useMemo(() => {
    const result: { date: number; day: number; events: CalendarEvent[]; isCurrentMonth: boolean }[] = []
    const startPad = firstDayDow === 0 ? 6 : firstDayDow - 1 // 周一 = 0
    const totalDays = startPad + daysInMonth
    const rows = Math.ceil(totalDays / 7)

    for (let i = 0; i < rows * 7; i++) {
      const day = i - startPad + 1
      const isCurrentMonth = day >= 1 && day <= daysInMonth
      const dateObj = new Date(year, month, day)
      const key = dateObj.getFullYear() * 10000 + (dateObj.getMonth() + 1) * 100 + dateObj.getDate()
      const dayEvents = (eventsByDay.get(key) ?? [])
        .sort((a, b) => a.startTime - b.startTime)
      result.push({ date: dateObj.getTime(), day, events: dayEvents, isCurrentMonth })
    }
    return result
  }, [firstDayDow, daysInMonth, year, month, eventsByDay])

  // ── Popover ──
  const [popoverCell, setPopoverCell] = useState<{ date: number; events: CalendarEvent[]; dateObj: Date } | null>(null)
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null)

  const handleOverflowClick = (e: React.MouseEvent, date: number, events: CalendarEvent[]) => {
    setPopoverAnchor(e.currentTarget as HTMLElement)
    setPopoverCell({ date, events, dateObj: new Date(date) })
  }
  const handlePopoverClose = () => {
    setPopoverCell(null)
    setPopoverAnchor(null)
  }

  // ⚠️ 所有 hooks 必须在 early return 之前调用完毕
  return (
    <div className="flex flex-col h-full p-5 overflow-y-auto bg-surface-base">
      {/* Grid — 暖底色，所有周等高 */}
      <div
        className="grid flex-1 min-h-0"
        style={{
          gridTemplateColumns: 'repeat(7, 1fr)',
          gridTemplateRows: 'auto',
          gridAutoRows: 'minmax(100px, auto)',
        }}
      >
        {/* Weekday headers */}
        {weekdayHeaders.map((name, i) => (
          <div
            key={i}
            className="font-sans text-[11px] text-text-tertiary/80 font-medium text-center pb-1.5 border-b border-border-subtle"
          >
            {name}
          </div>
        ))}

        {/* Cells rendered as normal flow within last row */}
        {cells.map((cell) => {
          const isToday_ = isToday(cell.date)
          const overflow = cell.events.length > 2 ? cell.events.length - 2 : 0
          return (
            <div
              key={cell.date}
              className={`
                min-h-[80px] p-1.5 border-b border-r border-border-subtle
                ${!cell.isCurrentMonth ? 'opacity-30' : ''}
                ${isToday_ ? 'bg-accent/5' : ''}
                hover:bg-surface-sunken/50 transition-colors duration-150
              `}
            >
              <div
                className={`
                  w-6 h-6 flex items-center justify-center rounded-full font-sans text-xs
                  ${isToday_ ? 'bg-accent text-white font-medium' : 'text-text-secondary'}
                `}
              >
                {cell.day > 0 ? cell.day : ''}
              </div>

              {/* Events (max 2) */}
              {cell.events.slice(0, 2).map((ev) => {
                const cat = categories.find((c) => c.id === ev.categoryId)
                const color = cat ? `var(--event-${cat.id}-fill)` : 'var(--event-accent-fill)'
                return (
                  <div
                    key={ev.id}
                    className="flex items-center gap-1 mt-px rounded px-0.5"
                    title={ev.title}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <span className="truncate font-sans text-[11px] text-text-secondary leading-normal" style={{ color }}>
                      {fmtTime(ev.startTime)} {ev.title}
                    </span>
                  </div>
                )
              })}

              {/* 溢出 — 点击打开悬浮卡片 */}
              {overflow > 0 && (
                <span
                  onClick={(e) => handleOverflowClick(e, cell.date, cell.events)}
                  className="font-sans text-[11px] text-text-tertiary pl-0.5 leading-tight mt-px cursor-pointer hover:text-accent transition-colors"
                >
                  {t('month.moreEvents', overflow)}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* ── Overflow popover ── */}
      {popoverCell && popoverAnchor && (
        <MonthOverflowPopover
          open
          anchorEl={popoverAnchor}
          events={popoverCell.events}
          date={popoverCell.date}
          categories={categories}
          language={language}
          onClose={handlePopoverClose}
          onNavigateToWeek={onNavigateToWeek}
        />
      )}
    </div>
  )
}

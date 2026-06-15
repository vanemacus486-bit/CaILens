/**
 * # DietCalendarCard — 饮食时刻图
 *
 * 以周视图（24h 时刻轴）展示每日饮食记录，仅保留时刻图。
 */

import { useMemo, useState, startTransition } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, isSameDay } from 'date-fns'
import type { CalendarEvent, MealOrder } from '@/domain/event'
import { MEAL_ORDER_LABELS, MEAL_TAG_LABELS } from '@/domain/event'
import { WeekTimeAxis, type AxisDay } from './WeekTimeAxis'
import { groupMealsByDay } from '@/domain/dietStats'
import { dateRange } from '@/domain/dateRange'

// ── 类型 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
}

// ── 餐次颜色 ────────────────────────────────────────────────

const MEAL_ORDER_COLORS: Record<MealOrder, string> = {
  breakfast: 'var(--event-accent-fill)',
  lunch: 'var(--event-sage-fill)',
  dinner: 'var(--event-sky-fill)',
  night_snack: 'var(--event-rose-fill)',
}

// ── 辅助 ────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function hourOfDay(ts: number): number {
  const d = new Date(ts)
  return d.getHours() + d.getMinutes() / 60
}

// ── 组件 ────────────────────────────────────────────────────

export function DietCalendarCard({ rangeEvents }: Props) {
  const [anchorDate, setAnchorDate] = useState(() => new Date())

  // ── 当前周范围 ────────────────────────────────────────
  const viewRange = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
    return { start: start.getTime(), end: end.getTime() + 86_400_000 }
  }, [anchorDate])

  // ── 分天数据 ──────────────────────────────────────────
  const dailyMeals = useMemo(() => {
    const range = dateRange(viewRange.start, viewRange.end)
    return groupMealsByDay(rangeEvents, range, true)
  }, [rangeEvents, viewRange])

  // ── 导航 ──────────────────────────────────────────────
  const goPrev = () => startTransition(() => setAnchorDate((d) => addWeeks(d, -1)))
  const goNext = () => startTransition(() => setAnchorDate((d) => addWeeks(d, 1)))
  const goToday = () => startTransition(() => setAnchorDate(new Date()))

  // ── 标题 ──────────────────────────────────────────────
  const titleLabel = useMemo(() => {
    const start = new Date(viewRange.start)
    const end = new Date(viewRange.end - 86_400_000)
    return `${format(start, 'yyyy年M月d日')} — ${format(end, 'M月d日')}`
  }, [viewRange])

  const today = useMemo(() => new Date(), [])

  // ── 时刻轴数据 ────────────────────────────────────────
  const dietDays: AxisDay[] = useMemo(
    () =>
      dailyMeals.map((dm) => {
        const dateObj = new Date(dm.date + 'T00:00:00')
        const wd = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][
          dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1
        ]
        return {
          date: dm.date,
          dayLabel: `${wd} ${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
          isToday: isSameDay(dateObj, today),
          timed: dm.meals.map((m) => ({
            id: m.eventId,
            hour: hourOfDay(m.startTime),
            timeLabel: fmtTime(m.startTime),
            color: MEAL_ORDER_COLORS[m.mealOrder],
            label: MEAL_ORDER_LABELS[m.mealOrder],
            detail: m.title,
            tags: m.foodTags.map((t) => MEAL_TAG_LABELS[t]),
          })),
          allDay: [],
        }
      }),
    [dailyMeals, today],
  )

  // ── 渲染 ──────────────────────────────────────────────
  return (
    <div className="dcc-root">
      <style>{DCC_CSS}</style>

      {/* ── 头部：周导航 ───────────────────────────── */}
      <div className="dcc-header">
        <div className="dcc-nav-row">
          <button onClick={goPrev} className="dcc-nav-arrow" title="上一周">‹</button>
          <span className="dcc-title">{titleLabel}</span>
          <button onClick={goNext} className="dcc-nav-arrow" title="下一周">›</button>
          <button onClick={goToday} className="dcc-today-btn">今天</button>
        </div>
      </div>

      {/* ── 时刻图 ─────────────────────────────────── */}
      <WeekTimeAxis days={dietDays} />
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const DCC_CSS = `
.dcc-root {
  width: 100%;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── Header / Navigation ────────────────────── */
.dcc-header {
  margin-bottom: 16px;
}
.dcc-nav-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.dcc-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  min-width: 180px;
  text-align: center;
}
.dcc-nav-arrow {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: var(--heatmap-ink-3);
  transition: color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}
.dcc-nav-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.dcc-today-btn {
  padding: 3px 10px;
  border-radius: 5px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg-card);
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  transition: color 0.2s ease;
}
.dcc-today-btn:hover {
  color: var(--heatmap-ink-1);
}
`

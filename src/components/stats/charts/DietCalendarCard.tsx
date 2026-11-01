/**
 * # DietCalendarCard — 饮食时刻图
 *
 * 以周视图（24h 时刻轴）展示每日饮食记录，仅保留时刻图。
 * 导航由 StatsPage 通过 anchorDate prop 控制。
 */

import { useMemo } from 'react'
import { startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import type { CalendarEvent, MealOrder } from '@/domain/event'
import { MEAL_ORDER_LABELS, MEAL_TAG_LABELS } from '@/domain/event'
import { WeekTimeAxis, type AxisDay } from './WeekTimeAxis'
import { groupMealsByDay } from '@/domain/dietStats'
import { dateRange } from '@/domain/dateRange'

// ── 类型 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  /** 外部控制的锚点日期 */
  anchorDate?: Date
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

export function DietCalendarCard({ rangeEvents, anchorDate: anchorDateProp }: Props) {
  // ── 当前周范围 ────────────────────────────────────────
  const viewRange = useMemo(() => {
    const d = anchorDateProp ?? new Date()
    const start = startOfWeek(d, { weekStartsOn: 1 })
    const end = endOfWeek(d, { weekStartsOn: 1 })
    return { start: start.getTime(), end: end.getTime() + 86_400_000 }
  }, [anchorDateProp])

  // ── 分天数据 ──────────────────────────────────────────
  const dailyMeals = useMemo(() => {
    const range = dateRange(viewRange.start, viewRange.end)
    return groupMealsByDay(rangeEvents, range, true)
  }, [rangeEvents, viewRange])

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
`

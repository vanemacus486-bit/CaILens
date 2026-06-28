/**
 * # HygieneCalendarCard — 卫生时刻图
 *
 * 以周视图（24h 时刻轴）展示每日卫生记录。纯只读镜头，与饮食时刻图同构。
 * 导航由 StatsPage 通过 anchorDate prop 控制。
 */

import { useMemo } from 'react'
import { startOfWeek, endOfWeek, isSameDay } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import type { HygieneActivityDef } from '@/domain/hygieneActivity'
import { hygieneColorVar } from '@/domain/hygieneActivity'
import type { AppLanguage } from '@/i18n/types'
import { groupHygieneByDay } from '@/domain/hygieneStats'
import { dateRange } from '@/domain/dateRange'
import { WeekTimeAxis, type AxisDay } from './WeekTimeAxis'

// ── 类型 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  activities: readonly HygieneActivityDef[]
  language: AppLanguage
  /** 外部控制的锚点日期 */
  anchorDate?: Date
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

export function HygieneCalendarCard({ rangeEvents, activities, anchorDate: anchorDateProp }: Props) {
  // ── 当前周范围 ────────────────────────────────────────
  const viewRange = useMemo(() => {
    const d = anchorDateProp ?? new Date()
    const start = startOfWeek(d, { weekStartsOn: 1 })
    const end = endOfWeek(d, { weekStartsOn: 1 })
    return { start: start.getTime(), end: end.getTime() + 86_400_000 }
  }, [anchorDateProp])

  // ── 分天数据 ──────────────────────────────────────────
  const dailyActivities = useMemo(() => {
    const range = dateRange(viewRange.start, viewRange.end)
    return groupHygieneByDay(rangeEvents, range, activities)
  }, [rangeEvents, activities, viewRange])

  const today = useMemo(() => new Date(), [])

  // ── 时刻轴数据 ────────────────────────────────────────
  const hygieneDays: AxisDay[] = useMemo(
    () =>
      dailyActivities.map((da) => {
        const dateObj = new Date(da.date + 'T00:00:00')
        const wd = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][
          dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1
        ]
        return {
          date: da.date,
          dayLabel: `${wd} ${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
          isToday: isSameDay(dateObj, today),
          timed: da.items.map((it) => ({
            id: it.eventId,
            hour: hourOfDay(it.startTime),
            timeLabel: fmtTime(it.startTime),
            color: hygieneColorVar(it.activityId),
            label: it.name,
            detail: it.title && it.title !== it.name ? it.title : undefined,
          })),
          allDay: [],
        }
      }),
    [dailyActivities, today],
  )

  // ── 渲染 ──────────────────────────────────────────────
  return (
    <div className="hcc-root">
      <style>{HCC_CSS}</style>
      <WeekTimeAxis days={hygieneDays} />
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const HCC_CSS = `
.hcc-root {
  width: 100%;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}
`

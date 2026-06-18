/**
 * # HygieneCalendarCard — 卫生时刻图
 *
 * 以周视图（24h 时刻轴）展示每日卫生记录。纯只读镜头，与饮食时刻图同构：
 * 卫生活动通过"记事"录入为类型化事件（typedData.hygiene），本卡仅可视化。
 * 哪些事件计入、什么颜色，由用户在「设置 → 卫生」自定义（activities prop）。
 */

import { useMemo, useState, startTransition } from 'react'
import { format, startOfWeek, endOfWeek, addWeeks, isSameDay } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import type { HygieneActivityDef } from '@/domain/hygieneActivity'
import { hygieneColorVar } from '@/domain/hygieneActivity'
import type { AppLanguage } from '@/domain/settings'
import { groupHygieneByDay } from '@/domain/hygieneStats'
import { dateRange } from '@/domain/dateRange'
import { WeekTimeAxis, type AxisDay } from './WeekTimeAxis'

// ── 类型 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  activities: readonly HygieneActivityDef[]
  language: AppLanguage
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

export function HygieneCalendarCard({ rangeEvents, activities, language }: Props) {
  const [anchorDate, setAnchorDate] = useState(() => new Date())

  // ── 当前周范围 ────────────────────────────────────────
  const viewRange = useMemo(() => {
    const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
    const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
    return { start: start.getTime(), end: end.getTime() + 86_400_000 }
  }, [anchorDate])

  // ── 分天数据 ──────────────────────────────────────────
  const dailyHygiene = useMemo(() => {
    const range = dateRange(viewRange.start, viewRange.end)
    return groupHygieneByDay(rangeEvents, range, activities, true)
  }, [rangeEvents, viewRange, activities])

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
  const hygieneDays: AxisDay[] = useMemo(
    () =>
      dailyHygiene.map((dh) => {
        const dateObj = new Date(dh.date + 'T00:00:00')
        const idx = dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1
        const wd =
          language === 'zh'
            ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx]
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]
        return {
          date: dh.date,
          dayLabel: `${wd} ${dateObj.getMonth() + 1}/${dateObj.getDate()}`,
          isToday: isSameDay(dateObj, today),
          timed: dh.items.map((it) => ({
            id: it.eventId,
            hour: hourOfDay(it.startTime),
            timeLabel: fmtTime(it.startTime),
            color: hygieneColorVar(it.colorKey),
            label: it.name,
            detail: it.title && it.title !== it.name ? it.title : undefined,
          })),
          allDay: [],
        }
      }),
    [dailyHygiene, language, today],
  )

  // ── 渲染 ──────────────────────────────────────────────
  return (
    <div className="hcc-root">
      <style>{HCC_CSS}</style>

      {/* ── 头部：周导航 ───────────────────────────── */}
      <div className="hcc-header">
        <div className="hcc-nav-row">
          <button onClick={goPrev} className="hcc-nav-arrow" title="上一周">‹</button>
          <span className="hcc-title">{titleLabel}</span>
          <button onClick={goNext} className="hcc-nav-arrow" title="下一周">›</button>
          <button onClick={goToday} className="hcc-today-btn">{language === 'zh' ? '今天' : 'Today'}</button>
        </div>
      </div>

      {/* ── 时刻图 ─────────────────────────────────── */}
      <WeekTimeAxis
        days={hygieneDays}
        allDayLabel={language === 'zh' ? '全天' : 'All day'}
      />

      {/* ── 录入提示 ───────────────────────────────── */}
      <p className="hcc-hint">
        {language === 'zh'
          ? '在日历里记一笔含关键词的事件即自动计入；活动与颜色在「设置 → 卫生」管理'
          : 'Log an event whose title contains a keyword to track it; manage activities in Settings → Hygiene'}
      </p>

      {/* ── 图例 ───────────────────────────────────── */}
      {activities.length > 0 && (
        <div className="hcc-legend">
          {activities.map((a) => (
            <span key={a.id} className="hcc-legend-item">
              <span className="hcc-legend-icon">{a.icon}</span>
              <span className="hcc-legend-dot" style={{ background: hygieneColorVar(a.color) }} />
              {a.name}
            </span>
          ))}
        </div>
      )}
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

/* ── Header / Navigation ────────────────────── */
.hcc-header {
  margin-bottom: 16px;
}
.hcc-nav-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hcc-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  min-width: 180px;
  text-align: center;
}
.hcc-nav-arrow {
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
.hcc-nav-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.hcc-today-btn {
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
.hcc-today-btn:hover {
  color: var(--heatmap-ink-1);
}

/* ── Hint ───────────────────────────────────── */
.hcc-hint {
  margin: 12px 0 0;
  font-size: 12px;
  font-style: italic;
  color: var(--heatmap-ink-3);
}

/* ── Legend ─────────────────────────────────── */
.hcc-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  flex-wrap: wrap;
}
.hcc-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.hcc-legend-icon {
  font-size: 12px;
}
.hcc-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
`

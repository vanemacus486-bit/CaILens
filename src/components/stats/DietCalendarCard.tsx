/**
 * # DietCalendarCard — 饮食日历
 *
 * 以周视图或月视图展示每日饮食记录。
 * 替换旧版 DietNutrientCard。
 *
 * 周视图：7 张日卡片纵向排列，展示每餐详情
 * 月视图：日历网格，每日以彩色圆点标示餐次
 */

import { useMemo, useState, startTransition } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
} from 'date-fns'
import type { CalendarEvent, MealOrder } from '@/domain/event'
import { MEAL_ORDER_LABELS } from '@/domain/event'
import { groupMealsByDay } from '@/domain/dietStats'
import { dateRange } from '@/domain/dateRange'

// ── 类型 ────────────────────────────────────────────────────

type ViewMode = 'week' | 'month'

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

const MEAL_ORDER_ICONS: Record<MealOrder, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌆',
  night_snack: '🌙',
}

// ── 辅助 ────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function fmtDateLabel(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

// ── 组件 ────────────────────────────────────────────────────

export function DietCalendarCard({ rangeEvents }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())

  // ── 计算当前视图范围 ──────────────────────────────────

  const viewRange = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
      const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
      return { start: start.getTime(), end: end.getTime() + 86_400_000 }
    } else {
      const start = startOfMonth(anchorDate)
      const end = endOfMonth(anchorDate)
      return { start: start.getTime(), end: end.getTime() + 86_400_000 }
    }
  }, [viewMode, anchorDate])

  // ── 分天数据 ──────────────────────────────────────────

  const dailyMeals = useMemo(() => {
    const range = dateRange(viewRange.start, viewRange.end)
    return groupMealsByDay(rangeEvents, range, true)
  }, [rangeEvents, viewRange])

  // ── 导航 ──────────────────────────────────────────────

  const goPrev = () => {
    startTransition(() => {
      setAnchorDate((d) =>
        viewMode === 'week' ? addWeeks(d, -1) : addMonths(d, -1),
      )
    })
  }

  const goNext = () => {
    startTransition(() => {
      setAnchorDate((d) =>
        viewMode === 'week' ? addWeeks(d, 1) : addMonths(d, 1),
      )
    })
  }

  const goToday = () => {
    startTransition(() => setAnchorDate(new Date()))
  }

  const changeViewMode = (vm: ViewMode) => {
    if (vm === viewMode) return
    startTransition(() => {
      setViewMode(vm)
      setAnchorDate(new Date())
    })
  }

  // ── 标题 ──────────────────────────────────────────────

  const titleLabel = useMemo(() => {
    if (viewMode === 'week') {
      const start = new Date(viewRange.start)
      const end = new Date(viewRange.end - 86_400_000)
      return `${format(start, 'yyyy年M月d日')} — ${format(end, 'M月d日')}`
    }
    return format(new Date(viewRange.start), 'yyyy年M月')
  }, [viewMode, viewRange])

  const today = useMemo(() => new Date(), [])

  // ── 月视图网格数据 ────────────────────────────────────

  const monthGrid = useMemo(() => {
    if (viewMode !== 'month') return null

    const monthStart = new Date(viewRange.start)
    const monthEnd = new Date(viewRange.end - 86_400_000)

    // 生成从月首周一（可能跨月）到月末周日的完整 6 周网格
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })

    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })
    const weeks: Date[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7))
    }

    return { weeks, monthStart }
  }, [viewMode, viewRange])

  // ── 构建日期→餐次映射（用于月视图快速查找）──────────
  const mealsByDate = useMemo(() => {
    const map = new Map<string, typeof dailyMeals[number]['meals']>()
    for (const dm of dailyMeals) {
      map.set(dm.date, dm.meals)
    }
    return map
  }, [dailyMeals])

  // ── 渲染 ──────────────────────────────────────────────

  return (
    <div className="dcc-root">
      <style>{DCC_CSS}</style>

      {/* ── 头部：导航 + 视图切换 ───────────────────── */}
      <div className="dcc-header">
        <div className="dcc-nav-row">
          <button onClick={goPrev} className="dcc-nav-arrow" title="上一周期">‹</button>
          <span className="dcc-title">{titleLabel}</span>
          <button onClick={goNext} className="dcc-nav-arrow" title="下一周期">›</button>

          <button onClick={goToday} className="dcc-today-btn">今天</button>

          {/* 视图切换 pills */}
          <div className="dcc-view-pills">
            {(['week', 'month'] as ViewMode[]).map((vm) => (
              <button
                key={vm}
                onClick={() => changeViewMode(vm)}
                className={`dcc-view-pill${viewMode === vm ? ' dcc-view-pill-active' : ''}`}
              >
                {vm === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 周视图 ──────────────────────────────────── */}
      {viewMode === 'week' && (
        <div className="dcc-week-view">
          {dailyMeals.map((dm) => {
            const dateObj = new Date(dm.date + 'T00:00:00')
            const isToday = isSameDay(dateObj, today)
            const dayLabel = `${['周一', '周二', '周三', '周四', '周五', '周六', '周日'][dateObj.getDay() === 0 ? 6 : dateObj.getDay() - 1]} ${fmtDateLabel(dateObj.getTime())}`

            return (
              <div
                key={dm.date}
                className={`dcc-day-card${isToday ? ' dcc-day-today' : ''}`}
              >
                <div className="dcc-day-header">
                  <span className="dcc-day-label">{dayLabel}</span>
                  {isToday && <span className="dcc-today-badge">今天</span>}
                  {dm.meals.length === 0 && (
                    <span className="dcc-no-meals">—</span>
                  )}
                </div>

                {dm.meals.length > 0 && (
                  <div className="dcc-meal-list">
                    {dm.meals.map((meal) => (
                      <div key={meal.eventId} className="dcc-meal-row">
                        <span
                          className="dcc-meal-dot"
                          style={{ background: MEAL_ORDER_COLORS[meal.mealOrder] }}
                        />
                        <span className="dcc-meal-icon">
                          {MEAL_ORDER_ICONS[meal.mealOrder]}
                        </span>
                        <span className="dcc-meal-order">
                          {MEAL_ORDER_LABELS[meal.mealOrder]}
                        </span>
                        <span className="dcc-meal-time">
                          {fmtTime(meal.startTime)}
                        </span>
                        <span className="dcc-meal-title">{meal.title}</span>
                        {/* 食物标签 */}
                        <span className="dcc-meal-tags">
                          {meal.foodTags.map((tag) => (
                            <span key={tag} className="dcc-tag-chip">
                              {tag}
                            </span>
                          ))}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── 月视图 ──────────────────────────────────── */}
      {viewMode === 'month' && monthGrid && (
        <div className="dcc-month-view">
          {/* 周标题 */}
          <div className="dcc-month-weekdays">
            {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
              <div key={d} className="dcc-month-weekday">{d}</div>
            ))}
          </div>

          {/* 日历网格 */}
          {monthGrid.weeks.map((week, wi) => (
            <div key={wi} className="dcc-month-week">
              {week.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const dayMeals = mealsByDate.get(dateKey) ?? []
                const isToday = isSameDay(day, today)
                const inMonth = isSameMonth(day, monthGrid.monthStart)

                // 按餐次去重着色
                const mealOrders = new Set(dayMeals.map((m) => m.mealOrder))

                return (
                  <div
                    key={dateKey}
                    className={`dcc-month-day${isToday ? ' dcc-month-today' : ''}${!inMonth ? ' dcc-month-other' : ''}`}
                  >
                    <span className="dcc-month-daynum">
                      {format(day, 'd')}
                    </span>

                    {dayMeals.length > 0 && (
                      <div className="dcc-month-dots">
                        {(['breakfast', 'lunch', 'dinner', 'night_snack'] as MealOrder[])
                          .filter((mo) => mealOrders.has(mo))
                          .map((mo) => (
                            <span
                              key={mo}
                              className="dcc-month-dot"
                              style={{ background: MEAL_ORDER_COLORS[mo] }}
                              title={MEAL_ORDER_LABELS[mo]}
                            />
                          ))}
                      </div>
                    )}

                    {/* Tooltip */}
                    {dayMeals.length > 0 && (
                      <div className="dcc-month-tooltip">
                        {dayMeals.map((meal) => (
                          <div key={meal.eventId} className="dcc-month-tooltip-row">
                            <span
                              className="dcc-month-tooltip-dot"
                              style={{ background: MEAL_ORDER_COLORS[meal.mealOrder] }}
                            />
                            <span>{MEAL_ORDER_LABELS[meal.mealOrder]}</span>
                            <span className="dcc-month-tooltip-time">
                              {fmtTime(meal.startTime)}
                            </span>
                            <span className="dcc-month-tooltip-title">
                              {meal.title}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── 图例 ──────────────────────────────────── */}
      <div className="dcc-legend">
        {(['breakfast', 'lunch', 'dinner', 'night_snack'] as MealOrder[]).map((mo) => (
          <span key={mo} className="dcc-legend-item">
            <span
              className="dcc-legend-dot"
              style={{ background: MEAL_ORDER_COLORS[mo] }}
            />
            {MEAL_ORDER_LABELS[mo]}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const DCC_CSS = `
.dcc-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
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
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  transition: color 0.2s ease;
}
.dcc-today-btn:hover {
  color: var(--heatmap-ink-1);
}
.dcc-view-pills {
  display: flex;
  gap: 2px;
  margin-left: auto;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
}
.dcc-view-pill {
  padding: 3px 12px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.dcc-view-pill:hover {
  color: var(--heatmap-ink-1);
}
.dcc-view-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Week view: day cards ────────────────────── */
.dcc-week-view {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.dcc-day-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  border: 1px solid var(--heatmap-rule);
  overflow: hidden;
}
.dcc-day-today {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}
.dcc-day-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--heatmap-rule);
}
.dcc-day-label {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
}
.dcc-today-badge {
  font-size: 10px;
  font-weight: 500;
  color: var(--accent);
  background: rgba(201, 100, 66, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}
.dcc-no-meals {
  margin-left: auto;
  font-size: 14px;
  color: var(--heatmap-ink-3);
  opacity: 0.3;
  font-family: 'JetBrains Mono', monospace;
}

/* ── Meal rows ──────────────────────────────── */
.dcc-meal-list {
  padding: 4px 12px 8px;
}
.dcc-meal-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 0;
  font-size: 12px;
}
.dcc-meal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dcc-meal-icon {
  font-size: 13px;
  width: 18px;
  text-align: center;
  flex-shrink: 0;
}
.dcc-meal-order {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  width: 28px;
  flex-shrink: 0;
}
.dcc-meal-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  width: 36px;
  flex-shrink: 0;
}
.dcc-meal-title {
  font-size: 13px;
  color: var(--heatmap-ink-1);
  font-weight: 500;
}
.dcc-meal-tags {
  display: flex;
  gap: 3px;
  margin-left: auto;
}
.dcc-tag-chip {
  font-size: 9px;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--heatmap-bg);
  color: var(--heatmap-ink-3);
  white-space: nowrap;
}

/* ── Month view ─────────────────────────────── */
.dcc-month-view {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.dcc-month-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 2px;
}
.dcc-month-weekday {
  text-align: center;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--heatmap-ink-3);
  padding: 4px 0;
}
.dcc-month-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.dcc-month-day {
  position: relative;
  aspect-ratio: 1;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
  transition: background-color 0.15s ease;
  overflow: visible;
}
.dcc-month-day:hover {
  background: var(--heatmap-bg);
}
.dcc-month-other {
  opacity: 0.3;
}
.dcc-month-today {
  border-color: var(--accent);
}
.dcc-month-daynum {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  line-height: 1;
}
.dcc-month-today .dcc-month-daynum {
  color: var(--accent);
  font-weight: 700;
}
.dcc-month-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  flex-wrap: wrap;
  justify-content: center;
}
.dcc-month-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Month tooltip ──────────────────────────── */
.dcc-month-tooltip {
  display: none;
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  z-index: 10;
  background: var(--heatmap-ink-1);
  color: var(--heatmap-bg);
  padding: 6px 10px;
  border-radius: 6px;
  font-size: 11px;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0,0,0,0.18);
  pointer-events: none;
}
.dcc-month-day:hover .dcc-month-tooltip {
  display: block;
}
.dcc-month-tooltip-row {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 1px 0;
}
.dcc-month-tooltip-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dcc-month-tooltip-time {
  font-family: 'JetBrains Mono', monospace;
  opacity: 0.7;
}
.dcc-month-tooltip-title {
  opacity: 0.85;
}

/* ── Legend ──────────────────────────────────── */
.dcc-legend {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}
.dcc-legend-item {
  display: flex;
  align-items: center;
  gap: 5px;
}
.dcc-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
`
/**
 * # DietFrequencyMatrix — 食物次数矩阵视图
 *
 * 按「本周 / 本月」范围展示食物出现次数矩阵。
 * 本周：按天（周一→周日）以餐次色圆点表示
 * 本月：按日历周（W1…Wn）以次数数字表示
 *
 * 导航由 StatsPage 通过 anchorDate prop 控制。
 */

import { useMemo, useState, startTransition } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import type { CalendarEvent, MealOrder } from '@/domain/event'
import { MEAL_ORDER_LABELS } from '@/domain/event'
import {
  computeFoodFreqWeek,
  computeFoodFreqMonth,
  getDietDimensionRange,
} from '@/domain/dietStats'

// ── 常量 ────────────────────────────────────────────────────

const MONTH_TOP_N = 8

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

const MEAL_ORDER_COLORS: Record<MealOrder, string> = {
  breakfast: 'var(--event-accent-fill)',
  lunch: 'var(--event-sage-fill)',
  dinner: 'var(--event-sky-fill)',
  night_snack: 'var(--event-rose-fill)',
}

// ── Props ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  /** 外部控制的锚点日期 */
  anchorDate?: Date
}

// ── 组件 ────────────────────────────────────────────────────

export function DietFrequencyMatrix({ rangeEvents, anchorDate: anchorDateProp }: Props) {
  const [scope, setScope] = useState<'week' | 'month'>('week')
  const anchorDate = anchorDateProp ?? new Date()

  const changeScope = (s: 'week' | 'month') => startTransition(() => setScope(s))

  // ── 周/月范围 ──────────────────────────────────────────
  const range = useMemo(() => {
    if (scope === 'week') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
      const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
      return { start: start.getTime(), end: end.getTime() + 86_400_000 }
    }
    return getDietDimensionRange('month', anchorDate.getTime())
  }, [scope, anchorDate])

  // ── 数据 ──────────────────────────────────────────────
  const weekData = useMemo(
    () => (scope === 'week' ? computeFoodFreqWeek(rangeEvents, range) : undefined),
    [scope, rangeEvents, range],
  )

  const monthData = useMemo(
    () => (scope === 'month' ? computeFoodFreqMonth(rangeEvents, range, MONTH_TOP_N) : undefined),
    [scope, rangeEvents, range],
  )

  const empty =
    (scope === 'week' && weekData && weekData.length === 0) ||
    (scope === 'month' && monthData && monthData.rows.length === 0)

  return (
    <div className="dfm-root">
      <style>{DFM_CSS}</style>

      {/* ── Scope pills ──────────────────────────────── */}
      <div className="dfm-scope-pills">
        <button
          className={`dfm-pill${scope === 'week' ? ' dfm-pill-active' : ''}`}
          onClick={() => changeScope('week')}
        >
          本周
        </button>
        <button
          className={`dfm-pill${scope === 'month' ? ' dfm-pill-active' : ''}`}
          onClick={() => changeScope('month')}
        >
          本月
        </button>
      </div>

      {/* ── 表格 ──────────────────────────────────────── */}
      {empty ? (
        <div className="dfm-empty">暂无饮食记录</div>
      ) : scope === 'week' ? (
        <div className="dfm-table-wrap">
          <table className="dfm-table">
            <thead>
              <tr>
                <th className="dfm-th dfm-th-name">食物</th>
                {WEEKDAY_LABELS.map((d, i) => (
                  <th key={i} className="dfm-th dfm-th-day">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekData!.map((row, ri) => (
                <tr key={ri} className="dfm-row">
                  <td className="dfm-td dfm-td-name">{row.title}</td>
                  {row.days.map((cell, ci) => (
                    <td key={ci} className="dfm-td dfm-td-cell">
                      {cell !== null ? (
                        <span
                          className="dfm-dot"
                          style={{ backgroundColor: MEAL_ORDER_COLORS[cell] }}
                          title={`${WEEKDAY_LABELS[ci]}·${MEAL_ORDER_LABELS[cell]}`}
                        />
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="dfm-table-wrap">
          <table className="dfm-table">
            <thead>
              <tr>
                <th className="dfm-th dfm-th-name">食物</th>
                {Array.from({ length: monthData!.weekCount }, (_, i) => (
                  <th key={i} className="dfm-th dfm-th-week">W{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthData!.rows.map((row, ri) => (
                <tr key={ri} className="dfm-row">
                  <td className="dfm-td dfm-td-name">{row.title}</td>
                  {row.weeks.map((cell, ci) => (
                    <td
                      key={ci}
                      className="dfm-td dfm-td-cell"
                    >
                      {cell > 0 ? (
                        <span className="dfm-count">{cell}</span>
                      ) : null}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const DFM_CSS = `
.dfm-root {
  width: 100%;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── Scope pills ─────────────────────────── */
.dfm-scope-pills {
  display: flex;
  gap: 2px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
  width: fit-content;
  margin-bottom: 16px;
}
.dfm-pill {
  padding: 5px 16px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.dfm-pill:hover {
  color: var(--heatmap-ink-1);
}
.dfm-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Empty state ─────────────────────────── */
.dfm-empty {
  text-align: center;
  padding: 48px 20px;
  font-size: 14px;
  color: var(--heatmap-ink-3);
}

/* ── Table ───────────────────────────────── */
.dfm-table-wrap {
  overflow-x: auto;
}
.dfm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.dfm-th {
  padding: 8px 6px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  border-bottom: 1px solid var(--heatmap-rule);
  text-align: center;
}
.dfm-th-name {
  text-align: left;
  min-width: 100px;
}
.dfm-th-day {
  width: 40px;
}
.dfm-th-week {
  width: 44px;
}
.dfm-row:not(:last-child) .dfm-td {
  border-bottom: 1px solid var(--heatmap-rule);
}
.dfm-td {
  padding: 8px 6px;
  vertical-align: middle;
}
.dfm-td-name {
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.dfm-td-cell {
  text-align: center;
}
.dfm-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 1px;
  vertical-align: middle;
}
.dfm-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--heatmap-ink-2);
}
`

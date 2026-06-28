/**
 * # HygieneFrequencyMatrix — 卫生频次矩阵视图
 *
 * 按「本周 / 本月」范围展示卫生活动出现次数矩阵。
 * 本周：按天（周一→周日）以活动色圆点表示
 * 本月：按日历周（W1…Wn）以次数数字表示
 *
 * 导航由 StatsPage 通过 anchorDate prop 控制。
 */

import { useMemo, useState, startTransition } from 'react'
import { startOfWeek, endOfWeek } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import type { HygieneActivityDef } from '@/domain/hygieneActivity'
import { hygieneColorVar } from '@/domain/hygieneActivity'
import {
  computeHygieneFreqWeek,
  computeHygieneFreqMonth,
} from '@/domain/hygieneStats'

// ── 常量 ────────────────────────────────────────────────────

const MONTH_TOP_N = 8

const WEEKDAY_LABELS = ['一', '二', '三', '四', '五', '六', '日']

// ── Props ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  activities: readonly HygieneActivityDef[]
  /** 外部控制的锚点日期 */
  anchorDate?: Date
}

// ── 辅助 ────────────────────────────────────────────────────

function fmtWeekTooltip(dow: number, count: number): string {
  return `周${WEEKDAY_LABELS[dow]}·${count}次`
}

// ── 组件 ────────────────────────────────────────────────────

export function HygieneFrequencyMatrix({ rangeEvents, activities, anchorDate: anchorDateProp }: Props) {
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
    const monthStart = new Date(anchorDate.getFullYear(), anchorDate.getMonth(), 1)
    const monthEnd = new Date(anchorDate.getFullYear(), anchorDate.getMonth() + 1, 1)
    return { start: monthStart.getTime(), end: monthEnd.getTime() }
  }, [scope, anchorDate])

  // ── 数据 ──────────────────────────────────────────────
  const weekData = useMemo(
    () => (scope === 'week' ? computeHygieneFreqWeek(rangeEvents, range, activities) : undefined),
    [scope, rangeEvents, activities, range],
  )

  const monthData = useMemo(
    () => (scope === 'month' ? computeHygieneFreqMonth(rangeEvents, range, activities, MONTH_TOP_N) : undefined),
    [scope, rangeEvents, activities, range],
  )

  const empty =
    (scope === 'week' && weekData && weekData.length === 0) ||
    (scope === 'month' && monthData && monthData.rows.length === 0)

  return (
    <div className="hfm-root">
      <style>{HFM_CSS}</style>

      {/* ── Scope pills ──────────────────────────────── */}
      <div className="hfm-scope-pills">
        <button
          className={`hfm-pill${scope === 'week' ? ' hfm-pill-active' : ''}`}
          onClick={() => changeScope('week')}
        >
          本周
        </button>
        <button
          className={`hfm-pill${scope === 'month' ? ' hfm-pill-active' : ''}`}
          onClick={() => changeScope('month')}
        >
          本月
        </button>
      </div>

      {/* ── 表格 ──────────────────────────────────────── */}
      {empty ? (
        <div className="hfm-empty">暂无卫生记录</div>
      ) : scope === 'week' ? (
        <div className="hfm-table-wrap">
          <table className="hfm-table">
            <thead>
              <tr>
                <th className="hfm-th hfm-th-name">活动</th>
                {WEEKDAY_LABELS.map((d, i) => (
                  <th key={i} className="hfm-th hfm-th-day">{d}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weekData!.map((row, ri) => (
                <tr key={ri} className="hfm-row">
                  <td className="hfm-td hfm-td-name">{row.name}</td>
                  {row.days.map((cell, ci) => (
                    <td key={ci} className="hfm-td hfm-td-cell">
                      {cell > 0 ? (
                        <span
                          className="hfm-dot"
                          style={{ backgroundColor: hygieneColorVar(row.activityId) }}
                          title={fmtWeekTooltip(ci, cell)}
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
        <div className="hfm-table-wrap">
          <table className="hfm-table">
            <thead>
              <tr>
                <th className="hfm-th hfm-th-name">活动</th>
                {Array.from({ length: monthData!.weekCount }, (_, i) => (
                  <th key={i} className="hfm-th hfm-th-week">W{i + 1}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {monthData!.rows.map((row, ri) => (
                <tr key={ri} className="hfm-row">
                  <td className="hfm-td hfm-td-name">{row.name}</td>
                  {row.weeks.map((cell, ci) => (
                    <td
                      key={ci}
                      className="hfm-td hfm-td-cell"
                    >
                      {cell > 0 ? <span className="hfm-count">{cell}</span> : null}
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

const HFM_CSS = `
.hfm-root {
  width: 100%;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── Scope pills ─────────────────────────── */
.hfm-scope-pills {
  display: flex;
  gap: 2px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
  width: fit-content;
  margin-bottom: 16px;
}
.hfm-pill {
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
.hfm-pill:hover {
  color: var(--heatmap-ink-1);
}
.hfm-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Empty state ─────────────────────────── */
.hfm-empty {
  text-align: center;
  padding: 48px 20px;
  font-size: 14px;
  color: var(--heatmap-ink-3);
}

/* ── Table ───────────────────────────────── */
.hfm-table-wrap {
  overflow-x: auto;
}
.hfm-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.hfm-th {
  padding: 8px 6px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  border-bottom: 1px solid var(--heatmap-rule);
  text-align: center;
}
.hfm-th-name {
  text-align: left;
  min-width: 100px;
}
.hfm-th-day {
  width: 40px;
}
.hfm-th-week {
  width: 44px;
}
.hfm-row:not(:last-child) .hfm-td {
  border-bottom: 1px solid var(--heatmap-rule);
}
.hfm-td {
  padding: 8px 6px;
  vertical-align: middle;
}
.hfm-td-name {
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.hfm-td-cell {
  text-align: center;
}
.hfm-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin: 0 1px;
  vertical-align: middle;
}
.hfm-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--heatmap-ink-2);
}
`

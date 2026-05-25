/**
 * # LeisureCard — 娱乐放松卡片
 *
 * 展示放松方式的分布与趋势。通过堆叠条形图（按天）显示
 * screen/social/quiet/active 四种类型的时长变化。
 *
 * 数据来自 DailyLeisure 记录（需从 dailyContextStore 加载）。
 */

import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import type { DailyLeisure } from '@/domain/dailyContext'
import { RELAX_TYPE_LABELS } from '@/domain/dailyContext'
import type { RelaxType } from '@/domain/dailyContext'
import { useAppSettingsStore } from '@/stores/settingsStore'

const RELAX_TYPES: RelaxType[] = ['screen', 'social', 'quiet', 'active']

interface Props {
  records: DailyLeisure[]
}

// ── 组件 ──────────────────────────────────────────────────

export function LeisureCard({ records }: Props) {
  const language = useAppSettingsStore((s) => s.settings.language)

  // 过去 14 天的每日娱乐数据
  const dailyData = useMemo(() => {
    const now = Date.now()

    // 按日期+类型聚合
    const agg = new Map<string, Record<RelaxType, number>>()

    for (const r of records) {
      const key = r.date
      if (!agg.has(key)) {
        const empty = {} as Record<RelaxType, number>
        for (const rt of RELAX_TYPES) empty[rt] = 0
        agg.set(key, empty)
      }
      const day = agg.get(key)!
      day[r.relaxType] = (day[r.relaxType] ?? 0) + r.durationMinutes
    }

    // 填充最近 14 天
    const result: Array<{
      date: string
      label: string
      byType: Record<RelaxType, number>
      total: number
    }> = []

    for (let i = 14; i >= 0; i--) {
      const day = format(subDays(now, i), 'yyyy-MM-dd')
      const label = format(subDays(now, i), 'MM/dd')
      const byType = agg.get(day) ?? { screen: 0, social: 0, quiet: 0, active: 0 }
      const total = Object.values(byType).reduce((s, v) => s + v, 0)
      result.push({ date: day, label, byType, total })
    }

    return result
  }, [records])

  // 本周汇总
  const weeklyTotal = useMemo(() => {
    const recent = dailyData.slice(-7)
    const totals: Record<RelaxType, number> = { screen: 0, social: 0, quiet: 0, active: 0 }
    for (const day of recent) {
      for (const rt of RELAX_TYPES) {
        totals[rt] += day.byType[rt]
      }
    }
    const total = Object.values(totals).reduce((s, v) => s + v, 0)
    return { totals, total }
  }, [dailyData])

  // 最大柱高（用于归一化）
  const maxTotal = useMemo(() => {
    return Math.max(...dailyData.map((d) => d.total), 1)
  }, [dailyData])

  const typeColors: Record<RelaxType, string> = {
    screen:  'var(--color-text-danger)',
    social:  'var(--color-text-info)',
    quiet:   'var(--color-text-success)',
    active:  'var(--color-text-warning)',
  }

  return (
    <div className="leisure-root">
      <style>{LEISURE_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="leisure-header">
        <span className="leisure-header-icon">🎯</span>
        <span className="leisure-header-title">{'娱乐放松'}</span>
      </div>

      {/* ── 堆叠条形图 ────────────────────────── */}
      <div className="leisure-chart">
        <div className="leisure-chart-title">
          {'近 15 天放松方式分布'}
        </div>
        <div className="leisure-chart-body">
          {dailyData.map((day) => {
            const pctTotal = day.total > 0 ? (day.total / maxTotal) * 100 : 0

            // 各类型累积宽度
            let cumPct = 0
            const segments = RELAX_TYPES.map((rt) => {
              const pct = day.total > 0 ? (day.byType[rt] / day.total) * pctTotal : 0
              const start = cumPct
              cumPct += pct
              return { type: rt, pct, start }
            }).filter((s) => s.pct > 0)

            return (
              <div key={day.date} className="leisure-bar-row">
                <span className="leisure-bar-label">{day.label}</span>
                <div className="leisure-bar-track">
                  {day.total > 0 ? (
                    segments.map((seg) => (
                      <div
                        key={seg.type}
                        className="leisure-bar-seg"
                        style={{
                          left: `${seg.start}%`,
                          width: `${seg.pct}%`,
                          backgroundColor: typeColors[seg.type],
                          opacity: 0.7,
                        }}
                        title={`${RELAX_TYPE_LABELS[seg.type][language === 'zh' ? 'zh' : 'en']}: ${(day.byType[seg.type] / 60).toFixed(1)}h`}
                      />
                    ))
                  ) : (
                    <div className="leisure-bar-empty" />
                  )}
                </div>
                <span className="leisure-bar-value">
                  {day.total > 0 ? (day.total / 60).toFixed(1) : ''}
                </span>
              </div>
            )
          })}
        </div>

        {/* 图例 */}
        <div className="leisure-legend">
          {RELAX_TYPES.map((rt) => (
            <span key={rt} className="leisure-legend-item">
              <span
                className="leisure-legend-swatch"
                style={{ backgroundColor: typeColors[rt], opacity: 0.7 }}
              />
              {RELAX_TYPE_LABELS[rt][language === 'zh' ? 'zh' : 'en']}
            </span>
          ))}
          <span className="leisure-legend-note">
            {'每小时=一格'}
          </span>
        </div>
      </div>

      {/* ── 本周汇总 ──────────────────────────── */}
      <div className="leisure-summary">
        {RELAX_TYPES.map((rt) => {
          const label = RELAX_TYPE_LABELS[rt][language === 'zh' ? 'zh' : 'en']
          const hours = weeklyTotal.totals[rt] / 60
          const pct = weeklyTotal.total > 0
            ? Math.round((weeklyTotal.totals[rt] / weeklyTotal.total) * 100)
            : 0

          return (
            <div key={rt} className="leisure-summary-item">
              <div className="leisure-summary-top">
                <span className="leisure-summary-dot" style={{ backgroundColor: typeColors[rt] }} />
                <span className="leisure-summary-label">{label}</span>
              </div>
              <div className="leisure-summary-value">
                {hours.toFixed(1)}
                <span className="leisure-summary-unit">{'小时'}</span>
              </div>
              <div className="leisure-summary-bar-wrap">
                <div
                  className="leisure-summary-bar"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: typeColors[rt],
                    opacity: 0.6,
                  }}
                />
              </div>
              <div className="leisure-summary-pct">{pct}%</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const LEISURE_CSS = `
.leisure-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.leisure-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.leisure-header-icon { font-size: 18px; }
.leisure-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}

/* ── Stacked bar chart ────────────────── */
.leisure-chart {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--heatmap-rule);
  margin-bottom: 16px;
}
.leisure-chart-title {
  font-size: 12px;
  color: var(--heatmap-ink-2);
  margin-bottom: 12px;
}
.leisure-chart-body {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.leisure-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.leisure-bar-label {
  width: 36px;
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--heatmap-ink-3);
  text-align: right;
}
.leisure-bar-track {
  flex: 1;
  height: 16px;
  background: var(--heatmap-bg);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}
.leisure-bar-seg {
  position: absolute;
  top: 0;
  height: 100%;
  border-radius: 3px;
  transition: width 0.2s ease;
}
.leisure-bar-empty {
  width: 100%;
  height: 2px;
  background: var(--heatmap-ink-3);
  opacity: 0.08;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}
.leisure-bar-value {
  width: 32px;
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--heatmap-ink-2);
  text-align: right;
}

/* ── Legend ────────────────────────────── */
.leisure-legend {
  display: flex;
  gap: 12px;
  margin-top: 10px;
  padding-top: 8px;
  border-top: 1px solid var(--heatmap-rule);
  flex-wrap: wrap;
}
.leisure-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
.leisure-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.leisure-legend-note {
  margin-left: auto;
  font-size: 10px;
  opacity: 0.5;
}

/* ── Weekly summary ───────────────────── */
.leisure-summary {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}
@media (min-width: 720px) {
  .leisure-summary {
    grid-template-columns: repeat(4, 1fr);
  }
}
.leisure-summary-item {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 10px;
}
.leisure-summary-top {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
}
.leisure-summary-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.leisure-summary-label {
  font-size: 11px;
  color: var(--heatmap-ink-2);
}
.leisure-summary-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 18px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  margin-bottom: 4px;
}
.leisure-summary-unit {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-left: 2px;
}
.leisure-summary-bar-wrap {
  height: 3px;
  background: var(--heatmap-bg);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 2px;
}
.leisure-summary-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.leisure-summary-pct {
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
`
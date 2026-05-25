/**
 * # BodyMetricsPanel — 身体指标面板
 *
 * 展示体重/BMI 趋势（折线图）、静息心率示值、视力快照。
 * 数据来自 BodyMetricsRecord 时序记录（需从 bodyMetricsStore 加载）。
 */

import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { format } from 'date-fns'
import type { BodyMetricsRecord } from '@/domain/dailyContext'
import type { Profile } from '@/domain/profile'
import { computeBMI } from '@/domain/dailyContext'

interface Props {
  records: BodyMetricsRecord[]
  profile: Profile | null
}

// ── 辅助 ──────────────────────────────────────────────────

function fmtDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return format(d, 'M/d')
}

// ── 组件 ──────────────────────────────────────────────────

export function BodyMetricsPanel({ records, profile }: Props) {

  // 准备图表数据（按日期升序，计算 BMI）
  const chartData = useMemo(() => {
    const height = profile?.body?.height ?? null
    const sorted = [...records].sort((a, b) => a.date.localeCompare(b.date))

    return sorted.map((r) => ({
      date: r.date,
      label: fmtDate(r.date),
      weight: r.weight ?? null,
      bmi: r.bmi ?? (r.weight !== null && height !== null ? computeBMI(r.weight, height) : null),
      restingHR: r.restingHR ?? null,
    }))
  }, [records, profile])

  // 最新一条记录
  const latest = useMemo(() => {
    if (chartData.length === 0) return null
    return chartData[chartData.length - 1]
  }, [chartData])

  // 7 日移动平均（最近有数据的 7 条）
  const movingAvg = useMemo(() => {
    const withWeight = chartData.filter((d) => d.weight !== null).slice(-7)
    if (withWeight.length === 0) return null
    const avg = withWeight.reduce((s, d) => s + (d.weight ?? 0), 0) / withWeight.length
    return Math.round(avg * 10) / 10
  }, [chartData])

  // 趋势方向
  const trend = useMemo(() => {
    if (chartData.length < 7) return null
    const recent = chartData.filter((d) => d.weight !== null)
    if (recent.length < 7) return null
    const first = recent.slice(-7)[0].weight!
    const last = recent[recent.length - 1].weight!
    const diff = last - first
    return {
      diff: Math.round(diff * 10) / 10,
      direction: diff > 0.5 ? 'up' : diff < -0.5 ? 'down' : 'stable',
    }
  }, [chartData])

  const hasWeightData = chartData.some((d) => d.weight !== null)
  const hasHRData = chartData.some((d) => d.restingHR !== null)

  return (
    <div className="body-metrics-root">
      <style>{BODY_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="body-title-area">
        <span className="body-title-main">
          {'身体指标'}
        </span>
        <p className="body-title-desc">
          {'历史记录趋势，数据来自手动录入'}
        </p>
      </div>

      {/* ── 体重趋势 ──────────────────────────── */}
      {hasWeightData && (
        <div className="body-chart-card">
          <div className="body-chart-header">
            <div>
              <div className="body-chart-title">{'体重趋势'}</div>
              <div className="body-chart-subtitle">
                {'含 7 点移动平均'}
              </div>
            </div>
            <div className="body-chart-stats">
              {latest?.weight !== null && latest?.weight !== undefined && (
                <div className="body-chart-stat">
                  <span className="body-stat-num">{latest.weight}</span>
                  <span className="body-stat-unit">kg</span>
                </div>
              )}
              {movingAvg !== null && (
                <div className="body-chart-stat">
                  <span className="body-stat-num">{movingAvg}</span>
                  <span className="body-stat-unit">{'MA7'}</span>
                </div>
              )}
              {trend && (
                <div
                  className="body-chart-stat"
                  style={{
                    color: trend.direction === 'up'
                      ? 'var(--color-text-danger)'
                      : trend.direction === 'down'
                        ? 'var(--color-text-success)'
                        : 'var(--heatmap-ink-3)',
                  }}
                >
                  <span className="body-stat-num">
                    {trend.diff >= 0 ? '+' : ''}{trend.diff}
                  </span>
                  <span className="body-stat-unit">{'7d'}</span>
                </div>
              )}
            </div>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v: number) => `${v}`}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="body-tooltip">
                        <div className="body-tooltip-label">{label}</div>
                        {payload.map((p, i) => (
                          <div key={i} className="body-tooltip-row">
                            <span className="body-tooltip-name">{p.name}</span>
                            <span className="body-tooltip-val">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="weight"
                  name={'体重'}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── BMI 趋势 ──────────────────────────── */}
      {chartData.some((d) => d.bmi !== null) && (
        <div className="body-chart-card">
          <div className="body-chart-header">
            <div>
              <div className="body-chart-title">{'BMI 趋势'}</div>
              <div className="body-chart-subtitle">
                {'基于体重与身高计算'}
              </div>
            </div>
            <div className="body-chart-stats">
              {(() => {
                const lastBmi = chartData.filter((d) => d.bmi !== null).pop()
                return lastBmi ? (
                  <div className="body-chart-stat">
                    <span className="body-stat-num">{lastBmi.bmi}</span>
                  </div>
                ) : null
              })()}
            </div>
          </div>
          <div style={{ width: '100%', height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload, label }) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div className="body-tooltip">
                        <div className="body-tooltip-label">{label}</div>
                        {payload.map((p, i) => (
                          <div key={i} className="body-tooltip-row">
                            <span className="body-tooltip-name">{p.name}</span>
                            <span className="body-tooltip-val">{p.value}</span>
                          </div>
                        ))}
                      </div>
                    )
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="bmi"
                  name="BMI"
                  stroke="var(--event-sage-fill)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--event-sage-fill)', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: 'var(--event-sage-fill)', strokeWidth: 0 }}
                  connectNulls={false}
                />
                <ReferenceLine
                  y={24}
                  stroke="var(--color-text-warning)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: '24',
                    position: 'insideTopRight',
                    fill: 'var(--color-text-warning)',
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  y={18.5}
                  stroke="var(--color-text-info)"
                  strokeDasharray="4 4"
                  strokeWidth={1}
                  label={{
                    value: '18.5',
                    position: 'insideBottomRight',
                    fill: 'var(--color-text-info)',
                    fontSize: 10,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 静息心率 ──────────────────────────── */}
      {hasHRData && (
        <div className="body-chart-card">
          <div className="body-chart-header">
            <div>
              <div className="body-chart-title">{'静息心率'}</div>
              <div className="body-chart-subtitle">
                {'参考范围: 60-100 bpm'}
              </div>
            </div>
            {latest?.restingHR !== null && latest?.restingHR !== undefined && (
              <div className="body-chart-stats">
                <div className="body-chart-stat">
                  <span
                    className="body-stat-num"
                    style={{
                      color: latest.restingHR >= 60 && latest.restingHR <= 100
                        ? 'var(--color-text-success)'
                        : 'var(--color-text-danger)',
                    }}
                  >
                    {latest.restingHR}
                  </span>
                  <span className="body-stat-unit">bpm</span>
                </div>
              </div>
            )}
          </div>
          <div style={{ width: '100%', height: 160 }}>
            <ResponsiveContainer>
              <LineChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)' }}
                  tickLine={false}
                  axisLine={{ stroke: 'var(--border-subtle)' }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  domain={[40, 120]}
                  tick={{ fontSize: 10, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
                  tickLine={false}
                  axisLine={false}
                  width={36}
                />
                <ReferenceLine
                  y={60}
                  stroke="var(--color-text-success)"
                  strokeDasharray="4 4"
                  strokeWidth={0.5}
                />
                <ReferenceLine
                  y={100}
                  stroke="var(--color-text-warning)"
                  strokeDasharray="4 4"
                  strokeWidth={0.5}
                />
                <Line
                  type="monotone"
                  dataKey="restingHR"
                  name={'心率'}
                  stroke="var(--event-rose-fill)"
                  strokeWidth={1.5}
                  dot={{ r: 2, fill: 'var(--event-rose-fill)', strokeWidth: 0 }}
                  activeDot={{ r: 4, fill: 'var(--event-rose-fill)', strokeWidth: 0 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── 视力快照 ──────────────────────────── */}
      {profile?.body?.visionLeft !== null && profile?.body?.visionRight !== null && (
        <div className="body-vision-card">
          <div className="body-vision-header">
            <span className="body-vision-icon">👁</span>
            <span className="body-vision-title">{'视力快照'}</span>
          </div>
          <div className="body-vision-body">
            <div className="body-vision-item">
              <span className="body-vision-label">{'左眼'}</span>
              <span className="body-vision-value">{profile?.body?.visionLeft}</span>
            </div>
            <div className="body-vision-item">
              <span className="body-vision-label">{'右眼'}</span>
              <span className="body-vision-value">{profile?.body?.visionRight}</span>
            </div>
            {profile?.body?.visionLastCheck && (
              <div className="body-vision-item">
                <span className="body-vision-label">{'最近验光'}</span>
                <span className="body-vision-value">{profile?.body?.visionLastCheck}</span>
              </div>
            )}
          </div>
          <div className="body-vision-note">
            {'视力变化以年为单位，不适合趋势图'}
          </div>
        </div>
      )}

      {/* ── 空状态 ────────────────────────────── */}
      {!hasWeightData && !hasHRData && (!profile?.body?.visionLeft) && (
        <div className="body-empty">
          <p className="body-empty-text">
            {'尚无身体指标数据。可在设置或个人档案中录入。'}
          </p>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const BODY_CSS = `
.body-metrics-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.body-title-area {
  margin-bottom: 24px;
}
.body-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.body-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 6px 0 0;
}

/* ── Chart cards ──────────────────────────── */
.body-chart-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
  border: 1px solid var(--heatmap-rule);
}
.body-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.body-chart-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.body-chart-subtitle {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-top: 2px;
}
.body-chart-stats {
  display: flex;
  gap: 12px;
  align-items: center;
}
.body-chart-stat {
  text-align: right;
}
.body-stat-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 20px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
}
.body-stat-unit {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-left: 2px;
}

/* ── Tooltip ────────────────────────────── */
.body-tooltip {
  background: var(--heatmap-bg);
  border: 1px solid var(--heatmap-rule);
  padding: 8px 12px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}
.body-tooltip-label {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  margin-bottom: 4px;
}
.body-tooltip-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 12px;
}
.body-tooltip-name {
  color: var(--heatmap-ink-2);
}
.body-tooltip-val {
  font-family: 'JetBrains Mono', monospace;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}

/* ── Vision card ──────────────────────────── */
.body-vision-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--heatmap-rule);
}
.body-vision-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}
.body-vision-icon { font-size: 18px; }
.body-vision-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.body-vision-body {
  display: flex;
  gap: 24px;
  margin-bottom: 12px;
}
.body-vision-item {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.body-vision-label {
  font-size: 12px;
  color: var(--heatmap-ink-3);
}
.body-vision-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.body-vision-note {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  font-style: italic;
  padding-top: 8px;
  border-top: 1px solid var(--heatmap-rule);
}

/* ── Empty state ──────────────────────────── */
.body-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
}
.body-empty-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
}

@media (max-width: 719px) {
  .body-title-main { font-size: 22px; }
  .body-stat-num { font-size: 16px; }
}
`
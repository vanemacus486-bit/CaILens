/**
 * # SteadyMetricsPanel — 稳态指标面板
 *
 * 替代旧的"连续天数"冲刺型指标，展示更能反映长期规律性的稳态指标：
 * - 覆盖率（周期内有记录的天数占比）
 * - 中位数（抗离群值的中心趋势）
 * - 标准差（波动幅度）
 * - 漂移速度（作息滑动的速率）
 * - 一致性指数（综合规律性评分）
 */

import { useMemo } from 'react'
import type { CalendarEvent } from '@/domain/event'
import {
  extractSleepNights,
  computeSleepSteadyMetrics,
} from '@/domain/steadyMetrics'

interface Props {
  rangeEvents: CalendarEvent[]
}

function fmtHour(h: number): string {
  const hr = Math.floor(h)
  const mi = Math.round((h - hr) * 60)
  return `${String(hr).padStart(2, '0')}:${String(mi).padStart(2, '0')}`
}

function fmtDuration(h: number): string {
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${String(mins).padStart(2, '0')}m`
}

export function SteadyMetricsPanel({ rangeEvents }: Props) {

  const now = useMemo(() => Date.now(), [])
  const periodDays = 90 // 最近 90 天

  const metrics = useMemo(() => {
    const rangeStart = now - periodDays * 24 * 60 * 60_000
    const nights = extractSleepNights(rangeEvents, rangeStart, now)
    return computeSleepSteadyMetrics(nights, periodDays)
  }, [rangeEvents, now, periodDays])

  // ── 方向图标与颜色 ──────────────────────────
  const driftColor =
    metrics.driftDirection === 'stable'
      ? 'var(--color-text-success)'
      : 'var(--color-text-warning)'
  const driftLabel =
    metrics.driftDirection === 'delaying'
      ? '推迟中'
      : metrics.driftDirection === 'advancing'
        ? '提前中'
        : '稳定'

  const consistencyLevel =
    metrics.consistencyIndex >= 0.8
      ? '良好'
      : metrics.consistencyIndex >= 0.5
        ? '一般'
        : '波动大'
  const consistencyColor =
    metrics.consistencyIndex >= 0.8
      ? 'var(--color-text-success)'
      : metrics.consistencyIndex >= 0.5
        ? 'var(--color-text-warning)'
        : 'var(--color-text-danger)'

  return (
    <div className="steady-root">
      <style>{STEADY_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="steady-title-area">
        <div className="steady-title-row">
          <span className="steady-title-main">
            {'稳态指标'}
          </span>
        </div>
        <p className="steady-title-desc">
          {'最近 90 天睡眠规律性分析'}
        </p>
      </div>

      {/* ── 概览行 ────────────────────────────── */}
      <div className="steady-overview">
        <div className="steady-kpi">
          <div className="steady-kpi-label">{'一致性指数'}</div>
          <div className="steady-kpi-value" style={{ color: consistencyColor }}>
            {(metrics.consistencyIndex * 100).toFixed(0)}
            <span className="steady-kpi-unit">%</span>
          </div>
          <div className="steady-kpi-extra">{consistencyLevel}</div>
        </div>

        <div className="steady-kpi">
          <div className="steady-kpi-label">{'覆盖率'}</div>
          <div className="steady-kpi-value">
            {(metrics.coverage * 100).toFixed(0)}
            <span className="steady-kpi-unit">%</span>
          </div>
          <div className="steady-kpi-extra">
            {`${metrics.recordedDays}/${metrics.periodDays} 天`}
          </div>
        </div>

        <div className="steady-kpi">
          <div className="steady-kpi-label">{'漂移速度'}</div>
          <div className="steady-kpi-value" style={{ color: driftColor }}>
            {metrics.driftSpeed > 0 ? '+' : ''}{metrics.driftSpeed.toFixed(1)}
            <span className="steady-kpi-unit">{'分/周'}</span>
          </div>
          <div className="steady-kpi-extra">{driftLabel}</div>
        </div>

        <div className="steady-kpi">
          <div className="steady-kpi-label">{'样本量'}</div>
          <div className="steady-kpi-value">
            {metrics.recordedDays}
            <span className="steady-kpi-unit">{'晚'}</span>
          </div>
          <div className="steady-kpi-extra">
            {metrics.recordedDays === 0
              ? '暂无数据'
              : '可用于分析'}
          </div>
        </div>
      </div>

      {/* ── 详细指标表 ────────────────────────── */}
      <div className="steady-detail-grid">
        {/* 就寝时间 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {'就寝时间'}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'均值'}</span>
              <span className="steady-detail-value">{fmtHour(metrics.meanBedtime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'中位数'}</span>
              <span className="steady-detail-value">{fmtHour(metrics.medianBedtime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'标准差'}</span>
              <span className="steady-detail-value">
                {metrics.stdBedtime.toFixed(1)}
                <span className="steady-unit">{'小时'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 起床时间 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {'起床时间'}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'均值'}</span>
              <span className="steady-detail-value">{fmtHour(metrics.meanWakeTime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'中位数'}</span>
              <span className="steady-detail-value">{fmtHour(metrics.medianWakeTime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'标准差'}</span>
              <span className="steady-detail-value">
                {metrics.stdWakeTime.toFixed(1)}
                <span className="steady-unit">{'小时'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 睡眠时长 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {'睡眠时长'}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'均值'}</span>
              <span className="steady-detail-value">{fmtDuration(metrics.meanDuration)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'中位数'}</span>
              <span className="steady-detail-value">{fmtDuration(metrics.medianDuration)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'标准差'}</span>
              <span className="steady-detail-value">
                {metrics.stdDuration.toFixed(1)}
                <span className="steady-unit">{'小时'}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 漂移分析 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {'漂移分析'}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'速度'}</span>
              <span className="steady-detail-value" style={{ color: driftColor }}>
                {metrics.driftSpeed > 0 ? '+' : ''}{metrics.driftSpeed.toFixed(1)}
                <span className="steady-unit">{'分/周'}</span>
              </span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'方向'}</span>
              <span className="steady-detail-value" style={{ color: driftColor }}>
                {driftLabel}
              </span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{'30 天预估'}</span>
              <span className="steady-detail-value">
                {metrics.driftSpeed === 0 || metrics.recordedDays === 0
                  ? '—'
                  : fmtHour(metrics.meanBedtime + (metrics.driftSpeed * 30) / (60 * 7))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 解读文本 ──────────────────────────── */}
      <div className="steady-insight">
        <div className="steady-insight-icon">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" />
            <path d="M7 4V8M7 9.5V10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
          </svg>
        </div>
        <p className="steady-insight-text">
          {metrics.recordedDays === 0
            ? '尚无足够的睡眠数据生成稳态分析'
            : metrics.consistencyIndex >= 0.8
              ? '作息规律性良好，当前模式值得保持。'
              : metrics.consistencyIndex >= 0.5
                ? '作息有一定规律，但波动不小。关注就寝时间的稳定性。'
                : '作息波动较大，建议优先关注就寝时间的一致性。'}
        </p>
      </div>
    </div>
  )
}

// ── Scoped CSS (matches existing stats components' design language) ──

const STEADY_CSS = `
.steady-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
  padding-top: 28px;
}

/* ── Title ────────────────────────────────── */
.steady-title-area {
  margin-bottom: 28px;
}
.steady-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.steady-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.steady-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 6px 0 0;
}

/* ── KPI bar ──────────────────────────────── */
.steady-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--heatmap-rule);
  border-bottom: 1px solid var(--heatmap-rule);
  margin-bottom: 24px;
}
@media (max-width: 719px) {
  .steady-overview {
    grid-template-columns: repeat(2, 1fr);
  }
}
.steady-kpi {
  padding: 20px;
  border-right: 1px solid var(--heatmap-rule);
  text-align: center;
}
.steady-kpi:last-child { border-right: none; }
.steady-kpi-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.steady-kpi-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.1;
  margin-bottom: 4px;
}
.steady-kpi-unit {
  font-size: 13px;
  color: var(--heatmap-ink-2);
  margin-left: 2px;
}
.steady-kpi-extra {
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Detail grid ──────────────────────────── */
.steady-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}
@media (max-width: 719px) {
  .steady-detail-grid {
    grid-template-columns: 1fr;
  }
}
.steady-detail-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 16px;
}
.steady-detail-header {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--heatmap-rule);
}
.steady-detail-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.steady-detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.steady-detail-label {
  font-size: 12px;
  color: var(--heatmap-ink-3);
}
.steady-detail-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.steady-unit {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  margin-left: 2px;
}

/* ── Insight ──────────────────────────────── */
.steady-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: var(--color-bg-info);
  border-radius: 8px;
}
.steady-insight-icon {
  flex-shrink: 0;
  color: var(--color-text-info);
  margin-top: 1px;
}
.steady-insight-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: var(--color-text-info);
  margin: 0;
  line-height: 1.5;
}

@media (max-width: 719px) {
  .steady-title-main { font-size: 22px; }
  .steady-kpi-value { font-size: 22px; }
  .steady-overview { grid-template-columns: repeat(2, 1fr); }
}
`
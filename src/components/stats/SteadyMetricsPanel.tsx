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
import type { AppLanguage } from '@/domain/settings'
import {
  extractSleepNights,
  computeSleepSteadyMetrics,
} from '@/domain/steadyMetrics'

interface Props {
  rangeEvents: CalendarEvent[]
  language: AppLanguage
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

export function SteadyMetricsPanel({ rangeEvents, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

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
      ? t('推迟中', 'Delaying')
      : metrics.driftDirection === 'advancing'
        ? t('提前中', 'Advancing')
        : t('稳定', 'Stable')

  const consistencyLevel =
    metrics.consistencyIndex >= 0.8
      ? t('良好', 'Good')
      : metrics.consistencyIndex >= 0.5
        ? t('一般', 'Fair')
        : t('波动大', 'Unstable')
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
            {t('稳态指标', 'Steady Metrics')}
          </span>
        </div>
        <p className="steady-title-desc">
          {t('最近 90 天睡眠规律性分析', 'Sleep regularity analysis — last 90 days')}
        </p>
      </div>

      {/* ── 概览行 ────────────────────────────── */}
      <div className="steady-overview">
        <div className="steady-kpi">
          <div className="steady-kpi-label">{t('一致性指数', 'Consistency')}</div>
          <div className="steady-kpi-value" style={{ color: consistencyColor }}>
            {(metrics.consistencyIndex * 100).toFixed(0)}
            <span className="steady-kpi-unit">%</span>
          </div>
          <div className="steady-kpi-extra">{consistencyLevel}</div>
        </div>

        <div className="steady-kpi">
          <div className="steady-kpi-label">{t('覆盖率', 'Coverage')}</div>
          <div className="steady-kpi-value">
            {(metrics.coverage * 100).toFixed(0)}
            <span className="steady-kpi-unit">%</span>
          </div>
          <div className="steady-kpi-extra">
            {t(`${metrics.recordedDays}/${metrics.periodDays} 天`, `${metrics.recordedDays}/${metrics.periodDays} days`)}
          </div>
        </div>

        <div className="steady-kpi">
          <div className="steady-kpi-label">{t('漂移速度', 'Drift Speed')}</div>
          <div className="steady-kpi-value" style={{ color: driftColor }}>
            {metrics.driftSpeed > 0 ? '+' : ''}{metrics.driftSpeed.toFixed(1)}
            <span className="steady-kpi-unit">{t('分/周', 'min/wk')}</span>
          </div>
          <div className="steady-kpi-extra">{driftLabel}</div>
        </div>

        <div className="steady-kpi">
          <div className="steady-kpi-label">{t('样本量', 'Samples')}</div>
          <div className="steady-kpi-value">
            {metrics.recordedDays}
            <span className="steady-kpi-unit">{t('晚', 'n')}</span>
          </div>
          <div className="steady-kpi-extra">
            {metrics.recordedDays === 0
              ? t('暂无数据', 'No data')
              : t('可用于分析', 'analyzable')}
          </div>
        </div>
      </div>

      {/* ── 详细指标表 ────────────────────────── */}
      <div className="steady-detail-grid">
        {/* 就寝时间 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {t('就寝时间', 'Bedtime')}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('均值', 'Mean')}</span>
              <span className="steady-detail-value">{fmtHour(metrics.meanBedtime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('中位数', 'Median')}</span>
              <span className="steady-detail-value">{fmtHour(metrics.medianBedtime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('标准差', 'Std Dev')}</span>
              <span className="steady-detail-value">
                {metrics.stdBedtime.toFixed(1)}
                <span className="steady-unit">{t('小时', 'h')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 起床时间 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {t('起床时间', 'Wake-up')}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('均值', 'Mean')}</span>
              <span className="steady-detail-value">{fmtHour(metrics.meanWakeTime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('中位数', 'Median')}</span>
              <span className="steady-detail-value">{fmtHour(metrics.medianWakeTime)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('标准差', 'Std Dev')}</span>
              <span className="steady-detail-value">
                {metrics.stdWakeTime.toFixed(1)}
                <span className="steady-unit">{t('小时', 'h')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 睡眠时长 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {t('睡眠时长', 'Duration')}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('均值', 'Mean')}</span>
              <span className="steady-detail-value">{fmtDuration(metrics.meanDuration)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('中位数', 'Median')}</span>
              <span className="steady-detail-value">{fmtDuration(metrics.medianDuration)}</span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('标准差', 'Std Dev')}</span>
              <span className="steady-detail-value">
                {metrics.stdDuration.toFixed(1)}
                <span className="steady-unit">{t('小时', 'h')}</span>
              </span>
            </div>
          </div>
        </div>

        {/* 漂移分析 */}
        <div className="steady-detail-card">
          <div className="steady-detail-header">
            {t('漂移分析', 'Drift Analysis')}
          </div>
          <div className="steady-detail-body">
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('速度', 'Speed')}</span>
              <span className="steady-detail-value" style={{ color: driftColor }}>
                {metrics.driftSpeed > 0 ? '+' : ''}{metrics.driftSpeed.toFixed(1)}
                <span className="steady-unit">{t('分/周', 'min/wk')}</span>
              </span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('方向', 'Direction')}</span>
              <span className="steady-detail-value" style={{ color: driftColor }}>
                {driftLabel}
              </span>
            </div>
            <div className="steady-detail-row">
              <span className="steady-detail-label">{t('30 天预估', '30d Forecast')}</span>
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
            ? t('尚无足够的睡眠数据生成稳态分析', 'Not enough sleep data for steady analysis yet')
            : metrics.consistencyIndex >= 0.8
              ? t('作息规律性良好，当前模式值得保持。', 'Good sleep regularity — keep up the pattern.')
              : metrics.consistencyIndex >= 0.5
                ? t('作息有一定规律，但波动不小。关注就寝时间的稳定性。', 'Moderate regularity — focus on bedtime consistency.')
                : t('作息波动较大，建议优先关注就寝时间的一致性。', 'High variability — prioritize bedtime consistency.')}
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
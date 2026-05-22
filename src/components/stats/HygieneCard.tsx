/**
 * # HygieneCard — 个人卫生卡片
 *
 * 展示卫生分数 vs 基准线的对比趋势。
 *
 * 机制：
 * - 每完成一个卫生活动，当日分数上升（各活动权重累加，上限 100）
 * - 基准线 = 最近 7 日移动平均 - 每日衰减 5 分
 * - 用户看到"我的分数 vs 应该达到的基准线"
 */

import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import type { DailyHygiene } from '@/domain/dailyContext'
import type { AppLanguage } from '@/domain/settings'
import { computeHygieneBaseline, HYGIENE_MAX_DAILY_SCORE } from '@/domain/dailyContext'

interface Props {
  records: DailyHygiene[]
  language: AppLanguage
}

// ── 组件 ──────────────────────────────────────────────────

export function HygieneCard({ records, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 生成最近 21 天的完整时序
  const timeline = useMemo(() => {
    const now = Date.now()
    const days = 21
    const result: Array<{ date: string; score: number | null }> = []

    // 按日期索引记录
    const scoreMap = new Map<string, number>()
    for (const r of records) {
      scoreMap.set(r.date, r.score)
    }

    for (let i = days; i >= 0; i--) {
      const day = format(subDays(now, i), 'yyyy-MM-dd')
      result.push({
        date: day,
        score: scoreMap.get(day) ?? null,
      })
    }
    return result
  }, [records])

  // 基准线
  const baseline = useMemo(() => {
    return computeHygieneBaseline(
      records.map((r) => ({ date: r.date, score: r.score })),
      7,
    )
  }, [records])

  // 当前分数（最近一条有数据的记录的分数）
  const currentScore = useMemo(() => {
    const sorted = [...records].sort((a, b) => b.date.localeCompare(a.date))
    return sorted[0]?.score ?? null
  }, [records])

  // 最近 7 天平均
  const weekAvg = useMemo(() => {
    const recent = timeline.filter((d) => d.score !== null).slice(-7)
    if (recent.length === 0) return null
    return Math.round(recent.reduce((s, d) => s + (d.score ?? 0), 0) / recent.length)
  }, [timeline])

  // 连续高于基准天数
  const streakAboveBaseline = useMemo(() => {
    let streak = 0
    for (let i = timeline.length - 1; i >= 0; i--) {
      const d = timeline[i]
      if (d.score !== null && d.score >= baseline) streak++
      else break
    }
    return streak
  }, [timeline, baseline])

  // 评分等级
  const level = currentScore !== null
    ? currentScore >= 80
      ? { label: t('优秀', 'Excellent'), color: 'var(--color-text-success)' }
      : currentScore >= 60
        ? { label: t('良好', 'Good'), color: 'var(--color-text-info)' }
        : currentScore >= 40
          ? { label: t('一般', 'Fair'), color: 'var(--color-text-warning)' }
          : { label: t('待关注', 'Needs Attention'), color: 'var(--color-text-danger)' }
    : { label: t('暂无记录', 'No Data'), color: 'var(--heatmap-ink-3)' }

  return (
    <div className="hygiene-root">
      <style>{HYGIENE_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="hygiene-header">
        <span className="hygiene-header-icon">🧹</span>
        <span className="hygiene-header-title">{t('个人卫生', 'Hygiene')}</span>
      </div>

      {/* ── 当前状态 ──────────────────────────── */}
      <div className="hygiene-current">
        <div className="hygiene-score-section">
          <div className="hygiene-score-label">{t('当前分数', 'Current Score')}</div>
          <div className="hygiene-score-value" style={{ color: level.color }}>
            {currentScore !== null ? currentScore : '—'}
          </div>
          <div className="hygiene-score-level" style={{ color: level.color }}>
            {level.label}
          </div>
        </div>

        <div className="hygiene-baseline-section">
          <div className="hygiene-baseline-label">{t('基准线', 'Baseline')}</div>
          <div className="hygiene-baseline-value">{Math.round(baseline)}</div>
          <div className="hygiene-baseline-detail">
            {t('近 7 日移动平均', '7d moving avg')}
          </div>
        </div>

        <div className="hygiene-compare-section">
          {currentScore !== null && (
            <>
              <div className="hygiene-compare-label">
                {currentScore >= baseline
                  ? t('高于基准', 'Above Baseline')
                  : t('低于基准', 'Below Baseline')}
              </div>
              <div
                className="hygiene-compare-value"
                style={{
                  color: currentScore >= baseline
                    ? 'var(--color-text-success)'
                    : 'var(--color-text-danger)',
                }}
              >
                {currentScore >= baseline ? '+' : ''}{Math.round(currentScore - baseline)}
              </div>
              {streakAboveBaseline > 1 && (
                <div className="hygiene-compare-detail">
                  {t(`连续 ${streakAboveBaseline} 天`, `${streakAboveBaseline} day streak`)}
                </div>
              )}
            </>
          )}
        </div>

        <div className="hygiene-week-section">
          <div className="hygiene-week-label">{t('近 7 日均', '7d Avg')}</div>
          <div className="hygiene-week-value">
            {weekAvg !== null ? weekAvg : '—'}
          </div>
        </div>
      </div>

      {/* ── 趋势图（文本条形图） ────────────────── */}
      <div className="hygiene-chart">
        <div className="hygiene-chart-title">
          {t('近 21 天趋势', 'Last 21 Days')}
        </div>
        <div className="hygiene-chart-body">
          {timeline.map((day) => {
            const dateObj = new Date(day.date + 'T00:00:00')
            const isToday = format(new Date(), 'yyyy-MM-dd') === day.date
            const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6
            const dayLabel = format(dateObj, 'MM/dd')

            const barHeight = day.score !== null
              ? Math.max((day.score / HYGIENE_MAX_DAILY_SCORE) * 100, 4)
              : 0
            const aboveBaseline = day.score !== null && day.score >= baseline

            return (
              <div
                key={day.date}
                className={`hygiene-bar-row${isToday ? ' hygiene-bar-today' : ''}${isWeekend ? ' hygiene-bar-weekend' : ''}`}
              >
                <span className="hygiene-bar-label">{dayLabel}</span>
                <div className="hygiene-bar-track">
                  {/* 基准线 */}
                  <div
                    className="hygiene-bar-baseline"
                    style={{ height: `${(baseline / HYGIENE_MAX_DAILY_SCORE) * 100}%` }}
                  />
                  {/* 分数柱 */}
                  {day.score !== null && (
                    <div
                      className="hygiene-bar-fill"
                      style={{
                        height: `${barHeight}%`,
                        backgroundColor: aboveBaseline
                          ? 'var(--color-text-success)'
                          : 'var(--color-text-danger)',
                        opacity: aboveBaseline ? 0.7 : 0.5,
                      }}
                    />
                  )}
                  {day.score === null && (
                    <div className="hygiene-bar-miss" />
                  )}
                </div>
                <span className="hygiene-bar-value">
                  {day.score !== null ? day.score : '—'}
                </span>
              </div>
            )
          })}
        </div>
        {/* 图例 */}
        <div className="hygiene-chart-legend">
          <span className="hygiene-legend-item">
            <span className="hygiene-legend-swatch" style={{ background: 'var(--color-text-success)', opacity: 0.7 }} />
            {t('高于基准', 'Above baseline')}
          </span>
          <span className="hygiene-legend-item">
            <span className="hygiene-legend-swatch" style={{ background: 'var(--color-text-danger)', opacity: 0.5 }} />
            {t('低于基准', 'Below baseline')}
          </span>
          <span className="hygiene-legend-item">
            <span className="hygiene-legend-line" />
            {t('基准线', 'Baseline')}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const HYGIENE_CSS = `
.hygiene-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.hygiene-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.hygiene-header-icon { font-size: 18px; }
.hygiene-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}

/* ── Current state bar ────────────────── */
.hygiene-current {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}
@media (max-width: 719px) {
  .hygiene-current {
    grid-template-columns: repeat(2, 1fr);
  }
}
.hygiene-current > div {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.hygiene-score-label,
.hygiene-baseline-label,
.hygiene-compare-label,
.hygiene-week-label {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.2em;
  margin-bottom: 6px;
}
.hygiene-score-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.1;
  margin-bottom: 4px;
}
.hygiene-score-level {
  font-size: 11px;
}
.hygiene-baseline-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  margin-bottom: 4px;
}
.hygiene-baseline-detail,
.hygiene-compare-detail {
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
.hygiene-compare-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 400;
  margin-bottom: 4px;
}
.hygiene-week-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 22px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  margin-bottom: 4px;
}

/* ── Chart (text-based bar chart) ──────── */
.hygiene-chart {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--heatmap-rule);
}
.hygiene-chart-title {
  font-size: 12px;
  color: var(--heatmap-ink-2);
  margin-bottom: 12px;
}
.hygiene-chart-body {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hygiene-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 2px 0;
}
.hygiene-bar-today {
  background: rgba(201, 100, 66, 0.04);
  border-radius: 3px;
}
.hygiene-bar-label {
  width: 36px;
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 9px;
  color: var(--heatmap-ink-3);
  text-align: right;
}
.hygiene-bar-track {
  flex: 1;
  height: 20px;
  background: var(--heatmap-bg);
  border-radius: 3px;
  position: relative;
  overflow: hidden;
}
.hygiene-bar-baseline {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  background: var(--heatmap-ink-3);
  opacity: 0.15;
  border-radius: 3px;
}
.hygiene-bar-fill {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 3px;
  transition: height 0.2s ease;
  min-height: 2px;
}
.hygiene-bar-miss {
  width: 100%;
  height: 2px;
  background: var(--heatmap-ink-3);
  opacity: 0.1;
  position: absolute;
  top: 50%;
}
.hygiene-bar-value {
  width: 24px;
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--heatmap-ink-2);
  text-align: right;
}

/* ── Legend ────────────────────────────── */
.hygiene-chart-legend {
  display: flex;
  gap: 16px;
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px solid var(--heatmap-rule);
}
.hygiene-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 10px;
  color: var(--heatmap-ink-3);
}
.hygiene-legend-swatch {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  flex-shrink: 0;
}
.hygiene-legend-line {
  width: 14px;
  height: 0;
  border-top: 2px solid var(--heatmap-ink-3);
  opacity: 0.3;
  flex-shrink: 0;
}
`
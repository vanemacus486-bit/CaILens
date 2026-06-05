/**
 * # HygieneStatsCard — 卫生统计摘要
 *
 * 基于日历事件中的洗澡事件展示统计：
 * - 总览：洗澡天数、总次数、连续天数
 * - 各时段洗澡频次（早/午/晚/深夜）
 * - 无需独立 hygieneRecords
 */

import { useMemo } from 'react'
import type { CalendarEvent } from '@/domain/event'
import { formatISODate } from '@/domain/time'
import type { AppLanguage } from '@/domain/settings'

// ── 类型 ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  language: AppLanguage
}

// ── 辅助 ────────────────────────────────────────────────────

function isShowerEvent(e: CalendarEvent): boolean {
  if (!e.title) return false
  const t = e.title.trim().toLowerCase()
  return t === '洗澡' || t === 'shower' || t.includes('洗澡') || t.includes('shower')
}

/** 根据小时划分时段 */
function getTimePeriod(hour: number): string {
  if (hour < 10) return 'morning'
  if (hour < 14) return 'noon'
  if (hour < 18) return 'afternoon'
  if (hour < 22) return 'evening'
  return 'night'
}

const PERIOD_LABELS: Record<string, [string, string]> = {
  morning:  ['上午', 'Morning'],
  noon:     ['中午', 'Noon'],
  afternoon: ['下午', 'Afternoon'],
  evening:  ['晚上', 'Evening'],
  night:    ['深夜', 'Night'],
}

const PERIOD_COLORS: Record<string, string> = {
  morning:  '#7BC47F',
  noon:     '#D4A44A',
  afternoon: '#E8734A',
  evening:  '#5B9EBD',
  night:    '#9B6B9B',
}

// ── 组件 ────────────────────────────────────────────────────

export function HygieneStatsCard({ rangeEvents, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // ── 统计 ──────────────────────────────────────────────────

  const stats = useMemo(() => {
    // 筛选洗澡事件
    const showerEvents = rangeEvents.filter((e) => isShowerEvent(e))

    // 按天分组
    const byDay = new Map<string, number[]>()
    for (const e of showerEvents) {
      const dk = formatISODate(new Date(e.startTime))
      const list = byDay.get(dk) ?? []
      list.push(e.startTime)
      byDay.set(dk, list)
    }

    const activeDays = byDay.size
    const totalShowers = showerEvents.length

    // 按天排序
    const sortedDays = [...byDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))

    // 连续天数
    let streak = 0
    if (sortedDays.length > 0) {
      const todayStr = formatISODate(new Date())
      const yesterdayStr = formatISODate(new Date(Date.now() - 86400000))
      const firstDate = sortedDays[sortedDays.length - 1][0]

      if (firstDate === todayStr || firstDate === yesterdayStr) {
        streak = 1
        for (let i = sortedDays.length - 2; i >= 0; i--) {
          const prevDate = sortedDays[i + 1][0]
          const currDate = sortedDays[i][0]
          const diffDays = (new Date(prevDate).getTime() - new Date(currDate).getTime()) / 86400000
          if (Math.abs(diffDays - 1) < 0.1) {
            streak++
          } else {
            break
          }
        }
      }
    }

    // 各时段频次
    const periodCount: Record<string, number> = {}
    for (const e of showerEvents) {
      const hour = new Date(e.startTime).getHours()
      const period = getTimePeriod(hour)
      periodCount[period] = (periodCount[period] ?? 0) + 1
    }

    const periodEntries = Object.entries(periodCount).sort((a, b) => b[1] - a[1])
    const maxPeriodCount = periodEntries[0]?.[1] ?? 1

    // 高频时段
    const topPeriod = periodEntries[0]?.[0] ?? null

    return {
      activeDays,
      totalShowers,
      streak,
      topPeriod,
      periodEntries,
      maxPeriodCount,
      showerEvents,
    }
  }, [rangeEvents])

  // ── 空状态 ──────────────────────────────────────────────

  if (stats.showerEvents.length === 0) {
    return (
      <div className="hsc-root">
        <style>{HSC_CSS}</style>
        <div className="hsc-empty">
          <p className="hsc-empty-text">
            {t(
              '还没有洗澡事件。在日历中创建"洗澡"事件即可开始记录。',
              'No shower events yet. Create "洗澡" events on the calendar to start tracking.',
            )}
          </p>
        </div>
      </div>
    )
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="hsc-root">
      <style>{HSC_CSS}</style>

      {/* ── 总览行 ──────────────────────────── */}
      <div className="hsc-overview">
        <div className="hsc-stat-card">
          <div className="hsc-stat-num">{stats.activeDays}</div>
          <div className="hsc-stat-label">{'洗澡天数'}</div>
        </div>
        <div className="hsc-stat-card">
          <div className="hsc-stat-num">{stats.totalShowers}</div>
          <div className="hsc-stat-label">{'洗澡总次数'}</div>
        </div>
        <div className="hsc-stat-card">
          <div className="hsc-stat-num">
            {stats.streak > 0 ? `${stats.streak}` : '—'}
          </div>
          <div className="hsc-stat-label">
            {t('连续天数', 'Day Streak')}
          </div>
        </div>
      </div>

      {/* ── 时段频次 ────────────────────────── */}
      <div className="hsc-section">
        <h3 className="hsc-section-title">
          {t('洗澡时段分布', 'Shower Time Distribution')}
        </h3>
        <div className="hsc-bar-list">
          {stats.periodEntries.map(([period, count]) => {
            const ratio = count / stats.maxPeriodCount
            const labels = PERIOD_LABELS[period] ?? [period, period]
            return (
              <div key={period} className="hsc-bar-row">
                <div className="hsc-bar-header">
                  <span className="hsc-bar-label">
                    {language === 'zh' ? labels[0] : labels[1]}
                  </span>
                  <span className="hsc-bar-value">{count}{t('次', '×')}</span>
                </div>
                <div className="hsc-bar-track">
                  <div
                    className="hsc-bar-fill"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: PERIOD_COLORS[period] ?? 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 高频时段 ────────────────────────── */}
      {stats.topPeriod && (
        <div className="hsc-top-activity">
          <span className="hsc-top-label">
            {t('最常洗澡时段', 'Most Common Time')}
          </span>
          <span className="hsc-top-value">
            {language === 'zh'
              ? (PERIOD_LABELS[stats.topPeriod]?.[0] ?? stats.topPeriod)
              : (PERIOD_LABELS[stats.topPeriod]?.[1] ?? stats.topPeriod)}
          </span>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const HSC_CSS = `
.hsc-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.hsc-empty {
  padding: 32px 0;
  text-align: center;
}
.hsc-empty-text {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-style: italic;
  color: var(--heatmap-ink-3);
}

/* ── Overview ──────────────────────────────── */
.hsc-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 24px;
}
.hsc-stat-card {
  background: var(--heatmap-bg-card);
  border: 1px solid var(--heatmap-rule);
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
}
.hsc-stat-num {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
}
.hsc-stat-label {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-top: 4px;
}

/* ── Section ──────────────────────────────── */
.hsc-section {
  margin-bottom: 20px;
}
.hsc-section-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  margin-bottom: 12px;
}
.hsc-bar-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.hsc-bar-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.hsc-bar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.hsc-bar-label {
  font-size: 12px;
  color: var(--heatmap-ink-1);
}
.hsc-bar-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--heatmap-ink-3);
}
.hsc-bar-track {
  width: 100%;
  height: 8px;
  background: var(--heatmap-bg);
  border-radius: 4px;
  overflow: hidden;
}
.hsc-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.5s ease;
}

/* ── Top activity ──────────────────────────── */
.hsc-top-activity {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--heatmap-bg-card);
  border: 1px solid var(--heatmap-rule);
  border-radius: 8px;
}
.hsc-top-label {
  font-size: 11px;
  color: var(--heatmap-ink-3);
}
.hsc-top-value {
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
`

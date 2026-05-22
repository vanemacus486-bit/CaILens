/**
 * # DietNutrientCard — 饮食营养素卡片
 *
 * 从 MealData (typedData on events) 聚合营养素摄入情况。
 * 展示四指标卡（糖/咖啡因/蔬菜/蛋白质）+ 摄入热力图 + 统计汇总。
 *
 * 数据完全来自已有的事件记录，无需额外录入。
 */

import { useMemo } from 'react'
import { format, subDays } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import type { AppLanguage } from '@/domain/settings'
import { aggregateNutrientStatus } from '@/domain/dailyContext'
import type { NutrientStatus } from '@/domain/dailyContext'
import { isMealData } from '@/domain/event'

interface Props {
  rangeEvents: CalendarEvent[]
  language: AppLanguage
}

// ── 常量 ──────────────────────────────────────────────────

const DAILY_HISTORY_DAYS = 28

// ── 辅助函数 ──────────────────────────────────────────────

function getDate(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

// ── 组件 ──────────────────────────────────────────────────

export function DietNutrientCard({ rangeEvents, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 按日期聚合 MealData
  const dailyNutrients = useMemo(() => {
    const now = Date.now()
    const start = subDays(now, DAILY_HISTORY_DAYS).getTime()

    const mealsByDay = new Map<string, Array<{ foodTags: readonly string[]; mealOrder: string }>>()

    for (const event of rangeEvents) {
      if (!event.typedData || !isMealData(event.typedData)) continue
      if (event.startTime < start || event.startTime > now) continue
      const day = getDate(new Date(event.startTime))
      const existing = mealsByDay.get(day) ?? []
      existing.push({
        foodTags: event.typedData.foodTags,
        mealOrder: event.typedData.mealOrder,
      })
      mealsByDay.set(day, existing)
    }

    // 将今天到 28 天前全部填满，无数据日返回 null
    const result: Array<{ date: string; status: NutrientStatus | null }> = []
    for (let i = DAILY_HISTORY_DAYS; i >= 0; i--) {
      const day = getDate(subDays(now, i))
      const meals = mealsByDay.get(day)
      result.push({
        date: day,
        status: meals ? aggregateNutrientStatus(meals) : null,
      })
    }
    return result
  }, [rangeEvents])

  // 本周汇总统计
  const weeklyStats = useMemo(() => {
    const now = new Date()
    const weekStart = subDays(now, 7)
    const recent = dailyNutrients.filter(
      (d) => d.date >= getDate(weekStart) && d.status !== null,
    )

    let sugarDays = 0
    let caffeineDays = 0
    let vegDays = 0
    let proteinDays = 0
    let exceedSugar = 0
    let exceedCaffeine = 0
    let totalDays = recent.length

    for (const day of recent) {
      if (!day.status) continue
      if (day.status.sugarCount > 0) sugarDays++
      if (day.status.sugarExceeded) exceedSugar++
      if (day.status.caffeineCount > 0) caffeineDays++
      if (day.status.caffeineExceeded) exceedCaffeine++
      if (day.status.vegetableCount > 0) vegDays++
      if (day.status.proteinCount > 0) proteinDays++
    }

    return { sugarDays, exceedSugar, caffeineDays, exceedCaffeine, vegDays, proteinDays, totalDays }
  }, [dailyNutrients])

  // 指示卡
  const indicators = useMemo(() => [
    {
      key: 'sugar',
      label: t('糖分', 'Sugar'),
      days: weeklyStats.sugarDays,
      exceedDays: weeklyStats.exceedSugar,
      weekTotal: weeklyStats.totalDays,
      color: 'var(--color-text-danger)',
      icon: '🍬',
    },
    {
      key: 'caffeine',
      label: t('咖啡因', 'Caffeine'),
      days: weeklyStats.caffeineDays,
      exceedDays: weeklyStats.exceedCaffeine,
      weekTotal: weeklyStats.totalDays,
      color: 'var(--color-text-warning)',
      icon: '☕',
    },
    {
      key: 'vegetable',
      label: t('蔬菜', 'Vegetable'),
      days: weeklyStats.vegDays,
      weekTotal: weeklyStats.totalDays,
      color: 'var(--color-text-success)',
      icon: '🥬',
    },
    {
      key: 'protein',
      label: t('蛋白质', 'Protein'),
      days: weeklyStats.proteinDays,
      weekTotal: weeklyStats.totalDays,
      color: 'var(--color-text-info)',
      icon: '🥩',
    },
  ], [weeklyStats, language, t])

  return (
    <div className="diet-root">
      <style>{DIET_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="diet-header">
        <span className="diet-header-icon">🍽️</span>
        <span className="diet-header-title">{t('饮食记录', 'Diet Log')}</span>
      </div>

      {/* ── 四指标卡 ──────────────────────────── */}
      <div className="diet-indicators">
        {indicators.map((ind) => (
          <div
            key={ind.key}
            className={`diet-indicator diet-indicator-${ind.key}`}
          >
            <div className="diet-indicator-top">
              <span className="diet-indicator-icon">{ind.icon}</span>
              <span className="diet-indicator-label">{ind.label}</span>
            </div>
            <div className="diet-indicator-bar-wrap">
              <div
                className="diet-indicator-bar"
                style={{
                  width: `${ind.weekTotal > 0 ? (ind.days / ind.weekTotal) * 100 : 0}%`,
                  backgroundColor: ind.color,
                }}
              />
            </div>
            <div className="diet-indicator-stats">
              <span className="diet-indicator-days">
                {ind.days}/{ind.weekTotal}
              </span>
              <span className="diet-indicator-unit">{t('天', 'd')}</span>
              {'exceedDays' in ind && ind.exceedDays !== undefined && ind.exceedDays > 0 && (
                <span className="diet-indicator-exceed" style={{ color: 'var(--color-text-danger)' }}>
                  {t(`${ind.exceedDays}天超标`, `${ind.exceedDays}d excess`)}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 摄入热力图 ────────────────────────── */}
      <div className="diet-calendar-label">
        {t('近 28 天摄入情况', 'Intake — Last 28 Days')}
      </div>
      <div className="diet-calendar">
        <div className="diet-calendar-header">
          {t('日期', 'Date')}
          <span className="diet-calendar-note">{t('● 糖 ● 咖啡因 ● 蔬菜 ● 蛋白质', '● Sugar ● Caffeine ● Veg ● Protein')}</span>
        </div>
        <div className="diet-calendar-body">
          {dailyNutrients.map((day) => {
            const dateObj = new Date(day.date + 'T00:00:00')
            const isToday = getDate(new Date()) === day.date
            const dayLabel = format(dateObj, 'MM/dd')
            const dow = format(dateObj, 'i') // 1=Mon, 7=Sun
            const isWeekend = dow === '6' || dow === '7'

            return (
              <div
                key={day.date}
                className={`diet-day-row${isToday ? ' diet-day-today' : ''}${isWeekend ? ' diet-day-weekend' : ''}`}
              >
                <span className="diet-day-label">{dayLabel}</span>
                <div className="diet-day-dots">
                  {day.status === null ? (
                    <span className="diet-day-empty">—</span>
                  ) : (
                    <>
                      <span
                        className={`diet-dot${day.status.sugarExceeded ? ' diet-dot-exceed' : ''}`}
                        style={{
                          backgroundColor: day.status.sugarCount > 0
                            ? 'var(--color-text-danger)'
                            : 'var(--heatmap-bg-cell-empty)',
                          opacity: day.status.sugarCount > 0 ? (day.status.sugarExceeded ? 1 : 0.5) : 0.3,
                        }}
                        title={t(
                          `糖 ${day.status.sugarCount}次${day.status.sugarExceeded ? ' ⚠️超标' : ''}`,
                          `Sugar ${day.status.sugarCount}x${day.status.sugarExceeded ? ' ⚠️exceed' : ''}`,
                        )}
                      />
                      <span
                        className={`diet-dot${day.status.caffeineExceeded ? ' diet-dot-exceed' : ''}`}
                        style={{
                          backgroundColor: day.status.caffeineCount > 0
                            ? 'var(--color-text-warning)'
                            : 'var(--heatmap-bg-cell-empty)',
                          opacity: day.status.caffeineCount > 0 ? (day.status.caffeineExceeded ? 1 : 0.5) : 0.3,
                        }}
                        title={t(
                          `咖啡因 ${day.status.caffeineCount}次${day.status.caffeineExceeded ? ' ⚠️超标' : ''}`,
                          `Caffeine ${day.status.caffeineCount}x${day.status.caffeineExceeded ? ' ⚠️exceed' : ''}`,
                        )}
                      />
                      <span
                        className="diet-dot"
                        style={{
                          backgroundColor: day.status.vegetableInsufficient
                            ? 'var(--heatmap-bg-cell-empty)'
                            : 'var(--color-text-success)',
                          opacity: day.status.vegetableInsufficient ? 0.2 : 0.7,
                        }}
                        title={t(
                          `蔬菜${day.status.vegetableInsufficient ? ' 不足' : ' ✓'}`,
                          `Vegetable${day.status.vegetableInsufficient ? ' insufficient' : ' ✓'}`,
                        )}
                      />
                      <span
                        className="diet-dot"
                        style={{
                          backgroundColor: day.status.proteinInsufficient
                            ? 'var(--heatmap-bg-cell-empty)'
                            : 'var(--color-text-info)',
                          opacity: day.status.proteinInsufficient ? 0.2 : 0.7,
                        }}
                        title={t(
                          `蛋白质${day.status.proteinInsufficient ? ' 不足' : ' ✓'}`,
                          `Protein${day.status.proteinInsufficient ? ' insufficient' : ' ✓'}`,
                        )}
                      />
                    </>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── 统计汇总 ──────────────────────────── */}
      <div className="diet-summary">
        <span className="diet-summary-text">
          {t(
            `本周 ${weeklyStats.totalDays} 天有记录，糖摄入 ${weeklyStats.sugarDays} 天 (${weeklyStats.exceedSugar > 0 ? weeklyStats.exceedSugar + '天超标' : '均未超标'})，咖啡因 ${weeklyStats.caffeineDays} 天 (${weeklyStats.exceedCaffeine > 0 ? weeklyStats.exceedCaffeine + '天超标' : '均未超标'})`,
            `${weeklyStats.totalDays} days logged this week. Sugar: ${weeklyStats.sugarDays}d (${weeklyStats.exceedSugar > 0 ? weeklyStats.exceedSugar + 'd exceed' : 'within limit'}). Caffeine: ${weeklyStats.caffeineDays}d (${weeklyStats.exceedCaffeine > 0 ? weeklyStats.exceedCaffeine + 'd exceed' : 'within limit'}).`,
          )}
        </span>
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const DIET_CSS = `
.diet-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.diet-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.diet-header-icon { font-size: 18px; }
.diet-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}

/* ── 4 indicator cards ──────────────────── */
.diet-indicators {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}
@media (max-width: 719px) {
  .diet-indicators {
    grid-template-columns: repeat(2, 1fr);
  }
}
.diet-indicator {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
}
.diet-indicator-top {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.diet-indicator-icon { font-size: 14px; }
.diet-indicator-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.diet-indicator-bar-wrap {
  height: 4px;
  background: var(--heatmap-bg-cell-empty);
  border-radius: 2px;
  margin-bottom: 6px;
  overflow: hidden;
}
.diet-indicator-bar {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.diet-indicator-stats {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}
.diet-indicator-days {
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
}
.diet-indicator-unit {
  font-size: 10px;
  margin-right: 4px;
}
.diet-indicator-exceed {
  font-size: 10px;
}

/* ── Calendar heatmap ──────────────────── */
.diet-calendar-label {
  font-size: 12px;
  color: var(--heatmap-ink-2);
  margin-bottom: 8px;
}
.diet-calendar {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  border: 1px solid var(--heatmap-rule);
  overflow: hidden;
  margin-bottom: 12px;
}
.diet-calendar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  border-bottom: 1px solid var(--heatmap-rule);
}
.diet-calendar-note {
  font-size: 10px;
  opacity: 0.7;
}
.diet-calendar-body {
  max-height: 360px;
  overflow-y: auto;
}
.diet-day-row {
  display: flex;
  align-items: center;
  padding: 3px 12px;
  gap: 8px;
  font-size: 11px;
  border-bottom: 1px solid var(--heatmap-rule);
  border-bottom-width: 0.5px;
}
.diet-day-row:last-child { border-bottom: none; }
.diet-day-today {
  background: rgba(201, 100, 66, 0.06);
}
.diet-day-weekend .diet-day-label {
  color: var(--heatmap-ink-3);
}
.diet-day-label {
  width: 40px;
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 10px;
  color: var(--heatmap-ink-2);
}
.diet-day-dots {
  display: flex;
  gap: 6px;
  align-items: center;
}
.diet-dot {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
  transition: opacity 0.2s ease;
}
.diet-dot-exceed {
  outline: 1.5px solid var(--color-text-danger);
  outline-offset: 1px;
}
.diet-day-empty {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  opacity: 0.4;
}

/* ── Summary ────────────────────────────── */
.diet-summary {
  padding: 8px 12px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
}
.diet-summary-text {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  line-height: 1.5;
}
`
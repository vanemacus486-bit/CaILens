/**
 * # DietFrequencyPanel — 饮食频次分析
 *
 * 按月/季/年/全部 维度展示餐次分布、食物标签频率、来源分布。
 * 三列并排条形图 + 概览数字。
 */

import { useMemo, useState, startTransition } from 'react'
import type { CalendarEvent, MealOrder, MealSource, MealTag } from '@/domain/event'
import {
  MEAL_ORDER_LABELS,
  MEAL_SOURCE_LABELS,
  MEAL_TAG_LABELS,
} from '@/domain/event'
import { computeRecipeStats } from '@/domain/recipeStats'
import { getDietDimensionRange, type DietDimension } from '@/domain/dietStats'

interface Props {
  rangeEvents: CalendarEvent[]
}

// ── 颜色映射 ────────────────────────────────────────────────

const TAG_COLORS: Record<MealTag, string> = {
  protein: '#E8734A',
  staple: '#D4A44A',
  vegetable: '#5B9E5B',
  fruit: '#C7A04A',
  caffeine: '#7B5B3A',
  sugar: '#C97B7B',
  alcohol: '#9B6B9B',
  fried: '#A08060',
}

const MEAL_ORDER_COLORS: Record<MealOrder, string> = {
  breakfast: 'var(--event-accent-fill)',
  lunch: 'var(--event-sage-fill)',
  dinner: 'var(--event-sky-fill)',
  night_snack: 'var(--event-rose-fill)',
}

const SOURCE_COLORS: Record<MealSource, string> = {
  home: 'var(--event-sage-fill)',
  takeout: 'var(--event-accent-fill)',
  dine_in: 'var(--event-sand-fill)',
  convenience: 'var(--event-stone-fill)',
}

const DIMENSIONS: DietDimension[] = ['month', 'quarter', 'year', 'all']

const DIMENSION_LABELS: Record<DietDimension, string> = {
  month: '本月',
  quarter: '本季',
  year: '本年',
  all: '全部',
}

// ── 组件 ────────────────────────────────────────────────────

export function DietFrequencyPanel({ rangeEvents }: Props) {
  const [dimension, setDimension] = useState<DietDimension>('month')

  const now = useMemo(() => Date.now(), [])

  const range = useMemo(
    () => getDietDimensionRange(dimension, now),
    [dimension, now],
  )

  const stats = useMemo(
    () => computeRecipeStats(rangeEvents, range),
    [rangeEvents, range],
  )

  // 排序后的分布
  const sortedMealOrders = useMemo(
    () =>
      (Object.entries(stats.mealOrderDistribution) as [MealOrder, number][])
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1]),
    [stats.mealOrderDistribution],
  )

  const sortedTags = useMemo(
    () =>
      (Object.entries(stats.tagFrequency) as [MealTag, number][])
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1]),
    [stats.tagFrequency],
  )

  const sortedSources = useMemo(
    () =>
      (Object.entries(stats.sourceDistribution) as [MealSource, number][])
        .filter(([, c]) => c > 0)
        .sort((a, b) => b[1] - a[1]),
    [stats.sourceDistribution],
  )

  const maxMealOrder = sortedMealOrders[0]?.[1] ?? 1
  const maxTag = sortedTags[0]?.[1] ?? 1
  const maxSource = sortedSources[0]?.[1] ?? 1

  const empty = stats.totalMeals === 0

  return (
    <div className="dfp-root">
      <style>{DFP_CSS}</style>

      {/* ── 维度切换 ──────────────────────────────── */}
      <div className="dfp-dimension-pills">
        {DIMENSIONS.map((dim) => (
          <button
            key={dim}
            onClick={() => startTransition(() => setDimension(dim))}
            className={`dfp-dim-pill${dimension === dim ? ' dfp-dim-pill-active' : ''}`}
          >
            {DIMENSION_LABELS[dim]}
          </button>
        ))}
      </div>

      {/* ── 概览数字 ──────────────────────────────── */}
      <div className="dfp-overview">
        <div className="dfp-ov-card">
          <div className="dfp-ov-value">{stats.daysWithMeals}</div>
          <div className="dfp-ov-label">有记录天数</div>
        </div>
        <div className="dfp-ov-card">
          <div className="dfp-ov-value">{stats.totalMeals}</div>
          <div className="dfp-ov-label">总餐数</div>
        </div>
        <div className="dfp-ov-card">
          <div className="dfp-ov-value">
            {stats.daysWithMeals > 0
              ? (stats.totalMeals / stats.daysWithMeals).toFixed(1)
              : '—'}
          </div>
          <div className="dfp-ov-label">日均餐数</div>
        </div>
      </div>

      {empty ? (
        <div className="dfp-empty">暂无饮食记录</div>
      ) : (
        /* ── 三列分布 ──────────────────────────── */
        <div className="dfp-columns">
          {/* ① 餐次分布 */}
          <div className="dfp-col">
            <h4 className="dfp-col-title">餐次分布</h4>
            <div className="dfp-col-bars">
              {sortedMealOrders.map(([mo, count]) => {
                const ratio = count / maxMealOrder
                return (
                  <div key={mo} className="dfp-bar-row">
                    <span className="dfp-bar-label">
                      {MEAL_ORDER_LABELS[mo]}
                    </span>
                    <div className="dfp-bar-track">
                      <div
                        className="dfp-bar-fill"
                        style={{
                          width: `${ratio * 100}%`,
                          background: MEAL_ORDER_COLORS[mo],
                        }}
                      />
                    </div>
                    <span className="dfp-bar-count">{count}</span>
                  </div>
                )
              })}
              {sortedMealOrders.length === 0 && (
                <div className="dfp-bar-empty">—</div>
              )}
            </div>
          </div>

          {/* ② 标签频率 */}
          <div className="dfp-col">
            <h4 className="dfp-col-title">食物标签</h4>
            <div className="dfp-col-bars">
              {sortedTags.map(([tag, count]) => {
                const ratio = count / maxTag
                return (
                  <div key={tag} className="dfp-bar-row">
                    <span className="dfp-bar-label">
                      {MEAL_TAG_LABELS[tag]}
                    </span>
                    <div className="dfp-bar-track">
                      <div
                        className="dfp-bar-fill"
                        style={{
                          width: `${ratio * 100}%`,
                          background: TAG_COLORS[tag],
                        }}
                      />
                    </div>
                    <span className="dfp-bar-count">{count}</span>
                  </div>
                )
              })}
              {sortedTags.length === 0 && (
                <div className="dfp-bar-empty">—</div>
              )}
            </div>
          </div>

          {/* ③ 来源分布 */}
          <div className="dfp-col">
            <h4 className="dfp-col-title">来源分布</h4>
            <div className="dfp-col-bars">
              {sortedSources.map(([src, count]) => {
                const ratio = count / maxSource
                return (
                  <div key={src} className="dfp-bar-row">
                    <span className="dfp-bar-label">
                      {MEAL_SOURCE_LABELS[src]}
                    </span>
                    <div className="dfp-bar-track">
                      <div
                        className="dfp-bar-fill"
                        style={{
                          width: `${ratio * 100}%`,
                          background: SOURCE_COLORS[src],
                        }}
                      />
                    </div>
                    <span className="dfp-bar-count">{count}</span>
                  </div>
                )
              })}
              {sortedSources.length === 0 && (
                <div className="dfp-bar-empty">—</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const DFP_CSS = `
.dfp-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

/* ── Dimension pills ────────────────────────── */
.dfp-dimension-pills {
  display: flex;
  gap: 2px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
  width: fit-content;
  margin-bottom: 16px;
}
.dfp-dim-pill {
  padding: 4px 14px;
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
.dfp-dim-pill:hover {
  color: var(--heatmap-ink-1);
}
.dfp-dim-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Overview cards ─────────────────────────── */
.dfp-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  margin-bottom: 20px;
}
.dfp-ov-card {
  background: var(--heatmap-bg-card);
  border: 1px solid var(--heatmap-rule);
  border-radius: 8px;
  padding: 14px;
  text-align: center;
}
.dfp-ov-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 24px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
}
.dfp-ov-label {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  margin-top: 4px;
}

/* ── Three columns ──────────────────────────── */
.dfp-columns {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}
.dfp-col {
  background: var(--heatmap-bg-card);
  border: 1px solid var(--heatmap-rule);
  border-radius: 8px;
  padding: 14px;
}
.dfp-col-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
  margin: 0 0 12px 0;
}
.dfp-col-bars {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.dfp-bar-row {
  display: flex;
  align-items: center;
  gap: 6px;
}
.dfp-bar-label {
  font-size: 11px;
  color: var(--heatmap-ink-2);
  width: 42px;
  flex-shrink: 0;
  text-align: right;
}
.dfp-bar-track {
  flex: 1;
  height: 8px;
  background: var(--heatmap-bg);
  border-radius: 4px;
  overflow: hidden;
}
.dfp-bar-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.4s ease;
}
.dfp-bar-count {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  width: 28px;
  text-align: right;
  flex-shrink: 0;
}
.dfp-bar-empty {
  font-size: 13px;
  color: var(--heatmap-ink-3);
  opacity: 0.4;
  text-align: center;
  padding: 8px 0;
}

/* ── Empty state ────────────────────────────── */
.dfp-empty {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  color: var(--heatmap-ink-3);
  font-style: italic;
  text-align: center;
  padding: 24px 0;
}

/* ── Responsive ─────────────────────────────── */
@media (max-width: 719px) {
  .dfp-columns {
    grid-template-columns: 1fr;
  }
  .dfp-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}
`
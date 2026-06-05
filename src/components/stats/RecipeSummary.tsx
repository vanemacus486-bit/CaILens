/**
 * # 食谱摘要（Recipe Summary）
 *
 * 基于 90 天 Meal 数据的自动聚合视图。
 * "不需要用户写食谱，食谱从记录中长出来"
 */

import { useMemo } from 'react'
import type { CalendarEvent, MealOrder, MealSource } from '@/domain/event'
import {
  MEAL_ORDER_LABELS,
  MEAL_ORDER_LABELS_EN,
  MEAL_SOURCE_LABELS,
  MEAL_SOURCE_LABELS_EN,
} from '@/domain/event'
import { computeRecipeStats } from '@/domain/recipeStats'

interface Props {
  rangeEvents: CalendarEvent[]
  language: 'zh' | 'en'
}

// ── 辅助: 百分比格式化 ──────────────────────────────────────

function pct(v: number): string {
  return `${Math.round(v * 100)}%`
}

// ── 卡片组件 ────────────────────────────────────────────────

function StatCard({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div className="bg-surface-raised border border-border-default rounded-xl p-5">
      <h3 className="font-serif text-sm font-medium text-text-primary mb-4">{title}</h3>
      {children}
    </div>
  )
}

function Divider() {
  return <div className="h-px bg-border-subtle my-3" />
}

// ── 主组件 ──────────────────────────────────────────────────

export function RecipeSummary({ rangeEvents, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const now = useMemo(() => Date.now(), [])
  const ninetyDaysAgo = now - 90 * 86_400_000

  const stats = useMemo(
    () => computeRecipeStats(rangeEvents, { start: ninetyDaysAgo, end: now }),
    [rangeEvents, ninetyDaysAgo, now],
  )

  // 空状态
  if (stats.totalMeals === 0) {
    return (
      <div className="py-16 text-center">
        <p className="font-serif text-sm text-text-tertiary italic">
          {t(
            '还没有饮食记录。在快速输入中输入"吃午饭"等关键词即可开始记录。',
            'No meal data yet. Type "吃午饭" or "dinner" in Quick Input to start tracking.',
          )}
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* 概览行 */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-surface-raised border border-border-default rounded-xl p-4 text-center">
          <div className="font-mono text-2xl font-semibold text-text-primary">
            {stats.daysWithMeals}
          </div>
          <div className="font-sans text-xs text-text-tertiary mt-1">
            {'有记录天数'}
          </div>
        </div>
        <div className="bg-surface-raised border border-border-default rounded-xl p-4 text-center">
          <div className="font-mono text-2xl font-semibold text-text-primary">
            {stats.totalMeals}
          </div>
          <div className="font-sans text-xs text-text-tertiary mt-1">
            {'总餐数'}
          </div>
        </div>
        <div className="bg-surface-raised border border-border-default rounded-xl p-4 text-center">
          <div className="font-mono text-2xl font-semibold text-text-primary">
            {stats.daysWithMeals > 0
              ? (stats.totalMeals / stats.daysWithMeals).toFixed(1)
              : '—'}
          </div>
          <div className="font-sans text-xs text-text-tertiary mt-1">
            {'均餐/天'}
          </div>
        </div>
      </div>

      {/* 餐次分布 */}
      <StatCard title={'餐次分布'}>
        <div className="space-y-2.5">
          {(
            Object.entries(stats.mealOrderDistribution) as [MealOrder, number][]
          ).map(([mo, count]) => {
            const maxMeal = Math.max(
              ...Object.values(stats.mealOrderDistribution),
              1,
            )
            const ratio = count / maxMeal
            return (
              <div key={mo}>
                <div className="flex items-center justify-between text-xs font-sans mb-1">
                  <span className="text-text-primary">
                    {t(MEAL_ORDER_LABELS[mo], MEAL_ORDER_LABELS_EN[mo])}
                  </span>
                  <span className="font-mono text-text-secondary tabular-nums">
                    {count}
                    <span className="text-text-tertiary ml-1">
                      ({pct(count / stats.totalMeals)})
                    </span>
                  </span>
                </div>
                <div className="w-full h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: 'var(--event-sand-text)',
                      opacity: 0.5 + 0.3 * ratio,
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <Divider />
        {/* 来源分布 */}
        <div className="flex gap-4 text-xs font-sans">
          {(
            Object.entries(stats.sourceDistribution) as [MealSource, number][]
          ).map(([src, count]) => (
            <div key={src} className="flex items-center gap-1.5">
              <span className="text-text-primary">
                {t(MEAL_SOURCE_LABELS[src], MEAL_SOURCE_LABELS_EN[src])}
              </span>
              <span className="font-mono text-text-tertiary tabular-nums">
                {count}
              </span>
            </div>
          ))}
        </div>
      </StatCard>

      {/* 脚注 */}
      <p className="font-sans text-[10px] text-text-tertiary text-center italic">
        {t(
          '食谱从记录中长出来——持续记录，模式会自然显现。',
          'Your recipe emerges from your records — keep tracking, patterns will surface.',
        )}
      </p>
    </div>
  )
}

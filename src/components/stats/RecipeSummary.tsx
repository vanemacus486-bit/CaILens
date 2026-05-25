/**
 * # 食谱摘要（Recipe Summary）
 *
 * 基于 90 天 Meal 数据的自动聚合视图。
 * "不需要用户写食谱，食谱从记录中长出来"
 */

import { useMemo } from 'react'
import type { CalendarEvent, MealOrder, MealSource } from '@/domain/event'
import type { MealTag } from '@/domain/event'
import {
  MEAL_TAG_LABELS,
  MEAL_TAG_LABELS_EN,
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

// ── 标签颜色映射 ────────────────────────────────────────────

const TAG_COLORS: Record<string, string> = {
  protein: '#E8734A',
  staple: '#D4A44A',
  vegetable: '#5B9E5B',
  fruit: '#C7A04A',
  caffeine: '#7B5B3A',
  sugar: '#C97B7B',
  alcohol: '#9B6B9B',
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

  // 标签频率排序（取 top 5）
  const sortedTags = (Object.entries(stats.tagFrequency) as [MealTag, number][])
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  const maxTagCount = sortedTags[0]?.[1] ?? 1

  // 外卖趋势最大次数（用于柱状图比例）
  const maxTakeout = Math.max(...stats.weeklyTakeoutCounts.map((w) => w.count), 1)

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

      {/* ① 主食构成 */}
      <StatCard title={'食物标签构成'}>
        <div className="space-y-2.5">
          {sortedTags.map(([tag, count]) => {
            const ratio = count / maxTagCount
            return (
              <div key={tag}>
                <div className="flex items-center justify-between text-xs font-sans mb-1">
                  <span className="text-text-primary">
                    {t(MEAL_TAG_LABELS[tag], MEAL_TAG_LABELS_EN[tag])}
                  </span>
                  <span className="font-mono text-text-secondary tabular-nums">{count}</span>
                </div>
                <div className="w-full h-2 bg-surface-sunken rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${ratio * 100}%`,
                      backgroundColor: TAG_COLORS[tag] ?? 'var(--accent)',
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <div className="mt-3 text-[11px] font-sans text-text-tertiary">
          {t(
            `近 90 天共记录 ${stats.totalMeals} 餐`,
            `${stats.totalMeals} meals recorded in the last 90 days.`,
          )}
        </div>
      </StatCard>

      {/* ② 达标率 */}
      <StatCard title={'饮食达标率'}>
        <div className="grid grid-cols-2 gap-4">
          {([
            ['protein', '#5B9E5B'],
            ['caffeine', '#7B5B3A'],
            ['sugar', '#C97B7B'],
            ['alcohol', '#9B6B9B'],
          ] as [MealTag, string][]).map(([tag, color]) => {
            const rate =
              tag === 'protein'
                ? stats.proteinRate
                : tag === 'caffeine'
                  ? stats.caffeineRate
                  : tag === 'sugar'
                    ? stats.sugarRate
                    : stats.alcoholRate
            return (
              <div key={tag}>
                <div className="flex items-center justify-between text-xs font-sans mb-1">
                  <span className="text-text-primary">
                    {t(MEAL_TAG_LABELS[tag], MEAL_TAG_LABELS_EN[tag])}
                  </span>
                  <span
                    className="font-mono font-medium tabular-nums"
                    style={{ color }}
                  >
                    {pct(rate)}
                  </span>
                </div>
                <div className="w-full h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${rate * 100}%`, backgroundColor: color }}
                  />
                </div>
              </div>
            )
          })}
        </div>
        <Divider />
        <div className="text-[11px] font-sans text-text-tertiary space-y-1">
          <p>
            {t(
              `蛋白质达标率 ${pct(stats.proteinRate)}——${stats.proteinRate >= 0.7 ? '不错，继续保持' : stats.proteinRate >= 0.4 ? '有提升空间' : '建议增加蛋白质摄入'}`,
              `Protein rate ${pct(stats.proteinRate)}${stats.proteinRate >= 0.7 ? ' — good, keep it up' : stats.proteinRate >= 0.4 ? ' — room for improvement' : ' — consider adding more protein'}`,
            )}
          </p>
          {stats.topCaffeineMealOrder && (
            <p>
              {t(
                `咖啡因最常见于 ${MEAL_ORDER_LABELS[stats.topCaffeineMealOrder]}`,
                `Caffeine most common at ${MEAL_ORDER_LABELS_EN[stats.topCaffeineMealOrder]}`,
              )}
            </p>
          )}
        </div>
      </StatCard>

      {/* ③ 外卖频率趋势 */}
      <StatCard title={'外卖频率趋势'}>
        {stats.weeklyTakeoutCounts.length === 0 ? (
          <p className="font-sans text-xs text-text-tertiary italic">
            {'近 90 天无外卖记录'}
          </p>
        ) : (
          <div className="space-y-1">
            {/* 柱状图 */}
            <div className="flex items-end gap-1.5 h-24">
              {stats.weeklyTakeoutCounts.map((w) => {
                const height = (w.count / maxTakeout) * 100
                return (
                  <div
                    key={w.weekLabel}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <span className="font-mono text-[10px] text-text-tertiary tabular-nums">
                      {w.count}
                    </span>
                    <div
                      className="w-full rounded-t"
                      style={{
                        height: `${Math.max(height, 2)}%`,
                        backgroundColor: 'var(--accent)',
                        opacity: 0.5 + 0.3 * (w.count / maxTakeout),
                      }}
                    />
                  </div>
                )
              })}
            </div>
            {/* X 轴标签 */}
            <div className="flex gap-1.5">
              {stats.weeklyTakeoutCounts.map((w, i) => (
                <div
                  key={w.weekLabel}
                  className="flex-1 text-center font-sans text-[9px] text-text-tertiary truncate"
                >
                  {i % 2 === 0 ? w.weekLabel : ''}
                </div>
              ))}
            </div>
          </div>
        )}
        {stats.topTakeoutMealOrder && (
          <div className="mt-3 text-[11px] font-sans text-text-tertiary">
            {t(
              `外卖最多的是 ${MEAL_ORDER_LABELS[stats.topTakeoutMealOrder]}`,
              `Most takeout at ${MEAL_ORDER_LABELS_EN[stats.topTakeoutMealOrder]}`,
            )}
          </div>
        )}
      </StatCard>

      {/* ④ 餐次分布 */}
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

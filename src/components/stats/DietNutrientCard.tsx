/**
 * # DietNutrientCard — 本周饮食一览
 *
 * 将一周的食事以纵向时间线展示。
 * 只看"吃了什么"，不看营养素指标。
 *
 * 数据来自 Meal 事件中的 title（用户在"吃了什么？"里输入的文字）。
 */

import { useMemo } from 'react'
import { format, startOfWeek, addDays } from 'date-fns'
import type { CalendarEvent, MealOrder } from '@/domain/event'
import type { AppLanguage } from '@/domain/settings'
import { isMealData } from '@/domain/event'
import { MEAL_ORDER_LABELS, MEAL_ORDER_LABELS_EN } from '@/domain/event'

interface Props {
  rangeEvents: CalendarEvent[]
  language: AppLanguage
}

// ── 餐次图标 ──────────────────────────────────────────────

const MEAL_ICONS: Record<MealOrder, string> = {
  breakfast: '🌅',
  lunch: '🌤️',
  dinner: '🌇',
  night_snack: '🌙',
}

const DAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

// ── 辅助 ──────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

// ── 组件 ──────────────────────────────────────────────────

export function DietNutrientCard({ rangeEvents, language }: Props) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const DAY_LABELS = language === 'zh' ? DAY_LABELS_ZH : DAY_LABELS_EN

  // 将本周的 Meal 事件按天、按餐次分组
  const weekMeals = useMemo(() => {
    const today = new Date()
    const monday = startOfWeek(today, { weekStartsOn: 1 })

    // 初始化 7 天空数组
    const days: Array<{
      date: string
      label: string
      meals: Array<{ id: string; time: string; mealOrder: MealOrder; title: string }>
    }> = []

    for (let i = 0; i < 7; i++) {
      const d = addDays(monday, i)
      days.push({
        date: format(d, 'yyyy-MM-dd'),
        label: `${DAY_LABELS[i]} ${format(d, 'M/d')}`,
        meals: [],
      })
    }

    // 填充数据
    for (const event of rangeEvents) {
      if (!event.typedData || !isMealData(event.typedData)) continue
      const d = new Date(event.startTime)
      const dateKey = format(d, 'yyyy-MM-dd')
      const day = days.find((dd) => dd.date === dateKey)
      if (!day) continue

      day.meals.push({
        id: event.id,
        time: fmtTime(event.startTime),
        mealOrder: event.typedData.mealOrder,
        title: event.title || t('吃饭', 'Meal'),
      })
    }

    // 每餐内部按 mealOrder 排序
    const orderRank: Record<MealOrder, number> = { breakfast: 0, lunch: 1, dinner: 2, night_snack: 3 }
    for (const day of days) {
      day.meals.sort((a, b) => orderRank[a.mealOrder] - orderRank[b.mealOrder])
    }

    return days
  }, [rangeEvents, DAY_LABELS, t])

  return (
    <div className="diet-root">
      <style>{DIET_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="diet-header">
        <span className="diet-header-icon">🍽️</span>
        <span className="diet-header-title">{t('本周饮食', 'This Week\'s Meals')}</span>
      </div>

      {/* ── 每日卡片 ──────────────────────────── */}
      {weekMeals.map((day) => {
        const isToday = day.date === format(new Date(), 'yyyy-MM-dd')
        const hasMeals = day.meals.length > 0

        return (
          <div
            key={day.date}
            className={`diet-day-card${isToday ? ' diet-day-today' : ''}`}
          >
            <div className="diet-day-header">
              <span className="diet-day-name">{day.label}</span>
              {isToday && <span className="diet-today-badge">{t('今天', 'Today')}</span>}
            </div>

            {!hasMeals ? (
              <div className="diet-day-empty-state">
                <span className="diet-empty-dash">—</span>
                <span className="diet-empty-text">{t('无饮食记录', 'No meals logged')}</span>
              </div>
            ) : (
              <div className="diet-meal-list">
                {day.meals.map((meal) => (
                  <div key={meal.id} className="diet-meal-row">
                    <span className="diet-meal-icon">{MEAL_ICONS[meal.mealOrder]}</span>
                    <span className="diet-meal-order">
                      {t(MEAL_ORDER_LABELS[meal.mealOrder], MEAL_ORDER_LABELS_EN[meal.mealOrder])}
                    </span>
                    <span className="diet-meal-time">{meal.time}</span>
                    <span className="diet-meal-title">{meal.title}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
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

/* ── Day card ───────────────────────────── */
.diet-day-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  border: 1px solid var(--heatmap-rule);
  margin-bottom: 8px;
  overflow: hidden;
}
.diet-day-today {
  border-color: var(--accent);
  box-shadow: 0 0 0 1px var(--accent);
}

.diet-day-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 8px;
  border-bottom: 1px solid var(--heatmap-rule);
}
.diet-day-name {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
}
.diet-today-badge {
  font-size: 10px;
  font-weight: 500;
  color: var(--accent);
  background: rgba(201, 100, 66, 0.1);
  padding: 1px 6px;
  border-radius: 4px;
}

/* ── Empty state ────────────────────────── */
.diet-day-empty-state {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 12px;
}
.diet-empty-dash {
  font-size: 14px;
  color: var(--heatmap-ink-3);
  opacity: 0.3;
  font-family: 'JetBrains Mono', monospace;
}
.diet-empty-text {
  font-size: 11px;
  color: var(--heatmap-ink-3);
  opacity: 0.5;
}

/* ── Meal list ──────────────────────────── */
.diet-meal-list {
  padding: 6px 12px 10px;
}
.diet-meal-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
}
.diet-meal-icon {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.diet-meal-order {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  width: 40px;
  flex-shrink: 0;
}
.diet-meal-time {
  font-family: 'JetBrains Mono', monospace;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  width: 38px;
  flex-shrink: 0;
}
.diet-meal-title {
  font-size: 13px;
  color: var(--heatmap-ink-1);
  font-weight: 500;
}
`
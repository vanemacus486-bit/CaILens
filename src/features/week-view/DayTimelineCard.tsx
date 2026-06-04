/**
 * # DayTimelineCard — 每日时间线卡片（日志 Tab 核心单元）
 *
 * 纵向流式列表中的每一天卡片，包含四个可选区域：
 * 1. 日摘要（总时数 + 分类堆叠条）
 * 2. 事件时间线（精简版）
 * 3. 已完成待办
 * 4. 生活上下文（饮食/卫生/娱乐）
 *
 * 数据全部为空时自动折叠为一行空态。
 */

import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatISODate } from '@/domain/time'
import { fmtDurationCompact } from '@/domain/log'
import type { DayTimeline } from '@/domain/log'
import type { Category, CategoryId } from '@/domain/category'
import type { CalendarEvent } from '@/domain/event'

// ── Constants ──────────────────────────────────────────────

function catFill(catId: CategoryId): string {
  if (catId === 'stone') return '#7a9aaa'
  return `var(--event-${catId}-fill)`
}

function catBg(catId: CategoryId): string {
  if (catId === 'stone') return '#e2e8ed'
  return `var(--event-${catId}-bg)`
}

function catText(catId: CategoryId): string {
  if (catId === 'stone') return '#5a7a8a'
  return `var(--event-${catId}-text)`
}

/** Format time (HH:MM from timestamp) */
function fmtHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const WEEKDAY_NAMES = ['日', '一', '二', '三', '四', '五', '六']

const MEAL_ORDER_SHORT: Record<string, string> = {
  breakfast: '早',
  lunch: '午',
  dinner: '晚',
  night_snack: '宵',
}

// ── Props ──────────────────────────────────────────────────

interface DayTimelineCardProps {
  day: DayTimeline
  categories: Category[]
  /** Whether this card is today */
  isToday: boolean
}

// ── Component ──────────────────────────────────────────────

export function DayTimelineCard({ day, categories, isToday: isTodayProp }: DayTimelineCardProps) {
  const navigate = useNavigate()
  const isDayToday = isTodayProp

  // ── Derived data ────────────────────────────────────────

  const sortedCategories = useMemo(() => {
    return Array.from(day.categoryMs.entries())
      .sort(([, a], [, b]) => b - a)
  }, [day.categoryMs])

  const catMap = useMemo(() => {
    const m = new Map<CategoryId, Category>()
    for (const c of categories) m.set(c.id, c)
    return m
  }, [categories])

  const hasEvents = day.events.length > 0
  const hasDoneTodos = day.doneTodos.length > 0
  const hasMeals = day.mealSummary.count > 0
  const isEmpty = !hasEvents && !hasDoneTodos && !hasMeals

  // ── Handlers ────────────────────────────────────────────

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation()
    // Navigate to week view with openEvent param
    navigate(`/?week=${formatISODate(new Date(day.dateTs))}&openEvent=${event.id}`)
  }

  // ── Render ──────────────────────────────────────────────

  return (
    <div
      className={cn(
        'rounded-xl border transition-all duration-200',
        isDayToday
          ? 'border-accent/40 bg-surface-raised shadow-card-float'
          : 'border-border-subtle/60 bg-surface-raised hover:border-border-default/60 hover:shadow-sm',
        isEmpty ? 'py-3' : 'py-4',
      )}
    >
      {/* ═══════════════════════════════════════════════════
          HEADER
          ═══════════════════════════════════════════════════ */}
      <div className="flex items-baseline justify-between px-5">
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-serif text-base font-medium tracking-wide',
              isDayToday ? 'text-accent' : 'text-text-primary',
            )}
          >
            {`周${WEEKDAY_NAMES[day.weekday]}`}
          </span>
          <span className="font-mono text-[11px] text-text-quaternary">
            {day.dateLabel}
          </span>
          {day.hasSleep && (
            <span className="text-[10px] leading-none opacity-40" title="有睡眠记录">🌙</span>
          )}
        </div>
        {day.totalMs > 0 && (
          <span className="font-mono text-xs font-medium text-text-secondary">
            {fmtDurationCompact(day.totalMs)}
          </span>
        )}
      </div>

      {/* ── Empty state ── */}
      {isEmpty && (
        <div className="flex items-center justify-center mt-1">
          <span className="font-serif text-[11px] text-text-quaternary/50 italic select-none">
            {'··· 无记录 ···'}
          </span>
        </div>
      )}

      {!isEmpty && (
        <div className="px-5 mt-3 space-y-3">
          {/* ═══════════════════════════════════════════════
              CATEGORY SUMMARY — stack bar + labels
              ═══════════════════════════════════════════════ */}
          {sortedCategories.length > 0 && (
            <div>
              {/* Stack bar */}
              <div className="flex h-1.5 rounded-full overflow-hidden">
                {sortedCategories.map(([catId, dur]) => {
                  const pct = (dur / day.totalMs) * 100
                  if (pct < 2) return null
                  return (
                    <div
                      key={catId}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: catFill(catId),
                        opacity: 0.7,
                      }}
                    />
                  )
                })}
              </div>

              {/* Labels */}
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1.5">
                {sortedCategories.map(([catId, dur]) => {
                  if (dur <= 0) return null
                  const cat = catMap.get(catId)
                  return (
                    <div key={catId} className="flex items-center gap-1">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: catFill(catId) }}
                      />
                      <span className="font-sans text-[10px] text-text-tertiary">
                        {cat?.name ?? catId}
                      </span>
                      <span className="font-mono text-[9px] text-text-quaternary">
                        {fmtDurationCompact(dur)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              EVENT TIMELINE
              ═══════════════════════════════════════════════ */}
          {hasEvents && (
            <div className="space-y-0.5 -mx-2">
              {day.events.map((event) => {
                const cat = catMap.get(event.categoryId)
                const startStr = fmtHM(event.startTime)
                const dur = event.endTime - event.startTime
                const isMeal = event.typedData?.type === 'meal'
                const isSleep = event.typedData?.type === 'sleep'

                return (
                  <div
                    key={event.id}
                    data-event-id={event.id}
                    onClick={(e) => handleEventClick(event, e)}
                    className="group grid grid-cols-[44px_3px_1fr_auto] gap-x-2.5 py-1.5 px-2 rounded-lg cursor-pointer hover:bg-surface-sunken/60 transition-colors duration-150"
                  >
                    {/* Time */}
                    <div className="text-right pt-0.5">
                      <span className="font-mono text-[11px] text-text-secondary leading-none">
                        {startStr}
                      </span>
                    </div>

                    {/* Color bar */}
                    <div className="flex items-start pt-0.5">
                      <div
                        className="w-[3px] rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: cat ? catFill(event.categoryId) : 'var(--text-tertiary)',
                          height: '14px',
                        }}
                      />
                    </div>

                    {/* Title + type icon */}
                    <div className="min-w-0 flex items-center gap-1.5">
                      {isMeal && <span className="text-[10px] leading-none flex-shrink-0 opacity-50">🍚</span>}
                      {isSleep && <span className="text-[10px] leading-none flex-shrink-0 opacity-50">🌙</span>}
                      <span className="font-serif text-[13px] text-text-primary truncate leading-snug">
                        {event.title || <span className="italic opacity-50 text-text-tertiary">{'无标题'}</span>}
                      </span>
                      {cat && (
                        <span
                          className="font-sans text-[8px] font-medium px-1 py-0.5 rounded-sm flex-shrink-0 leading-none"
                          style={{ backgroundColor: catBg(event.categoryId), color: catText(event.categoryId) }}
                        >
                          {cat.name}
                        </span>
                      )}
                    </div>

                    {/* Duration */}
                    <div className="text-right pt-0.5">
                      <span className="font-mono text-[10px] text-text-quaternary leading-none">
                        {fmtDurationCompact(dur)}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              DONE TODOS
              ═══════════════════════════════════════════════ */}
          {hasDoneTodos && (
            <div className="space-y-0.5 -mx-2">
              {day.doneTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-sunken/60 transition-colors"
                >
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 opacity-30 bg-accent" />
                  <span className="flex-1 font-sans text-[11px] text-text-tertiary line-through truncate">
                    {todo.title}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* ═══════════════════════════════════════════════
              LIFE CONTEXT — meal summary
              ═══════════════════════════════════════════════ */}
          {hasMeals && (
            <div className="flex items-center gap-2 pt-0.5">
              <span className="flex items-center gap-1 text-[10px] text-text-quaternary">
                <span>🍚</span>
                <span className="font-sans">
                  {day.mealSummary.orders
                    .sort((a, b) => {
                      const order = ['breakfast', 'lunch', 'dinner', 'night_snack']
                      return order.indexOf(a) - order.indexOf(b)
                    })
                    .map((o) => MEAL_ORDER_SHORT[o] ?? o)
                    .join('·')}
                </span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

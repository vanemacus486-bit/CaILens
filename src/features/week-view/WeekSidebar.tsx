/**
 * # WeekSidebar — 周/月视图左侧面板
 *
 * 精简浅色面板：「新日程」按钮 + 缩小版月视图。
 * 显隐由顶栏左上角 ☰ 控制（uiStore.sidebarExpanded，见 WeekView），
 * 本组件只负责内容，不再常驻、不含品牌名与折叠按钮。
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isSameDay,
  isToday,
  format,
} from 'date-fns'

interface WeekSidebarProps {
  language: 'zh' | 'en'
  viewMode: 'week' | 'month' | 'day'
  /** 当前主视图的周起点（周一） */
  weekStart: Date
  /** day/month 模式下选中的日期 */
  selectedDay: Date
  /** 点击迷你月历某天 */
  onSelectDate: (day: Date) => void
  /** 点击「新日程」，传入按钮元素作锚点 */
  onNewEvent: (anchorEl: HTMLElement) => void
}

const WEEKDAYS_ZH = ['一', '二', '三', '四', '五', '六', '日']
const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** 手写风圆圈 —— 不规则椭圆 + 顶部小缺口，像用笔圈了一下 */
function HandDrawnCircle() {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[25px] h-[25px] overflow-visible"
      fill="none"
    >
      <path
        d="M19 5.5 C13 3.5 6.5 5.5 5 11 C3.8 15.5 6 21 11.5 22.5 C17 24 23.5 21 24 15 C24.4 10 21.5 6 16 5.5"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        transform="rotate(-4 14 14)"
      />
    </svg>
  )
}

/** 手写风横线 —— 贯穿单元格底部，相邻格首尾相接成「当前周」整行下划线 */
function HandDrawnWeekUnderline() {
  return (
    <svg
      viewBox="0 0 28 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute left-0 right-0 bottom-[1px] w-full h-1.5 overflow-visible"
      fill="none"
    >
      <path
        d="M0 3.2 C5 2 10 4.6 14 3.2 C18 1.9 23 4.4 28 3.2"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function WeekSidebar({
  language, viewMode, weekStart, selectedDay, onSelectDate, onNewEvent,
}: WeekSidebarProps) {
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 决定高亮基准日：周模式看 weekStart，日/月模式看 selectedDay
  const anchorDate = viewMode === 'week' ? weekStart : selectedDay
  const activeWeekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const activeWeekEnd = endOfWeek(anchorDate, { weekStartsOn: 1 })

  // 迷你月历当前显示的月份；主视图跨月时自动跟随
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(anchorDate))
  const anchorMonthKey = format(anchorDate, 'yyyy-MM')
  useEffect(() => {
    setViewMonth(startOfMonth(anchorDate))
    // 仅在主视图基准月变化时同步，避免覆盖用户手动翻月
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorMonthKey])

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  const handlePrevMonth = useCallback(() => setViewMonth((m) => subMonths(m, 1)), [])
  const handleNextMonth = useCallback(() => setViewMonth((m) => addMonths(m, 1)), [])

  const newEventRef = useRef<HTMLButtonElement>(null)
  const handleNewEventClick = useCallback(() => {
    if (newEventRef.current) onNewEvent(newEventRef.current)
  }, [onNewEvent])

  const weekdays = language === 'zh' ? WEEKDAYS_ZH : WEEKDAYS_EN
  const monthLabel = language === 'zh'
    ? format(viewMonth, 'yyyy 年 M 月')
    : format(viewMonth, 'MMMM yyyy')

  return (
    <aside className="w-56 flex-shrink-0 flex flex-col bg-surface-base border-r border-border-subtle overflow-y-auto max-md:hidden">
      <div className="flex flex-col gap-4 px-4 pt-4 pb-3">
        {/* ── 新日程 ── */}
        <button
          ref={newEventRef}
          onClick={handleNewEventClick}
          className="flex items-center justify-center gap-1.5 h-9 w-full rounded-lg bg-accent text-white font-sans text-sm font-medium cursor-pointer border-none transition-[filter] duration-200 hover:brightness-105 active:brightness-95"
        >
          <Plus size={16} strokeWidth={2.25} />
          {t('新日程', 'New event')}
        </button>

        {/* ── 缩小版月视图 ── */}
        <div>
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handlePrevMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
              aria-label={t('上个月', 'Previous month')}
            >
              <ChevronLeft size={14} strokeWidth={1.75} />
            </button>
            <span className="font-serif text-[13px] font-medium text-text-primary select-none">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
              aria-label={t('下个月', 'Next month')}
            >
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 mb-0.5">
            {weekdays.map((w, i) => (
              <div
                key={i}
                className="h-6 flex items-center justify-center font-sans text-[10px] text-text-quaternary select-none"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth)
              const inActiveWeek = day >= activeWeekStart && day <= activeWeekEnd
              // 月/周模式圈「今天」，日模式圈「选中日」；周模式额外在当前周整行下画手写横线
              const isCircled = viewMode === 'day' ? isSameDay(day, selectedDay) : isToday(day)
              const showUnderline = viewMode === 'week' && inActiveWeek

              return (
                <button
                  key={day.getTime()}
                  onClick={() => onSelectDate(day)}
                  className={[
                    'relative h-8 w-full font-sans text-xs cursor-pointer border-none bg-transparent transition-colors duration-150 rounded-md',
                    !inMonth ? 'text-text-quaternary/40'
                      : isCircled ? 'text-text-primary font-medium'
                      : 'text-text-primary hover:bg-surface-sunken',
                  ].join(' ')}
                >
                  {showUnderline && <HandDrawnWeekUnderline />}
                  {isCircled && <HandDrawnCircle />}
                  <span className="relative z-10">{format(day, 'd')}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </aside>
  )
}

/**
 * # ArchivePanel — 规划页内嵌历史归档面板
 *
 * 可折叠面板，展示所有已完成待办的按日分组时间线。
 * 顶部内联月历，点击某天过滤当天记录；未选日期则显示全部按天分组。
 */

import { useMemo, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  format,
} from 'date-fns'
import { ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, CheckCircle, Archive, CalendarDays } from 'lucide-react'
import { useTodoStore } from '@/stores/todoStore'
import { useTodoListStore } from '@/stores/todoListStore'
import { useT } from '@/i18n/useT'
import { filterDoneTodosByDay, groupTodosByCompletionDate } from '@/domain/todo'
import type { Todo, CompletionGroup } from '@/domain/todo'

// ── 内联月历 ───────────────────────────────────────────────

const WEEKDAYS = ['一', '二', '三', '四', '五', '六', '日']

interface MiniCalendarProps {
  selectedDate: number | null
  onSelectDate: (dayStart: number | null) => void
  /** 有完成记录的日期集合（当天 0 点时间戳） */
  daysWithData: Set<number>
}

function MiniCalendar({ selectedDate, onSelectDate, daysWithData }: MiniCalendarProps) {
  const today = useMemo(() => new Date(), [])
  const [viewMonth, setViewMonth] = useState(() =>
    selectedDate !== null ? startOfMonth(selectedDate) : startOfMonth(today),
  )

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  const handleSelect = useCallback(
    (day: Date) => {
      const d = new Date(day.getFullYear(), day.getMonth(), day.getDate())
      const ts = d.getTime()
      // Toggle: clicking the already-selected day clears the filter
      if (selectedDate === ts) {
        onSelectDate(null)
      } else {
        onSelectDate(ts)
      }
    },
    [selectedDate, onSelectDate],
  )

  return (
    <div className="bg-surface-raised rounded-2xl border border-border-subtle p-4">
      {/* 月份导航 */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setViewMonth((m) => subMonths(m, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          aria-label="上个月"
        >
          <ChevronLeft size={14} strokeWidth={1.75} />
        </button>
        <span className="font-serif text-sm font-medium text-text-primary select-none">
          {format(viewMonth, 'yyyy 年 M 月')}
        </span>
        <button
          onClick={() => setViewMonth((m) => addMonths(m, 1))}
          className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          aria-label="下个月"
        >
          <ChevronRight size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* 星期表头 */}
      <div className="grid grid-cols-7 mb-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="h-7 flex items-center justify-center font-sans text-[10px] text-text-quaternary select-none"
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日期网格 */}
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const inMonth = isSameMonth(day, viewMonth)
          const dayTs = new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime()
          const isSelected = selectedDate !== null && selectedDate === dayTs
          const isDayToday = isToday(day)
          const hasData = daysWithData.has(dayTs)

          return (
            <button
              key={day.getTime()}
              onClick={() => handleSelect(day)}
              className={`
                relative h-9 w-full rounded-lg text-xs font-sans cursor-pointer border-none transition-all duration-150
                ${!inMonth ? 'text-text-quaternary/30' : ''}
                ${isSelected
                  ? 'bg-accent text-white font-medium'
                  : inMonth
                    ? 'text-text-primary hover:bg-surface-sunken'
                    : ''
                }
                ${isDayToday && !isSelected && inMonth
                  ? 'ring-1 ring-accent/50'
                  : ''
                }
              `}
            >
              {format(day, 'd')}
              {/* 完成标记小圆点 */}
              {hasData && !isSelected && inMonth && (
                <span className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-accent/60" />
              )}
            </button>
          )
        })}
      </div>

      {/* 快捷清除 */}
      {selectedDate !== null && (
        <div className="mt-2 pt-2 border-t border-border-subtle/50">
          <button
            onClick={() => onSelectDate(null)}
            className="flex items-center gap-1 h-7 px-2 rounded-md text-[10px] font-sans text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            <CalendarDays size={12} strokeWidth={1.75} />
            显示全部
          </button>
        </div>
      )}
    </div>
  )
}

// ── 日期分组卡片 ────────────────────────────────────────────

interface DayGroupCardProps {
  group: CompletionGroup
  listNames: Map<string, string>
  defaultExpanded?: boolean
}

function DayGroupCard({ group, listNames, defaultExpanded = false }: DayGroupCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const t = useT()

  const d = new Date(group.dateTs)
  const isoDate = format(d, 'yyyy-MM-dd')
  const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdayNames[d.getDay()]

  return (
    <div className="bg-surface-raised rounded-xl border border-border-subtle overflow-hidden">
      {/* 日期标题 */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer border-none bg-transparent hover:bg-surface-sunken/50 transition-colors"
      >
        {expanded ? (
          <ChevronDown size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
        ) : (
          <ChevronRightIcon size={16} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <span className="font-serif text-sm font-medium text-text-primary">
            {isoDate}
          </span>
          <span className="ml-2 text-xs text-text-tertiary font-sans">
            ({weekday})
          </span>
        </div>
        <span className="text-xs text-text-tertiary font-sans">
          {t('archive.completedCount', group.todos.length)}
        </span>
      </button>

      {/* 任务列表 */}
      {expanded && (
        <div className="border-t border-border-subtle">
          {group.todos.map((todo) => (
            <TodoArchiveCard key={todo.id} todo={todo} listName={listNames.get(todo.listId)} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 单条任务卡片 ────────────────────────────────────────────

interface TodoArchiveCardProps {
  todo: Todo
  listName?: string
}

function TodoArchiveCard({ todo, listName }: TodoArchiveCardProps) {
  const completedTime = todo.completedAt
    ? new Date(todo.completedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

  const listLabel = listName ?? '默认'

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 border-b border-border-subtle/50 last:border-b-0 hover:bg-surface-sunken/30 transition-colors">
      <CheckCircle size={16} strokeWidth={1.5} className="text-text-tertiary/40 shrink-0" />
      <div className="flex-1 min-w-0 flex items-center gap-2">
        <span className="text-sm font-sans text-text-secondary line-through truncate">
          {todo.title}
        </span>
        <span className="text-[11px] text-text-quaternary font-sans shrink-0">
          · {listLabel}
        </span>
      </div>
      <span className="text-[11px] text-text-quaternary font-mono shrink-0 tabular-nums">
        {completedTime}
      </span>
    </div>
  )
}

// ── ArchivePanel 主组件 ────────────────────────────────────

export function ArchivePanel() {
  const todos = useTodoStore((s) => s.todos)
  const lists = useTodoListStore((s) => s.lists)
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()

  const dateParam = searchParams.get('archiveDate')
  const selectedDate = dateParam ? Number(dateParam) : null

  const setSelectedDate = useCallback(
    (ts: number | null) => {
      const next = new URLSearchParams(searchParams)
      if (ts !== null) {
        next.set('archiveDate', String(ts))
      } else {
        next.delete('archiveDate')
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // 所有已完成待办（带 completedAt）
  const doneTodos = useMemo(
    () =>
      todos
        .filter((t) => t.status === 'done' && t.completedAt !== null)
        .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)),
    [todos],
  )

  // 有完成记录的日期集合（用于日历小圆点）
  const daysWithData = useMemo(() => {
    const set = new Set<number>()
    for (const t of doneTodos) {
      if (t.completedAt === null) continue
      const d = new Date(t.completedAt)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      set.add(dayStart)
    }
    return set
  }, [doneTodos])

  // 列表名映射
  const listNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of lists) {
      map.set(l.id, l.name)
    }
    return map
  }, [lists])

  // 按日期分组（全量）或单日过滤
  const groups = useMemo(() => {
    if (selectedDate !== null) {
      const dayTodos = filterDoneTodosByDay(doneTodos, selectedDate)
      if (dayTodos.length === 0) return []
      const d = new Date(selectedDate)
      const label = `${d.getMonth() + 1}月${d.getDate()}日`
      return [{ dateLabel: label, dateTs: selectedDate, todos: dayTodos }]
    }
    return groupTodosByCompletionDate(doneTodos)
  }, [doneTodos, selectedDate])

  const isEmpty = groups.length === 0

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[680px] w-full px-4 py-6">
          {/* 静态标题行 */}
          <div className="flex items-center gap-3 mb-5">
            <Archive size={18} strokeWidth={1.75} className="text-text-tertiary shrink-0" />
            <span className="font-serif text-base font-medium text-text-primary">
              {t('archive.title')}
            </span>
            <span className="text-xs text-text-tertiary font-sans">
              ({doneTodos.length})
            </span>
          </div>

          {/* 内联月历 */}
          <MiniCalendar
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            daysWithData={daysWithData}
          />

          {/* 时间线列表 */}
          <div className="mt-5 flex flex-col gap-3">
            {isEmpty ? (
              <div className="text-center py-12">
                <Archive size={40} strokeWidth={1} className="mx-auto text-text-quaternary/40 mb-3" />
                <p className="text-sm font-sans text-text-tertiary">
                  {t('archive.empty')}
                </p>
              </div>
            ) : (
              groups.map((group) => (
                <DayGroupCard
                  key={group.dateTs}
                  group={group}
                  listNames={listNames}
                  defaultExpanded={selectedDate !== null}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

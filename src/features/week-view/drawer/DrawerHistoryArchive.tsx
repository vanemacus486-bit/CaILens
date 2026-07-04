/**
 * # DrawerHistoryArchive — DayDrawer 历史归档模式
 *
 * 展示某天已完成的待办。仿 ArchivePanel.tsx 的 TodoArchiveCard 风格：
 * 勾选图标 + 删除线标题 + 清单名 + 完成时间。
 * 用 filterDoneTodosByDay 按天过滤。
 */

import { useMemo } from 'react'
import { CheckCircle } from 'lucide-react'
import { useTodoStore } from '@/stores/todoStore'
import { useTodoListStore } from '@/stores/todoListStore'
import { filterDoneTodosByDay } from '@/domain/todo'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { getDayStart } from '@/domain/time'
import { useT } from '@/i18n/useT'

interface DrawerHistoryArchiveProps {
  selectedDateMs: number
}

export function DrawerHistoryArchive({ selectedDateMs }: DrawerHistoryArchiveProps) {
  const todos = useTodoStore((s) => s.todos)
  const lists = useTodoListStore((s) => s.lists)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = useT()

  const dayStartMs = useMemo(() => getDayStart(new Date(selectedDateMs)), [selectedDateMs])

  const doneTodos = useMemo(
    () =>
      todos.filter((t) => t.status === 'done' && t.completedAt !== null),
    [todos],
  )

  const dayTodos = useMemo(
    () => filterDoneTodosByDay(doneTodos, dayStartMs),
    [doneTodos, dayStartMs],
  )

  const listNames = useMemo(() => {
    const map = new Map<string, string>()
    for (const l of lists) map.set(l.id, l.name)
    return map
  }, [lists])

  if (dayTodos.length === 0) {
    return (
      <div className="flex items-center justify-center py-8">
        <p className="font-serif text-sm text-text-tertiary italic">
          {t('dayDrawer.historyEmpty')}
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 px-3 pb-4">
      {dayTodos.map((todo) => {
        const completedTime = todo.completedAt
          ? new Date(todo.completedAt).toLocaleTimeString(
              language === 'zh' ? 'zh-CN' : 'en-US',
              { hour: '2-digit', minute: '2-digit', hour12: language !== 'zh' },
            )
          : ''
        const listName = listNames.get(todo.listId) ?? (language === 'zh' ? '默认' : 'Default')

        return (
          <div
            key={todo.id}
            className="flex items-center gap-3 px-4 py-2 rounded-xl hover:bg-surface-sunken/30 transition-colors"
          >
            <CheckCircle size={15} strokeWidth={1.5} className="text-text-tertiary/40 shrink-0" />
            <div className="flex-1 min-w-0 flex items-center gap-2">
              <span className="text-sm font-sans text-text-secondary line-through truncate">
                {todo.title}
              </span>
              <span className="text-[11px] text-text-quaternary font-sans shrink-0">
                · {listName}
              </span>
            </div>
            <span className="text-[11px] text-text-quaternary font-mono shrink-0 tabular-nums">
              {completedTime}
            </span>
          </div>
        )
      })}
    </div>
  )
}

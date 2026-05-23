/**
 * # ActionPage — 规划 Tab（待办事项）
 *
 * 完整的待办列表界面：
 * - 新建待办（快速输入 + 展开式详情面板）
 * - 按日期分组（逾期 / 今天 / 未来 / 无截止日期）
 * - 筛选切换（全部 / 待办 / 已完成）
 * - 切换完成状态、编辑、删除
 * - 统计条
 */

import { useEffect, useState, useCallback } from 'react'
import {
  ListTodo,
  CheckSquare,
  Square,
  AlertCircle,
  Calendar,
  Inbox,
  FolderKanban,
} from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { useTodoStore } from '@/stores/todoStore'
import { groupTodosByDueDate } from '@/domain/todo'
import type { CreateTodoInput, TodoPriority } from '@/domain/todo'
import { TodoInput } from './TodoInput'
import { TodoItem } from './TodoItem'
import { ProjectsView } from './ProjectsView'

type FilterMode = 'all' | 'active' | 'done'

// ── 主组件 ────────────────────────────────────────

export function ActionPage() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const { todos, isLoading, isLoaded, error, loadTodos, createTodo, updateTodo, deleteTodo, toggleComplete } = useTodoStore()
  const [filter, setFilter] = useState<FilterMode>('all')
  const [viewMode, setViewMode] = useState<'todos' | 'projects'>('todos')

  useEffect(() => {
    if (!isLoaded) loadTodos()
  }, [isLoaded, loadTodos])

  const handleCreate = useCallback(
    (input: CreateTodoInput) => {
      createTodo(input)
    },
    [createTodo],
  )

  const handleToggle = useCallback(
    (id: string) => {
      toggleComplete(id)
    },
    [toggleComplete],
  )

  const handleUpdate = useCallback(
    (id: string, updates: { title?: string; description?: string; priority?: TodoPriority; dueDate?: number | null }) => {
      updateTodo({ id, ...updates })
    },
    [updateTodo],
  )

  const handleDelete = useCallback(
    (id: string) => {
      deleteTodo(id)
    },
    [deleteTodo],
  )

  // 筛选
  const filteredTodos = todos.filter((todo) => {
    if (filter === 'active') return todo.status !== 'done'
    if (filter === 'done') return todo.status === 'done'
    return true
  })

  // 分组
  const now = Date.now()
  const groups = groupTodosByDueDate(filteredTodos, now)

  // 统计
  const totalCount = todos.length
  const doneCount = todos.filter((t) => t.status === 'done').length
  const activeCount = totalCount - doneCount

  const FILTERS: { mode: FilterMode; labelZh: string; labelEn: string }[] = [
    { mode: 'all',    labelZh: '全部', labelEn: 'All' },
    { mode: 'active', labelZh: '待办', labelEn: 'Active' },
    { mode: 'done',   labelZh: '已完成', labelEn: 'Done' },
  ]

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      {/* ── 头部 ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
        <h1 className="font-serif text-lg font-medium text-text-primary flex items-center gap-2">
          <ListTodo size={20} strokeWidth={1.5} className="text-accent" />
          {t('待办事项', 'Todo List')}
        </h1>
        {/* 统计 */}
        <div className="flex items-center gap-3 font-sans text-xs text-text-tertiary">
          <span>
            <span className="text-text-secondary font-medium">{activeCount}</span>
            {' '}{t('待处理', 'active')}
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/40" />
          <span>
            <span className="text-text-secondary font-medium">{doneCount}</span>
            {' '}{t('已完成', 'done')}
          </span>
        </div>
      </div>

      {/* ── 视图模式切换 + 筛选切换 ── */}
      <div className="flex items-center gap-4 px-6 pb-3 flex-shrink-0">
        {/* 模式切换 */}
        <div className="flex bg-surface-sunken rounded-md p-[2px] gap-0">
          <button
            onClick={() => setViewMode('todos')}
            className={`h-7 px-3 rounded text-xs font-medium font-sans transition-colors cursor-pointer border-none ${
              viewMode === 'todos'
                ? 'bg-surface-raised text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary bg-transparent'
            }`}
          >
            <ListTodo size={12} strokeWidth={1.75} className="inline mr-1 align-middle" />
            {t('待办', 'Todos')}
          </button>
          <button
            onClick={() => setViewMode('projects')}
            className={`h-7 px-3 rounded text-xs font-medium font-sans transition-colors cursor-pointer border-none ${
              viewMode === 'projects'
                ? 'bg-surface-raised text-text-primary shadow-sm'
                : 'text-text-tertiary hover:text-text-secondary bg-transparent'
            }`}
          >
            <FolderKanban size={12} strokeWidth={1.75} className="inline mr-1 align-middle" />
            {t('项目', 'Projects')}
          </button>
        </div>

        {/* 筛选（仅待办模式） */}
        {viewMode === 'todos' && (
          <div className="flex items-center gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.mode}
                onClick={() => setFilter(f.mode)}
                className={`h-7 px-3 rounded-md text-xs font-medium font-sans transition-colors cursor-pointer border-none ${
                  filter === f.mode
                    ? 'bg-surface-raised text-text-primary shadow-sm'
                    : 'text-text-tertiary hover:text-text-secondary bg-transparent'
                }`}
              >
                {f.mode === 'all' && <Square size={11} strokeWidth={1.75} className="inline mr-1 align-middle" />}
                {f.mode === 'active' && <AlertCircle size={11} strokeWidth={1.75} className="inline mr-1 align-middle" />}
                {f.mode === 'done' && <CheckSquare size={11} strokeWidth={1.75} className="inline mr-1 align-middle" />}
                {t(f.labelZh, f.labelEn)}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ── 内容区 ── */}
      <div ref={usePageScrollRestore('/action')} className="flex-1 overflow-y-auto px-6 pb-8">
        {viewMode === 'projects' ? (
          <ProjectsView />
        ) : (
        <>
        {/* 新建输入 */}
        <div className="mb-5">
          <TodoInput onCreate={handleCreate} />
        </div>

        {error && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-[#B53535]/10 border border-[#B53535]/20 text-xs font-sans text-[#B53535]">
            {error}
          </div>
        )}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-sans text-sm text-text-tertiary">{t('加载中…', 'Loading…')}</p>
          </div>
        ) : filteredTodos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox size={40} strokeWidth={1.25} className="text-text-tertiary/40 mb-4" />
            <p className="font-sans text-sm text-text-tertiary mb-1">
              {filter === 'all'
                ? t('还没有待办事项，在上方输入框添加', 'No todos yet. Add one above.')
                : filter === 'done'
                  ? t('还没有已完成的待办', 'No completed todos yet.')
                  : t('所有待办都已完成！', 'All todos are done!')}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 逾期 */}
            {groups.overdue.length > 0 && (
              <Section
                label={t('已逾期', 'Overdue')}
                icon={<AlertCircle size={14} strokeWidth={1.75} className="text-[#B53535]" />}
                count={groups.overdue.length}
                accent
              >
                {groups.overdue.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </Section>
            )}

            {/* 今天 */}
            {groups.today.length > 0 && (
              <Section
                label={t('今天', 'Today')}
                icon={<Calendar size={14} strokeWidth={1.75} className="text-accent" />}
                count={groups.today.length}
              >
                {groups.today.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </Section>
            )}

            {/* 未来 */}
            {groups.future.length > 0 && (
              <Section
                label={t('将来', 'Upcoming')}
                icon={<Calendar size={14} strokeWidth={1.75} className="text-text-tertiary" />}
                count={groups.future.length}
              >
                {groups.future.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </Section>
            )}

            {/* 无截止日期 */}
            {groups.noDate.length > 0 && (
              <Section
                label={t('待整理', 'Unsorted')}
                icon={<Inbox size={14} strokeWidth={1.75} className="text-text-tertiary" />}
                count={groups.noDate.length}
              >
                {groups.noDate.map((todo) => (
                  <TodoItem
                    key={todo.id}
                    todo={todo}
                    onToggle={handleToggle}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                  />
                ))}
              </Section>
            )}
          </div>
        )}
        </>
        )}
      </div>
    </div>
  )
}

// ── Section 分组组件 ──────────────────────────────

function Section({
  label,
  icon,
  count,
  accent,
  children,
}: {
  label: string
  icon: React.ReactNode
  count: number
  accent?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h2 className={`font-serif text-xs font-medium ${accent ? 'text-[#B53535]' : 'text-text-secondary'}`}>
          {label}
        </h2>
        <span className="font-mono text-[10px] text-text-quaternary">{count}</span>
      </div>
      <div className="rounded-xl border border-border-subtle bg-surface-raised divide-y divide-border-subtle/50">
        {children}
      </div>
    </div>
  )
}

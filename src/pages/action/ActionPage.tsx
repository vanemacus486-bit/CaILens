/**
 * # ActionPage — 规划 Tab
 *
 * 统一视图：待办按"未分组 + 项目分组"展示。
 * - 顶部快速添加待办
 * - "待整理"区：未归属项目的独立待办
 * - 项目卡片区：每个项目下展示其待办子项
 * - 底部创建新项目
 */

import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { ListTodo, Inbox, FolderKanban } from 'lucide-react'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'
import { TodoInput } from './TodoInput'
import { TodoItem } from './TodoItem'
import { ProjectsView } from './ProjectsView'

export function ActionPage() {
  const {
    todos,
    isLoading: todosLoading,
    isLoaded: todosLoaded,
    error: todosError,
    loadTodos,
    createTodo,
    updateTodo,
    deleteTodo,
    toggleComplete,
  } = useTodoStore()

  const { createProject } = useProjectStore()

  const [newProjectName, setNewProjectName] = useState('')

  useEffect(() => {
    if (!todosLoaded) loadTodos()
  }, [todosLoaded, loadTodos])

  // ── 操作 handlers ──

  const handleCreate = useCallback(
    (title: string) => {
      createTodo({ title })
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
    (id: string, updates: { title?: string }) => {
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

  const handleCreateProject = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const trimmed = newProjectName.trim()
      if (!trimmed) return
      createProject({ name: trimmed, categoryId: 'accent' })
      setNewProjectName('')
    },
    [newProjectName, createProject],
  )

  // ── 统计与分组 ──

  const doneCount = todos.filter((t) => t.status === 'done').length
  const activeCount = todos.length - doneCount
  const ungroupedTodos = todos.filter((t) => t.projectId === null)

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      {/* ── 头部 ── */}
      <div className="flex items-center justify-between px-6 pt-5 pb-3 flex-shrink-0">
        <h1 className="font-serif text-lg font-medium text-text-primary flex items-center gap-2">
          <ListTodo size={20} strokeWidth={1.5} className="text-accent" />
          {'规划'}
        </h1>
        <div className="flex items-center gap-3 font-sans text-xs text-text-tertiary">
          <span>
            <span className="text-text-secondary font-medium">{activeCount}</span>
            {' '}{'待处理'}
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/40" />
          <span>
            <span className="text-text-secondary font-medium">{doneCount}</span>
            {' '}{'已完成'}
          </span>
        </div>
      </div>

      {/* ── 内容区 ── */}
      <div ref={usePageScrollRestore('/action')} className="flex-1 overflow-y-auto px-6 pb-8">
        {/* 新建待办（顶部固定） */}
        <div className="mb-5">
          <TodoInput onCreate={handleCreate} />
        </div>

        {todosError && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-[#B53535]/10 border border-[#B53535]/20 text-xs font-sans text-[#B53535]">
            {todosError}
          </div>
        )}

        {todosLoading ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-sans text-sm text-text-tertiary">{'加载中…'}</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* ── 待整理（未归属项目的独立待办） ── */}
            {ungroupedTodos.length > 0 && (
              <Section
                label="待整理"
                icon={<Inbox size={14} strokeWidth={1.75} className="text-text-tertiary" />}
                count={ungroupedTodos.length}
              >
                {ungroupedTodos.map((todo) => (
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

            {/* ── 待办为空且无项目时的引导 ── */}
            {ungroupedTodos.length === 0 && todos.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Inbox size={40} strokeWidth={1.25} className="text-text-tertiary/40 mb-4" />
                <p className="font-sans text-sm text-text-tertiary mb-1">
                  {'还没有待办，在上方输入框添加'}
                </p>
              </div>
            )}

            {/* ── 项目分组待办 ── */}
            <div>
              <ProjectsView />
            </div>

            {/* ── 新建项目 ── */}
            <div>
              <form
                onSubmit={handleCreateProject}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-sunken px-4 py-2.5 transition-shadow duration-200 focus-within:shadow-sm"
              >
                <FolderKanban size={16} strokeWidth={1.75} className="text-text-quaternary flex-shrink-0" />
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  placeholder={'新建项目…'}
                  className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
                />
                <button
                  type="submit"
                  disabled={!newProjectName.trim()}
                  className="h-7 px-3 rounded-md text-xs font-medium font-sans bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer border-none"
                >
                  {'添加'}
                </button>
              </form>
            </div>
          </div>
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
  children,
}: {
  label: string
  icon: React.ReactNode
  count: number
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 px-1">
        {icon}
        <h2 className="font-serif text-xs font-medium text-text-secondary">{label}</h2>
        <span className="font-mono text-[10px] text-text-quaternary">{count}</span>
      </div>
      <div className="rounded-xl border border-border-subtle bg-surface-raised divide-y divide-border-subtle/50">
        {children}
      </div>
    </div>
  )
}

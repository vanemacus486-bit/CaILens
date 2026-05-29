/**
 * # ActionPage — 规划 Tab（待办散点图版）
 *
 * QuadrantChart 是主视图：每条待办一个圆点，Y=分类, X=紧迫度。
 * - 统一输入：标题 + 分类 + 期限（默认一周）+ 归属项目
 * - 点击圆点 → 弹框编辑/完成/删除
 * - 已完成待办不显示在图中
 */

import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { ListTodo, FolderKanban } from 'lucide-react'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'
import { calcTodoPositions } from '@/domain/quadrant'
import type { CategoryId } from '@/domain/category'
import { TodoInput } from './TodoInput'
import { QuadrantChart } from './QuadrantChart'
import { TodoDotDialog } from './TodoDotDialog'
import { ProjectsView } from './ProjectsView'

export function ActionPage() {
  // ── Stores ──
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

  const {
    projects,
    createProject,
    loadAll: loadAllProjects,
    isLoaded: projectsLoaded,
  } = useProjectStore()

  // ── 数据加载 ──
  useEffect(() => {
    if (!todosLoaded) loadTodos()
    if (!projectsLoaded) loadAllProjects()
  }, [todosLoaded, loadTodos, projectsLoaded, loadAllProjects])

  // ── 本地状态 ──
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectCategory, setNewProjectCategory] = useState<CategoryId>('accent')
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)

  // ── 散点图数据 ──
  const positions = calcTodoPositions(todos, projects, Date.now())

  // ── 选中的待办 ──
  const selectedPosition = selectedTodoId
    ? positions.find((p) => p.todoId === selectedTodoId) ?? null
    : null

  // ── 统一创建 ──
  const handleCreate = useCallback((input: {
    title: string
    categoryId: CategoryId | null
    dueDate: number | null
    projectId: string | null
  }) => {
    createTodo({
      title: input.title,
      dueDate: input.dueDate,
      projectId: input.projectId,
      categoryId: input.categoryId,
    })
  }, [createTodo])

  // ── 弹框操作 ──
  const handleDotClick = useCallback((id: string) => {
    setSelectedTodoId(id)
  }, [])

  const handleDotSave = useCallback((updates: {
    title?: string
    categoryId?: string | null
    dueDate?: number | null
    projectId?: string | null
  }) => {
    if (!selectedTodoId) return
    updateTodo({ id: selectedTodoId, ...updates })
  }, [selectedTodoId, updateTodo])

  const handleToggleDone = useCallback((id: string) => {
    toggleComplete(id)
  }, [toggleComplete])

  const handleDelete = useCallback((id: string) => {
    deleteTodo(id)
    if (selectedTodoId === id) setSelectedTodoId(null)
  }, [deleteTodo, selectedTodoId])

  // ── 新建项目 ──
  const handleCreateProject = useCallback((e: FormEvent) => {
    e.preventDefault()
    const trimmed = newProjectName.trim()
    if (!trimmed) return
    createProject({ name: trimmed, categoryId: newProjectCategory })
    setNewProjectName('')
    setNewProjectCategory('accent')
  }, [newProjectName, newProjectCategory, createProject])

  // ── 统计 ──
  const doneCount = todos.filter((t) => t.status === 'done').length
  const activeCount = todos.length - doneCount

  // ── 项目列表（给输入框用） ──
  const activeProjects = projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ id: p.id, name: p.name, categoryId: p.categoryId }))

  const activeProjectCount = projects.filter((p) => p.status === 'active').length

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      {/* ── 头部 ── */}
      <div className="border-b border-border-subtle/50 flex-shrink-0">
        <div className="flex items-center justify-between px-6 pt-4 pb-2">
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
            {activeProjectCount > 0 && (
              <>
                <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/40" />
                <span>
                  <span className="text-text-secondary font-medium">{activeProjectCount}</span>
                  {' '}{'项目'}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 内容区 ── */}
      <div ref={usePageScrollRestore('/action')} className="flex-1 overflow-y-auto px-6 pb-8 pt-4 flex flex-col min-h-0">
        {/* 统一输入 */}
        <div className="mb-6">
          <TodoInput
            projects={activeProjects}
            onCreate={handleCreate}
          />
        </div>

        {todosError && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-[#B53535]/10 border border-[#B53535]/20 text-xs font-sans text-[#B53535]">
            {todosError}
          </div>
        )}

        {todosLoading && todos.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <p className="font-sans text-sm text-text-tertiary">{'加载中…'}</p>
          </div>
        ) : (
          <div className="xl:grid xl:grid-cols-[1fr_360px] xl:grid-rows-1 xl:gap-6 flex-1 flex flex-col gap-6">
            {/* ── 左列：图表 + 已完成 ── */}
            <div className="space-y-6 min-w-0 flex-1 xl:h-full flex flex-col">
              {/* ── 待办散点图 ── */}
              {positions.length > 0 && (
                <QuadrantChart
                  positions={positions}
                  selectedId={selectedTodoId}
                  onDotClick={handleDotClick}
                />
              )}

              {/* ── 空态 ── */}
              {positions.length === 0 && todos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
                    <ListTodo size={24} strokeWidth={1.5} className="text-text-quaternary" />
                  </div>
                  <p className="font-sans text-sm text-text-tertiary mb-1">
                    {'还没有待办，在上方输入框添加'}
                  </p>
                  <p className="font-sans text-[11px] text-text-quaternary">
                    {'或新建一个项目来分组管理待办事项'}
                  </p>
                </div>
              )}

              {/* ── 已完成待办简约列表 ── */}
              {doneCount > 0 && (
                <details className="group">
                  <summary className="font-sans text-xs text-text-tertiary cursor-pointer hover:text-text-secondary transition-colors select-none list-none flex items-center gap-2">
                    <span className="inline-block w-3 transition-transform group-open:rotate-90 text-text-quaternary">{'›'}</span>
                    {'已完成'} <span className="font-mono text-[10px] text-text-quaternary">{doneCount}</span>
                  </summary>
                  <div className="mt-2 rounded-xl border border-border-subtle bg-surface-raised divide-y divide-border-subtle/50">
                    {todos
                      .filter((t) => t.status === 'done')
                      .slice(0, 20)
                      .map((todo) => (
                        <div key={todo.id} className="flex items-center gap-3 px-4 py-2">
                          <span className="font-sans text-xs text-text-tertiary line-through truncate flex-1">
                            {todo.title}
                          </span>
                          <button
                            onClick={() => toggleComplete(todo.id)}
                            className="text-[10px] font-sans text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent"
                          >
                            {'撤回'}
                          </button>
                        </div>
                      ))}
                    {doneCount > 20 && (
                      <div className="px-4 py-2 font-sans text-[10px] text-text-quaternary text-center">
                        {'仅显示最近 20 条'}
                      </div>
                    )}
                  </div>
                </details>
              )}

            {/* 弹性空白 — 撑满剩余空间 */}
            <div className="flex-1 min-h-4" />
            </div>

            {/* ── 右列：项目视图 ── */}
            <div className="space-y-4 xl:min-h-0">
              {/* ── 项目分组视图 ── */}
              {activeProjectCount > 0 && (
                <section>
                  <h2 className="font-serif text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                    <FolderKanban size={16} strokeWidth={1.5} className="text-accent" />
                    {'项目待办'}
                  </h2>
                  <ProjectsView />
                </section>
              )}

              {/* ── 新建项目 ── */}
              <form
                onSubmit={handleCreateProject}
                className="flex items-center gap-2 rounded-xl border border-border-subtle bg-surface-sunken px-4 py-2.5 transition-shadow duration-200 focus-within:shadow-sm"
              >
                <FolderKanban size={16} strokeWidth={1.75} className="text-text-quaternary flex-shrink-0" />
                <select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value as CategoryId)}
                  className="h-7 rounded-md border border-border-subtle bg-surface-sunken text-[11px] font-sans text-text-secondary px-2 outline-none cursor-pointer min-w-[70px]"
                >
                  <option value="accent">{'主要矛盾'}</option>
                  <option value="sage">{'次要矛盾'}</option>
                  <option value="sky">{'个人提升'}</option>
                  <option value="sand">{'庶务时间'}</option>
                  <option value="rose">{'娱乐休息'}</option>
                </select>
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

      {/* ── 待办编辑弹框 ── */}
      {selectedPosition && (
        <TodoDotDialog
          position={selectedPosition}
          projects={activeProjects}
          onSave={handleDotSave}
          onToggleDone={handleToggleDone}
          onDelete={handleDelete}
          onClose={() => setSelectedTodoId(null)}
        />
      )}
    </div>
  )
}

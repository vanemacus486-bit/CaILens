/**
 * # ActionPage — 规划 Tab（优先级矩阵版）
 *
 * PriorityMatrix 是主视图：5 行 (分类) × 3 列 (优先级) 网格。
 * 每个格子展示该组合下的待办卡片，点击卡片→编辑弹框。
 * - 统一输入：标题 + 分类 + 优先级 + 期限（默认一周）+ 归属项目
 * - 已完成待办不显示在矩阵中
 */

import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { ListTodo, FolderKanban } from 'lucide-react'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'
import { groupTodosByPriority } from '@/domain/todo'
import type { CategoryId } from '@/domain/category'
import { TodoInput } from './TodoInput'
import { PriorityMatrix } from './PriorityMatrix'
import { TodoDotDialog } from './TodoDotDialog'
import { ProjectsView } from './ProjectsView'

// 分类顺序（矩阵行序）
const CATEGORY_ORDER: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

export function ActionPage() {
  // ── Stores ──
  const {
    todos,
    isLoading: todosLoading,
    isLoaded: todosLoaded,
    error: todosError,
    loadTodos,
    createTodo,
    toggleComplete,
    reorderTodo,
    updateTodo,
  } = useTodoStore()

  const {
    projects,
    createProject,
    loadAll: loadAllProjects,
    isLoaded: projectsLoaded,
    reorderTodoArbitrary,
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

  // ── 项目→分类映射（供分组函数继承用） ──
  const projectCategoryMap: Record<string, string> = {}
  for (const p of projects) {
    projectCategoryMap[p.id] = p.categoryId
  }

  // ── 优先级矩阵数据 ──
  const grouped = groupTodosByPriority(todos, projectCategoryMap, CATEGORY_ORDER)

  // ── 统一创建 ──
  const handleCreate = useCallback((input: {
    title: string
    categoryId: CategoryId | null
    dueDate: number | null
    projectId: string | null
    priority: 'high' | 'medium' | 'low'
  }) => {
    createTodo({
      title: input.title,
      priority: input.priority,
      dueDate: input.dueDate,
      projectId: input.projectId,
      categoryId: input.categoryId,
    })
  }, [createTodo])

  // ── 卡片点击 ──
  const handleCardClick = useCallback((id: string) => {
    setSelectedTodoId(id)
  }, [])

  // ── 拖拽重排 ──
  const handleReorder = useCallback((
    sourceId: string,
    targetId: string,
    position: 'before' | 'after',
  ) => {
    const sourceTodo = todos.find((t) => t.id === sourceId)
    if (!sourceTodo) return
    if (sourceTodo.projectId) {
      reorderTodoArbitrary(sourceId, targetId, position)
    } else {
      reorderTodo(sourceId, targetId, position)
    }
  }, [todos, reorderTodo, reorderTodoArbitrary])

  // ── 跨格拖拽移动（改分类/优先级） ──
  const handleMoveToCell = useCallback((
    sourceId: string,
    catId: string,
    priId: string,
  ) => {
    const sourceTodo = todos.find((t) => t.id === sourceId)
    if (!sourceTodo) return
    updateTodo({
      id: sourceId,
      categoryId: catId as CategoryId,
      priority: priId as 'high' | 'medium' | 'low',
    })
  }, [todos, updateTodo])

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

  // 是否有未完成待办
  const hasActiveTodos = todos.some((t) => t.status !== 'done')

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
        {/* 统一输入 — 已移至右列 */}

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
            {/* ── 左列：矩阵 + 已完成 ── */}
            <div className="space-y-6 min-w-0 flex-1 xl:h-full flex flex-col">
              {/* ── 优先级矩阵 ── */}
              {hasActiveTodos && (
                <PriorityMatrix
                  grouped={grouped}
                  selectedId={selectedTodoId}
                  onCardClick={handleCardClick}
                  onReorder={handleReorder}
                  onMoveToCell={handleMoveToCell}
                />
              )}

              {/* ── 空态 ── */}
              {!hasActiveTodos && todos.length === 0 && (
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

              {/* ── 全部完成态 ── */}
              {!hasActiveTodos && todos.length > 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                    <CheckIcon />
                  </div>
                  <p className="font-sans text-sm text-text-tertiary">
                    {'全部完成！'}
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

            {/* ── 右列：新建待办 + 项目视图 ── */}
            <div className="space-y-4 xl:min-h-0">
              {/* ── 统一新建待办 ── */}
              <section>
                <h2 className="font-serif text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
                  <ListTodo size={16} strokeWidth={1.5} className="text-accent" />
                  {'新建待办'}
                </h2>
                <TodoInput
                  projects={activeProjects}
                  onCreate={handleCreate}
                />
              </section>

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
      {selectedTodoId && (
        <TodoDotDialog
          todoId={selectedTodoId}
          projects={activeProjects}
          onClose={() => setSelectedTodoId(null)}
        />
      )}
    </div>
  )
}

/** 小勾图标 */
function CheckIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-accent">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

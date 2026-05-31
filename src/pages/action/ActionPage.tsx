/**
 * # ActionPage — 规划 Tab（右键创建版）
 *
 * PriorityMatrix 是主视图：5 行 (分类) × 3 列 (优先级) 网格。
 * 右键矩阵区域 → QuickCreateMenu 快速创建待办。
 * 右列：ProjectChipList（项目色标组）+ OrphanTodoList（独立待办）。
 * - 分类用色点表达，优先级用浓度表达，尽量少文字
 * - 已完成待办不显示在矩阵中
 */

import { useEffect, useState, useCallback } from 'react'
import { ListTodo } from 'lucide-react'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'
import { groupTodosByPriority } from '@/domain/todo'
import type { CategoryId } from '@/domain/category'
import { PriorityMatrix } from './PriorityMatrix'
import { TodoDotDialog } from './TodoDotDialog'
import { QuickCreateMenu } from './QuickCreateMenu'
import { ProjectChipList } from './ProjectChipList'
import { OrphanTodoList } from './OrphanTodoList'

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
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // ── 项目→分类映射（供分组函数继承用） ──
  const projectCategoryMap: Record<string, string> = {}
  for (const p of projects) {
    projectCategoryMap[p.id] = p.categoryId
  }

  // ── 优先级矩阵数据 ──
  const grouped = groupTodosByPriority(todos, projectCategoryMap, CATEGORY_ORDER)

  // ── 右键菜单处理器 ──
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

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

  // ── 统计 ──
  const doneCount = todos.filter((t) => t.status === 'done').length
  const activeCount = todos.length - doneCount

  // ── 项目列表（给输入框用） ──
  const activeProjects = projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ id: p.id, name: p.name, categoryId: p.categoryId }))

  const activeProjectCount = projects.filter((p) => p.status === 'active').length

  // 独立待办（无项目归属 + 未完成）
  const orphanTodos = todos.filter((t) => !t.projectId && t.status !== 'done')

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
            {/* ── 左列：矩阵 + 已完成（右键创建） ── */}
            <div
              className="space-y-6 min-w-0 flex-1 xl:h-full flex flex-col"
              onContextMenu={handleContextMenu}
            >
              {/* ── 优先级矩阵 ── */}
              {hasActiveTodos && (
                <PriorityMatrix
                  grouped={grouped}
                  selectedId={selectedTodoId}
                  onCardClick={handleCardClick}
                  onReorder={handleReorder}
                  onMoveToCell={handleMoveToCell}
                  onComplete={toggleComplete}
                />
              )}

              {/* ── 空态 ── */}
              {!hasActiveTodos && todos.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
                    <ListTodo size={24} strokeWidth={1.5} className="text-text-quaternary" />
                  </div>
                  <p className="font-sans text-sm text-text-tertiary mb-1">
                    右键此处创建第一个待办
                  </p>
                  <p className="font-sans text-[11px] text-text-quaternary">
                    或先在右侧新建项目
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

            {/* ── 右列：项目色标组 + 独立待办 ── */}
            <div className="space-y-4 xl:min-h-0">
              <ProjectChipList />
              <OrphanTodoList
                todos={orphanTodos}
                onCardClick={handleCardClick}
                onComplete={toggleComplete}
              />
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

      {/* ── 右键快速创建菜单 ── */}
      {contextMenu && (
        <QuickCreateMenu
          x={contextMenu.x}
          y={contextMenu.y}
          projects={activeProjects}
          onCreate={(input) => {
            createTodo({
              title: input.title,
              priority: input.priority,
              dueDate: input.dueDate,
              projectId: input.projectId,
              categoryId: input.categoryId,
            })
            setContextMenu(null)
          }}
          onClose={() => setContextMenu(null)}
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

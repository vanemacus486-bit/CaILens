/**
 * # ActionPage — 规划 Tab（右键创建版，双 Tab 布局）
 *
 * 两个 Tab：「矩阵」和「日志」，仿 StatsPage 的 Tab 切换模式。
 * - 矩阵 Tab：PriorityMatrix + 已完成折叠列表 + 右列（项目/独立待办）
 * - 日志 Tab：CompletedLog（按日期查看已完成任务）
 *
 * 右键矩阵格子 → QuickCreateCard（FloatingEventCard 风格），
 * 自动匹配该格的分类和优先级。
 * 不再包含日期快捷选项和项目选择器。
 */

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListTodo } from 'lucide-react'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'
import { groupTodosByPriority } from '@/domain/todo'
import type { CategoryId } from '@/domain/category'
import type { TodoPriority } from '@/domain/todo'
import { PriorityMatrix } from './PriorityMatrix'
import { TodoDotDialog } from './TodoDotDialog'
import { QuickCreateCard } from './QuickCreateCard'
import { ProjectChipList } from './ProjectChipList'
import { OrphanTodoList } from './OrphanTodoList'
import { CompletedLog } from './CompletedLog'

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_ORDER: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

type ActionTab = 'matrix' | 'log'

const TABS: { id: ActionTab; label: string }[] = [
  { id: 'matrix', label: '矩阵' },
  { id: 'log', label: '日志' },
]

// ── 组件 ──────────────────────────────────────────────────

export function ActionPage() {
  const [searchParams, setSearchParams] = useSearchParams()

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

  // ── Tab 状态 ──
  const tab = (searchParams.get('tab') as ActionTab | null) ?? 'matrix'

  const setTab = useCallback((newTab: ActionTab) => {
    const next = new URLSearchParams(searchParams)
    if (newTab === 'matrix') next.delete('tab')
    else next.set('tab', newTab)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // ── 本地状态 ──
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)

  // 右键菜单：位置 + 格子上下文
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    categoryId: CategoryId
    priority: TodoPriority
  } | null>(null)

  // ── 项目→分类映射 ──
  const projectCategoryMap: Record<string, string> = {}
  for (const p of projects) {
    projectCategoryMap[p.id] = p.categoryId
  }

  // ── 优先级矩阵数据 ──
  const grouped = groupTodosByPriority(todos, projectCategoryMap, CATEGORY_ORDER)

  // ── 右键菜单处理器 ──
  /** 右键矩阵格子 → 预填该格的分类+优先级 */
  const handleCellContextMenu = useCallback((
    e: React.MouseEvent,
    catId: string,
    priId: string,
  ) => {
    e.preventDefault()
    e.stopPropagation() // 阻止冒泡到父级，避免被 handleContextMenu 覆盖
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      categoryId: catId as CategoryId,
      priority: priId as TodoPriority,
    })
  }, [])

  /** 右键左列空白区 → 默认 sand + medium */
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      categoryId: 'sand',
      priority: 'medium',
    })
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

  // ── 跨格拖拽移动 ──
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

  // ── 项目列表 ──
  const activeProjects = projects
    .filter((p) => p.status === 'active')
    .map((p) => ({ id: p.id, name: p.name, categoryId: p.categoryId }))

  const activeProjectCount = projects.filter((p) => p.status === 'active').length

  // 独立待办（无项目归属 + 未完成）
  const orphanTodos = todos.filter((t) => !t.projectId && t.status !== 'done')

  // 是否有未完成待办
  const hasActiveTodos = todos.some((t) => t.status !== 'done')

  // Autocomplete: unique existing titles
  const existingTitles = Array.from(new Set(todos.map((t) => t.title).filter(Boolean)))

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

        {/* ── Tab 栏 ── */}
        <div className="flex gap-0 px-6">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-6 py-2.5 font-serif text-sm tracking-wide cursor-pointer border-none bg-transparent transition-all duration-200 border-b-2 ${
                tab === t.id
                  ? 'text-text-primary font-medium border-accent'
                  : 'text-text-tertiary border-transparent hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── 内容区 ── */}
      <div ref={usePageScrollRestore('/action')} className="flex-1 overflow-y-auto px-6 pb-8 pt-4 flex flex-col min-h-0">
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
          <>
            {/* ════════════════════════════════════════════
                Tab: 矩阵
                ════════════════════════════════════════════ */}
            {tab === 'matrix' && (
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
                      onCellContextMenu={handleCellContextMenu}
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

                  {/* 弹性空白 */}
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

            {/* ════════════════════════════════════════════
                Tab: 日志
                ════════════════════════════════════════════ */}
            {tab === 'log' && (
              <div className="max-w-2xl mx-auto w-full flex-1">
                <CompletedLog
                  todos={todos}
                  onUndo={toggleComplete}
                />
              </div>
            )}
          </>
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

      {/* ── 右键快速创建卡片（FloatingEventCard 风格） ── */}
      {contextMenu && (
        <QuickCreateCard
          x={contextMenu.x}
          y={contextMenu.y}
          defaultCategoryId={contextMenu.categoryId}
          priority={contextMenu.priority}
          existingTitles={existingTitles}
          onCreate={(input) => {
            createTodo({
              title: input.title,
              priority: input.priority,
              dueDate: null,
              projectId: null,
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

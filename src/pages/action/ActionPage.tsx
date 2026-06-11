/**
 * # ActionPage — 规划 Tab
 *
 * 两个 Tab：「矩阵」和「日志」。
 * - 矩阵 Tab：PriorityMatrix + 已完成折叠列表 + 右列（项目/独立待办）
 * - 日志 Tab：七日卡片墙 — 按周展示每日已完成待办，完成项归入当天
 *
 * 右键矩阵格子 → QuickCreateCard，自动匹配该格的分类和优先级。
 */

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ListTodo } from 'lucide-react'
import { fireAndForget } from '@/lib/fireAndForget'
import { usePageScrollRestore } from '@/hooks/usePageScrollRestore'
import { TabBar } from '@/components/nav/TabBar'
import { useTabTransition } from '@/hooks/useTabTransition'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { groupTodosByPriorityWithDoneFocus, getTodayFocusStats, getTodayStart, isTodayFocus, getWeekCompletionStats, calcCompletionStreak } from '@/domain/todo'
import type { CategoryId } from '@/domain/category'
import type { TodoPriority } from '@/domain/todo'
import { computeWeekTimeline } from '@/domain/log'
import { DayTimelineCard } from '@/features/week-view/DayTimelineCard'
import { WeekNavigation } from './WeekNavigation'
import { PriorityMatrix } from './PriorityMatrix'
import { TodoDetailCard } from './TodoDetailCard'
import { QuickCreateCard } from './QuickCreateCard'
import { ProjectChipList } from './ProjectChipList'
import { OrphanTodoList } from './OrphanTodoList'
import { InboxTaskList } from './InboxTaskList'

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_ORDER: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

type ActionTab = 'matrix' | 'log'

const TABS: { id: ActionTab; label: string }[] = [
  { id: 'matrix', label: '矩阵' },
  { id: 'log', label: '日志' },
]

/** 获取本周一 0 点（基于当前日期） */
function getWeekStart(date: Date = new Date()): number {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** 判断某时间戳是否今天 */
function isToday(ts: number): boolean {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  return ts === todayStart
}

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
    deleteTodo,
  } = useTodoStore()

  // ── 收件箱任务（从原始 todos 派生，避免 selector 内创建新引用） ──
  const inboxTasks = useMemo(
    () => todos.filter((t) => t.priority === null && t.domain === null),
    [todos],
  )

  const {
    projects,
    loadAll: loadAllProjects,
    isLoaded: projectsLoaded,
    reorderTodoArbitrary,
  } = useProjectStore()

  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const loadRange = useEventStore((s) => s.loadRange)
  const categories = useCategoryStore((s) => s.categories)

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

  // ── 周导航（日志 Tab 用） ──
  const [weekOffset, setWeekOffset] = useState(0)

  const weekStart = useMemo(() => {
    const base = getWeekStart()
    return base + weekOffset * 7 * 86400000
  }, [weekOffset])

  const isCurrentWeek = useMemo(() => weekOffset === 0, [weekOffset])

  const handlePrevWeek = useCallback(() => setWeekOffset((p) => p - 1), [])
  const handleNextWeek = useCallback(() => setWeekOffset((p) => p + 1), [])
  const handleGoToday = useCallback(() => setWeekOffset(0), [])

  // ── Tab 切换动画 ──
  // key 仅含 tab 标识，weekOffset 变化不触发动画
  const { visible: tabContentVisible, className: tabContentClass } = useTabTransition(tab)

  // ── 加载日志 Tab 所需的事件 ──
  useEffect(() => {
    const weekEnd = weekStart + 7 * 86_400_000
    fireAndForget(loadRange(weekStart, weekEnd), 'load log week events')
  }, [weekStart, loadRange])

  // ── 周数据（日志 Tab 用）：聚合事件 + 已完成待办 ──
  const weekTimeline = useMemo(() => {
    const doneTodos = todos.filter((t) => t.status === 'done')
    return computeWeekTimeline(rangeEvents, doneTodos, weekStart)
  }, [rangeEvents, todos, weekStart])

  // ── 本周完成总数（用于空态判断） ──
  const weekDoneCount = useMemo(() => {
    let count = 0
    for (const day of weekTimeline.days) {
      count += day.doneTodos.length
    }
    return count
  }, [weekTimeline])

  // 日志 Tab: 周完成统计（圆点阵用，含每日时数）
  const weekCompletionStats = useMemo(() => {
    const stats = getWeekCompletionStats(
      todos.filter((t) => t.status === 'done'),
      weekStart,
    )
    // Augment with totalMs from weekTimeline
    const enhanced = stats.map((stat, i) => ({
      ...stat,
      totalMs: weekTimeline.days[i]?.totalMs ?? 0,
    }))
    return enhanced
  }, [todos, weekStart, weekTimeline])

  // ── 本地状态 ──
  const [selectedTodoId, setSelectedTodoId] = useState<string | null>(null)
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null)

  // 连续聚焦天数
  const streakDays = useMemo(() => calcCompletionStreak(todos), [todos])

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
  const grouped = groupTodosByPriorityWithDoneFocus(todos, projectCategoryMap, CATEGORY_ORDER)

  // ── 今日聚焦数据 ──
  const focusStats = getTodayFocusStats(todos)
  const focusIds = new Set(focusStats.focused.map((t) => t.id))

  // ── 格子点击处理器 ──
  const handleCellClick = useCallback((
    e: React.MouseEvent,
    catId: string,
    priId: string,
  ) => {
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      categoryId: catId as CategoryId,
      priority: priId as TodoPriority,
    })
  }, [])

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
  const handleCardClick = useCallback((id: string, e: React.MouseEvent) => {
    setSelectedTodoId(id)
    setAnchorEl(e.currentTarget as HTMLElement)
  }, [])

  // ── 拖拽重排（矩阵） ──
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

  // ── 跨日拖拽移动（日志 Tab 用） ──
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

  // ── 聚焦切换：设置/清除 today dueDate ──
  const handleToggleFocus = useCallback((todoId: string, isFocus: boolean) => {
    const todo = todos.find((t) => t.id === todoId)
    if (!todo) return
    if (isFocus) {
      updateTodo({ id: todoId, dueDate: getTodayStart() })
    } else {
      updateTodo({ id: todoId, dueDate: null })
    }
  }, [todos, updateTodo])

  /** 清除所有未完成的今日聚焦 */
  const handleClearTodayFocus = useCallback(() => {
    for (const t of todos) {
      if (isTodayFocus(t) && t.status !== 'done') {
        updateTodo({ id: t.id, dueDate: null })
      }
    }
  }, [todos, updateTodo])

  // ── 统计 ──
  const doneCount = todos.filter((t) => t.status === 'done').length
  const activeCount = todos.length - doneCount

  // ── 项目统计 ──
  const activeProjectCount = projects.filter((p) => p.status === 'active').length

  // 独立待办（无项目归属 + 未完成）
  const orphanTodos = todos.filter((t) => !t.projectId && t.status !== 'done')

  // 是否有未完成待办
  const hasActiveTodos = todos.some((t) => t.status !== 'done')

  // Autocomplete: unique existing titles
  const existingTitles = Array.from(new Set(todos.map((t) => t.title).filter(Boolean)))


  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      {/* ── Tab 栏 ── */}
      <div className="border-b border-border-subtle/50 flex-shrink-0">
        <TabBar tabs={TABS} activeId={tab} onTabChange={setTab} />
      </div>

      {/* ── 统计条 ── */}
      <div className="flex-shrink-0 px-6 pt-3 pb-2">
        <div className="flex items-center gap-3 font-sans text-xs text-text-tertiary">
          <span>
            <span className="text-text-secondary font-medium">{activeCount}</span>
            {' '}待处理
          </span>
          <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/40" />
          <span>
            <span className="text-text-secondary font-medium">{doneCount}</span>
            {' '}已完成
          </span>
          {activeProjectCount > 0 && (
            <>
              <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/40" />
              <span>
                <span className="text-text-secondary font-medium">{activeProjectCount}</span>
                {' '}项目
              </span>
            </>
          )}
        </div>
      </div>

      {/* ── 内容区 ── */}
      <div ref={usePageScrollRestore('/action')} className="flex-1 overflow-y-auto px-6 pb-8 pt-4 flex flex-col min-h-0">
        {todosError && (
          <div className="mb-4 px-4 py-2 rounded-lg bg-color-bg-danger border border-color-text-danger/20 text-xs font-sans text-color-text-danger">
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
                Tab 内容区（动画切换）
                ════════════════════════════════════════════ */}
            <div className={`flex-1 flex flex-col min-h-0 ${tabContentClass}`}>
            {tabContentVisible && (
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
                  {/* ── 今日聚焦状态条 ── */}
                  {focusStats.total > 0 && (
                    <div className="flex items-center justify-between px-3 py-1.5 rounded-lg border border-border-subtle/40 bg-surface-sunken/30">
                      <div className="flex items-center gap-2">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-70">
                          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                        </svg>
                        {focusStats.completed === focusStats.total ? (
                          <span className="font-sans text-xs text-accent">
                            {'✓ 今日采摘完成'}
                          </span>
                        ) : (
                          <span className="font-sans text-xs text-text-secondary">
                            {'今日采摘'}<span className="font-mono ml-1 text-text-tertiary">{focusStats.completed}/{focusStats.total}</span>
                          </span>
                        )}
                      </div>
                      {focusStats.completed < focusStats.total && (
                        <button
                          onClick={handleClearTodayFocus}
                          className="font-sans text-[10px] text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent px-2 py-0.5 rounded hover:bg-surface-sunken"
                          title="清除所有今日聚焦"
                        >
                          {'清空'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── 优先级矩阵 ── */}
                  {(hasActiveTodos || focusStats.total > 0) && (
                    <PriorityMatrix
                      grouped={grouped}
                      selectedId={selectedTodoId}
                      onCardClick={handleCardClick}
                      onReorder={handleReorder}
                      onMoveToCell={handleMoveToCell}
                      onComplete={toggleComplete}
                      onCellClick={handleCellClick}
                      focusIds={focusIds}
                      onToggleFocus={handleToggleFocus}
                      onDeleteTodo={deleteTodo}
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
                  {!hasActiveTodos && todos.length > 0 && focusStats.total === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-3">
                        <CheckIcon />
                      </div>
                      <p className="font-sans text-sm text-text-tertiary">
                        {'全部完成！'}
                      </p>
                    </div>
                  )}

                  {/* ── 弹性空白 ── */}
                  <div className="flex-1 min-h-4" />
                </div>

                {/* ── 右列：项目色标组 + 收件箱 + 独立待办 ── */}
                <div className="space-y-4 xl:min-h-0">
                  <ProjectChipList />
                  <InboxTaskList
                    tasks={inboxTasks}
                    onAdd={async (title) => {
                      await createTodo({ title, priority: null, domain: null, categoryId: null, projectId: null })
                    }}
                    onComplete={async (id) => {
                      await toggleComplete(id)
                    }}
                    onDelete={async (id) => {
                      await deleteTodo(id)
                    }}
                  />
                  <OrphanTodoList
                    todos={orphanTodos}
                    onCardClick={handleCardClick}
                    onComplete={toggleComplete}
                  />
                </div>
              </div>
            )}

            {/* ════════════════════════════════════════════
                Tab: 日志 — 纵向流式时间线
                ════════════════════════════════════════════ */}
            {tab === 'log' && (
              <div className="flex flex-col gap-3 flex-1">
                {/* ── 周导航 ── */}
                <WeekNavigation
                  weekLabel={weekTimeline.weekLabel}
                  doneCount={weekDoneCount}
                  totalCount={weekDoneCount}
                  showToday={!isCurrentWeek}
                  onPrevWeek={handlePrevWeek}
                  onNextWeek={handleNextWeek}
                  onGoToday={handleGoToday}
                  hideProgress
                  weekTotalHours={weekTimeline.weekTotalMs}
                  completionStats={weekCompletionStats}
                />

                {/* ── 连续聚焦日 ── */}
                {streakDays > 0 && (
                  <div className="flex items-center gap-1.5 px-1 -mt-1">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="var(--accent)" stroke="var(--accent)" strokeWidth="1.5" className="opacity-50">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                    </svg>
                    <span className="font-sans text-[10px] text-text-quaternary">
                      {'连续聚焦 '}<span className="font-medium text-text-tertiary">{streakDays}</span>{' 天'}
                    </span>
                  </div>
                )}

                {/* ── 时间线列表：纵向流式 ── */}
                <div className="flex flex-col gap-3 min-h-0">
                  {weekTimeline.days.map((day) => (
                    <DayTimelineCard
                      key={day.dateTs}
                      day={day}
                      categories={categories}
                      isToday={isToday(day.dateTs)}
                    />
                  ))}
                </div>

                {/* ── 空态（整周无任何记录） ── */}
                {weekTimeline.weekTotalMs === 0 && weekDoneCount === 0 && (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="w-12 h-12 rounded-full bg-surface-sunken flex items-center justify-center mb-4">
                      <ListTodo size={24} strokeWidth={1.5} className="text-text-quaternary" />
                    </div>
                    <p className="font-sans text-sm text-text-tertiary mb-1">
                      {'该周暂无记录'}
                    </p>
                    <p className="font-sans text-[11px] text-text-quaternary">
                      {'在日历页面记录事件或在矩阵页面创建待办后，会在此按日呈现'}
                    </p>
                  </div>
                )}
              </div>
            )}
            </>
            )}
            </div>
          </>
        )}
      </div>

      {/* ── 待办编辑浮卡 ── */}
      {selectedTodoId && anchorEl && (
        <TodoDetailCard
          todoId={selectedTodoId}
          anchorEl={anchorEl}
          onClose={() => { setSelectedTodoId(null); setAnchorEl(null) }}
        />
      )}

      {/* ── 右键快速创建卡片 ── */}
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

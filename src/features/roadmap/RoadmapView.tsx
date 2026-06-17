/**
 * # RoadmapView — 长期目标内容区
 *
 * 三段式：
 *   上段：主目标切换 chips + 可编辑横向脑图（GoalMindMap）
 *   中段：聚焦目标的任务卡（TaskCard，聚合子目标待办）
 *   下段：聚焦目标的关键指标计数器（KeyMetricsCard）
 *
 * 「聚焦目标」由脑图节点点击驱动，默认 = 当前主目标。
 */

import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Target } from 'lucide-react'
import { useGoalStore } from '@/stores/goalStore'
import { useEventStore } from '@/stores/eventStore'
import { useTodoStore } from '@/stores/todoStore'
import { getMainGoals } from '@/domain/goal'
import type { CategoryId } from '@/domain/category'
import { MainGoalSwitcher } from './MainGoalSwitcher'
import { GoalMindMap } from './GoalMindMap'
import { TaskCard } from './TaskCard'
import { InboxCard } from './InboxCard'
import { KeyMetricsCard } from './KeyMetricsCard'
import ROADMAP_CSS from './roadmap.css'

export function RoadmapView() {
  const {
    goals,
    todosByGoal,
    isLoading,
    isLoaded,
    error,
    selectedMainGoalId,
    loadAll,
    createGoal,
    updateGoal,
    deleteGoal,
    setSelectedMainGoal,
    addTodoToGoal,
    toggleTodoDone,
    removeTodoFromGoal,
    renameTodo,
    moveTodo,
    reorderMainGoals,
    addMetric,
    updateMetric,
    incrementMetric,
    removeMetric,
    toggleMetricLinkedEvent,
  } = useGoalStore()

  const { events, loadAllEvents } = useEventStore()
  const {
    todos,
    isLoaded: todosLoaded,
    loadTodos,
    toggleComplete: toggleTodo,
    deleteTodo,
    updateTodo,
    quickCapture,
  } = useTodoStore()

  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(null)

  useEffect(() => {
    if (events.length === 0) loadAllEvents()
  }, [events.length, loadAllEvents])

  useEffect(() => {
    if (!todosLoaded) loadTodos()
  }, [todosLoaded, loadTodos])

  // 未分配待办（goalId === null）：来源 todoStore，与 N 快速记录同源
  const unassignedTodos = useMemo(() => todos.filter((t) => !t.goalId), [todos])

  // CSS injection (once)
  const cssInjected = useRef(false)
  useEffect(() => {
    if (!cssInjected.current) {
      const style = document.createElement('style')
      style.textContent = ROADMAP_CSS
      document.head.appendChild(style)
      cssInjected.current = true
    }
  }, [])

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  // 切换主目标时，聚焦回主目标
  useEffect(() => {
    setFocusedGoalId(selectedMainGoalId)
  }, [selectedMainGoalId])

  const mainGoals = useMemo(() => getMainGoals(goals), [goals])

  const selectedMainGoal = useMemo(
    () => goals.find((g) => g.id === selectedMainGoalId) ?? null,
    [goals, selectedMainGoalId],
  )

  // 聚焦目标（失效则回退主目标）
  const focusedGoal = useMemo(() => {
    const f = goals.find((g) => g.id === focusedGoalId)
    return f ?? selectedMainGoal
  }, [goals, focusedGoalId, selectedMainGoal])

  // 聚焦节点被删后回退
  useEffect(() => {
    if (focusedGoalId && !goals.find((g) => g.id === focusedGoalId)) {
      setFocusedGoalId(selectedMainGoalId)
    }
  }, [goals, focusedGoalId, selectedMainGoalId])

  // 聚合：聚焦目标 + 所有后代的待办
  const aggregatedTodos = useMemo(() => {
    if (!focusedGoal) return []
    const collectIds = (id: string): string[] => {
      const children = goals.filter((g) => g.parentId === id && g.status !== 'archived')
      return [id, ...children.flatMap((c) => collectIds(c.id))]
    }
    return collectIds(focusedGoal.id).flatMap((id) => todosByGoal[id] ?? [])
  }, [focusedGoal, goals, todosByGoal])

  // goalId → color string (for sub-goal badges in TaskCard)
  const goalColorMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const g of goals) {
      map[g.id] = g.categoryId ? `var(--event-${g.categoryId}-fill)` : 'var(--accent)'
    }
    return map
  }, [goals])

  // ── Callbacks ──────────────────────────────────────────────

  const handleCreateMainGoal = useCallback(
    async (title: string, categoryId?: CategoryId | null) => {
      const goal = await createGoal({ title, categoryId: categoryId ?? null })
      setSelectedMainGoal(goal.id)
    },
    [createGoal, setSelectedMainGoal],
  )

  const handleAddChildGoal = useCallback(
    async (parentId: string, title: string, categoryId?: CategoryId | null) => {
      if (!title) return
      await createGoal({ title, parentId, categoryId: categoryId ?? null })
    },
    [createGoal],
  )

  const handleRenameGoal = useCallback(
    async (goalId: string, newTitle: string) => {
      await updateGoal({ id: goalId, title: newTitle })
    },
    [updateGoal],
  )

  const handleDeleteGoal = useCallback(
    async (goalId: string) => {
      await deleteGoal(goalId)
      await loadTodos() // 目标删除后其待办 goalId 被置空，刷新收件箱使其重新出现
    },
    [deleteGoal, loadTodos],
  )

  const handleColorChange = useCallback(
    async (goalId: string, categoryId: CategoryId | null) => {
      await updateGoal({ id: goalId, categoryId })
    },
    [updateGoal],
  )

  const handleAddTodo = useCallback(
    async (goalId: string, title: string) => {
      if (!title) return
      await addTodoToGoal(goalId, title)
    },
    [addTodoToGoal],
  )

  const handleToggleTodo = useCallback(
    (todoId: string) => { toggleTodoDone(todoId) },
    [toggleTodoDone],
  )

  const handleDeleteTodo = useCallback(
    (todoId: string) => { removeTodoFromGoal(todoId) },
    [removeTodoFromGoal],
  )

  const handleRenameTodo = useCallback(
    (todoId: string, newTitle: string) => { renameTodo(todoId, newTitle) },
    [renameTodo],
  )

  const handleMoveTodo = useCallback(
    (goalId: string, todoId: string, newIndex: number) => {
      moveTodo(goalId, todoId, newIndex)
    },
    [moveTodo],
  )

  const handleReorderMainGoals = useCallback(
    (orderedIds: string[]) => { reorderMainGoals(orderedIds) },
    [reorderMainGoals],
  )

  const handleAssignTodo = useCallback(
    async (todoId: string, goalId: string) => {
      await updateTodo({ id: todoId, goalId })
      await loadAll() // 刷新目标分组：挂靠后的待办出现在对应任务卡
    },
    [updateTodo, loadAll],
  )

  const inboxCard =
    unassignedTodos.length > 0 ? (
      <div style={{ marginTop: 16 }}>
        <InboxCard
          todos={unassignedTodos}
          goals={goals}
          onAdd={async (title) => {
            await quickCapture(title)
          }}
          onToggle={toggleTodo}
          onDelete={deleteTodo}
          onRename={(id, title) => {
            void updateTodo({ id, title })
          }}
          onAssign={handleAssignTodo}
        />
      </div>
    ) : null

  // ── Render ─────────────────────────────────────────────────

  if (isLoading && goals.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-sans text-sm text-text-tertiary">加载中…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mb-4 px-4 py-2 rounded-lg bg-color-bg-danger border border-color-text-danger/20 text-xs font-sans text-color-text-danger">
        {error}
      </div>
    )
  }

  if (mainGoals.length === 0) {
    return (
      <div style={{ width: '100%', maxWidth: 880, margin: '0 auto', paddingBottom: 60 }}>
        <div className="roadmap-empty">
          <div className="roadmap-empty-icon">
            <Target size={24} strokeWidth={1.5} />
          </div>
          <p className="roadmap-empty-title">还没有目标</p>
          <p className="roadmap-empty-desc">创建第一个长期目标，开始追踪你的成长轨迹</p>
          <button
            className="roadmap-empty-btn"
            onClick={async () => {
              const goal = await createGoal({ title: '新目标' })
              setSelectedMainGoal(goal.id)
            }}
          >
            创建第一个长期目标
          </button>
        </div>
        {inboxCard}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 880, margin: '0 auto', paddingBottom: 60 }}>
      <MainGoalSwitcher
        mainGoals={mainGoals}
        selectedId={selectedMainGoalId}
        onSelect={setSelectedMainGoal}
        onCreate={handleCreateMainGoal}
        onDelete={handleDeleteGoal}
        onRename={handleRenameGoal}
        onColorChange={handleColorChange}
        onReorder={handleReorderMainGoals}
      />

      {selectedMainGoal && (
        <div className="roadmap-sections">
          {/* 上段：横向脑图 */}
          <section className="roadmap-mindmap-section">
            <GoalMindMap
              mainGoal={selectedMainGoal}
              allGoals={goals}
              todosByGoal={todosByGoal}
              focusedGoalId={focusedGoal?.id ?? null}
              onFocus={setFocusedGoalId}
              onAddChild={handleAddChildGoal}
              onRename={handleRenameGoal}
              onDelete={handleDeleteGoal}
              onColorChange={handleColorChange}
              onReorder={handleReorderMainGoals}
            />
          </section>

          {focusedGoal && (
            <>
              {/* 中段：任务卡（聚合子目标待办） */}
              <TaskCard
                goal={focusedGoal}
                todos={aggregatedTodos}
                goalColorMap={goalColorMap}
                onAddTodo={handleAddTodo}
                onToggleTodo={handleToggleTodo}
                onDeleteTodo={handleDeleteTodo}
                onRenameTodo={handleRenameTodo}
                onMoveTodo={handleMoveTodo}
              />

              {/* 下段：关键指标 */}
              <KeyMetricsCard
                goal={focusedGoal}
                events={events}
                onAddMetric={addMetric}
                onIncrement={incrementMetric}
                onUpdateMetric={updateMetric}
                onRemoveMetric={removeMetric}
                onToggleMetricEvent={toggleMetricLinkedEvent}
              />
            </>
          )}
        </div>
      )}

      {inboxCard}
    </div>
  )
}

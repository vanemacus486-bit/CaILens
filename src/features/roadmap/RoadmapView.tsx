/**
 * # RoadmapView — 长期目标内容区
 *
 * 上：主目标切换 chips
 * 中：全宽横向脑图 band（GoalMindMap）
 * 下：聚焦目标工作区，分 tab —— 任务 / 时间 / 已完成 / 文档
 *
 * 「聚焦目标」由脑图节点点击驱动，默认 = 当前主目标。
 */

import { useEffect, useMemo, useCallback, useRef, useState } from 'react'
import { Target } from 'lucide-react'
import { useGoalStore } from '@/stores/goalStore'
import { useEventStore } from '@/stores/eventStore'
import { useTodoStore } from '@/stores/todoStore'
import { getMainGoals, isProjectComplete } from '@/domain/goal'
import type { CategoryId } from '@/domain/category'
import type { Todo } from '@/domain/todo'
import { MainGoalSwitcher } from './MainGoalSwitcher'
import { GoalMindMap } from './GoalMindMap'
import { TaskCard } from './TaskCard'
import { InboxCard } from './InboxCard'
import { KeyMetricsCard } from './KeyMetricsCard'
import { GoalDocTab } from './GoalDocTab'
import { DoneArchiveTab } from './DoneArchiveTab'
import { ArchiveView } from './ArchiveView'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import ROADMAP_CSS from './roadmap.css'

export function RoadmapView() {
  const {
    goals,
    isLoading,
    isLoaded,
    error,
    selectedMainGoalId,
    loadAll,
    createGoal,
    updateGoal,
    deleteGoal,
    setSelectedMainGoal,
    reorderMainGoals,
    addMetric,
    updateMetric,
    incrementMetric,
    removeMetric,
    toggleMetricLinkedEvent,
    addGoalNote,
    updateGoalNote,
    removeGoalNote,
    markProjectDone,
    restoreProject,
  } = useGoalStore()

  const { events, loadAllEvents } = useEventStore()
  // 待办全部以 todoStore 为唯一数据源（每次写操作都从 DB 重载），
  // 规划页的目标卡 / 脑图 / 已完成都从这里派生 —— 不再用 goalStore 的
  // 第二份 todosByGoal 缓存（它只在首次 loadAll 时建，之后形同冻结，
  // 任何经 todoStore 的改动都同步不到 → 待办“消失/串位/删了又回来”）。
  const {
    todos,
    isLoaded: todosLoaded,
    loadTodos,
    createTodo,
    toggleComplete: toggleTodo,
    deleteTodo,
    updateTodo,
    moveTodoWithinGoal,
    quickCapture,
  } = useTodoStore()

  const [focusedGoalId, setFocusedGoalId] = useState<string | null>(null)
  const [tab, setTab] = useState<'tasks' | 'time' | 'done' | 'docs'>('tasks')
  const [showArchive, setShowArchive] = useState(false)
  const [confirmDoneGoalId, setConfirmDoneGoalId] = useState<string | null>(null)
  const [confirmDoneHasOpen, setConfirmDoneHasOpen] = useState(false)

  useEffect(() => {
    if (events.length === 0) loadAllEvents()
  }, [events.length, loadAllEvents])

  useEffect(() => {
    if (!todosLoaded) loadTodos()
  }, [todosLoaded, loadTodos])

  // 未分配待办（goalId === null）：来源 todoStore，与 N 快速记录同源
  const unassignedTodos = useMemo(() => todos.filter((t) => !t.goalId), [todos])

  // 目标 → 待办索引：直接从 todoStore 派生，永远与 DB 一致
  const todosByGoal = useMemo(() => {
    const map: Record<string, Todo[]> = {}
    for (const t of todos) {
      if (t.goalId) (map[t.goalId] ??= []).push(t)
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.sortOrder - b.sortOrder)
    }
    return map
  }, [todos])

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

  const archiveDoneCount = useMemo(
    () => goals.filter((g) => g.parentId === null && g.status === 'done').length,
    [goals],
  )

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
      const children = goals.filter((g) => g.parentId === id && g.status === 'active')
      return [id, ...children.flatMap((c) => collectIds(c.id))]
    }
    return collectIds(focusedGoal.id).flatMap((id) => todosByGoal[id] ?? [])
  }, [focusedGoal, goals, todosByGoal])

  const doneCount = useMemo(
    () => aggregatedTodos.filter((t) => t.status === 'done').length,
    [aggregatedTodos],
  )

  // 聚焦目标的祖先链（主目标 › … › 当前），供工作区面包屑显示
  const focusPath = useMemo(() => {
    if (!focusedGoal) return []
    const path: typeof goals = []
    let cur = goals.find((g) => g.id === focusedGoal.id)
    while (cur) {
      path.unshift(cur)
      const parentId: string | null = cur.parentId
      cur = parentId ? goals.find((g) => g.id === parentId) : undefined
    }
    return path
  }, [focusedGoal, goals])

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
      await createTodo({ title, goalId })
    },
    [createTodo],
  )

  const handleToggleTodo = useCallback(
    (todoId: string) => { void toggleTodo(todoId) },
    [toggleTodo],
  )

  const handleDeleteTodo = useCallback(
    (todoId: string) => { void deleteTodo(todoId) },
    [deleteTodo],
  )

  const handleRenameTodo = useCallback(
    (todoId: string, newTitle: string) => { void updateTodo({ id: todoId, title: newTitle }) },
    [updateTodo],
  )

  const handleMoveTodo = useCallback(
    (goalId: string, todoId: string, newIndex: number) => {
      void moveTodoWithinGoal(goalId, todoId, newIndex)
    },
    [moveTodoWithinGoal],
  )

  const handleReorderMainGoals = useCallback(
    (orderedIds: string[]) => { reorderMainGoals(orderedIds) },
    [reorderMainGoals],
  )

  const handleAssignTodo = useCallback(
    async (todoId: string, goalId: string) => {
      // 仅改 todo 的 goalId；todoStore 重载后 todosByGoal 自动重算，
      // 待办即出现在对应任务卡、离开收件箱（无需再 loadAll 目标树）。
      await updateTodo({ id: todoId, goalId })
    },
    [updateTodo],
  )

  const handleMarkDone = useCallback(
    (goalId: string) => {
      const goal = goals.find((g) => g.id === goalId)
      if (!goal) return
      // 检查是否需要确认（有未完成子任务）
      if (!isProjectComplete(goal, goals, todos)) {
        const subtreeGoalIds = new Set<string>()
        const collect = (id: string) => {
          subtreeGoalIds.add(id)
          goals.filter((g) => g.parentId === id).forEach((g) => collect(g.id))
        }
        collect(goalId)
        const incompleteCount = todos.filter(
          (t) => t.goalId && subtreeGoalIds.has(t.goalId) && t.status !== 'done',
        ).length
        if (incompleteCount > 0) {
          setConfirmDoneGoalId(goalId)
          setConfirmDoneHasOpen(true)
          return
        }
      }
      // 无未完成子任务或全部完成，直接标记
      void markProjectDone(goalId)
    },
    [goals, todos, markProjectDone],
  )

  const handleConfirmDone = useCallback(() => {
    if (confirmDoneGoalId) {
      void markProjectDone(confirmDoneGoalId)
    }
    setConfirmDoneGoalId(null)
    setConfirmDoneHasOpen(false)
  }, [confirmDoneGoalId, markProjectDone])

  const handleRestoreProject = useCallback(
    (goalId: string) => {
      void restoreProject(goalId)
    },
    [restoreProject],
  )

  const inboxCardInner =
    unassignedTodos.length > 0 ? (
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
        {inboxCardInner && <div style={{ marginTop: 16 }}>{inboxCardInner}</div>}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', maxWidth: 1400, margin: '0 auto', paddingBottom: 60 }}>
      <MainGoalSwitcher
        mainGoals={mainGoals}
        selectedId={selectedMainGoalId}
        onSelect={(id) => {
          setSelectedMainGoal(id)
          setShowArchive(false)
        }}
        onCreate={handleCreateMainGoal}
        onDelete={handleDeleteGoal}
        onRename={handleRenameGoal}
        onColorChange={handleColorChange}
        onReorder={handleReorderMainGoals}
        onMarkDone={handleMarkDone}
        doneCount={archiveDoneCount}
        onShowArchive={() => setShowArchive(true)}
      />

      {showArchive ? (
        <div style={{ marginTop: 8 }}>
          <ArchiveView
            goals={goals}
            allTodos={todos}
            goalColorMap={goalColorMap}
            onRestore={handleRestoreProject}
            onToggleTodo={handleToggleTodo}
            onDeleteTodo={handleDeleteTodo}
          />
        </div>
      ) : selectedMainGoal ? (
        <>
          {/* 脑图 band：全宽矮条，横向铺、横向滚动 */}
          <div className="roadmap-board">
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
                onMarkDone={handleMarkDone}
              />
            </section>
          </div>

          {/* 聚焦目标工作区：全宽，分 tab */}
          {focusedGoal && (
            <div className="roadmap-workspace">
              <div className="roadmap-ws-tabs" role="tablist">
                <button
                  className={`roadmap-ws-tab ${tab === 'tasks' ? 'roadmap-ws-tab-active' : ''}`}
                  onClick={() => setTab('tasks')}
                >
                  任务
                  {aggregatedTodos.length > 0 && (
                    <span className="roadmap-ws-tab-count">{aggregatedTodos.length}</span>
                  )}
                </button>
                <button
                  className={`roadmap-ws-tab ${tab === 'time' ? 'roadmap-ws-tab-active' : ''}`}
                  onClick={() => setTab('time')}
                >
                  时间
                </button>
                <button
                  className={`roadmap-ws-tab ${tab === 'done' ? 'roadmap-ws-tab-active' : ''}`}
                  onClick={() => setTab('done')}
                >
                  已完成
                  {doneCount > 0 && <span className="roadmap-ws-tab-count">{doneCount}</span>}
                </button>
                <button
                  className={`roadmap-ws-tab ${tab === 'docs' ? 'roadmap-ws-tab-active' : ''}`}
                  onClick={() => setTab('docs')}
                >
                  文档
                </button>
                <span
                  className="roadmap-ws-focus"
                  title={focusPath.map((g) => g.title).join(' › ')}
                >
                  <Target size={12} strokeWidth={2} />
                  <span className="roadmap-ws-focus-text">{focusedGoal.title}</span>
                </span>
              </div>

              {tab === 'tasks' && (
                <div className="roadmap-ws-tasks">
                  {/* 任务卡（聚合子目标待办） */}
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

                  {/* 关键指标 */}
                  <KeyMetricsCard
                    goal={focusedGoal}
                    events={events}
                    onAddMetric={addMetric}
                    onIncrement={incrementMetric}
                    onUpdateMetric={updateMetric}
                    onRemoveMetric={removeMetric}
                    onToggleMetricEvent={toggleMetricLinkedEvent}
                  />
                </div>
              )}

              {tab === 'time' && (
                <div className="roadmap-ws-placeholder">时间投入即将接入真实事件时长</div>
              )}
              {tab === 'done' && (
                <DoneArchiveTab
                  todos={aggregatedTodos.filter((t) => t.status === 'done')}
                  goalColorMap={goalColorMap}
                  focusGoalId={focusedGoal.id}
                  onToggle={handleToggleTodo}
                  onDelete={handleDeleteTodo}
                />
              )}
              {tab === 'docs' && (
                <GoalDocTab
                  goal={focusedGoal}
                  onAddNote={addGoalNote}
                  onUpdateNote={updateGoalNote}
                  onRemoveNote={removeGoalNote}
                />
              )}
            </div>
          )}

          {/* 未分配收件箱：落在工作区下方 */}
          {inboxCardInner && <div style={{ marginTop: 16 }}>{inboxCardInner}</div>}
        </>
      ) : (
        inboxCardInner && <div style={{ marginTop: 16 }}>{inboxCardInner}</div>
      )}

      {/* 标记完成确认对话框 */}
      <AlertDialog open={confirmDoneHasOpen} onOpenChange={(open) => { if (!open) { setConfirmDoneGoalId(null); setConfirmDoneHasOpen(false) } }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>标记项目为已完成？</AlertDialogTitle>
            <AlertDialogDescription>
              还有子任务未完成。标记完成后，项目将离开活跃视图进入归档，待办与文档完整保留。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDone}>
              确认完成
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

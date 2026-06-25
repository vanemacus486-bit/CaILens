/**
 * # goalStore — 长期目标树状态管理
 *
 * Zustand 切片，包裹 GoalRepository + TodoRepository。
 * 组件只通过此 store 访问目标数据。
 */

import { create } from 'zustand'
import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/domain/goal'
import { sortGoals, getMainGoals, isActiveGoal } from '@/domain/goal'
import type { KeyMetric, CreateMetricInput } from '@/domain/keyMetric'
import { makeMetric } from '@/domain/keyMetric'
import type { GoalNote } from '@/domain/goalDoc'
import { normalizeGoalDoc, makeNote } from '@/domain/goalDoc'
import type { Todo } from '@/domain/todo'
import { getGoalRepo, getTodoRepo } from '@/data/getRepositories'

const LS_KEY = 'cailens_selected_main_goal'

interface GoalState {
  goals: Goal[]
  isLoaded: boolean
  isLoading: boolean
  error: string | null
  selectedMainGoalId: string | null

  loadAll: () => Promise<void>
  createGoal: (input: CreateGoalInput) => Promise<Goal>
  updateGoal: (input: UpdateGoalInput) => Promise<void>
  deleteGoal: (id: string) => Promise<void>
  reorderGoal: (id: string, dir: 'up' | 'down') => Promise<void>
  setSelectedMainGoal: (id: string) => void

  reorderMainGoals: (orderedIds: string[]) => Promise<void>

  toggleLinkedEvent: (goalId: string, eventId: string) => Promise<void>

  // 关键指标计数器
  addMetric: (goalId: string, input: CreateMetricInput) => Promise<void>
  updateMetric: (goalId: string, metricId: string, patch: Partial<Omit<KeyMetric, 'id'>>) => Promise<void>
  incrementMetric: (goalId: string, metricId: string, delta: number) => Promise<void>
  removeMetric: (goalId: string, metricId: string) => Promise<void>
  toggleMetricLinkedEvent: (goalId: string, metricId: string, eventId: string) => Promise<void>

  // 自由文档
  addGoalNote: (goalId: string) => Promise<string>
  updateGoalNote: (
    goalId: string,
    noteId: string,
    patch: Partial<Pick<GoalNote, 'title' | 'body'>>,
  ) => Promise<void>
  removeGoalNote: (goalId: string, noteId: string) => Promise<void>

  // 项目完成 / 恢复
  markProjectDone: (goalId: string) => Promise<void>
  restoreProject: (goalId: string) => Promise<void>
}

export const useGoalStore = create<GoalState>()((set, get) => ({
  goals: [],
  isLoaded: false,
  isLoading: false,
  error: null,
  selectedMainGoalId: null,

  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      // 只管目标树本身；待办由 todoStore 持有（规划页从 todoStore 派生 todosByGoal）
      const goals = sortGoals(await getGoalRepo().getAll())

      // 确定 selectedMainGoalId
      const mainGoals = getMainGoals(goals)
      let selectedId = localStorage.getItem(LS_KEY)
      if (selectedId && !mainGoals.find((g) => g.id === selectedId)) {
        selectedId = null // 失效
      }
      if (!selectedId && mainGoals.length > 0) {
        selectedId = mainGoals[0].id
      }

      set({ goals, selectedMainGoalId: selectedId, isLoaded: true, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  createGoal: async (input) => {
    const goal = await getGoalRepo().create(input)
    set((state) => ({
      goals: sortGoals([...state.goals, goal]),
    }))
    // 如果没有选中主目标，自动选新建的主目标
    const mainGoals = getMainGoals(sortGoals([...get().goals, goal]))
    if (!get().selectedMainGoalId && mainGoals.length > 0) {
      get().setSelectedMainGoal(mainGoals[0].id)
    }
    return goal
  },

  updateGoal: async (input) => {
    const updated = await getGoalRepo().update(input)
    set((state) => ({
      goals: sortGoals(state.goals.map((g) => (g.id === updated.id ? updated : g))),
    }))
  },

  deleteGoal: async (id) => {
    const allGoals = get().goals
    const currentSelectedId = get().selectedMainGoalId

    // 递归收集所有子目标 id
    const collectDescendants = (parentId: string): string[] => {
      const children = allGoals.filter((g) => g.parentId === parentId)
      return [parentId, ...children.flatMap((c) => collectDescendants(c.id))]
    }
    const toDelete = collectDescendants(id)
    const toDeleteSet = new Set(toDelete)

    // 1. 乐观更新 UI（立即响应）
    const remaining = allGoals.filter((g) => !toDeleteSet.has(g.id))
    set({ goals: sortGoals(remaining) })

    // 如果删除的是当前选中主目标，立即切换
    if (toDeleteSet.has(currentSelectedId ?? '')) {
      const mainGoals = getMainGoals(remaining)
      if (mainGoals.length > 0) {
        get().setSelectedMainGoal(mainGoals[0].id)
      } else {
        set({ selectedMainGoalId: null })
        localStorage.removeItem(LS_KEY)
      }
    }

    // 2. DB：把这些目标下的待办一次性释放回收件箱（goalId=null），再删目标。
    //    用单次 bulkPut 而非逐条 update —— 文件系统存储下每写一条都会 flush 落盘，
    //    逐条会变成 N 次磁盘写 + N 次监听回灌，正是“删除卡顿 / 列表闪烁”的来源。
    const goalRepo = getGoalRepo()
    const todoRepo = getTodoRepo()
    const linkedLists = await Promise.all(toDelete.map((goalId) => todoRepo.getByGoal(goalId)))
    const now = Date.now()
    const released: Todo[] = linkedLists.flat().map((t) => ({ ...t, goalId: null, updatedAt: now }))
    if (released.length > 0) await todoRepo.bulkPut(released)
    await Promise.all(toDelete.map((goalId) => goalRepo.delete(goalId)))
    // 调用方（RoadmapView）随后 loadTodos() 刷新收件箱，释放的待办即重新出现
  },

  reorderGoal: async (id, direction) => {
    const repo = getGoalRepo()
    await repo.reorderGoal(id, direction)
    const goals = sortGoals(await repo.getAll())
    set({ goals })
  },

  setSelectedMainGoal: (id) => {
    localStorage.setItem(LS_KEY, id)
    set({ selectedMainGoalId: id })
  },

  reorderMainGoals: async (orderedIds) => {
    const goalRepo = getGoalRepo()
    const { goals } = get()
    const now = Date.now()
    const updates: Goal[] = orderedIds
      .map((id, i) => {
        const g = goals.find((x) => x.id === id)
        if (!g) return null
        return { ...g, sortOrder: i, updatedAt: now }
      })
      .filter((g): g is Goal => g !== null)
    await goalRepo.bulkPut(updates)
    set((state) => ({
      goals: sortGoals(
        state.goals.map((g) => updates.find((u) => u.id === g.id) ?? g),
      ),
    }))
  },

  toggleLinkedEvent: async (goalId, eventId) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return
    const current = goal.linkedEventIds ?? []
    const next = current.includes(eventId)
      ? current.filter((e) => e !== eventId)
      : [...current, eventId]
    await get().updateGoal({ id: goalId, linkedEventIds: next })
  },

  // 任何写操作都先把 doc 归一成新版 { notes }（顺带迁移旧三段框架），
  // 再整体写回 —— 落盘的永远是新结构，旧字段随首次编辑自然消失。
  addGoalNote: async (goalId) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return ''
    const note = makeNote(crypto.randomUUID(), Date.now())
    const notes = [...normalizeGoalDoc(goal.doc).notes, note]
    await get().updateGoal({ id: goalId, doc: { notes } })
    return note.id
  },

  updateGoalNote: async (goalId, noteId, patch) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return
    const now = Date.now()
    const notes = normalizeGoalDoc(goal.doc).notes.map((n) =>
      n.id === noteId ? { ...n, ...patch, updatedAt: now } : n,
    )
    await get().updateGoal({ id: goalId, doc: { notes } })
  },

  removeGoalNote: async (goalId, noteId) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return
    const notes = normalizeGoalDoc(goal.doc).notes.filter((n) => n.id !== noteId)
    await get().updateGoal({ id: goalId, doc: { notes } })
  },

  addMetric: async (goalId, input) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal) return
    const metric = makeMetric(crypto.randomUUID(), input)
    const next = [...(goal.metrics ?? []), metric]
    await get().updateGoal({ id: goalId, metrics: next })
  },

  updateMetric: async (goalId, metricId, patch) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal?.metrics) return
    const next = goal.metrics.map((m) => (m.id === metricId ? { ...m, ...patch } : m))
    await get().updateGoal({ id: goalId, metrics: next })
  },

  incrementMetric: async (goalId, metricId, delta) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal?.metrics) return
    const next = goal.metrics.map((m) =>
      m.id === metricId ? { ...m, manualCount: Math.max(0, m.manualCount + delta) } : m,
    )
    await get().updateGoal({ id: goalId, metrics: next })
  },

  removeMetric: async (goalId, metricId) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal?.metrics) return
    const next = goal.metrics.filter((m) => m.id !== metricId)
    await get().updateGoal({ id: goalId, metrics: next })
  },

  toggleMetricLinkedEvent: async (goalId, metricId, eventId) => {
    const goal = get().goals.find((g) => g.id === goalId)
    if (!goal?.metrics) return
    const next = goal.metrics.map((m) => {
      if (m.id !== metricId) return m
      const ids = m.linkedEventIds.includes(eventId)
        ? m.linkedEventIds.filter((e) => e !== eventId)
        : [...m.linkedEventIds, eventId]
      return { ...m, linkedEventIds: ids }
    })
    await get().updateGoal({ id: goalId, metrics: next })
  },

  markProjectDone: async (goalId) => {
    const now = Date.now()
    await get().updateGoal({ id: goalId, status: 'done', completedAt: now, updatedAt: now })

    // 如果完成的是当前选中主目标，自动切到下一个活跃主目标
    if (get().selectedMainGoalId === goalId) {
      const remaining = get().goals.filter((g) => g.parentId === null && isActiveGoal(g))
      if (remaining.length > 0) {
        get().setSelectedMainGoal(remaining[0].id)
      } else {
        set({ selectedMainGoalId: null })
        localStorage.removeItem(LS_KEY)
      }
    }
  },

  restoreProject: async (goalId) => {
    const now = Date.now()
    await get().updateGoal({ id: goalId, status: 'active', completedAt: undefined, updatedAt: now })
  },
}))

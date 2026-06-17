/**
 * # goalStore — 长期目标树状态管理
 *
 * Zustand 切片，包裹 GoalRepository + TodoRepository。
 * 组件只通过此 store 访问目标数据。
 */

import { create } from 'zustand'
import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/domain/goal'
import { sortGoals, getMainGoals } from '@/domain/goal'
import type { KeyMetric, CreateMetricInput } from '@/domain/keyMetric'
import { makeMetric } from '@/domain/keyMetric'
import type { Todo } from '@/domain/todo'
import { getGoalRepo, getTodoRepo } from '@/data/getRepositories'

const LS_KEY = 'cailens_selected_main_goal'

interface GoalState {
  goals: Goal[]
  todosByGoal: Record<string, Todo[]>
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

  // 待办块操作（复用 todoRepo）
  addTodoToGoal: (goalId: string, title: string) => Promise<void>
  toggleTodoDone: (todoId: string) => Promise<void>
  removeTodoFromGoal: (todoId: string) => Promise<void>
  renameTodo: (todoId: string, newTitle: string) => Promise<void>
  moveTodo: (goalId: string, todoId: string, newIndex: number) => Promise<void>
  reorderMainGoals: (orderedIds: string[]) => Promise<void>

  toggleLinkedEvent: (goalId: string, eventId: string) => Promise<void>

  // 关键指标计数器
  addMetric: (goalId: string, input: CreateMetricInput) => Promise<void>
  updateMetric: (goalId: string, metricId: string, patch: Partial<Omit<KeyMetric, 'id'>>) => Promise<void>
  incrementMetric: (goalId: string, metricId: string, delta: number) => Promise<void>
  removeMetric: (goalId: string, metricId: string) => Promise<void>
  toggleMetricLinkedEvent: (goalId: string, metricId: string, eventId: string) => Promise<void>

  // 帮助方法
  getTodosByGoal: (goalId: string) => Todo[]
}

export const useGoalStore = create<GoalState>()((set, get) => ({
  goals: [],
  todosByGoal: {},
  isLoaded: false,
  isLoading: false,
  error: null,
  selectedMainGoalId: null,

  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const goalRepo = getGoalRepo()
      const todoRepo = getTodoRepo()
      const goals = sortGoals(await goalRepo.getAll())
      const allTodos = await todoRepo.getAll()

      // 构建 todosByGoal 索引
      const todosByGoal: Record<string, Todo[]> = {}
      for (const t of allTodos) {
        if (t.goalId) {
          (todosByGoal[t.goalId] ??= []).push(t)
        }
      }
      for (const key of Object.keys(todosByGoal)) {
        todosByGoal[key].sort((a, b) => a.sortOrder - b.sortOrder)
      }

      // 确定 selectedMainGoalId
      const mainGoals = getMainGoals(goals)
      let selectedId = localStorage.getItem(LS_KEY)
      if (selectedId && !mainGoals.find((g) => g.id === selectedId)) {
        selectedId = null // 失效
      }
      if (!selectedId && mainGoals.length > 0) {
        selectedId = mainGoals[0].id
      }

      set({ goals, todosByGoal, selectedMainGoalId: selectedId, isLoaded: true, isLoading: false })
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
    const newTodosByGoal = { ...get().todosByGoal }
    for (const goalId of toDelete) {
      delete newTodosByGoal[goalId]
    }
    set({ goals: sortGoals(remaining), todosByGoal: newTodosByGoal })

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

    // 2. 并行执行 DB 操作（不阻塞 UI）
    const goalRepo = getGoalRepo()
    const todoRepo = getTodoRepo()
    await Promise.all(
      toDelete.map(async (goalId) => {
        const linkedTodos = await todoRepo.getByGoal(goalId)
        await Promise.all(linkedTodos.map((t) => todoRepo.update({ id: t.id, goalId: null })))
      }),
    )
    await Promise.all(toDelete.map((goalId) => goalRepo.delete(goalId)))
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

  addTodoToGoal: async (goalId, title) => {
    const todoRepo = getTodoRepo()
    const todo = await todoRepo.create({
      title,
      goalId,
    })
    set((state) => {
      const current = state.todosByGoal[goalId] ?? []
      return {
        todosByGoal: {
          ...state.todosByGoal,
          [goalId]: [...current, todo].sort((a, b) => a.sortOrder - b.sortOrder),
        },
      }
    })
  },

  toggleTodoDone: async (todoId) => {
    const todoRepo = getTodoRepo()
    const updated = await todoRepo.toggleComplete(todoId)
    const goalId = updated.goalId

    set((state) => {
      if (!goalId) return state
      const items = (state.todosByGoal[goalId] ?? []).map((t) =>
        t.id === updated.id ? updated : t,
      )
      return {
        todosByGoal: { ...state.todosByGoal, [goalId]: items },
      }
    })

    // 重加载以确保状态一致
    if (goalId) {
      const fresh = await todoRepo.getByGoal(goalId)
      set((state) => ({
        todosByGoal: { ...state.todosByGoal, [goalId]: fresh },
      }))
    }
  },

  removeTodoFromGoal: async (todoId) => {
    const todoRepo = getTodoRepo()
    const existing = await todoRepo.getById(todoId)
    const goalId = existing?.goalId
    await todoRepo.delete(todoId)
    if (goalId) {
      set((state) => {
        const items = (state.todosByGoal[goalId] ?? []).filter((t) => t.id !== todoId)
        return {
          todosByGoal: { ...state.todosByGoal, [goalId]: items },
        }
      })
    }
  },

  renameTodo: async (todoId, newTitle) => {
    const todoRepo = getTodoRepo()
    const existing = await todoRepo.getById(todoId)
    if (!existing?.goalId) return
    await todoRepo.update({ id: todoId, title: newTitle })
    const goalId = existing.goalId
    set((state) => ({
      todosByGoal: {
        ...state.todosByGoal,
        [goalId]: (state.todosByGoal[goalId] ?? []).map((t) =>
          t.id === todoId ? { ...t, title: newTitle } : t,
        ),
      },
    }))
  },

  moveTodo: async (goalId, todoId, newIndex) => {
    const todoRepo = getTodoRepo()
    const todos = [...(get().todosByGoal[goalId] ?? [])]
    const fromIdx = todos.findIndex((t) => t.id === todoId)
    if (fromIdx === -1 || fromIdx === newIndex) return
    const [item] = todos.splice(fromIdx, 1)
    todos.splice(newIndex, 0, item)
    const now = Date.now()
    const updated = todos.map((t, i) => ({ ...t, sortOrder: i, updatedAt: now }))
    await todoRepo.bulkPut(updated)
    set((state) => ({
      todosByGoal: { ...state.todosByGoal, [goalId]: updated },
    }))
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

  getTodosByGoal: (goalId) => {
    return get().todosByGoal[goalId] ?? []
  },
}))

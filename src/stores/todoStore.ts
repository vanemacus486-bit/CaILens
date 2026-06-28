import { create } from 'zustand'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@/domain/todo'
import { sortTodos, isRepeatingTodo } from '@/domain/todo'
import type { TodoPriority } from '@/domain/todo'
import { getTodoRepo } from '@/data/getRepositories'

interface TodoState {
  todos: Todo[]
  isLoading: boolean
  isLoaded: boolean
  error: string | null

  loadTodos: () => Promise<void>
  createTodo: (input: CreateTodoInput) => Promise<Todo>
  updateTodo: (input: UpdateTodoInput) => Promise<Todo>
  deleteTodo: (id: string) => Promise<void>
  toggleComplete: (id: string) => Promise<Todo>
  clearRepeatPattern: (id: string) => Promise<void>
  reorderTodo: (id: string, targetId: string, position: 'before' | 'after', listId?: string) => Promise<void>
  /** 在「同一目标」内把某待办移到 newIndex（规划页任务卡拖拽重排用） */
  moveTodoWithinGoal: (goalId: string, todoId: string, newIndex: number) => Promise<void>
  quickCapture: (title: string) => Promise<Todo>

  /** 将待办移动到指定清单 */
  moveToList: (todoId: string, listId: string) => Promise<void>

  // ── 收件箱任务 ────────────────────────────────────────────
  /** 创建一条 priority=null、domain=null 的收件箱任务 */
  addInboxTask: (title: string) => Promise<Todo>
  /** 将任务分配优先级和领域（移出收件箱） */
  assignTask: (id: string, priority: TodoPriority, domain: string) => Promise<Todo>
}

export const useTodoStore = create<TodoState>()((set, get) => ({
  todos: [],
  isLoading: false,
  isLoaded: false,
  error: null,

  loadTodos: async () => {
    set({ isLoading: true, error: null })
    try {
      const todos = sortTodos(await getTodoRepo().getAll())
      set({ todos, isLoading: false, isLoaded: true })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  createTodo: async (input) => {
    try {
      const todo = await getTodoRepo().create(input)
      // 重新从 DB 加载确保一致性（和 eventStore 的 clearEventCache + loadWeek 同理）
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  updateTodo: async (input) => {
    try {
      const todo = await getTodoRepo().update(input)
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  deleteTodo: async (id) => {
    try {
      await getTodoRepo().delete(id)
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  toggleComplete: async (id) => {
    try {
      const existing = get().todos.find((t) => t.id === id)
      if (!existing) throw new Error('Todo not found')

      const isDone = existing.status !== 'done'
      const todo = await getTodoRepo().toggleComplete(id)

      // 如果标记为完成且是重复待办 → 克隆到明天
      if (isDone && isRepeatingTodo(existing)) {
        await getTodoRepo().spawnRepeat(existing)
      }

      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  clearRepeatPattern: async (id) => {
    await getTodoRepo().update({ id, repeatPattern: null })
    const all = sortTodos(await getTodoRepo().getAll())
    set({ todos: all })
  },

  reorderTodo: async (id, targetId, position, listId?) => {
    if (id === targetId) return
    try {
      const now = Date.now()

      // ── 1. 从 store 本地数据计算新顺序（立即，0ms） ──
      const current = get().todos
      const ungrouped = current
        .filter((t) => {
          if (t.projectId) return false
          if (listId) return t.listId === listId
          return true
        })
        .sort((a, b) => a.sortOrder - b.sortOrder)

      const fromIdx = ungrouped.findIndex((t) => t.id === id)
      const toIdx = ungrouped.findIndex((t) => t.id === targetId)
      if (fromIdx === -1 || toIdx === -1) return

      const [moved] = ungrouped.splice(fromIdx, 1)
      const adjustedTo = fromIdx < toIdx ? toIdx - 1 : toIdx
      const insertAt = position === 'before' ? adjustedTo : adjustedTo + 1
      ungrouped.splice(insertAt, 0, moved)

      // ── 2. 乐观更新 store（立即刷新 UI） ──
      const updatedUngrouped = ungrouped.map((t, i) => ({ ...t, sortOrder: i, updatedAt: now }))
      const updatedIds = new Set(updatedUngrouped.map((t) => t.id))
      const merged = sortTodos([
        ...current.filter((t) => !updatedIds.has(t.id)),
        ...updatedUngrouped,
      ])
      set({ todos: merged })

      // ── 3. 后台写入 DB（用户无感知） ──
      await getTodoRepo().bulkPut(updatedUngrouped)
    } catch (e) {
      // 出错时从 DB 恢复
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all, error: (e as Error).message })
    }
  },

  moveTodoWithinGoal: async (goalId, todoId, newIndex) => {
    try {
      const goalTodos = get()
        .todos.filter((t) => t.goalId === goalId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
      const fromIdx = goalTodos.findIndex((t) => t.id === todoId)
      if (fromIdx === -1 || fromIdx === newIndex) return
      const [item] = goalTodos.splice(fromIdx, 1)
      goalTodos.splice(newIndex, 0, item)
      const now = Date.now()
      const reordered = goalTodos.map((t, i) => ({ ...t, sortOrder: i, updatedAt: now }))
      await getTodoRepo().bulkPut(reordered)
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
    } catch (e) {
      // 失败时从 DB 恢复，避免本地顺序与持久层不一致
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all, error: (e as Error).message })
    }
  },

  moveToList: async (todoId, listId) => {
    try {
      await getTodoRepo().update({ id: todoId, listId })
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  quickCapture: async (title) => {
    try {
      const todo = await getTodoRepo().create({
        title,
        listId: 'default',
        priority: 'medium',
        categoryId: null,
        projectId: null,
        dueDate: null,
      })
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  // ── 收件箱任务 ────────────────────────────────────────────

  addInboxTask: async (title) => {
    try {
      const todo = await getTodoRepo().create({
        title,
        listId: 'default',
        priority: null,
        domain: null,
        categoryId: null,
        projectId: null,
        dueDate: null,
      })
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },

  assignTask: async (id, priority, domain) => {
    try {
      const todo = await getTodoRepo().update({ id, priority, domain })
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },
}))

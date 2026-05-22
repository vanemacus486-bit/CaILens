import { create } from 'zustand'
import type { Todo, CreateTodoInput, UpdateTodoInput } from '@/domain/todo'
import { sortTodos } from '@/domain/todo'
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
}

export const useTodoStore = create<TodoState>()((set) => ({
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
      const todo = await getTodoRepo().toggleComplete(id)
      const all = sortTodos(await getTodoRepo().getAll())
      set({ todos: all })
      return todo
    } catch (e) {
      set({ error: (e as Error).message })
      throw e
    }
  },
}))

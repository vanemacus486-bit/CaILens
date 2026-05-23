import { create } from 'zustand'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/domain/project'
import { sortProjects } from '@/domain/project'
import type { Todo } from '@/domain/todo'
import { calcProjectProgress } from '@/domain/todo'
import { getProjectRepo } from '@/data/getRepositories'
import { getTodoRepo } from '@/data/getRepositories'

interface ProjectState {
  projects: Project[]
  todosByProject: Record<string, Todo[]>
  recentProjects: Project[]
  isLoaded: boolean
  isLoading: boolean
  error: string | null

  loadAll: () => Promise<void>
  loadProjects: () => Promise<void>
  loadRecentProjects: (limit?: number) => Promise<void>
  createProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (input: UpdateProjectInput) => Promise<void>
  deleteProject: (id: string) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  reorderProject: (id: string, direction: 'up' | 'down') => Promise<void>
  recordProjectUsage: (id: string) => Promise<void>
  getActiveByCategory: (categoryId: string) => Project[]
  searchProjects: (query: string, limit?: number) => Promise<Project[]>

  // Todo-scoped-to-project operations
  getTodosByProject: (projectId: string) => Todo[]
  getProjectProgress: (projectId: string) => { done: number; total: number; percent: number }
  createTodoInProject: (projectId: string, title: string) => Promise<Todo>
  deleteTodoInProject: (id: string) => Promise<void>
  toggleTodoDone: (id: string) => Promise<void>
  reorderTodo: (id: string, direction: 'up' | 'down') => Promise<void>
}

export const useProjectStore = create<ProjectState>()((set, get) => ({
  projects: [],
  todosByProject: {},
  recentProjects: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const projectRepo = getProjectRepo()
      const todoRepo = getTodoRepo()
      const projects = sortProjects(await projectRepo.getAllSorted())
      const allTodos = await todoRepo.getAll()
      const todosByProject: Record<string, Todo[]> = {}
      for (const t of allTodos) {
        if (t.projectId) {
          (todosByProject[t.projectId] ??= []).push(t)
        }
      }
      for (const key of Object.keys(todosByProject)) {
        todosByProject[key].sort((a, b) => a.sortOrder - b.sortOrder)
      }
      set({ projects, todosByProject, isLoaded: true, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  loadProjects: async () => {
    set({ isLoading: true })
    const projects = await getProjectRepo().getAll()
    set({ projects, isLoaded: true, isLoading: false })
  },

  loadRecentProjects: async (limit = 6) => {
    const recent = await getProjectRepo().getRecent(limit)
    set({ recentProjects: recent })
  },

  createProject: async (input) => {
    const project = await getProjectRepo().create(input)
    set((state) => ({
      projects: sortProjects([...state.projects, project]),
    }))
    return project
  },

  updateProject: async (input) => {
    const updated = await getProjectRepo().update(input)
    set((state) => ({
      projects: sortProjects(
        state.projects.map((p) => (p.id === updated.id ? updated : p)),
      ),
    }))
  },

  deleteProject: async (id) => {
    await getProjectRepo().delete(id)
    set((state) => {
      const { [id]: _removed, ...rest } = state.todosByProject
      return {
        projects: state.projects.filter((p) => p.id !== id),
        todosByProject: rest,
      }
    })
  },

  archiveProject: async (id) => {
    const updated = await getProjectRepo().update({ id, status: 'archived' })
    set((state) => ({
      projects: sortProjects(
        state.projects.map((p) => (p.id === updated.id ? updated : p)),
      ),
    }))
  },

  reorderProject: async (id, direction) => {
    const repo = getProjectRepo()
    await repo.reorderProject(id, direction)
    const projects = sortProjects(await repo.getAllSorted())
    set({ projects })
  },

  recordProjectUsage: async (id) => {
    await getProjectRepo().recordUsage(id)
    set((state) => ({
      projects: state.projects.map((p) =>
        p.id === id
          ? { ...p, useCount: (p.useCount ?? 0) + 1, lastUsedAt: Date.now() }
          : p,
      ),
    }))
  },

  getActiveByCategory: (categoryId) => {
    return get()
      .projects.filter((p) => p.categoryId === categoryId && p.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name))
  },

  searchProjects: async (query, limit = 10) => {
    return getProjectRepo().searchByName(query, limit)
  },

  // ── Project-scoped todo operations ──

  getTodosByProject: (projectId) => {
    return get().todosByProject[projectId] ?? []
  },

  getProjectProgress: (projectId) => {
    const todos = get().todosByProject[projectId] ?? []
    return calcProjectProgress(todos)
  },

  createTodoInProject: async (projectId, title) => {
    const todoRepo = getTodoRepo()
    const allTodos = await todoRepo.getAll()
    const projectTodos = allTodos.filter((t) => t.projectId === projectId)
    const maxOrder = projectTodos.length > 0
      ? Math.max(...projectTodos.map((t) => t.sortOrder))
      : -1
    const todo = await todoRepo.create({
      title,
      projectId,
    })
    // Patch sortOrder to be project-local
    await todoRepo.update({ id: todo.id, sortOrder: maxOrder + 1 })
    todo.sortOrder = maxOrder + 1
    set((state) => {
      const current = state.todosByProject[projectId] ?? []
      return {
        todosByProject: {
          ...state.todosByProject,
          [projectId]: [...current, todo].sort((a, b) => a.sortOrder - b.sortOrder),
        },
      }
    })
    return todo
  },

  deleteTodoInProject: async (id) => {
    const todoRepo = getTodoRepo()
    const existing = await todoRepo.getById(id)
    await todoRepo.delete(id)
    if (existing?.projectId) {
      const pid = existing.projectId
      set((state) => {
        const items = (state.todosByProject[pid] ?? []).filter(
          (t: Todo) => t.id !== id,
        )
        return {
          todosByProject: { ...state.todosByProject, [pid]: items },
        }
      })
    }
  },

  toggleTodoDone: async (id) => {
    const todoRepo = getTodoRepo()
    const updated = await todoRepo.toggleComplete(id)
    set((state) => {
      const pid = updated.projectId
      if (!pid) return state
      const items = (state.todosByProject[pid] ?? []).map((t) =>
        t.id === updated.id ? updated : t,
      )
      return {
        todosByProject: { ...state.todosByProject, [pid]: items },
      }
    })
  },

  reorderTodo: async (id, direction) => {
    const todoRepo = getTodoRepo()
    const existing = await todoRepo.getById(id)
    if (!existing || !existing.projectId) return
    const pid = existing.projectId
    const items = (get().todosByProject[pid] ?? [])
      .filter((t) => t.projectId === pid)
      .sort((a, b) => a.sortOrder - b.sortOrder)
    const idx = items.findIndex((t) => t.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return
    const tmp = items[idx].sortOrder
    await todoRepo.reorder(id, items[swapIdx].sortOrder)
    await todoRepo.reorder(items[swapIdx].id, tmp)
    // Reload project todos
    const fresh = await todoRepo.getByProject(pid)
    set((state) => ({
      todosByProject: { ...state.todosByProject, [pid]: fresh },
    }))
  },
}))

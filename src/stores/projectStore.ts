import { create } from 'zustand'
import type { Project, CreateProjectInput, UpdateProjectInput } from '@/domain/project'
import { getProjectRepo } from '@/data/getRepositories'

interface ProjectState {
  projects: Project[]
  recentProjects: Project[]
  isLoaded: boolean
  isLoading: boolean
  loadProjects: () => Promise<void>
  loadRecentProjects: (limit?: number) => Promise<void>
  createProject: (input: CreateProjectInput) => Promise<Project>
  updateProject: (input: UpdateProjectInput) => Promise<void>
  archiveProject: (id: string) => Promise<void>
  recordProjectUsage: (id: string) => Promise<void>
  /** 获取某分类下的活跃项目 */
  getActiveByCategory: (categoryId: string) => Project[]
  /** 前缀搜索项目名 */
  searchProjects: (query: string, limit?: number) => Promise<Project[]>
}

export const useProjectStore = create<ProjectState>((set, get) => ({
  projects: [],
  recentProjects: [],
  isLoaded: false,
  isLoading: false,

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
    set((state) => ({ projects: [...state.projects, project] }))
    return project
  },

  updateProject: async (input) => {
    const updated = await getProjectRepo().update(input)
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }))
  },

  archiveProject: async (id) => {
    const updated = await getProjectRepo().update({ id, status: 'archived' })
    set((state) => ({
      projects: state.projects.map((p) => (p.id === updated.id ? updated : p)),
    }))
  },

  recordProjectUsage: async (id) => {
    await getProjectRepo().recordUsage(id)
    // 同步更新本地 store
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
}))

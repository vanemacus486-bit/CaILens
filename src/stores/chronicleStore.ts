import { create } from 'zustand'
import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'
import { getChronicleRepo } from '@/data/getRepositories'

interface ChronicleState {
  phases: ChroniclePhase[]
  tasks: ChronicleTask[]
  isLoaded: boolean
  isLoading: boolean
  error: string | null

  loadAll: () => Promise<void>
  loadRange: (startDate: number, endDate: number) => Promise<void>

  // Phase CRUD
  addPhase: (phase: ChroniclePhase) => Promise<void>
  updatePhase: (id: string, changes: Partial<ChroniclePhase>) => Promise<void>
  deletePhase: (id: string) => Promise<void>

  // Task CRUD
  addTask: (task: ChronicleTask) => Promise<void>
  updateTask: (id: string, changes: Partial<ChronicleTask>) => Promise<void>
  deleteTask: (id: string) => Promise<void>
}

export const useChronicleStore = create<ChronicleState>()((set, get) => ({
  phases: [],
  tasks: [],
  isLoaded: false,
  isLoading: false,
  error: null,

  loadAll: async () => {
    set({ isLoading: true, error: null })
    try {
      const repo = getChronicleRepo()
      const [phases, tasks] = await Promise.all([
        repo.getAllPhases(),
        repo.getAllTasks(),
      ])
      set({ phases, tasks, isLoaded: true, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  loadRange: async (startDate: number, endDate: number) => {
    set({ isLoading: true, error: null })
    try {
      const repo = getChronicleRepo()
      const [phases, tasks] = await Promise.all([
        repo.getPhasesInRange(startDate, endDate),
        repo.getTasksInRange(startDate, endDate),
      ])
      set({ phases, tasks, isLoaded: true, isLoading: false })
    } catch (e) {
      set({ error: (e as Error).message, isLoading: false })
    }
  },

  // ── Phase CRUD ──────────────────────────────────────────

  addPhase: async (phase: ChroniclePhase) => {
    const repo = getChronicleRepo()
    await repo.putPhase(phase)
    set({ phases: [...get().phases, phase] })
  },

  updatePhase: async (id: string, changes: Partial<ChroniclePhase>) => {
    const repo = getChronicleRepo()
    await repo.updatePhase(id, changes)
    set({
      phases: get().phases.map((p) =>
        p.id === id ? { ...p, ...changes, updatedAt: Date.now() } : p,
      ),
    })
  },

  deletePhase: async (id: string) => {
    const repo = getChronicleRepo()
    await repo.deletePhase(id)
    set({ phases: get().phases.filter((p) => p.id !== id) })
  },

  // ── Task CRUD ───────────────────────────────────────────

  addTask: async (task: ChronicleTask) => {
    const repo = getChronicleRepo()
    await repo.putTask(task)
    set({ tasks: [...get().tasks, task] })
  },

  updateTask: async (id: string, changes: Partial<ChronicleTask>) => {
    const repo = getChronicleRepo()
    await repo.updateTask(id, changes)
    set({
      tasks: get().tasks.map((t) =>
        t.id === id ? { ...t, ...changes, updatedAt: Date.now() } : t,
      ),
    })
  },

  deleteTask: async (id: string) => {
    const repo = getChronicleRepo()
    await repo.deleteTask(id)
    set({ tasks: get().tasks.filter((t) => t.id !== id) })
  },
}))

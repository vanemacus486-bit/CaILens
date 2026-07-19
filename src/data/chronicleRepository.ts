import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class ChronicleRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  // ── Phases ──────────────────────────────────────────────

  async getAllPhases(): Promise<ChroniclePhase[]> {
    return (await this.adapter.chroniclePhases.getAll()).filter((p) => !p.deletedAt)
  }

  async getPhasesInRange(startDate: number, endDate: number): Promise<ChroniclePhase[]> {
    return this.adapter.chroniclePhases.query({
      filter: (p) => !p.deletedAt && p.startDate <= endDate && p.endDate >= startDate,
    })
  }

  async putPhase(phase: ChroniclePhase): Promise<void> {
    await this.adapter.chroniclePhases.put({ ...phase, deletedAt: phase.deletedAt ?? null })
  }

  async updatePhase(id: string, changes: Partial<ChroniclePhase>): Promise<void> {
    await this.adapter.chroniclePhases.update(id, { ...changes, updatedAt: Date.now() })
  }

  async deletePhase(id: string): Promise<void> {
    const existing = await this.adapter.chroniclePhases.get(id)
    if (!existing) return
    await this.adapter.chroniclePhases.put({ ...existing, deletedAt: Date.now(), updatedAt: Date.now() })
  }

  // ── Tasks ───────────────────────────────────────────────

  async getAllTasks(): Promise<ChronicleTask[]> {
    return (await this.adapter.chronicleTasks.getAll()).filter((t) => !t.deletedAt)
  }

  async getTasksInRange(startDate: number, endDate: number): Promise<ChronicleTask[]> {
    return this.adapter.chronicleTasks.query({
      filter: (t) => {
        if (t.deletedAt) return false
        const tStart = t.startDate ?? t.date
        const tEnd = t.endDate ?? t.date
        return tStart <= endDate && tEnd >= startDate
      },
    })
  }

  async putTask(task: ChronicleTask): Promise<void> {
    await this.adapter.chronicleTasks.put({ ...task, deletedAt: task.deletedAt ?? null })
  }

  async updateTask(id: string, changes: Partial<ChronicleTask>): Promise<void> {
    await this.adapter.chronicleTasks.update(id, { ...changes, updatedAt: Date.now() })
  }

  async deleteTask(id: string): Promise<void> {
    const existing = await this.adapter.chronicleTasks.get(id)
    if (!existing) return
    await this.adapter.chronicleTasks.put({ ...existing, deletedAt: Date.now(), updatedAt: Date.now() })
  }
}

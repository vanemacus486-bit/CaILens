import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'
import type { StorageAdapter } from './adapters/StorageAdapter'

export class ChronicleRepository {
  private adapter: StorageAdapter

  constructor(adapter: StorageAdapter) {
    this.adapter = adapter
  }

  // ── Phases ──────────────────────────────────────────────

  async getAllPhases(): Promise<ChroniclePhase[]> {
    return this.adapter.chroniclePhases.getAll()
  }

  async getPhasesInRange(startDate: number, endDate: number): Promise<ChroniclePhase[]> {
    return this.adapter.chroniclePhases.query({
      filter: (p) => p.startDate <= endDate && p.endDate >= startDate,
    })
  }

  async putPhase(phase: ChroniclePhase): Promise<void> {
    await this.adapter.chroniclePhases.put(phase)
  }

  async updatePhase(id: string, changes: Partial<ChroniclePhase>): Promise<void> {
    await this.adapter.chroniclePhases.update(id, { ...changes, updatedAt: Date.now() })
  }

  async deletePhase(id: string): Promise<void> {
    await this.adapter.chroniclePhases.delete(id)
  }

  // ── Tasks ───────────────────────────────────────────────

  async getAllTasks(): Promise<ChronicleTask[]> {
    return this.adapter.chronicleTasks.getAll()
  }

  async getTasksInRange(startDate: number, endDate: number): Promise<ChronicleTask[]> {
    return this.adapter.chronicleTasks.query({
      filter: (t) => {
        const tStart = t.startDate ?? t.date
        const tEnd = t.endDate ?? t.date
        return tStart <= endDate && tEnd >= startDate
      },
    })
  }

  async putTask(task: ChronicleTask): Promise<void> {
    await this.adapter.chronicleTasks.put(task)
  }

  async updateTask(id: string, changes: Partial<ChronicleTask>): Promise<void> {
    await this.adapter.chronicleTasks.update(id, { ...changes, updatedAt: Date.now() })
  }

  async deleteTask(id: string): Promise<void> {
    await this.adapter.chronicleTasks.delete(id)
  }
}

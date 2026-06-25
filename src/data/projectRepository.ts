import type { Project, CreateProjectInput, UpdateProjectInput } from '@/domain/project'
import type { StorageAdapter } from './adapters/StorageAdapter'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class ProjectRepository {
  private adapter: StorageAdapter
  private clock: Clock
  private idGen: IdGenerator

  constructor(
    adapter: StorageAdapter,
    clock: Clock = { now: () => Date.now() },
    idGen: IdGenerator = { generate: () => crypto.randomUUID() },
  ) {
    this.adapter = adapter
    this.clock = clock
    this.idGen = idGen
  }

  async getAll(): Promise<Project[]> {
    return this.adapter.projects.getAll()
  }

  async getById(id: string): Promise<Project | undefined> {
    return this.adapter.projects.get(id)
  }

  async getByCategory(categoryId: string): Promise<Project[]> {
    const all = await this.getAll()
    return all
      .filter((p) => p.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name))
  }

  async searchByName(query: string, limit = 10): Promise<Project[]> {
    const q = query.trim().toLowerCase()
    if (!q) return []
    const all = await this.getAll()
    return all
      .filter((p) => p.name.toLowerCase().includes(q))
      .slice(0, limit)
  }

  async create(input: CreateProjectInput): Promise<Project> {
    const now = this.clock.now()
    const all = await this.getAll()
    const maxOrder = all.length > 0 ? Math.max(...all.map((p) => p.sortOrder)) : -1
    const project: Project = {
      id: this.idGen.generate(),
      name: input.name,
      categoryId: input.categoryId,
      status: 'active',
      description: input.description ?? '',
      totalMinutes: 0,
      eventCount: 0,
      useCount: 0,
      lastUsedAt: now,
      sortOrder: input.sortOrder ?? maxOrder + 1,
      createdAt: now,
      updatedAt: now,
      dailyRepeat: input.dailyRepeat ?? false,
    }
    await this.adapter.projects.put(project)
    return project
  }

  async update(input: UpdateProjectInput): Promise<Project> {
    const existing = await this.adapter.projects.get(input.id)
    if (existing === undefined) {
      throw new Error(`Project not found: ${input.id}`)
    }
    const updated: Project = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: this.clock.now(),
    }
    await this.adapter.projects.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.adapter.projects.delete(id)
  }

  /** 获取最近使用的项目（按 lastUsedAt 降序，limit 限制） */
  async getRecent(limit = 6): Promise<Project[]> {
    const all = await this.getAll()
    const active = all.filter((p) => p.status === 'active')
    return active
      .sort((a, b) => b.lastUsedAt - a.lastUsedAt)
      .slice(0, limit)
  }

  /** 记录一次项目使用（递增 useCount，更新 lastUsedAt） */
  async recordUsage(id: string): Promise<void> {
    const existing = await this.adapter.projects.get(id)
    if (!existing) return
    await this.adapter.projects.put({
      ...existing,
      useCount: (existing.useCount ?? 0) + 1,
      lastUsedAt: this.clock.now(),
      updatedAt: this.clock.now(),
    })
  }

  /** 按 sortOrder 排序获取所有项目 */
  async getAllSorted(): Promise<Project[]> {
    const all = await this.getAll()
    return all.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  /** 交换相邻项目的 sortOrder */
  async reorderProject(id: string, direction: 'up' | 'down'): Promise<void> {
    const all = await this.getAllSorted()
    const idx = all.findIndex((p) => p.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= all.length) return
    const now = this.clock.now()
    const tmp = all[idx].sortOrder
    await this.adapter.projects.put({ ...all[idx], sortOrder: all[swapIdx].sortOrder, updatedAt: now })
    await this.adapter.projects.put({ ...all[swapIdx], sortOrder: tmp, updatedAt: now })
  }

  async bulkPut(projects: Project[]): Promise<void> {
    await this.adapter.projects.bulkPut(projects)
  }

  /** 更新项目的缓存统计（事件创建/修改时调用） */
  async refreshStats(id: string): Promise<void> {
    const events = await this.adapter.events.getAll()
    // 排除软删除事件（deletedAt 非空）——与 eventRepository 所有读取路径一致，
    // 否则已删除事件仍会计入项目的 totalMinutes / eventCount。
    const projectEvents = events.filter((e) => !e.deletedAt && e.projectId === id)
    const totalMinutes = projectEvents.reduce(
      (sum, e) => sum + (e.endTime - e.startTime) / 60_000,
      0,
    )
    const existing = await this.adapter.projects.get(id)
    if (existing) {
      await this.adapter.projects.put({
        ...existing,
        totalMinutes: Math.round(totalMinutes),
        eventCount: projectEvents.length,
        updatedAt: this.clock.now(),
      })
    }
  }

  /** 切换项目每日重复开关 */
  async toggleDailyRepeat(id: string): Promise<Project> {
    const existing = await this.adapter.projects.get(id)
    if (existing === undefined) {
      throw new Error(`Project not found: ${id}`)
    }
    const updated: Project = {
      ...existing,
      dailyRepeat: !existing.dailyRepeat,
      updatedAt: this.clock.now(),
    }
    await this.adapter.projects.put(updated)
    return updated
  }
}

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
    const project: Project = {
      id: this.idGen.generate(),
      name: input.name,
      categoryId: input.categoryId,
      status: 'active',
      totalMinutes: 0,
      eventCount: 0,
      useCount: 0,
      lastUsedAt: now,
      createdAt: now,
      updatedAt: now,
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

  /** 更新项目的缓存统计（事件创建/修改时调用） */
  async refreshStats(id: string): Promise<void> {
    const events = await this.adapter.events.getAll()
    const projectEvents = events.filter((e) => e.projectId === id)
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
}

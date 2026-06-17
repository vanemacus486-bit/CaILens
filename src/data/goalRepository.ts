/**
 * # GoalRepository — 目标持久化
 *
 * 严格参照 projectRepository.ts 模式：构造注入 Clock + IdGenerator。
 * 所有 goals 表操作通过 StorageAdapter.goals 完成。
 */

import type { Goal, CreateGoalInput, UpdateGoalInput } from '@/domain/goal'
import { nextGoalSortOrder, getChildren } from '@/domain/goal'
import type { StorageAdapter } from './adapters/StorageAdapter'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class GoalRepository {
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

  async getAll(): Promise<Goal[]> {
    return this.adapter.goals.getAll()
  }

  async getById(id: string): Promise<Goal | undefined> {
    return this.adapter.goals.get(id)
  }

  async getByParent(parentId: string): Promise<Goal[]> {
    const all = await this.getAll()
    return getChildren(all, parentId)
  }

  async create(input: CreateGoalInput): Promise<Goal> {
    const now = this.clock.now()
    const all = await this.getAll()
    const parentId = input.parentId ?? null
    const siblings = parentId !== null ? getChildren(all, parentId) : all.filter((g) => g.parentId === null)

    const goal: Goal = {
      id: this.idGen.generate(),
      title: input.title,
      description: input.description ?? '',
      categoryId: input.categoryId ?? null,
      linkedEventIds: input.linkedEventIds ?? [],
      status: 'active',
      sortOrder: input.sortOrder ?? nextGoalSortOrder(siblings),
      targetDate: input.targetDate ?? null,
      parentId,
      createdAt: now,
      updatedAt: now,
    }
    await this.adapter.goals.put(goal)
    return goal
  }

  async update(input: UpdateGoalInput): Promise<Goal> {
    const existing = await this.adapter.goals.get(input.id)
    if (existing === undefined) {
      throw new Error(`Goal not found: ${input.id}`)
    }
    const updated: Goal = {
      ...existing,
      ...input,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: this.clock.now(),
    }
    await this.adapter.goals.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.adapter.goals.delete(id)
  }

  async bulkPut(goals: Goal[]): Promise<void> {
    await this.adapter.goals.bulkPut(goals)
  }

  /** 交换相邻目标的 sortOrder */
  async reorderGoal(id: string, direction: 'up' | 'down'): Promise<void> {
    const all = await this.getAll()
    const target = all.find((g) => g.id === id)
    if (!target) return

    // 只在同层 siblings 内重排
    const siblings = all.filter(
      (g) => g.parentId === target.parentId && g.status !== 'archived',
    ).sort((a, b) => a.sortOrder - b.sortOrder)

    const idx = siblings.findIndex((g) => g.id === id)
    if (idx === -1) return
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= siblings.length) return

    const now = this.clock.now()
    await this.adapter.goals.put({ ...siblings[idx], sortOrder: siblings[swapIdx].sortOrder, updatedAt: now })
    await this.adapter.goals.put({ ...siblings[swapIdx], sortOrder: siblings[idx].sortOrder, updatedAt: now })
  }
}

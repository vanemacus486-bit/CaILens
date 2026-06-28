/**
 * # TodoListRepository — 待办清单持久化
 *
 * 按 todoRepo / projectRepo 模式：构造注入 Clock + IdGenerator。
 * 所有 todoLists 表操作通过 StorageAdapter.todoLists 完成。
 */

import type { TodoList } from '@/domain/todo'
import type { StorageAdapter } from './adapters/StorageAdapter'

export interface Clock {
  now(): number
}

export interface IdGenerator {
  generate(): string
}

export class TodoListRepository {
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

  async getAll(): Promise<TodoList[]> {
    return this.adapter.todoLists.getAll()
  }

  async getById(id: string): Promise<TodoList | undefined> {
    return this.adapter.todoLists.get(id)
  }

  async create(name: string): Promise<TodoList> {
    const now = this.clock.now()
    const all = await this.getAll()
    const maxOrder = all.length > 0 ? Math.max(...all.map((l) => l.sortOrder)) : -1
    const list: TodoList = {
      id: this.idGen.generate(),
      name,
      sortOrder: maxOrder + 1,
      createdAt: now,
      updatedAt: now,
    }
    await this.adapter.todoLists.put(list)
    return list
  }

  async update(id: string, patch: Partial<Pick<TodoList, 'name' | 'sortOrder'>>): Promise<TodoList> {
    const existing = await this.adapter.todoLists.get(id)
    if (!existing) throw new Error(`TodoList not found: ${id}`)
    const updated: TodoList = {
      ...existing,
      ...patch,
      updatedAt: this.clock.now(),
    }
    await this.adapter.todoLists.put(updated)
    return updated
  }

  /**
   * 确保 id='default' 的默认清单记录存在。
   * 覆盖三种适配器，补齐存量用户（空 todoLists 表），
   * 使 listId='default' 的旧待办恢复可见。
   * sortOrder=-1 保证永远排第一。
   */
  async ensureDefault(): Promise<void> {
    const existing = await this.adapter.todoLists.get('default')
    if (existing) return
    const now = this.clock.now()
    await this.adapter.todoLists.put({
      id: 'default',
      name: '默认',
      sortOrder: -1,
      createdAt: now,
      updatedAt: now,
    })
  }

  async delete(id: string): Promise<void> {
    await this.adapter.todoLists.delete(id)
  }
}

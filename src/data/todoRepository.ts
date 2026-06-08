import type { Todo, CreateTodoInput, UpdateTodoInput, TodoStatus } from '@/domain/todo'
import type { StorageAdapter } from './adapters/StorageAdapter'

interface Clock { now(): number }

export class TodoRepository {
  private adapter: StorageAdapter
  private clock: Clock
  constructor(adapter: StorageAdapter, clock: Clock = { now: () => Date.now() }) {
    this.adapter = adapter; this.clock = clock
  }

  async getAll(): Promise<Todo[]> {
    const todos = await this.adapter.todos.getAll()
    return todos.sort((a, b) => a.sortOrder - b.sortOrder)
  }

  async getById(id: string): Promise<Todo | undefined> {
    return this.adapter.todos.get(id)
  }

  async queryByStatus(status: TodoStatus): Promise<Todo[]> {
    return this.adapter.todos.query({
      where: { key: 'status', op: 'equals', value: status },
      orderBy: 'sortOrder',
      orderDir: 'asc',
    })
  }

  async getByProject(projectId: string): Promise<Todo[]> {
    return this.adapter.todos.query({
      where: { key: 'projectId', op: 'equals', value: projectId },
      orderBy: 'sortOrder',
      orderDir: 'asc',
    })
  }

  async queryByDueDateRange(start: number, end: number): Promise<Todo[]> {
    return this.adapter.todos.query({
      where: { key: 'dueDate', op: 'above', value: start },
      filter: (t) => t.dueDate !== null && t.dueDate <= end && t.status !== 'done',
    })
  }

  async create(input: CreateTodoInput): Promise<Todo> {
    const now = this.clock.now()
    // Get the current max sortOrder to place new item at the end
    const all = await this.adapter.todos.getAll()
    const maxOrder = all.length > 0 ? Math.max(...all.map((t) => t.sortOrder)) : -1

    const todo: Todo = {
      id: crypto.randomUUID(),
      title: input.title,
      description: input.description ?? '',
      status: 'todo',
      priority: input.priority ?? 'medium',
      dueDate: input.dueDate ?? null,
      sortOrder: maxOrder + 1,
      projectId: input.projectId ?? null,
      categoryId: input.categoryId ?? null,
      createdAt: now,
      updatedAt: now,
      completedAt: null,
      repeatPattern: input.repeatPattern ?? null,
    }
    await this.adapter.todos.put(todo)
    return todo
  }

  async update(input: UpdateTodoInput): Promise<Todo> {
    const existing = await this.adapter.todos.get(input.id)
    if (!existing) throw new Error(`Todo not found: ${input.id}`)

    // If marking as done, set completedAt
    const completedAt = input.status === 'done' && existing.status !== 'done'
      ? this.clock.now()
      : input.status && input.status !== 'done'
        ? null
        : existing.completedAt

    const updated: Todo = {
      ...existing,
      ...input,
      completedAt: completedAt ?? existing.completedAt,
      updatedAt: this.clock.now(),
    }
    await this.adapter.todos.put(updated)
    return updated
  }

  async toggleComplete(id: string): Promise<Todo> {
    const existing = await this.adapter.todos.get(id)
    if (!existing) throw new Error(`Todo not found: ${id}`)
    const now = this.clock.now()
    const isDone = existing.status !== 'done'
    const updated: Todo = {
      ...existing,
      status: isDone ? 'done' : 'todo',
      completedAt: isDone ? now : null,
      updatedAt: now,
    }
    await this.adapter.todos.put(updated)
    return updated
  }

  async delete(id: string): Promise<void> {
    await this.adapter.todos.delete(id)
  }

  async reorder(id: string, newSortOrder: number): Promise<Todo> {
    const existing = await this.adapter.todos.get(id)
    if (!existing) throw new Error(`Todo not found: ${id}`)
    const updated: Todo = {
      ...existing,
      sortOrder: newSortOrder,
      updatedAt: this.clock.now(),
    }
    await this.adapter.todos.put(updated)
    return updated
  }

  async bulkPut(todos: Todo[]): Promise<void> {
    await this.adapter.todos.bulkPut(todos)
  }

  /** 为重复待办生成下一个实例（完成当前后自动调用） */
  async spawnRepeat(todo: Todo): Promise<Todo> {
    const { spawnNextRepeat } = await import('@/domain/todo')
    const cloned = spawnNextRepeat(todo)
    await this.adapter.todos.put(cloned)
    return cloned
  }
}

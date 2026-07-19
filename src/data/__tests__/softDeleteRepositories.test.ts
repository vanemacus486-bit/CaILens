import { describe, expect, it } from 'vitest'
import { CailensDB } from '../db'
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter'
import { TodoRepository } from '../todoRepository'
import { TodoListRepository } from '../todoListRepository'
import { ProjectRepository } from '../projectRepository'
import { InspirationRepository } from '../inspirationRepository'
import { EstimateRepository } from '../estimateRepository'
import { DailyContextRepository } from '../dailyContextRepository'
import { ChronicleRepository } from '../chronicleRepository'
import type { Todo } from '@/domain/todo'
import type { Project } from '@/domain/project'
import type { InspirationLog } from '@/domain/inspiration'
import type { WeeklyEstimate } from '@/domain/estimate'
import type { DailyOutfit } from '@/domain/dailyContext'
import type { ChroniclePhase, ChronicleTask } from '@/domain/chronicle'

const clock = { now: () => 100 }
const idGen = { generate: () => 'generated-id' }

function adapter() {
  return new IndexedDBAdapter(new CailensDB(`cailens-soft-delete-${Math.random()}`))
}

function todo(overrides: Partial<Todo> = {}): Todo {
  return {
    id: 'todo-1',
    listId: 'default',
    title: 'Todo',
    description: '',
    status: 'todo',
    priority: null,
    domain: null,
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    createdAt: 0,
    updatedAt: 0,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    isStarred: false,
    archivedAt: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('soft-delete repository visibility', () => {
  it('hides deleted todos while preserving raw rows', async () => {
    const a = adapter()
    const repo = new TodoRepository(a, clock)
    await a.todos.put(todo())
    await repo.delete('todo-1')

    expect(await repo.getAll()).toEqual([])
    expect((await a.todos.get('todo-1'))?.deletedAt).toBe(100)
  })

  it('hides deleted todo lists while preserving raw rows', async () => {
    const a = adapter()
    const repo = new TodoListRepository(a, clock, idGen)
    await a.todoLists.put({ id: 'list-1', name: 'List', sortOrder: 0, categoryId: null, createdAt: 0, updatedAt: 0, deletedAt: null })
    await repo.delete('list-1')

    expect(await repo.getAll()).toEqual([])
    expect((await a.todoLists.get('list-1'))?.deletedAt).toBe(100)
  })

  it('hides deleted projects and inspirations while preserving raw rows', async () => {
    const a = adapter()
    const projectRepo = new ProjectRepository(a, clock, idGen)
    const inspirationRepo = new InspirationRepository(a)
    const project: Project = { id: 'project-1', name: 'P', categoryId: 'accent', status: 'active', description: '', totalMinutes: 0, eventCount: 0, useCount: 0, lastUsedAt: 0, sortOrder: 0, createdAt: 0, updatedAt: 0, dailyRepeat: false, deletedAt: null }
    const inspiration: InspirationLog = { id: 'insp-1', projectId: 'project-1', eventId: 'event-1', content: 'Idea', createdAt: 0, updatedAt: 0, deletedAt: null }
    await a.projects.put(project)
    await a.inspirations.put(inspiration)

    await projectRepo.delete('project-1')
    await inspirationRepo.delete('insp-1')

    expect(await projectRepo.getAll()).toEqual([])
    expect(await inspirationRepo.getByProject('project-1')).toEqual([])
    expect((await a.projects.get('project-1'))?.deletedAt).toBe(100)
    expect((await a.inspirations.get('insp-1'))?.deletedAt).toBeGreaterThan(0)
  })

  it('hides deleted estimates, outfits, and chronicle rows', async () => {
    const a = adapter()
    const estimateRepo = new EstimateRepository(a)
    const outfitRepo = new DailyContextRepository(a, idGen)
    const chronicleRepo = new ChronicleRepository(a)
    const estimate: WeeklyEstimate = { id: 'est-1', weekStart: 0, categoryId: 'accent', estimatedHours: 1, createdAt: 0, updatedAt: 0, deletedAt: 1 }
    const outfit: DailyOutfit = { id: 'outfit-1', date: '2026-01-01', items: [], updatedAt: 0, deletedAt: 1 }
    const phase: ChroniclePhase = { id: 'phase-1', title: 'Phase', startDate: 0, endDate: 100, color: '#000', categoryId: null, createdAt: 0, updatedAt: 0, deletedAt: 1 }
    const task: ChronicleTask = { id: 'task-1', title: 'Task', date: 0, startDate: null, endDate: null, color: '#000', categoryId: null, description: null, status: 'todo', createdAt: 0, updatedAt: 0, deletedAt: 1 }
    await a.weeklyEstimates.put(estimate)
    await a.outfitLogs.put(outfit)
    await a.chroniclePhases.put(phase)
    await a.chronicleTasks.put(task)

    expect(await estimateRepo.getByWeek(0)).toEqual([])
    expect(await outfitRepo.getOutfitsByDateRange('2026-01-01', '2026-01-01')).toEqual([])
    expect(await chronicleRepo.getAllPhases()).toEqual([])
    expect(await chronicleRepo.getAllTasks()).toEqual([])
    expect((await a.weeklyEstimates.get('est-1'))?.deletedAt).toBe(1)
  })
})

import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '../db'
import { ProjectRepository } from '../projectRepository'
import { EventRepository } from '../eventRepository'
import { IndexedDBAdapter } from '../adapters/IndexedDBAdapter'

// 每个用例独立的内存 DB（fake-indexeddb）。
let db: CailensDB
let adapter: IndexedDBAdapter
let projectRepo: ProjectRepository
let eventRepo: EventRepository

const clock = { now: () => 1000 }

beforeEach(() => {
  db = new CailensDB(`cailens-test-${Math.random()}`)
  adapter = new IndexedDBAdapter(db)
  let p = 0
  let e = 0
  projectRepo = new ProjectRepository(adapter, clock, { generate: () => `proj-${p++}` })
  eventRepo = new EventRepository(adapter, clock, { generate: () => `ev-${e++}` })
})

describe('ProjectRepository.refreshStats', () => {
  it('排除软删除事件：不计入 totalMinutes / eventCount', async () => {
    const project = await projectRepo.create({ name: 'P', categoryId: 'accent' })

    // 两条 60 分钟事件挂在该项目下
    await eventRepo.create({
      title: 'a', startTime: 0, endTime: 3_600_000,
      color: 'accent', categoryId: 'accent', projectId: project.id,
    })
    const e2 = await eventRepo.create({
      title: 'b', startTime: 0, endTime: 3_600_000,
      color: 'accent', categoryId: 'accent', projectId: project.id,
    })

    // 软删除其中一条
    await eventRepo.delete(e2.id)

    await projectRepo.refreshStats(project.id)
    const updated = await projectRepo.getById(project.id)

    // 只应统计未删除的那一条
    expect(updated?.eventCount).toBe(1)
    expect(updated?.totalMinutes).toBe(60)
  })

  it('全部事件均未删除时按实际累计', async () => {
    const project = await projectRepo.create({ name: 'P', categoryId: 'sage' })
    await eventRepo.create({
      title: 'a', startTime: 0, endTime: 1_800_000, // 30 min
      color: 'sage', categoryId: 'sage', projectId: project.id,
    })
    await eventRepo.create({
      title: 'b', startTime: 0, endTime: 3_600_000, // 60 min
      color: 'sage', categoryId: 'sage', projectId: project.id,
    })

    await projectRepo.refreshStats(project.id)
    const updated = await projectRepo.getById(project.id)

    expect(updated?.eventCount).toBe(2)
    expect(updated?.totalMinutes).toBe(90)
  })
})

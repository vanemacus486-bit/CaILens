/**
 * 规划页待办状态一致性的 store 级测试。
 *
 * 覆盖此前无测试、且本次改动触及的关键路径：
 * - goalStore.deleteGoal：删目标时把其（含子目标）待办「释放回收件箱」而非删除，且批量写。
 * - todoStore.moveTodoWithinGoal：同目标内拖拽重排，落点用完整列表索引。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { CailensDB } from '@/data/db'
import { IndexedDBAdapter } from '@/data/adapters/IndexedDBAdapter'
import { initRepositories, getGoalRepo, getTodoRepo } from '@/data/getRepositories'
import { useGoalStore } from '@/stores/goalStore'
import { useTodoStore } from '@/stores/todoStore'

beforeEach(() => {
  const db = new CailensDB(`cailens-test-goaltodo-${Math.random()}`)
  initRepositories(new IndexedDBAdapter(db))
  useGoalStore.setState({
    goals: [],
    isLoaded: false,
    isLoading: false,
    error: null,
    selectedMainGoalId: null,
  })
  useTodoStore.setState({ todos: [], isLoading: false, isLoaded: false, error: null })
})

describe('goalStore.deleteGoal', () => {
  it('删目标(含子目标)时，其待办释放回收件箱(goalId=null)而非被删除', async () => {
    const goalRepo = getGoalRepo()
    const parent = await goalRepo.create({ title: 'Parent' })
    const child = await goalRepo.create({ title: 'Child', parentId: parent.id })
    const todoRepo = getTodoRepo()
    const t1 = await todoRepo.create({ title: 'T1', goalId: parent.id })
    const t2 = await todoRepo.create({ title: 'T2', goalId: child.id })

    // 直接灌 goalStore.goals（避开 loadAll 在测试环境对 localStorage 的依赖）；
    // selectedMainGoalId=null 让 deleteGoal 跳过 localStorage 分支，保持确定性
    useGoalStore.setState({ goals: [parent, child], selectedMainGoalId: null, isLoaded: true })
    await useGoalStore.getState().deleteGoal(parent.id)

    // 目标（含子目标）都删了
    expect(await goalRepo.getById(parent.id)).toBeUndefined()
    expect(await goalRepo.getById(child.id)).toBeUndefined()

    // 待办仍存在，只是 goalId 被置空 —— 回到收件箱，不会“凭空消失”
    const a = await todoRepo.getById(t1.id)
    const b = await todoRepo.getById(t2.id)
    expect(a).toBeTruthy()
    expect(b).toBeTruthy()
    expect(a?.goalId).toBeNull()
    expect(b?.goalId).toBeNull()
  })
})

describe('todoStore.moveTodoWithinGoal', () => {
  // 按 sortOrder 排序后取 title，避免依赖底层 query 的返回顺序
  const orderBySortOrder = async (ids: string[]) => {
    const todoRepo = getTodoRepo()
    const rows = await Promise.all(ids.map((id) => todoRepo.getById(id)))
    return rows
      .filter((t): t is NonNullable<typeof t> => !!t)
      .sort((x, y) => x.sortOrder - y.sortOrder)
      .map((t) => t.title)
  }

  it('同目标内把 A 移到完整列表索引 2，顺序变为 B,C,A', async () => {
    const goalRepo = getGoalRepo()
    const g = await goalRepo.create({ title: 'G' })
    const todoRepo = getTodoRepo()
    const a = await todoRepo.create({ title: 'A', goalId: g.id })
    const b = await todoRepo.create({ title: 'B', goalId: g.id })
    const c = await todoRepo.create({ title: 'C', goalId: g.id })

    await useTodoStore.getState().loadTodos()
    await useTodoStore.getState().moveTodoWithinGoal(g.id, a.id, 2)

    expect(await orderBySortOrder([a.id, b.id, c.id])).toEqual(['B', 'C', 'A'])
  })

  it('只重排目标内待办，不动其它目标的待办', async () => {
    const goalRepo = getGoalRepo()
    const g1 = await goalRepo.create({ title: 'G1' })
    const g2 = await goalRepo.create({ title: 'G2' })
    const todoRepo = getTodoRepo()
    const a = await todoRepo.create({ title: 'A', goalId: g1.id })
    const b = await todoRepo.create({ title: 'B', goalId: g1.id })
    const other = await todoRepo.create({ title: 'X', goalId: g2.id })

    await useTodoStore.getState().loadTodos()
    await useTodoStore.getState().moveTodoWithinGoal(g1.id, a.id, 1)

    expect(await orderBySortOrder([a.id, b.id])).toEqual(['B', 'A'])
    // 另一目标待办原样保留
    const x = await todoRepo.getById(other.id)
    expect(x?.goalId).toBe(g2.id)
  })
})

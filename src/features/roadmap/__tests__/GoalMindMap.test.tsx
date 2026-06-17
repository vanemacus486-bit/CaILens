import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, within } from '@testing-library/react'
import { GoalMindMap } from '../GoalMindMap'
import type { Goal } from '@/domain/goal'
import type { Todo } from '@/domain/todo'

function makeGoal(over: Partial<Goal> = {}): Goal {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    parentId: null,
    title: 'Goal',
    description: '',
    categoryId: null,
    status: 'active',
    sortOrder: 0,
    targetDate: null,
    createdAt: now,
    updatedAt: now,
    ...over,
  }
}

function makeTodo(over: Partial<Todo> = {}): Todo {
  const now = Date.now()
  return {
    id: crypto.randomUUID(),
    title: 'Todo',
    description: '',
    status: 'todo',
    priority: 'medium',
    domain: null,
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    ...over,
  }
}

const noop = () => {}
const asyncNoop = async () => {}

function renderMap(props: Partial<React.ComponentProps<typeof GoalMindMap>> = {}) {
  const main = props.mainGoal ?? makeGoal({ id: 'root', title: '主目标' })
  return render(
    <GoalMindMap
      mainGoal={main}
      allGoals={props.allGoals ?? [main]}
      todosByGoal={props.todosByGoal ?? {}}
      focusedGoalId={props.focusedGoalId ?? main.id}
      onFocus={props.onFocus ?? noop}
      onAddChild={props.onAddChild ?? asyncNoop}
      onRename={props.onRename ?? asyncNoop}
      onDelete={props.onDelete ?? noop}
      onColorChange={props.onColorChange ?? asyncNoop}
      onReorder={props.onReorder ?? noop}
    />,
  )
}

const node = (id: string) => `[data-node-id="${id}"]`

describe('GoalMindMap', () => {
  it('画出每个节点的标题（卡片正文）', () => {
    const root = makeGoal({ id: 'root', title: '主目标' })
    const c1 = makeGoal({ id: 'c1', title: '子目标A', parentId: 'root', sortOrder: 0 })
    const { getByText } = renderMap({ mainGoal: root, allGoals: [root, c1] })
    expect(getByText('主目标')).toBeTruthy()
    expect(getByText('子目标A')).toBeTruthy()
  })

  it('元信息行显示 done/total，并按 percent 填充底部进度条', () => {
    const root = makeGoal({ id: 'root' })
    const c1 = makeGoal({ id: 'c1', title: 'C', parentId: 'root' })
    const todosByGoal = {
      c1: [makeTodo({ status: 'done' }), makeTodo({ status: 'todo' })],
    }
    const { container } = renderMap({ mainGoal: root, allGoals: [root, c1], todosByGoal })

    const c1node = container.querySelector(node('c1')) as HTMLElement
    expect(within(c1node).getByText('1/2')).toBeTruthy()

    const fill = c1node.querySelector('.mm-node-progress-fill') as HTMLElement
    expect(fill.style.width).toBe('50%')
  })

  it('父节点元信息显示「N 子目标」', () => {
    const root = makeGoal({ id: 'root' })
    const c1 = makeGoal({ id: 'c1', parentId: 'root' })
    const c2 = makeGoal({ id: 'c2', parentId: 'root' })
    const { container } = renderMap({ mainGoal: root, allGoals: [root, c1, c2] })
    const rootNode = container.querySelector(node('root')) as HTMLElement
    expect(within(rootNode).getByText('· 2 子目标')).toBeTruthy()
  })

  it('点击节点触发 onFocus(id)', () => {
    const root = makeGoal({ id: 'root' })
    const c1 = makeGoal({ id: 'c1', parentId: 'root' })
    const onFocus = vi.fn()
    const { container } = renderMap({ mainGoal: root, allGoals: [root, c1], onFocus })
    fireEvent.click(container.querySelector(node('c1')) as HTMLElement)
    expect(onFocus).toHaveBeenCalledWith('c1')
  })

  it('聚焦节点带 mm-node-focused 类', () => {
    const root = makeGoal({ id: 'root' })
    const c1 = makeGoal({ id: 'c1', parentId: 'root' })
    const { container } = renderMap({ mainGoal: root, allGoals: [root, c1], focusedGoalId: 'c1' })
    expect((container.querySelector(node('c1')) as HTMLElement).className).toContain('mm-node-focused')
  })

  it('折叠/展开：点右缘按钮收起再展开子树', () => {
    const root = makeGoal({ id: 'root' })
    const a = makeGoal({ id: 'a', title: 'A', parentId: 'root' })
    const a1 = makeGoal({ id: 'a1', title: 'A1', parentId: 'a' })
    const { container, getByText, queryByText } = renderMap({
      mainGoal: root,
      allGoals: [root, a, a1],
    })
    expect(getByText('A1')).toBeTruthy()

    const edgeBtn = () => container.querySelector(`${node('a')} .mm-node-edge-btn`) as HTMLButtonElement
    fireEvent.click(edgeBtn()) // 折叠 a
    expect(queryByText('A1')).toBeNull()

    fireEvent.click(edgeBtn()) // 再展开
    expect(getByText('A1')).toBeTruthy()
  })

  it('叶子右缘按钮触发加子目标（出现 ghost 输入）', () => {
    const root = makeGoal({ id: 'root' })
    const a = makeGoal({ id: 'a', title: 'A', parentId: 'root' }) // 叶子
    const { container, getByPlaceholderText, queryByPlaceholderText } = renderMap({
      mainGoal: root,
      allGoals: [root, a],
    })
    expect(queryByPlaceholderText('子目标名称…')).toBeNull()
    fireEvent.click(container.querySelector(`${node('a')} .mm-node-edge-btn`) as HTMLButtonElement)
    expect(getByPlaceholderText('子目标名称…')).toBeTruthy()
  })

  it('键盘 ArrowRight：从父节点进入第一个子节点', () => {
    const root = makeGoal({ id: 'root' })
    const a = makeGoal({ id: 'a', parentId: 'root' })
    const onFocus = vi.fn()
    const { container } = renderMap({
      mainGoal: root,
      allGoals: [root, a],
      focusedGoalId: 'root',
      onFocus,
    })
    fireEvent.keyDown(container.querySelector('.mm-scroll') as HTMLElement, { key: 'ArrowRight' })
    expect(onFocus).toHaveBeenCalledWith('a')
  })
})

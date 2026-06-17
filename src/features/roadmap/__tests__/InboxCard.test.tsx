import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { InboxCard } from '../InboxCard'
import type { Todo } from '@/domain/todo'
import type { Goal } from '@/domain/goal'

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

const noop = () => {}
const asyncNoop = async () => {}

function renderCard(props: Partial<React.ComponentProps<typeof InboxCard>> = {}) {
  return render(
    <InboxCard
      todos={props.todos ?? []}
      goals={props.goals ?? []}
      onAdd={props.onAdd ?? asyncNoop}
      onToggle={props.onToggle ?? noop}
      onDelete={props.onDelete ?? noop}
      onRename={props.onRename ?? noop}
      onAssign={props.onAssign ?? noop}
    />,
  )
}

describe('InboxCard', () => {
  it('paints every unassigned todo title', () => {
    const { getByText } = renderCard({
      todos: [makeTodo({ title: '买菜', sortOrder: 0 }), makeTodo({ title: '写周报', sortOrder: 1 })],
    })
    expect(getByText('买菜')).toBeTruthy()
    expect(getByText('写周报')).toBeTruthy()
  })

  it('shows the unassigned count in the header', () => {
    const { getByText } = renderCard({
      todos: [makeTodo({ title: 'a' }), makeTodo({ title: 'b' }), makeTodo({ title: 'c' })],
    })
    expect(getByText('3')).toBeTruthy()
  })

  it('renders an empty state when there are no unassigned todos', () => {
    const { getByText } = renderCard({ todos: [] })
    expect(getByText('没有未分配的待办')).toBeTruthy()
  })

  it('sorts done todos after active ones', () => {
    const { container } = renderCard({
      todos: [
        makeTodo({ title: '已完成的', status: 'done', sortOrder: 0 }),
        makeTodo({ title: '还没做', status: 'todo', sortOrder: 1 }),
      ],
    })
    const titles = Array.from(container.querySelectorAll('.rm-task-title')).map((el) => el.textContent)
    expect(titles).toEqual(['还没做', '已完成的'])
  })

  it('lists main goals and indented children in the 归到 dropdown', () => {
    const g1 = makeGoal({ id: 'g1', title: '健身' })
    const g2 = makeGoal({ id: 'g2', title: '增肌', parentId: 'g1' })
    const { getAllByTitle } = renderCard({ todos: [makeTodo({ title: '买菜' })], goals: [g1, g2] })
    const select = getAllByTitle('归到目标')[0] as HTMLSelectElement
    const values = Array.from(select.querySelectorAll('option')).map((o) => (o as HTMLOptionElement).value)
    expect(values).toContain('g1')
    expect(values).toContain('g2')
  })

  it('hides the dropdown entirely when there are no goals', () => {
    const { queryByTitle } = renderCard({ todos: [makeTodo({ title: '买菜' })], goals: [] })
    expect(queryByTitle('归到目标')).toBeNull()
  })

  it('calls onAssign with (todoId, goalId) when a goal is picked', () => {
    const g1 = makeGoal({ id: 'g1', title: '健身' })
    const onAssign = vi.fn()
    const { getAllByTitle } = renderCard({
      todos: [makeTodo({ id: 't1', title: '买菜' })],
      goals: [g1],
      onAssign,
    })
    fireEvent.change(getAllByTitle('归到目标')[0], { target: { value: 'g1' } })
    expect(onAssign).toHaveBeenCalledWith('t1', 'g1')
  })

  it('calls onToggle when the checkbox is clicked', () => {
    const onToggle = vi.fn()
    const { container } = renderCard({ todos: [makeTodo({ id: 't1', title: '买菜' })], onToggle })
    fireEvent.click(container.querySelector('.rm-task-check') as HTMLButtonElement)
    expect(onToggle).toHaveBeenCalledWith('t1')
  })
})

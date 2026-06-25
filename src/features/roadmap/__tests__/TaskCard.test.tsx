import { describe, it, expect } from 'vitest'
import { render, within } from '@testing-library/react'
import { TaskCard } from '../TaskCard'
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

const asyncNoop = async () => {}
const noop = () => {}

describe('TaskCard', () => {
  it('已完成项行内划线沉底：仍在列表中，显示删除线', () => {
    const goal = makeGoal({ id: 'g' })
    const todos = [
      makeTodo({ id: 'a', title: 'Alpha', goalId: 'g', sortOrder: 0 }),
      makeTodo({ id: 'b', title: 'Bravo', goalId: 'g', sortOrder: 1, status: 'done', completedAt: 200 }),
    ]
    const { getByText } = render(
      <TaskCard goal={goal} todos={todos} onAddTodo={asyncNoop} onToggleTodo={noop} onDeleteTodo={noop} />,
    )
    expect(getByText('Alpha')).toBeTruthy()
    const bravoEl = getByText('Bravo')
    expect(bravoEl).toBeTruthy()
    expect(bravoEl.classList.contains('rm-task-title-done')).toBe(true)
  })

  it('拖动重排：已完成行无拖拽柄，未完成行仍可拖拽', () => {
    const goal = makeGoal({ id: 'g' })
    const todos = [
      makeTodo({ id: 'a', title: 'Alpha', goalId: 'g', sortOrder: 0 }),
      makeTodo({ id: 'b', title: 'Bravo', goalId: 'g', sortOrder: 1, status: 'done', completedAt: 200 }),
      makeTodo({ id: 'c', title: 'Charlie', goalId: 'g', sortOrder: 2 }),
    ]
    const { container } = render(
      <TaskCard
        goal={goal}
        todos={todos}
        onAddTodo={asyncNoop}
        onToggleTodo={noop}
        onDeleteTodo={noop}
        onMoveTodo={noop}
      />,
    )
    const rows = Array.from(container.querySelectorAll('.rm-task-row')) as HTMLElement[]
    expect(rows).toHaveLength(3) // A、B、C 全部渲染

    // 渲染顺序：Alpha(未完成) → Charlie(未完成) → Bravo(已完成)
    // 已完成行无拖拽柄；未完成行有拖拽柄
    expect(rows[0].querySelector('.rm-task-drag')).toBeTruthy()   // Alpha
    expect(rows[1].querySelector('.rm-task-drag')).toBeTruthy()   // Charlie
    expect(rows[2].querySelector('.rm-task-drag')).toBeNull()     // Bravo
  })

  it('聚合视图：来自子目标的任务渲染子目标色点（常驻标识）', () => {
    const goal = makeGoal({ id: 'parent' })
    const todos = [
      makeTodo({ id: 'own', title: '本目标任务', goalId: 'parent', sortOrder: 0 }),
      makeTodo({ id: 'sub', title: '子目标任务', goalId: 'child', sortOrder: 1 }),
    ]
    const goalColorMap = { parent: 'var(--accent)', child: 'var(--event-sage-fill)' }
    const { container } = render(
      <TaskCard
        goal={goal}
        todos={todos}
        goalColorMap={goalColorMap}
        onAddTodo={asyncNoop}
        onToggleTodo={noop}
        onDeleteTodo={noop}
        onMoveTodo={noop}
      />,
    )
    const rows = Array.from(container.querySelectorAll('.rm-task-row')) as HTMLElement[]
    const ownRow = rows.find((r) => within(r).queryByText('本目标任务')) as HTMLElement
    const subRow = rows.find((r) => within(r).queryByText('子目标任务')) as HTMLElement

    // 本目标任务无子目标色点；子目标任务有常驻色点
    expect(ownRow.querySelector('.rm-task-goal-dot-rest')).toBeNull()
    expect(subRow.querySelector('.rm-task-goal-dot-rest')).toBeTruthy()
  })
})

/**
 * # TaskRow 交互测试
 *
 * - 双击标题 → 就地编辑输入框（两次快速点击，间隔 < 400ms）
 * - Enter 保存退出编辑 / Escape 还原
 * - 展开面板不含重复标题框
 * - 单机仍能展开详情面板
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { TaskRow } from '../TaskRow'
import type { Todo } from '@/domain/todo'

// ── Helpers ─────────────────────────────────────────────

function makeTodo(over: Partial<Todo> = {}): Todo {
  return {
    id: 't1',
    listId: 'default',
    title: '写测试用例',
    description: '覆盖交互场景',
    status: 'todo',
    priority: null,
    domain: null,
    dueDate: null,
    sortOrder: 0,
    projectId: null,
    categoryId: null,
    createdAt: 1000,
    updatedAt: 1000,
    completedAt: null,
    repeatPattern: null,
    goalId: null,
    isStarred: false,
    ...over,
  }
}

function renderRow(todo?: Todo, over: Partial<Parameters<typeof TaskRow>[0]> = {}) {
  const onToggle = vi.fn()
  const onUpdate = vi.fn()
  const onDelete = vi.fn()
  const onReorder = vi.fn()
  render(
    <TaskRow
      todo={todo ?? makeTodo()}
      now={2000}
      sortMode="manual"
      onReorder={onReorder}
      onToggle={onToggle}
      onUpdate={onUpdate}
      onDelete={onDelete}
      {...over}
    />,
  )
  return { onToggle, onUpdate, onDelete, onReorder }
}

/** 找行内最后一个 button（展开/折叠切换） */
function getExpandButton(): HTMLButtonElement {
  const buttons = document.querySelectorAll<HTMLButtonElement>('div[class*="flex items-start"] button')
  return buttons[buttons.length - 1]
}

/** 快速双击标题：两次 click + 中间推进时间（< 400ms 且 < 200ms 展开计时器） */
function doubleClickTitle() {
  const span = screen.getByText('写测试用例')
  fireEvent.click(span)                    // 第 1 击 → 启动展开计时器
  act(() => { vi.advanceTimersByTime(100) }) // 推进 100ms（< 200ms 展开定时器）
  fireEvent.click(span)                    // 第 2 击 → 双击识别 → 进入编辑
}

// ── Tests ───────────────────────────────────────────────

describe('TaskRow 双击标题改名', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('双击标题 → 出现输入框（替换<span>）', () => {
    renderRow()
    const span = screen.getByText('写测试用例')
    expect(span.tagName).toBe('SPAN')

    doubleClickTitle()

    // span 消失，input 出现
    expect(screen.queryByText('写测试用例')).toBeNull()
    const input = screen.getByDisplayValue('写测试用例')
    expect(input).toBeTruthy()
    expect(input.tagName).toBe('INPUT')
  })

  it('双击改标题 → Enter 保存并退出编辑', () => {
    const { onUpdate } = renderRow()
    doubleClickTitle()

    const input = screen.getByDisplayValue('写测试用例') as HTMLInputElement
    fireEvent.change(input, { target: { value: '新标题' } })

    // Enter 提交
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onUpdate).toHaveBeenCalledWith('t1', { title: '新标题' })

    // 退出编辑态，回到 span（props 未更新，仍显示原始标题）
    expect(screen.getByText('写测试用例')).toBeTruthy()
  })

  it('双击改标题 → Escape 还原不保存', () => {
    const { onUpdate } = renderRow()
    doubleClickTitle()

    const input = screen.getByDisplayValue('写测试用例') as HTMLInputElement
    fireEvent.change(input, { target: { value: '改了不改了' } })
    fireEvent.keyDown(input, { key: 'Escape' })

    // 还原为原始标题，onUpdate 未被调用
    expect(screen.getByText('写测试用例')).toBeTruthy()
    expect(onUpdate).not.toHaveBeenCalled()
  })

  it('展开详情面板不含重复标题框', () => {
    renderRow()
    // 点 chevron 按钮直接展开（无 debounce）
    fireEvent.click(getExpandButton())

    // 面板出现：有详细信息输入框
    expect(screen.getByPlaceholderText('详细信息')).toBeTruthy()
    // 但不应再出现 placeholder="标题" 的输入框
    expect(screen.queryByPlaceholderText('标题')).toBeNull()
  })

  it('单机行展开详情面板（debounce 后展开）', () => {
    renderRow()
    // 单击行
    const rowDiv = screen.getByText('写测试用例').closest('.flex-1')?.parentElement
    if (!rowDiv) throw new Error('row not found')
    fireEvent.click(rowDiv)

    // 计时器还没到，面板未出现
    expect(screen.queryByPlaceholderText('详细信息')).toBeNull()

    // 推进 250ms，展开
    act(() => { vi.advanceTimersByTime(250) })
    expect(screen.getByPlaceholderText('详细信息')).toBeTruthy()
  })
})

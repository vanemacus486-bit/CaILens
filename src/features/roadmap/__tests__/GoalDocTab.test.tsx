import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { GoalDocTab } from '../GoalDocTab'
import type { Goal } from '@/domain/goal'
import { makeNote, type GoalDoc } from '@/domain/goalDoc'

function makeGoal(doc?: GoalDoc): Goal {
  const now = Date.now()
  return {
    id: 'g1',
    parentId: null,
    title: 'SAA',
    description: '',
    categoryId: null,
    status: 'active',
    sortOrder: 0,
    targetDate: null,
    doc,
    createdAt: now,
    updatedAt: now,
  }
}

const asyncNoop = async () => {}
const addNoop = async () => ''

function renderTab(props: Partial<React.ComponentProps<typeof GoalDocTab>> = {}) {
  const goal = props.goal ?? makeGoal()
  return render(
    <GoalDocTab
      goal={goal}
      onAddNote={props.onAddNote ?? addNoop}
      onUpdateNote={props.onUpdateNote ?? asyncNoop}
      onRemoveNote={props.onRemoveNote ?? asyncNoop}
    />,
  )
}

describe('GoalDocTab', () => {
  it('空目标显示空态与「新建文档」按钮', () => {
    const { getByText } = renderTab()
    expect(getByText('新建文档')).toBeTruthy()
  })

  it('点击「新建文档」调用 onAddNote(goal.id)', () => {
    const onAddNote = vi.fn(async () => 'new-id')
    const { getByText } = renderTab({ onAddNote })
    fireEvent.click(getByText('新建文档'))
    expect(onAddNote).toHaveBeenCalledWith('g1')
  })

  it('读态：标题成 heading，正文按空行折成多段（去掉巨坑空行）', () => {
    const goal = makeGoal({ notes: [makeNote('n1', 1000, '关于 SAA', '第一段\n\n\n第二段\n\n第三段')] })
    const { getByText, getByRole, container } = renderTab({ goal })
    expect(getByRole('heading', { name: '关于 SAA' })).toBeTruthy()
    // 三个空行分隔的段 → 三个 <p>，而非一个塞满空行的 textarea
    const paras = container.querySelectorAll('.rm-note-p')
    expect(paras.length).toBe(3)
    expect(getByText('第一段')).toBeTruthy()
    expect(getByText('第三段')).toBeTruthy()
    // 读态不应有 textarea
    expect(container.querySelector('textarea')).toBeNull()
  })

  it('点击读态卡片进入编辑态，露出可编辑 textarea 且带原文', () => {
    const goal = makeGoal({ notes: [makeNote('n1', 1000, '标题', '正文内容')] })
    const { getByText, container } = renderTab({ goal })
    fireEvent.click(getByText('正文内容'))
    const ta = container.querySelector('textarea') as HTMLTextAreaElement
    expect(ta).toBeTruthy()
    expect(ta.value).toBe('正文内容')
  })

  it('空标题文档读态显示「无标题文档」占位', () => {
    const goal = makeGoal({ notes: [makeNote('n1', 1000, '', '只有正文')] })
    const { getByText } = renderTab({ goal })
    expect(getByText('无标题文档')).toBeTruthy()
  })

  it('读态把 ## 标题渲染成小标题，- 列表渲染成项目', () => {
    const goal = makeGoal({ notes: [makeNote('n1', 1000, '考纲', '## 考点\n- VPC\n- IAM')] })
    const { container, getByText } = renderTab({ goal })
    expect(getByText('考点').tagName.toLowerCase()).toBe('h4')
    expect(container.querySelectorAll('.rm-md-list li').length).toBe(2)
  })

  it('读态把 **加粗** 渲染成 strong', () => {
    const goal = makeGoal({ notes: [makeNote('n1', 1000, 't', '务必 **设告警**')] })
    const { container } = renderTab({ goal })
    expect(container.querySelector('strong')?.textContent).toBe('设告警')
  })

  it('卡片显示「更新于」脚注', () => {
    const goal = makeGoal({ notes: [makeNote('n1', Date.now(), '标题', '正文')] })
    const { getByText } = renderTab({ goal })
    expect(getByText(/更新于/)).toBeTruthy()
  })
})

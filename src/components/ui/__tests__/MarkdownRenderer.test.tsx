/**
 * # MarkdownRenderer 测试
 *
 * 覆盖：标题、加粗、无序列表、链接（target/rel）、行内代码渲染出对应 DOM。
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownRenderer } from '../MarkdownRenderer'

describe('MarkdownRenderer', () => {
  it('renders a level-2 heading', () => {
    render(<MarkdownRenderer content="## Context" />)
    const heading = screen.getByRole('heading', { level: 2 })
    expect(heading).toHaveTextContent('Context')
  })

  it('renders bold text as strong', () => {
    render(<MarkdownRenderer content="这是 **重点** 内容" />)
    const strong = screen.getByText('重点')
    expect(strong.tagName).toBe('STRONG')
  })

  it('renders a bullet list', () => {
    render(<MarkdownRenderer content={'- 第一项\n- 第二项'} />)
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
    expect(screen.getByText('第一项')).toBeInTheDocument()
  })

  it('renders a link with safe target and rel', () => {
    render(<MarkdownRenderer content="[查看计划](.omc/plans/timepage/04-mobile-day-stream.md)" />)
    const link = screen.getByRole('link', { name: '查看计划' })
    expect(link).toHaveAttribute('href', '.omc/plans/timepage/04-mobile-day-stream.md')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('renders inline code', () => {
    render(<MarkdownRenderer content="使用 `data-style` 属性" />)
    const code = screen.getByText('data-style')
    expect(code.tagName).toBe('CODE')
  })
})

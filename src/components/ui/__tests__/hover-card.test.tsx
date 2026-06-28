/**
 * # HoverCard 测试
 *
 * 覆盖：延迟显示、快速离开不显示、hover card 保持、shortcut 渲染、position 方向、退场动画
 * 卡片通过 Portal 渲染到 body，测试验证 DOM 位置而非 CSS 计算值。
 */

import { describe, it, expect } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { HoverCard } from '../hover-card'

describe('HoverCard', () => {
  it('renders the trigger child', () => {
    render(
      <HoverCard content="日历" shortcut="Alt+1">
        <button data-testid="trigger">日历</button>
      </HoverCard>,
    )
    expect(screen.getByTestId('trigger')).toHaveTextContent('日历')
  })

  it('does not show card before hover', () => {
    render(
      <HoverCard content="日历" shortcut="Alt+1">
        <button data-testid="trigger">日历</button>
      </HoverCard>,
    )
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('shows card after delay on hover', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="日历" shortcut="Alt+1" delay={10}>
        <button data-testid="trigger">日历</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })
    expect(tooltip).toBeInTheDocument()
    expect(tooltip).toHaveTextContent('日历')
    expect(tooltip).toHaveTextContent('Alt+1')
  })

  it('shows card with only content (no shortcut)', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="所有任务" delay={10}>
        <button data-testid="trigger">所有任务</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })
    expect(tooltip).toHaveTextContent('所有任务')
    expect(tooltip.querySelector('kbd')).toBeNull()
  })

  it('does not show card if mouse leaves before delay expires', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="规划" shortcut="Alt+2" delay={300}>
        <button data-testid="trigger">规划</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    await user.unhover(screen.getByTestId('trigger'))
    await waitFor(
      () => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
      { timeout: 500 },
    )
  })

  it('keeps card visible when mouse moves from trigger to card', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="设置" shortcut="Ctrl+," delay={10}>
        <button data-testid="trigger">设置</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })
    expect(tooltip).toBeInTheDocument()

    // Move from trigger to card — card should stay
    await user.unhover(screen.getByTestId('trigger'))
    await user.hover(tooltip)
    await waitFor(() => expect(screen.getByRole('tooltip')).toBeInTheDocument(), { timeout: 200 })
  })

  it('hides card when mouse leaves the card', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="设置" shortcut="Ctrl+," delay={10}>
        <button data-testid="trigger">设置</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })

    await user.unhover(tooltip)
    await waitFor(
      () => expect(screen.queryByRole('tooltip')).not.toBeInTheDocument(),
      { timeout: 300 },
    )
  })

  it('renders card with fixed position style', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="日历" shortcut="Alt+1" delay={10}>
        <button data-testid="trigger">日历</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })
    // Card has fixed positioning; px values come from getBoundingClientRect
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.style.left).toMatch(/^\d+px$/)
  })

  it('renders with bottom position offset', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="日历" shortcut="Alt+1" position="bottom" delay={10}>
        <button data-testid="trigger">日历</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })
    expect(tooltip.style.position).toBe('fixed')
    expect(tooltip.style.transform).toContain('translateX(-50%)')
  })

  it('renders via portal in document.body', async () => {
    const user = userEvent.setup()
    render(
      <HoverCard content="日历" shortcut="Alt+1" delay={10}>
        <button data-testid="trigger">日历</button>
      </HoverCard>,
    )
    await user.hover(screen.getByTestId('trigger'))
    const tooltip = await screen.findByRole('tooltip', {}, { timeout: 200 })
    // Portal renders into body
    expect(tooltip.parentElement).toBe(document.body)
  })
})

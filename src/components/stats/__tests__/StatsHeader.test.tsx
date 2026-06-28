import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { StatsHeader } from '../StatsHeader'
import { StatsRail } from '../StatsRail'

// ── StatsHeader ──────────────────────────────────────────────

describe('StatsHeader', () => {
  it('renders title without segments or arrows', () => {
    const { container } = render(<StatsHeader title="穿搭" />)
    const title = container.querySelector('.stats-header-title')
    expect(title).not.toBeNull()
    expect(title!.textContent).toBe('穿搭')
    // No row 2 when no segments
    expect(container.querySelector('.stats-header-row2')).toBeNull()
    // No arrows
    expect(container.querySelector('.stats-header-arrow')).toBeNull()
  })

  it('renders wordless slider with N hit zones and aria-labels', () => {
    const { container } = render(
      <StatsHeader
        title="趋势"
        segments={[{ id: 'day', label: '日' }, { id: 'week', label: '周' }, { id: 'month', label: '月' }]}
        value="week"
        onChange={() => {}}
      />,
    )
    // Title present
    expect(container.querySelector('.stats-header-title')!.textContent).toBe('趋势')
    // Row 2 present
    const row2 = container.querySelector('.stats-header-row2')
    expect(row2).not.toBeNull()
    // Scrubber present
    const scrubber = container.querySelector('.scrubber')
    expect(scrubber).not.toBeNull()
    // 3 hit zone buttons with aria-labels
    const zones = scrubber!.querySelectorAll('.scrubber-zone')
    expect(zones).toHaveLength(3)
    expect(zones[0].getAttribute('aria-label')).toBe('日')
    expect(zones[1].getAttribute('aria-label')).toBe('周')
    expect(zones[2].getAttribute('aria-label')).toBe('月')
    // Active zone (week, index 1) has aria-current
    expect(zones[1].getAttribute('aria-current')).toBe('true')
    expect(zones[0].getAttribute('aria-current')).toBeNull()
    expect(zones[2].getAttribute('aria-current')).toBeNull()
  })

  it('renders navigation arrows when onNavigate is provided', () => {
    const { container } = render(
      <StatsHeader
        title="热力图"
        segments={[{ id: 'roll', label: '近一年' }, { id: 'year', label: '年度' }]}
        value="roll"
        onChange={() => {}}
        onNavigate={() => {}}
      />,
    )
    const arrows = container.querySelectorAll('.stats-header-arrow')
    expect(arrows).toHaveLength(2)
    expect(arrows[0].textContent).toBe('‹')
    expect(arrows[1].textContent).toBe('›')
  })

  it('calls onChange when a slider hit zone is clicked (by aria-label)', () => {
    const onChange = vi.fn()
    const { container } = render(
      <StatsHeader
        title="趋势"
        segments={[{ id: 'day', label: '日' }, { id: 'week', label: '周' }]}
        value="day"
        onChange={onChange}
      />,
    )
    // Find zone by aria-label
    const weekZone = container.querySelector('[aria-label="周"]') as HTMLButtonElement
    expect(weekZone).not.toBeNull()
    fireEvent.click(weekZone)
    expect(onChange).toHaveBeenCalledWith('week')
  })

  it('calls onNavigate with -1/1 when arrows are clicked', () => {
    const onNavigate = vi.fn()
    const { container } = render(
      <StatsHeader
        title="睡眠"
        segments={[{ id: 'month', label: '月' }]}
        value="month"
        onChange={() => {}}
        onNavigate={onNavigate}
      />,
    )
    const arrows = container.querySelectorAll('.stats-header-arrow')
    fireEvent.click(arrows[0])
    expect(onNavigate).toHaveBeenCalledWith(-1)
    fireEvent.click(arrows[1])
    expect(onNavigate).toHaveBeenCalledWith(1)
  })

  it('renders rail slot when provided', () => {
    const { container } = render(
      <StatsHeader
        title="趋势"
        rail={<div data-testid="test-rail">dots</div>}
      />,
    )
    const rail = container.querySelector('.stats-header-rail')
    expect(rail).not.toBeNull()
    expect(rail!.textContent).toBe('dots')
  })
})

// ── StatsRail (horizontal) ───────────────────────────────────

describe('StatsRail', () => {
  it('returns null in empty mode', () => {
    const { container } = render(<StatsRail mode="empty" selected="accent" />)
    expect(container.innerHTML).toBe('')
  })

  it('renders 6 horizontal dots in multi mode', () => {
    const { container } = render(
      <StatsRail mode="multi" selected={['accent', 'sage']} />,
    )
    const dots = container.querySelectorAll('.stats-rail-dot')
    expect(dots).toHaveLength(6)
    // First dot (accent) should be active
    expect(dots[0].classList.contains('stats-rail-dot-active')).toBe(true)
    // Second dot (sage) should be active
    expect(dots[1].classList.contains('stats-rail-dot-active')).toBe(true)
    // Third dot (sand) should be inactive
    expect(dots[2].classList.contains('stats-rail-dot-inactive')).toBe(true)
  })

  it('renders 6 dots in single mode with one selected', () => {
    const { container } = render(
      <StatsRail mode="single" selected="accent" />,
    )
    const dots = container.querySelectorAll('.stats-rail-dot')
    expect(dots).toHaveLength(6)
    expect(dots[0].classList.contains('stats-rail-dot-active')).toBe(true)
    expect(dots[1].classList.contains('stats-rail-dot-inactive')).toBe(true)
  })

  it('calls onToggle when a dot is clicked in multi mode', () => {
    const onToggle = vi.fn()
    const { container } = render(
      <StatsRail mode="multi" selected={['accent']} onToggle={onToggle} />,
    )
    const dots = container.querySelectorAll('.stats-rail-dot')
    // Click sage (index 1, currently inactive)
    fireEvent.click(dots[1])
    expect(onToggle).toHaveBeenCalledWith('sage')
  })

  it('calls onSelect when a dot is clicked in single mode', () => {
    const onSelect = vi.fn()
    const { container } = render(
      <StatsRail mode="single" selected="accent" onSelect={onSelect} />,
    )
    const dots = container.querySelectorAll('.stats-rail-dot')
    fireEvent.click(dots[3]) // sky, index 3
    expect(onSelect).toHaveBeenCalledWith('sky')
  })
})

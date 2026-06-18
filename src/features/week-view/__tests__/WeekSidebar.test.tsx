import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { WeekSidebar } from '../WeekSidebar'

function renderSidebar(over: Partial<Parameters<typeof WeekSidebar>[0]> = {}) {
  const onSelectDate = vi.fn()
  const onNewEvent = vi.fn()
  const props = {
    language: 'zh' as const,
    viewMode: 'week' as const,
    weekStart: new Date(2026, 5, 15), // Mon 2026-06-15
    selectedDay: new Date(2026, 5, 15),
    onSelectDate,
    onNewEvent,
    ...over,
  }
  render(<WeekSidebar {...props} />)
  return { onSelectDate, onNewEvent }
}

describe('WeekSidebar', () => {
  it('renders the mini-calendar for the active week month', () => {
    renderSidebar()
    expect(screen.getByText('2026 年 6 月')).toBeTruthy()
    // day cells are rendered as clickable buttons
    expect(screen.getByRole('button', { name: '15' })).toBeTruthy()
  })

  it('fires onNewEvent with the button element when 新日程 is clicked', () => {
    const { onNewEvent } = renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: '新日程' }))
    expect(onNewEvent).toHaveBeenCalledTimes(1)
    expect(onNewEvent.mock.calls[0][0]).toBeInstanceOf(HTMLButtonElement)
  })

  it('fires onSelectDate when a day cell is clicked', () => {
    const { onSelectDate } = renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: '15' }))
    expect(onSelectDate).toHaveBeenCalledTimes(1)
    expect(onSelectDate.mock.calls[0][0]).toBeInstanceOf(Date)
    expect((onSelectDate.mock.calls[0][0] as Date).getDate()).toBe(15)
  })

  it('browses months independently via the nav arrows', () => {
    renderSidebar()
    fireEvent.click(screen.getByRole('button', { name: '上个月' }))
    expect(screen.getByText('2026 年 5 月')).toBeTruthy()
  })
})

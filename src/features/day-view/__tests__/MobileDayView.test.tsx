import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MobileDayView } from '../MobileDayView'

vi.mock('@/stores/eventStore', () => ({
  useEventStore: (selector: (state: { events: never[] }) => unknown) => selector({ events: [] }),
}))

vi.mock('@/stores/categoryStore', () => ({
  useCategoryStore: (selector: (state: { categories: never[] }) => unknown) => selector({ categories: [] }),
}))

vi.mock('@/stores/settingsStore', () => ({
  useAppSettingsStore: (selector: (state: { settings: { language: 'zh' } }) => unknown) => (
    selector({ settings: { language: 'zh' } })
  ),
}))

describe('MobileDayView', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 6, 24, 14, 10))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('localizes the day strip and creates from the visible empty state action', () => {
    const onCreateEvent = vi.fn()

    render(
      <MobileDayView
        weekStart={new Date(2026, 6, 20)}
        onWeekStartChange={vi.fn()}
        onCreateEvent={onCreateEvent}
      />,
    )

    expect(screen.getByText('周一')).toBeInTheDocument()
    expect(screen.getByText('添加一条记录，开始还原今天的时间去向。')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '添加记录' }))

    expect(onCreateEvent).toHaveBeenCalledTimes(1)
    const [startTime, anchorEl] = onCreateEvent.mock.calls[0] as [number, HTMLElement]
    expect(new Date(startTime)).toEqual(new Date(2026, 6, 24, 14, 30))
    expect(anchorEl).toBeInstanceOf(HTMLElement)
  })
})

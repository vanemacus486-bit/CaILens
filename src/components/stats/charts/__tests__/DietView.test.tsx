import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { CalendarEvent } from '@/domain/event'

import { DietView } from '../DietView'

describe('DietView', () => {
  it('renders without crashing with empty data', () => {
    const { container } = render(
      <DietView rangeEvents={[]} anchorDate={new Date()} mode="timeline" onModeChange={() => {}} />,
    )
    expect(container).toBeTruthy()
  })

  it('renders with synthetic events', () => {
    const events: CalendarEvent[] = [{
      id: '1', title: '早餐', startTime: Date.now() - 3600000, endTime: Date.now(),
      color: 'rose', categoryId: 'rose', createdAt: Date.now(), updatedAt: Date.now(),
      typedKey: 'meal',
      typedData: { type: 'meal', mealOrder: 'breakfast', source: 'home', foodTags: [] },
    }]
    const { container } = render(
      <DietView rangeEvents={events} anchorDate={new Date()} mode="timeline" onModeChange={() => {}} />,
    )
    expect(container.querySelector('.dv-root')).toBeTruthy()
  })
})

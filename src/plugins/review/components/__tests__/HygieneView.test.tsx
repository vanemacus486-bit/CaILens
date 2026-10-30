import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import type { CalendarEvent } from '@/domain/event'
import type { HygieneActivityDef } from '@/domain/hygieneActivity'

import { HygieneView } from '../HygieneView'

describe('HygieneView', () => {
  const activities: HygieneActivityDef[] = [
    { id: 'brush', name: '刷牙', keywords: ['刷牙'], color: 'sky', icon: '🪥' },
    { id: 'shower', name: '洗澡', keywords: ['洗澡'], color: 'sage', icon: '🚿' },
  ]

  it('renders without crashing with empty data', () => {
    const { container } = render(
      <HygieneView
        rangeEvents={[]}
        activities={activities}
        language="zh"
        anchorDate={new Date()}
        mode="timeline"
        onModeChange={() => {}}
      />,
    )
    expect(container).toBeTruthy()
  })

  it('renders with a hygiene event', () => {
    const events: CalendarEvent[] = [{
      id: '1', title: '刷牙', startTime: Date.now() - 600000, endTime: Date.now(),
      color: 'sky', categoryId: 'sky', createdAt: Date.now(), updatedAt: Date.now(),
      typedKey: 'hygiene',
      typedData: { type: 'hygiene', activity: 'brush' },
    }]
    const { container } = render(
      <HygieneView
        rangeEvents={events}
        activities={activities}
        language="zh"
        anchorDate={new Date()}
        mode="timeline"
        onModeChange={() => {}}
      />,
    )
    expect(container).toBeTruthy()
  })
})

import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import type { CalendarEvent } from '@/domain/event'

/* recharts' <ResponsiveContainer> measures its parent via ResizeObserver, which
   reports 0×0 in jsdom — the chart would render nothing. Replace it with a
   pass-through that injects a fixed size so the chart computes a real layout. */
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 800, height: 360 }),
  }
})

// Import AFTER the mock is registered.
import { SleepScatterChart } from '../SleepScatterChart'

/** A main-sleep night anchored in June 2026 (the current month under test). */
function sleepNight(bedDay: number, bedHour: number, wakeDay: number, wakeHour: number): CalendarEvent {
  return {
    id: crypto.randomUUID(),
    title: '睡眠',
    startTime: new Date(2026, 5, bedDay, bedHour, 0).getTime(),
    endTime: new Date(2026, 5, wakeDay, wakeHour, 0).getTime(),
    color: 'stone',
    categoryId: 'stone',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }
}

describe('SleepScatterChart rendering', () => {
  it('draws a bed dot and a wake dot for every night in view', () => {
    const events = [
      sleepNight(3, 23, 4, 7),
      sleepNight(5, 22, 6, 6),
      sleepNight(8, 0, 8, 8),
      sleepNight(10, 23, 11, 7),
    ]

    const { container } = render(<SleepScatterChart rangeEvents={events} />)

    const dots = container.querySelectorAll('.recharts-customized-wrapper circle')
    // 4 nights × (bed + wake) = 8 dots expected
    expect(dots.length).toBe(8)
  })
})

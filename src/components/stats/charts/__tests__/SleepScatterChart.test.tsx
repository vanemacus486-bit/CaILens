import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render, fireEvent } from '@testing-library/react'
import type { CalendarEvent } from '@/domain/event'

/* recharts' <ResponsiveContainer> measures its parent via ResizeObserver, which
   reports 0×0 in jsdom �?the chart would render nothing. Replace it with a
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

    const { container } = render(<SleepScatterChart rangeEvents={events} anchorDate={new Date(2026, 5, 1)} viewMode="month" onViewModeChange={() => {}} />)

    const dots = container.querySelectorAll('.recharts-customized-wrapper circle')
    // 4 nights �� (bed + wake) = 8 dots expected
    expect(dots.length).toBe(8)
  })

  it('reveals a night\'s exact bed/wake time on hover', () => {
    const events = [
      sleepNight(3, 23, 4, 7),   // bed 23:00 �?wake 07:00
      sleepNight(5, 22, 6, 6),
      sleepNight(8, 0, 8, 8),
      sleepNight(10, 23, 11, 7),
    ]

    const { container } = render(<SleepScatterChart rangeEvents={events} anchorDate={new Date(2026, 5, 1)} viewMode="month" onViewModeChange={() => {}} />)
    const capture = container.querySelector('rect[data-sleep-capture]')
    expect(capture).not.toBeNull()

    // No hover popup until the pointer enters the plot. (The average-line labels
    // are always rendered and may legitimately share digits with a given night's
    // time, so this checks the popup element itself rather than page text.)
    expect(container.querySelector('[data-sleep-tooltip]')).toBeNull()

    fireEvent.mouseMove(capture!, { clientX: 0 })

    // jsdom reports a 0-width box �?fraction 0 �?snaps to the earliest night
    // (day 3: bed 23:00, wake 07:00). The popup should now show both times.
    const tooltip = container.querySelector('[data-sleep-tooltip]')
    expect(tooltip).not.toBeNull()
    expect(tooltip!.textContent).toContain('23:00')
    expect(tooltip!.textContent).toContain('07:00')
  })

  it('places the average-line label to the right of the plot, clear of every dot', () => {
    const events = [
      sleepNight(3, 23, 4, 7),
      sleepNight(5, 22, 6, 6),
      sleepNight(8, 0, 8, 8),
      sleepNight(10, 23, 11, 7),
    ]

    const { container } = render(<SleepScatterChart rangeEvents={events} anchorDate={new Date(2026, 5, 1)} viewMode="month" onViewModeChange={() => {}} />)

    const wrapper = container.querySelector('.recharts-customized-wrapper')
    expect(wrapper).not.toBeNull()

    const dotXs = Array.from(wrapper!.querySelectorAll('circle')).map((el) => Number(el.getAttribute('cx')))
    expect(dotXs.length).toBeGreaterThan(0)
    const rightmostDotX = Math.max(...dotXs)

    const label = Array.from(wrapper!.querySelectorAll('text')).find((el) => (el.textContent ?? '').includes('平均就寝'))
    expect(label).toBeDefined()
    // The label must sit strictly past the rightmost dot — outside the plotted
    // data area — so it can never land on top of a record.
    expect(Number(label!.getAttribute('x'))).toBeGreaterThan(rightmostDotX)
  })

  it('averages bed/wake times across the midnight boundary without skewing toward noon', () => {
    // Every night sleeps exactly 8h, but bedtimes straddle midnight (23:00, 00:00,
    // 22:00, 01:00). A plain 0-24 mean of those bedtimes lands at 11:30 (noon-ish),
    // wildly inconsistent with the 8h duration every night actually has.
    const events = [
      sleepNight(3, 23, 4, 7),
      sleepNight(5, 0, 5, 8),
      sleepNight(7, 22, 8, 6),
      sleepNight(9, 1, 9, 9),
    ]

    const { container } = render(<SleepScatterChart rangeEvents={events} anchorDate={new Date(2026, 5, 1)} viewMode="month" onViewModeChange={() => {}} />)

    // Correct wrap-aware averages: bed ~23:30, wake ~07:30, duration 8h —
    // avgWake - avgBed (mod 24) reconciles with avgDuration.
    expect(container.textContent).toContain('23:30')
    expect(container.textContent).toContain('07:30')
    expect(container.textContent).toContain('8h 00m')

    // The old naive mean produced 11:30 for avgBed — must not reappear.
    expect(container.textContent).not.toContain('11:30')
  })
})


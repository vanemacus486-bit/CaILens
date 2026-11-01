import { describe, it, expect, vi } from 'vitest'
import React from 'react'
import { render } from '@testing-library/react'
import { DEFAULT_CATEGORIES } from '@/domain/category'

/* recharts <ResponsiveContainer> measures its parent via ResizeObserver, which
   reports 0×0 in jsdom → replace with a pass-through injecting fixed size. */
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof import('recharts')>()
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactElement<{ width?: number; height?: number }> }) =>
      React.cloneElement(children, { width: 800, height: 360 }),
  }
})

import { CategoryTrendChart } from '../CategoryTrendChart'

describe('CategoryTrendChart', () => {
  it('does not crash with empty history', () => {
    const { container } = render(
      <CategoryTrendChart
        history={[]}
        categories={[...DEFAULT_CATEGORIES]}
        periodType="day"
        maturity={{ daysRecorded: 0, consecutiveDays: 0, maturityLevel: 'cold' }}
        selected={[]}
      />,
    )
    expect(container).toBeTruthy()
  })
})

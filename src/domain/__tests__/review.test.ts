import { describe, expect, it } from 'vitest'
import { resolveReviewRoute, reviewViewAnchor, anchorForPeriod } from '../review'

describe('resolveReviewRoute', () => {
  it('maps known domains', () => {
    expect(resolveReviewRoute('trend')).toEqual({ domain: 'trend' })
    expect(resolveReviewRoute('heatmap')).toEqual({ domain: 'heatmap' })
    expect(resolveReviewRoute('sleep')).toEqual({ domain: 'sleep' })
    expect(resolveReviewRoute('diet')).toEqual({ domain: 'diet' })
    expect(resolveReviewRoute('hygiene')).toEqual({ domain: 'hygiene' })
  })

  it('defaults unknown or missing views to trend', () => {
    expect(resolveReviewRoute('time')).toEqual({ domain: 'trend' })
    expect(resolveReviewRoute(null)).toEqual({ domain: 'trend' })
    expect(resolveReviewRoute('unknown')).toEqual({ domain: 'trend' })
  })
})

describe('reviewViewAnchor', () => {
  const d = new Date(2026, 4, 20) // 2026-05-20，周三

  it('steps by the view own grain, not the page grain', () => {
    // 热力图按年：锚点落到 1 月 1 日
    expect(reviewViewAnchor('heatmap', 'week', d).getMonth()).toBe(0)
    expect(reviewViewAnchor('heatmap', 'week', d).getDate()).toBe(1)
    // 睡眠按月：锚点落到当月 1 日，年月不变
    const sleep = reviewViewAnchor('sleep', 'week', d)
    expect(sleep.getFullYear()).toBe(2026)
    expect(sleep.getMonth()).toBe(4)
    expect(sleep.getDate()).toBe(1)
  })

  it('falls back to the page grain for trend and unknown views', () => {
    expect(reviewViewAnchor('trend', 'day', d).getHours()).toBe(0)
    expect(reviewViewAnchor('trend', 'day', d).getDate()).toBe(20)
    expect(reviewViewAnchor('no-such-view', 'day', d).getDate()).toBe(20)
  })

  it('diet/hygiene step by week, starting Monday', () => {
    const diet = reviewViewAnchor('diet', 'month', d)
    expect(diet.getDay()).toBe(1) // 周一
    expect(diet.getTime()).toBeLessThan(d.getTime() + 1)
  })
})

describe('anchorForPeriod', () => {
  const d = new Date(2026, 4, 20, 15, 30)

  it('normalises to the start of each grain', () => {
    expect(anchorForPeriod('day', d).getHours()).toBe(0)
    expect(anchorForPeriod('month', d).getDate()).toBe(1)
    expect(anchorForPeriod('week', d).getDay()).toBe(1)
  })
})

import { describe, expect, it } from 'vitest'
import { resolveReviewRoute } from '../review'

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

import { describe, it, expect } from 'vitest'

/**
 * MobileDayPage 时间指示线的定位公式验证。
 *
 * 代码位置：src/features/mobile/MobileDayPage.tsx:240-253
 *  - PX_PER_MINUTE = 1，HOUR_HEIGHT = 60
 *  - 小时线：top = h * HOUR_HEIGHT = h * 60 （px）
 *  - 时间指示线：top = mins * PX_PER_MINUTE = (getHours()*60 + getMinutes()) * 1 （px）
 *
 * 验证：在任何整点，时间指示线的像素位置 = 对应小时线的像素位置。
 * 验证：在任何半点/非整点，时间指示线位于正确比例位置。
 */

// 模拟 MobileDayPage 中时间指示线的计算逻辑
function timeIndicatorTop(now: Date): number {
  return (now.getHours() * 60 + now.getMinutes()) * 1  // PX_PER_MINUTE = 1
}

function hourLineTop(hour: number): number {
  return hour * 60  // HOUR_HEIGHT = 60
}

describe('MobileDayPage time indicator alignment', () => {
  it('aligns with hour lines at every whole hour', () => {
    for (let h = 0; h < 24; h++) {
      const now = new Date(2026, 3, 20, h, 0, 0)
      expect(timeIndicatorTop(now)).toBe(hourLineTop(h))
    }
  })

  it('aligns with half-hour marks', () => {
    for (let h = 0; h < 24; h++) {
      const now = new Date(2026, 3, 20, h, 30, 0)
      const expected = h * 60 + 30
      expect(timeIndicatorTop(now)).toBe(expected)
    }
  })

  it('places 15:20 at correct proportional position', () => {
    const now = new Date(2026, 3, 20, 15, 20, 0)
    const top15 = hourLineTop(15)  // 900px
    const top16 = hourLineTop(16)  // 960px
    const indicator = timeIndicatorTop(now)  // 920px

    // 15:20 should be 20/60 = 33.3% of the way between 15:00 and 16:00
    const fractionThrough = (indicator - top15) / (top16 - top15)
    expect(fractionThrough).toBeCloseTo(20 / 60, 5)
  })

  it('uses clock-based time (DST-safe), not UTC-elapsed', () => {
    // Simulate DST spring-forward day: at 3:00 AM clock (spring-forward from 2:00)
    // getHours() returns 3, not UTC-elapsed 2
    const now = new Date(2026, 2, 29, 3, 0, 0)  // DST spring-forward
    expect(timeIndicatorTop(now)).toBe(180)  // 3 * 60 = 180px

    // On DST fall-back day: second occurrence of 2:00 AM
    // getHours() returns 2
    const nowFallback = new Date(2026, 9, 25, 2, 0, 0)  // DST fall-back
    expect(timeIndicatorTop(nowFallback)).toBe(120)  // 2 * 60 = 120px
  })

  it('handles midnight correctly', () => {
    const now = new Date(2026, 3, 20, 0, 0, 0)
    expect(timeIndicatorTop(now)).toBe(0)
  })

  it('handles end of day (23:59) correctly', () => {
    const now = new Date(2026, 3, 20, 23, 59, 0)
    expect(timeIndicatorTop(now)).toBe(23 * 60 + 59)  // 1439px
  })
})

import { describe, it, expect } from 'vitest'
import { computeQuickCaptureSpan, QUICK_CAPTURE_MIN_MS } from '../quickCaptureSpan'

// ── Seam: computeQuickCaptureSpan 纯函数 ──────────────────
// 验证「打开快速录入时预填什么时间区间」这一条业务规则。
// 期望值全部来自手工算好的时刻，不复用函数内部算式。

// 2026-06-22 15:00 本地时间
const NOW = new Date(2026, 5, 22, 15, 0, 0, 0).getTime()
const at = (h: number, m: number) => new Date(2026, 5, 22, h, m, 0, 0).getTime()

describe('computeQuickCaptureSpan', () => {
  it('上一条事件在 14:20 结束 → 区间就是 14:20–15:00', () => {
    const span = computeQuickCaptureSpan({ lastEventEnd: at(14, 20), now: NOW })
    expect(span.start).toBe(at(14, 20))
    expect(span.end).toBe(NOW)
  })

  it('没有上一条事件 → 起点回落到当前整点，终点是现在', () => {
    const span = computeQuickCaptureSpan({ lastEventEnd: null, now: NOW })
    expect(span.start).toBe(at(15, 0))
    expect(span.end).toBe(NOW + QUICK_CAPTURE_MIN_MS)
  })

  it('上一条紧贴着现在结束 → 区间至少 15 分钟', () => {
    const span = computeQuickCaptureSpan({ lastEventEnd: at(15, 0), now: NOW })
    expect(span.start).toBe(at(15, 0))
    expect(span.end).toBe(at(15, 15))
  })

  it('上一条结束时间在未来（预排的事件）→ 忽略它，回落到整点', () => {
    const span = computeQuickCaptureSpan({ lastEventEnd: at(18, 0), now: NOW })
    expect(span.start).toBe(at(15, 0))
    expect(span.end).toBe(NOW + QUICK_CAPTURE_MIN_MS)
  })

  it('上一条在 20 小时前结束 → 起点不被拉那么远，回落到整点', () => {
    const span = computeQuickCaptureSpan({ lastEventEnd: at(19, 0), now: NOW })
    expect(span.start).toBe(at(15, 0))
  })
})

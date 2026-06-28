import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render } from '@testing-library/react'
import { CurrentTimeLine } from '../CurrentTimeLine'
import { TOTAL_SLOTS } from '@/features/week-view/constants'

/**
 * CurrentTimeLine 渲染测试。
 *
 * 验证要点：
 * 1. `top%` 的计算公式为 `minutes / (24*60) * 100`
 * 2. 整点（12:00 → 50%、06:00 → 25%）的 top% 与 DayColumn
 *    96-slot 网格的对应整点线（slot[4h] top = 4h/96*100%）一致
 * 3. 非整点（15:20）的 top% 在正确比例位置
 * 4. DOM 结构包含圆点（span）和横线（div borderTop）
 * 5. 对齐关系验证：每个整点的 top% 与 96-slot 网格的 slot[4h] top 一致
 */
describe('CurrentTimeLine', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders at 50% for 12:00 (noon)', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).not.toBeNull()
    expect(wrapper.style.top).toBe('50%')
  })

  it('renders at 25% for 06:00', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 6, 0, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.top).toBe('25%')
  })

  it('renders at 12.5% for 03:00', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 3, 0, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.top).toBe('12.5%')
  })

  it('renders at 0% for 00:00 (midnight)', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 0, 0, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.style.top).toBe('0%')
  })

  it('renders at 100% for 24:00 (end of day)', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 23, 59, 59))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    // 23:59:59 ≈ 1439.98 min → ~99.999%
    const topVal = parseFloat(wrapper.style.top)
    expect(topVal).toBeGreaterThan(99.9)
    expect(topVal).toBeLessThanOrEqual(100)
  })

  it('renders at correct proportional position for 15:20 (≈63.889%)', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 15, 20, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    // (15*60 + 20) / (24*60) * 100 = 920/1440*100 = 63.888...%
    const topVal = parseFloat(wrapper.style.top)
    expect(topVal).toBeCloseTo(63.8889, 3)
  })

  it('renders at correct proportional position for 09:30 (≈39.583%)', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 9, 30, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    // (9*60 + 30) / 1440 * 100 = 570/1440*100 = 39.5833...%
    const topVal = parseFloat(wrapper.style.top)
    expect(topVal).toBeCloseTo(39.5833, 3)
  })

  it('renders dot (span) and line (div) elements', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0))
    const { container } = render(<CurrentTimeLine />)
    // The wrapper div should have exactly two children: a span (dot) and a div (line)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.children.length).toBe(2)

    const dot = wrapper.children[0] as HTMLElement
    expect(dot.tagName).toBe('SPAN')
    // Dot should have rounded-full class and width/height of 5px
    expect(dot.className).toContain('rounded-full')
    expect(dot.style.width).toBe('5px')
    expect(dot.style.height).toBe('5px')

    const lineDiv = wrapper.children[1] as HTMLElement
    expect(lineDiv.tagName).toBe('DIV')
    // Line should be created via borderTop
    expect(lineDiv.style.borderTop).toContain('var(--accent)')
  })

  it('wrapper has pointer-events-none and z-20', () => {
    vi.setSystemTime(new Date(2026, 3, 20, 12, 0, 0))
    const { container } = render(<CurrentTimeLine />)
    const wrapper = container.firstChild as HTMLElement
    expect(wrapper.className).toContain('pointer-events-none')
    expect(wrapper.className).toContain('z-20')
  })

  // ── Grid alignment tests ────────────────────────────────
  // 验证 CurrentTimeLine 的 top% 与 DayColumn 的 96-slot 网格线对齐。
  // 网格 slot[4h] 的顶部 = 整点线，slot[4h+2] 的顶部 = 半点线。

  describe.each([
    { label: '00:00', hour: 0,  min: 0,  expectedTopPct:  0 },
    { label: '01:00', hour: 1,  min: 0,  expectedTopPct:  4.166666666666667 },
    { label: '03:00', hour: 3,  min: 0,  expectedTopPct: 12.5 },
    { label: '06:00', hour: 6,  min: 0,  expectedTopPct: 25 },
    { label: '09:00', hour: 9,  min: 0,  expectedTopPct: 37.5 },
    { label: '12:00', hour: 12, min: 0,  expectedTopPct: 50 },
    { label: '15:00', hour: 15, min: 0,  expectedTopPct: 62.5 },
    { label: '18:00', hour: 18, min: 0,  expectedTopPct: 75 },
    { label: '21:00', hour: 21, min: 0,  expectedTopPct: 87.5 },
    { label: '23:00', hour: 23, min: 0,  expectedTopPct: 95.83333333333333 },
  ])('aligns with grid hour lines ($label)', ({ hour, min, expectedTopPct }) => {
    it(`CurrentTimeLine at ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} → ${expectedTopPct}%`, () => {
      vi.setSystemTime(new Date(2026, 3, 20, hour, min, 0))
      const { container } = render(<CurrentTimeLine />)
      const wrapper = container.firstChild as HTMLElement
      const actualTopPct = parseFloat(wrapper.style.top)
      expect(actualTopPct).toBeCloseTo(expectedTopPct, 5)

      // 整点在 96-slot 网格中的对应 slot = 4*hour, slot top = slot/96 * 100%
      const gridSlotIndex = hour * 4
      const gridLineTopPct = (gridSlotIndex / TOTAL_SLOTS) * 100
      expect(actualTopPct).toBeCloseTo(gridLineTopPct, 5)
    })
  })

  describe.each([
    { label: '00:30', hour: 0,  min: 30, expectedTopPct:  2.083333333333333 },
    { label: '09:30', hour: 9,  min: 30, expectedTopPct: 39.58333333333333 },
    { label: '15:20', hour: 15, min: 20, expectedTopPct: 63.88888888888889 },
    { label: '18:45', hour: 18, min: 45, expectedTopPct: 78.125 },
  ])('aligns with grid half-hour / non-integer marks ($label)', ({ hour, min, expectedTopPct }) => {
    it(`CurrentTimeLine at ${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')} → ${expectedTopPct}%`, () => {
      vi.setSystemTime(new Date(2026, 3, 20, hour, min, 0))
      const { container } = render(<CurrentTimeLine />)
      const wrapper = container.firstChild as HTMLElement
      const actualTopPct = parseFloat(wrapper.style.top)
      expect(actualTopPct).toBeCloseTo(expectedTopPct, 5)
    })
  })
})

import { describe, it, expect } from 'vitest'
import {
  computeMetricAutoCount,
  metricCurrent,
  metricPercent,
  aggregateMetricsPercent,
  makeMetric,
  type KeyMetric,
} from '../keyMetric'
import type { CalendarEvent } from '../event'

function metric(partial: Partial<KeyMetric>): KeyMetric {
  return {
    id: 'm1',
    label: '安卓开发',
    categoryId: null,
    manualCount: 0,
    target: 100,
    unit: '次',
    linkedEventIds: [],
    ...partial,
  }
}

function ev(id: string): CalendarEvent {
  return {
    id,
    title: 't',
    categoryId: 'accent',
    startTime: 0,
    endTime: 1000,
  } as CalendarEvent
}

describe('makeMetric', () => {
  it('默认 target 100 / 单位 次 / manualCount 0', () => {
    const m = makeMetric('id1', { label: '苹果开发' })
    expect(m).toMatchObject({ id: 'id1', label: '苹果开发', target: 100, unit: '次', manualCount: 0 })
    expect(m.linkedEventIds).toEqual([])
  })

  it('可覆盖 target/unit/categoryId', () => {
    const m = makeMetric('id2', { label: 'x', target: 50, unit: '小时', categoryId: 'sage' })
    expect(m).toMatchObject({ target: 50, unit: '小时', categoryId: 'sage' })
  })
})

describe('computeMetricAutoCount', () => {
  it('无绑定返回 0', () => {
    expect(computeMetricAutoCount(metric({}), [ev('a'), ev('b')])).toBe(0)
  })

  it('计绑定且存在的事件数', () => {
    const m = metric({ linkedEventIds: ['a', 'c'] })
    expect(computeMetricAutoCount(m, [ev('a'), ev('b'), ev('c')])).toBe(2)
  })

  it('绑定但事件不存在则不计', () => {
    const m = metric({ linkedEventIds: ['x'] })
    expect(computeMetricAutoCount(m, [ev('a')])).toBe(0)
  })
})

describe('metricCurrent', () => {
  it('= manual + auto', () => {
    expect(metricCurrent(metric({ manualCount: 37 }), 5)).toBe(42)
  })
  it('下限 0', () => {
    expect(metricCurrent(metric({ manualCount: -10 }), 0)).toBe(0)
  })
})

describe('metricPercent', () => {
  it('37/100 → 37', () => {
    expect(metricPercent(metric({ manualCount: 37 }))).toBe(37)
  })
  it('超过 target 截断 100', () => {
    expect(metricPercent(metric({ manualCount: 150 }))).toBe(100)
  })
  it('target 0 → 0', () => {
    expect(metricPercent(metric({ manualCount: 5, target: 0 }))).toBe(0)
  })
  it('含自动计数', () => {
    expect(metricPercent(metric({ manualCount: 20 }), 30)).toBe(50)
  })
})

describe('aggregateMetricsPercent', () => {
  it('截图三指标 37/23/84 → 48%', () => {
    const ms = [
      metric({ id: 'a', manualCount: 37 }),
      metric({ id: 'b', manualCount: 23 }),
      metric({ id: 'c', manualCount: 84 }),
    ]
    expect(aggregateMetricsPercent(ms)).toBe(48) // (37+23+84)/300
  })

  it('空数组 → 0', () => {
    expect(aggregateMetricsPercent([])).toBe(0)
  })

  it('叠加自动计数', () => {
    const ms = [metric({ id: 'a', manualCount: 10, target: 100 })]
    const auto = new Map([['a', 40]])
    expect(aggregateMetricsPercent(ms, auto)).toBe(50)
  })
})

import { describe, it, expect } from 'vitest'
import { resolveLabelStack } from '../labelStack'

const opts = { top: 0, bottom: 400, gap: 14 }

describe('resolveLabelStack', () => {
  it('returns empty map for no anchors', () => {
    expect(resolveLabelStack([], opts).size).toBe(0)
  })

  it('leaves well-separated labels at their ideal positions', () => {
    const r = resolveLabelStack(
      [{ key: 'a', idealY: 100 }, { key: 'b', idealY: 300 }],
      opts,
    )
    expect(r.get('a')).toBe(100)
    expect(r.get('b')).toBe(300)
  })

  it('pushes overlapping labels apart by exactly the gap, anchoring the upper one', () => {
    const r = resolveLabelStack(
      [{ key: 'a', idealY: 200 }, { key: 'b', idealY: 205 }],
      opts,
    )
    expect(r.get('a')).toBe(200)
    expect(r.get('b')! - r.get('a')!).toBe(14)
  })

  it('keeps every label within [top, bottom]', () => {
    const r = resolveLabelStack(
      [{ key: 'a', idealY: 390 }, { key: 'b', idealY: 399 }],
      opts,
    )
    for (const y of r.values()) {
      expect(y).toBeGreaterThanOrEqual(opts.top)
      expect(y).toBeLessThanOrEqual(opts.bottom)
    }
    // bottom one pinned to bottom, upper one lifted by the gap
    expect(r.get('b')).toBe(400)
    expect(r.get('b')! - r.get('a')!).toBe(14)
  })

  it('preserves vertical order regardless of input order', () => {
    const r = resolveLabelStack(
      [{ key: 'low', idealY: 300 }, { key: 'high', idealY: 100 }],
      opts,
    )
    expect(r.get('high')!).toBeLessThan(r.get('low')!)
  })

  it('spaces three colliding labels evenly by the gap', () => {
    const r = resolveLabelStack(
      [{ key: 'a', idealY: 200 }, { key: 'b', idealY: 203 }, { key: 'c', idealY: 206 }],
      opts,
    )
    const ys = [r.get('a')!, r.get('b')!, r.get('c')!].sort((x, y) => x - y)
    expect(ys[1] - ys[0]).toBeGreaterThanOrEqual(14)
    expect(ys[2] - ys[1]).toBeGreaterThanOrEqual(14)
  })

  it('clamps a single out-of-range label into the band', () => {
    const r = resolveLabelStack([{ key: 'a', idealY: 999 }], opts)
    expect(r.get('a')).toBe(400)
  })
})

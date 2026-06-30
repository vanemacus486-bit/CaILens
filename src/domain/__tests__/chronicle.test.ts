import { describe, it, expect } from 'vitest'
import {
  phasesOverlap,
  generateMonthNodes,
  snapToMonthNode,
  layoutPhasesIntoTracks,
  layoutTasksIntoRows,
  resolveColorHex,
  CATEGORY_HEX,
} from '../chronicle'
import type { ChroniclePhase, ChronicleTask } from '../chronicle'

// ── Helpers ────────────────────────────────────────────────

function phase(overrides: Partial<ChroniclePhase> = {}): ChroniclePhase {
  return {
    id: crypto.randomUUID(),
    title: 'Test Phase',
    startDate: new Date('2025-01-01').getTime(),
    endDate: new Date('2025-03-31').getTime(),
    color: '#BC4A26',
    categoryId: 'accent',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

function task(overrides: Partial<ChronicleTask> = {}): ChronicleTask {
  return {
    id: crypto.randomUUID(),
    title: 'Test Task',
    date: new Date('2025-06-01').getTime(),
    startDate: null,
    endDate: null,
    color: '#BC4A26',
    categoryId: 'accent',
    description: null,
    status: 'todo',
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  }
}

// ── phasesOverlap ─────────────────────────────────────────

describe('phasesOverlap', () => {
  it('returns true for overlapping intervals', () => {
    expect(phasesOverlap(0, 10, 5, 15)).toBe(true)
  })

  it('returns true when one contains the other', () => {
    expect(phasesOverlap(0, 20, 5, 10)).toBe(true)
  })

  it('returns true for touching boundaries', () => {
    expect(phasesOverlap(0, 10, 10, 20)).toBe(true)
  })

  it('returns false for non-overlapping intervals', () => {
    expect(phasesOverlap(0, 5, 10, 15)).toBe(false)
  })

  it('returns false when reversed order non-overlapping', () => {
    expect(phasesOverlap(10, 15, 0, 5)).toBe(false)
  })
})

// ── generateMonthNodes ─────────────────────────────────────

describe('generateMonthNodes', () => {
  it('returns nodes for each month in range', () => {
    const start = new Date('2025-01-15').getTime()
    const end = new Date('2025-03-10').getTime()
    const nodes = generateMonthNodes(start, end)
    expect(nodes).toHaveLength(3) // Jan, Feb, Mar
    expect(new Date(nodes[0].ts).getMonth()).toBe(0)  // Jan
    expect(new Date(nodes[1].ts).getMonth()).toBe(1)  // Feb
    expect(new Date(nodes[2].ts).getMonth()).toBe(2)  // Mar
  })

  it('returns single node for same-month range', () => {
    const start = new Date('2025-06-10').getTime()
    const end = new Date('2025-06-20').getTime()
    const nodes = generateMonthNodes(start, end)
    expect(nodes).toHaveLength(1)
  })

  it('all nodes are at midnight of month start', () => {
    const start = new Date('2025-01-15T12:30:00').getTime()
    const end = new Date('2025-01-20').getTime()
    const nodes = generateMonthNodes(start, end)
    const d = new Date(nodes[0].ts)
    expect(d.getHours()).toBe(0)
    expect(d.getMinutes()).toBe(0)
    expect(d.getDate()).toBe(1)
  })

  it('handles reverse range (end before start)', () => {
    const start = new Date('2025-03-01').getTime()
    const end = new Date('2025-01-01').getTime()
    const nodes = generateMonthNodes(start, end)
    expect(nodes).toHaveLength(0)
  })
})

// ── snapToMonthNode ────────────────────────────────────────

describe('snapToMonthNode', () => {
  it('snaps to nearest node', () => {
    const jan = new Date('2025-01-01').getTime()
    const feb = new Date('2025-02-01').getTime()
    const mar = new Date('2025-03-01').getTime()
    const nodes = [{ ts: jan }, { ts: feb }, { ts: mar }]

    // Date closer to Feb
    const midFeb = new Date('2025-02-10').getTime()
    expect(snapToMonthNode(midFeb, nodes)).toBe(feb)
  })

  it('snaps to earlier node when equidistant', () => {
    const jan = new Date('2025-01-01').getTime()
    const feb = new Date('2025-02-01').getTime()
    const nodes = [{ ts: jan }, { ts: feb }]

    // Midpoint exactly between Jan 1 and Feb 1
    const mid = new Date('2025-01-16T12:00:00').getTime()
    // Jan 1 to mid = 15.5 days, mid to Feb 1 = 15.5 days
    // Our snap goes to the first found with min distance → jan
    expect(snapToMonthNode(mid, nodes)).toBe(jan)
  })

  it('returns the only node when one node', () => {
    const jan = new Date('2025-01-01').getTime()
    expect(snapToMonthNode(new Date('2025-06-15').getTime(), [{ ts: jan }])).toBe(jan)
  })

  it('returns input ts for empty nodes array', () => {
    const ts = new Date('2025-06-15').getTime()
    expect(snapToMonthNode(ts, [])).toBe(ts)
  })
})

// ── layoutPhasesIntoTracks ─────────────────────────────────

describe('layoutPhasesIntoTracks', () => {
  it('single phase gets track 0', () => {
    const phases = [phase()]
    const result = layoutPhasesIntoTracks(phases)
    expect(result).toHaveLength(1)
    expect(result[0].track).toBe(0)
  })

  it('non-overlapping phases all get track 0', () => {
    const p1 = phase({ startDate: new Date('2025-01-01').getTime(), endDate: new Date('2025-01-31').getTime() })
    const p2 = phase({ startDate: new Date('2025-02-01').getTime(), endDate: new Date('2025-02-28').getTime() })
    const result = layoutPhasesIntoTracks([p1, p2])
    expect(result).toHaveLength(2)
    expect(result[0].track).toBe(0)
    expect(result[1].track).toBe(0)
  })

  it('overlapping phases get different tracks', () => {
    const p1 = phase({ startDate: new Date('2025-01-01').getTime(), endDate: new Date('2025-03-31').getTime() })
    const p2 = phase({ startDate: new Date('2025-02-01').getTime(), endDate: new Date('2025-02-28').getTime() })
    const result = layoutPhasesIntoTracks([p1, p2])
    // p1 (Jan-Mar) overlaps p2 (Feb), so p2 goes to track 1
    const p1Layout = result.find((r) => r.phase === p1)!
    const p2Layout = result.find((r) => r.phase === p2)!
    expect(p1Layout.track).toBe(0)  // earlier start
    expect(p2Layout.track).toBe(1)  // overlaps with p1, bumped
  })

  it('three phases with complex overlaps', () => {
    const p1 = phase({ startDate: new Date('2025-01-01').getTime(), endDate: new Date('2025-06-30').getTime() })
    const p2 = phase({ startDate: new Date('2025-03-01').getTime(), endDate: new Date('2025-04-30').getTime() })
    const p3 = phase({ startDate: new Date('2025-05-01').getTime(), endDate: new Date('2025-08-31').getTime() })
    // p1 Jan-Jun
    // p2 Mar-Apr → overlaps p1 → track 1
    // p3 May-Aug → overlaps p1 (track 0) but not p2 (track 1) → track 1
    const result = layoutPhasesIntoTracks([p1, p2, p3])
    const p3Layout = result.find((r) => r.phase === p3)!
    expect(p3Layout.track).toBe(1)
  })
})

// ── layoutTasksIntoRows ────────────────────────────────────

describe('layoutTasksIntoRows', () => {
  it('single task gets row 0', () => {
    const nodes = generateMonthNodes(
      new Date('2025-01-01').getTime(),
      new Date('2025-12-31').getTime(),
    )
    const tasks = [task()]
    const result = layoutTasksIntoRows(tasks, nodes)
    expect(result).toHaveLength(1)
    expect(result[0].row).toBe(0)
  })

  it('tasks at different months both get row 0', () => {
    const nodes = generateMonthNodes(
      new Date('2025-01-01').getTime(),
      new Date('2025-12-31').getTime(),
    )
    const t1 = task({ date: new Date('2025-03-01').getTime() })
    const t2 = task({ date: new Date('2025-07-01').getTime() })
    const result = layoutTasksIntoRows([t1, t2], nodes)
    expect(result).toHaveLength(2)
    expect(result[0].row).toBe(0)
    expect(result[1].row).toBe(0)
  })

  it('tasks at same month get increasing rows', () => {
    const nodes = generateMonthNodes(
      new Date('2025-01-01').getTime(),
      new Date('2025-12-31').getTime(),
    )
    const t1 = task({ date: new Date('2025-06-01').getTime(), title: 'A' })
    const t2 = task({ date: new Date('2025-06-05').getTime(), title: 'B' })
    const t3 = task({ date: new Date('2025-06-10').getTime(), title: 'C' })
    const result = layoutTasksIntoRows([t1, t2, t3], nodes)
    expect(result).toHaveLength(3)
    const rows = result.map((r) => r.row)
    expect(rows).toEqual([0, 1, 2])
  })
})

// ── resolveColorHex ────────────────────────────────────────

describe('resolveColorHex', () => {
  it('returns hex as-is when starts with #', () => {
    expect(resolveColorHex('#FF00FF')).toBe('#FF00FF')
  })

  it('resolves category ID to hex', () => {
    expect(resolveColorHex('accent')).toBe(CATEGORY_HEX.accent)
    expect(resolveColorHex('sage')).toBe(CATEGORY_HEX.sage)
    expect(resolveColorHex('sand')).toBe(CATEGORY_HEX.sand)
    expect(resolveColorHex('sky')).toBe(CATEGORY_HEX.sky)
    expect(resolveColorHex('rose')).toBe(CATEGORY_HEX.rose)
    expect(resolveColorHex('stone')).toBe(CATEGORY_HEX.stone)
  })

  it('falls back to stone for unknown color', () => {
    expect(resolveColorHex('unknown')).toBe(CATEGORY_HEX.stone)
  })
})

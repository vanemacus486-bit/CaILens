import type { CategoryId } from './category'
import { startOfMonth, addMonths, differenceInMonths } from 'date-fns'

// ── Types ──────────────────────────────────────────────────

export interface ChroniclePhase {
  id: string              // crypto.randomUUID()
  title: string
  startDate: number       // UTC ms, start of month
  endDate: number         // UTC ms, end of month (inclusive)
  color: string           // hex string (e.g. "#BC4A26") — resolved from category or custom
  categoryId: CategoryId | null  // optional link to event category for default color
  createdAt: number       // UTC ms
  updatedAt: number       // UTC ms
}

export type ChronicleTaskStatus = 'todo' | 'in_progress' | 'done'

export interface ChronicleTask {
  id: string              // crypto.randomUUID()
  title: string
  date: number            // UTC ms, main anchor date (snapped to month start)
  startDate: number | null // optional for multi-month capsule
  endDate: number | null   // optional for multi-month capsule
  color: string           // hex string
  categoryId: CategoryId | null
  description: string | null
  status: ChronicleTaskStatus
  createdAt: number
  updatedAt: number
}

/** A month-aligned node on the timeline axis */
export interface MonthNode {
  ts: number              // UTC ms, start of month
}

/** A year-aligned node on the timeline axis (year granularity mode) */
export interface YearNode {
  ts: number              // UTC ms, start of year (Jan 1)
  year: number            // e.g. 2024
}

/** Supported timeline granularities */
export type ChronicleGranularity = 'month' | 'year'

/** Layout result for a single phase block */
export interface PhaseTrackLayout {
  phase: ChroniclePhase
  track: number           // 0 = closest to axis, higher = farther
}

/** Layout result for a single task bubble */
export interface TaskRowLayout {
  task: ChronicleTask
  row: number             // 0 = closest to axis, higher = farther above
}

/** Resolved color for rendering: either hex or CSS variable reference */
export interface ResolvedColor {
  hex: string
}

// ── Constants ──────────────────────────────────────────────

/** Default hex colors for the 6 category IDs */
export const CATEGORY_HEX: Record<CategoryId, string> = {
  accent: '#BC4A26',
  sage:   '#66793F',
  sand:   '#A87B23',
  sky:    '#4F6B80',
  rose:   '#9A5468',
  stone:  '#7E776A',
}

// ── Pure functions ─────────────────────────────────────────

/**
 * Check if two time intervals overlap.
 * Intervals are [start, end] inclusive.
 */
export function phasesOverlap(
  aStart: number, aEnd: number,
  bStart: number, bEnd: number,
): boolean {
  return aStart <= bEnd && bStart <= aEnd
}

/**
 * Generate month-start timestamps covering [rangeStart, rangeEnd].
 */
export function generateMonthNodes(rangeStart: number, rangeEnd: number): MonthNode[] {
  const start = startOfMonth(rangeStart).getTime()
  const end = startOfMonth(rangeEnd).getTime()
  const count = differenceInMonths(end, start) + 1
  if (count <= 0) return []
  const nodes: MonthNode[] = []
  for (let i = 0; i < count; i++) {
    nodes.push({ ts: addMonths(start, i).getTime() })
  }
  return nodes
}

/**
 * Generate year-start timestamps covering [rangeStart, rangeEnd].
 */
export function generateYearNodes(rangeStart: number, rangeEnd: number): YearNode[] {
  const startYear = new Date(rangeStart).getFullYear()
  const endYear = new Date(rangeEnd).getFullYear()
  const count = endYear - startYear + 1
  if (count <= 0) return []
  const nodes: YearNode[] = []
  for (let i = 0; i < count; i++) {
    const y = startYear + i
    nodes.push({ ts: new Date(y, 0, 1).getTime(), year: y })
  }
  return nodes
}

/**
 * Snap a timestamp to the nearest year-start node.
 */
export function snapToYearNode(ts: number, nodes: YearNode[]): number {
  if (nodes.length === 0) return ts
  let best = nodes[0].ts
  let bestDist = Math.abs(ts - best)
  for (let i = 1; i < nodes.length; i++) {
    const dist = Math.abs(ts - nodes[i].ts)
    if (dist < bestDist) {
      bestDist = dist
      best = nodes[i].ts
    }
  }
  return best
}

/**
 * Snap a timestamp to the nearest month-start node.
 * If equidistant, snaps to the earlier node.
 */
export function snapToMonthNode(ts: number, nodes: MonthNode[]): number {
  if (nodes.length === 0) return ts
  let best = nodes[0].ts
  let bestDist = Math.abs(ts - best)
  for (let i = 1; i < nodes.length; i++) {
    const dist = Math.abs(ts - nodes[i].ts)
    if (dist < bestDist) {
      bestDist = dist
      best = nodes[i].ts
    }
  }
  return best
}

/**
 * Layout phases into non-overlapping tracks (bottom side of timeline).
 *
 * Greedy algorithm:
 * 1. Sort phases by startDate ascending
 * 2. For each phase, find the first track where it doesn't overlap
 *    with any already-placed phase in that track
 *
 * Returns a flat array of PhaseTrackLayout.
 */
export function layoutPhasesIntoTracks(phases: ChroniclePhase[]): PhaseTrackLayout[] {
  const sorted = [...phases].sort((a, b) => a.startDate - b.startDate)
  const tracks: ChroniclePhase[][] = [] // tracks[i] = phases in track i
  const result: PhaseTrackLayout[] = []

  for (const phase of sorted) {
    let assignedTrack = -1
    for (let t = 0; t < tracks.length; t++) {
      const hasOverlap = tracks[t].some((p) =>
        phasesOverlap(phase.startDate, phase.endDate, p.startDate, p.endDate),
      )
      if (!hasOverlap) {
        assignedTrack = t
        break
      }
    }
    if (assignedTrack === -1) {
      assignedTrack = tracks.length
      tracks.push([])
    }
    tracks[assignedTrack].push(phase)
    result.push({ phase, track: assignedTrack })
  }

  return result
}

/**
 * Layout tasks into rows above timeline to prevent bubble overlap.
 *
 * Groups tasks by their anchor month node.
 * Within each group, assigns rows so bubbles stack vertically.
 * Tasks with the same month get increasing row numbers.
 * Multi-month tasks (with startDate/endDate) are treated as
 * anchored at their `date` field for row assignment.
 */
export function layoutTasksIntoRows(
  tasks: ChronicleTask[],
  nodes: MonthNode[],
): TaskRowLayout[] {
  // Group tasks by nearest month node
  const groups = new Map<number, ChronicleTask[]>()
  for (const task of tasks) {
    const nodeTs = snapToMonthNode(task.date, nodes)
    let group = groups.get(nodeTs)
    if (!group) {
      group = []
      groups.set(nodeTs, group)
    }
    group.push(task)
  }

  const result: TaskRowLayout[] = []
  for (const [, group] of groups) {
    // Sort by startDate so multi-month tasks come first
    group.sort((a, b) => (a.startDate ?? a.date) - (b.startDate ?? b.date))
    group.forEach((task, i) => {
      result.push({ task, row: i })
    })
  }

  return result
}

/**
 * Layout tasks into rows above timeline for year granularity.
 *
 * Groups tasks by their nearest year node instead of month.
 * Otherwise identical to layoutTasksIntoRows.
 */
export function layoutTasksIntoYearRows(
  tasks: ChronicleTask[],
  nodes: YearNode[],
): TaskRowLayout[] {
  const groups = new Map<number, ChronicleTask[]>()
  for (const task of tasks) {
    const nodeTs = snapToYearNode(task.date, nodes)
    let group = groups.get(nodeTs)
    if (!group) {
      group = []
      groups.set(nodeTs, group)
    }
    group.push(task)
  }

  const result: TaskRowLayout[] = []
  for (const [, group] of groups) {
    group.sort((a, b) => (a.startDate ?? a.date) - (b.startDate ?? b.date))
    group.forEach((task, i) => {
      result.push({ task, row: i })
    })
  }

  return result
}

/**
 * Resolve a phase or task color to a hex string.
 * If the color is already a hex string (starts with #), return as-is.
 * If it's a CategoryId, look up the default hex.
 * Otherwise fall back to stone color.
 */
export function resolveColorHex(color: string): string {
  if (color.startsWith('#')) return color
  if (color in CATEGORY_HEX) return CATEGORY_HEX[color as CategoryId]
  return CATEGORY_HEX.stone
}

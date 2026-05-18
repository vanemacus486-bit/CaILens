import { getDayStart } from './time'
import type { CalendarEvent } from './event'

export interface GapDistribution {
  byHour: number[]   // 24 entries, 0-1: fraction of days with zero coverage at this hour
  avgGap: number     // average across all 24 hours
  totalDays: number  // days analyzed
}

/**
 * For each hour of day (0-23), compute what fraction of days in the
 * lookback window had zero recorded time at that hour.
 */
export function computeGapDistribution(
  events: readonly CalendarEvent[],
  windowDays = 90,
): GapDistribution {
  const now = Date.now()
  const periodStart = now - windowDays * 86_400_000
  const dayZero = getDayStart(new Date(periodStart))
  const totalDays = Math.floor((now - dayZero) / 86_400_000) + 1

  // Sparse coverage tracking: key = dayIndex * 24 + hour
  const covered = new Set<number>()

  for (const e of events) {
    if (e.endTime <= periodStart || e.startTime >= now) continue

    const firstDay = Math.max(0, Math.floor((e.startTime - dayZero) / 86_400_000))
    const lastDay = Math.min(totalDays - 1, Math.floor((e.endTime - dayZero) / 86_400_000))

    for (let d = firstDay; d <= lastDay; d++) {
      const dateStart = dayZero + d * 86_400_000
      const dateEnd = dateStart + 86_400_000
      const clipStart = Math.max(e.startTime, dateStart)
      const clipEnd = Math.min(e.endTime, dateEnd)

      const firstHour = Math.max(0, Math.floor((clipStart - dateStart) / 3_600_000))
      const lastHour = Math.min(23, Math.floor((clipEnd - dateStart) / 3_600_000))

      for (let h = firstHour; h <= lastHour; h++) {
        covered.add(d * 24 + h)
      }
    }
  }

  const gapCounts = new Array<number>(24).fill(0)
  for (let d = 0; d < totalDays; d++) {
    for (let h = 0; h < 24; h++) {
      if (!covered.has(d * 24 + h)) gapCounts[h]++
    }
  }

  const byHour = gapCounts.map((c) => c / totalDays)
  const avgGap = byHour.reduce((a, b) => a + b, 0) / 24

  return { byHour, avgGap, totalDays }
}

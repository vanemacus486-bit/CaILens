import { useMemo, useState, useRef, useCallback } from 'react'
import { startOfDay, addDays, differenceInDays } from 'date-fns'
import { cn } from '@/lib/utils'
import type { CalendarEvent } from '@/domain/event'
import type { Bucket } from '@/hooks/useStatsAggregation'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_MS = 24 * 3600_000

interface CellData {
  date: Date
  intensity: number // 0–1, accent hours / 24
  hours: number
  inRange: boolean
}

function computeIntensityGrid(
  events: readonly CalendarEvent[],
  bucket: Bucket,
): CellData[][] {
  const periodStart = bucket.start
  const periodEnd = bucket.end
  const totalDays = differenceInDays(periodEnd, periodStart)

  // Group events by day for accent category
  const dayMap = new Map<number, number>() // dayTimestamp -> accentMs
  for (const event of events) {
    if (event.categoryId !== 'accent') continue
    const start = Math.max(event.startTime, periodStart.getTime())
    const end = Math.min(event.endTime, periodEnd.getTime())
    if (end <= start) continue

    // Walk through each day this event touches
    let cursor = startOfDay(new Date(start)).getTime()
    while (cursor < end) {
      const dayEnd = cursor + DAY_MS
      const overlap = Math.min(end, dayEnd) - Math.max(start, cursor)
      if (overlap > 0) {
        dayMap.set(cursor, (dayMap.get(cursor) ?? 0) + overlap)
      }
      cursor += DAY_MS
    }
  }

  // Build the 7×N grid
  // N = number of weeks that overlap with the period
  const firstDay = startOfDay(periodStart)
  const firstDow = (firstDay.getDay() + 6) % 7 // Mon=0
  const numWeeks = Math.ceil((firstDow + totalDays) / 7)

  const grid: CellData[][] = Array.from({ length: 7 }, () => [])

  for (let week = 0; week < numWeeks; week++) {
    for (let dow = 0; dow < 7; dow++) {
      const dayIndex = week * 7 + dow - firstDow
      const dayDate = addDays(firstDay, dayIndex)
      const dayTs = dayDate.getTime()
      const inRange = dayTs >= periodStart.getTime() && dayTs < periodEnd.getTime()
      const accentMs = inRange ? (dayMap.get(dayTs) ?? 0) : 0
      const hours = accentMs / 3600_000
      const intensity = Math.min(hours / 24, 1)

      grid[dow].push({
        date: dayDate,
        intensity,
        hours,
        inRange,
      })
    }
  }

  return grid
}

function computeOpacityLevels(grid: CellData[][]): number[] {
  const values = grid
    .flat()
    .filter((c) => c.inRange && c.intensity > 0)
    .map((c) => c.intensity)
    .sort((a, b) => a - b)

  if (values.length === 0) return [0.08, 0.18, 0.32, 0.52, 0.78]

  const len = values.length
  const p20 = values[Math.floor(len * 0.2)]
  const p40 = values[Math.floor(len * 0.4)]
  const p60 = values[Math.floor(len * 0.6)]
  const p80 = values[Math.floor(len * 0.8)]
  return [p20, p40, p60, p80]
}

function getOpacity(intensity: number, levels: number[]): number {
  if (intensity <= 0) return 0
  if (intensity <= levels[0]) return 0.10
  if (intensity <= levels[1]) return 0.22
  if (intensity <= levels[2]) return 0.38
  if (intensity <= levels[3]) return 0.58
  return 0.82
}

interface DayIntensityHeatmapProps {
  current: Bucket
  rangeEvents: readonly CalendarEvent[]
  language: 'zh' | 'en'
}

export function DayIntensityHeatmap({
  current,
  rangeEvents,
  language,
}: DayIntensityHeatmapProps) {
  const [tooltip, setTooltip] = useState<{
    x: number
    y: number
    cell: CellData
  } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const grid = useMemo(
    () => computeIntensityGrid(rangeEvents, current),
    [rangeEvents, current],
  )

  const opacityLevels = useMemo(() => computeOpacityLevels(grid), [grid])

  const dayLabels = language === 'zh' ? DAY_LABELS_ZH : DAY_LABELS

  const handlePointerEnter = useCallback(
    (cell: CellData, event: React.PointerEvent) => {
      if (!cell.inRange) return
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return
      setTooltip({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        cell,
      })
    },
    [],
  )

  const handlePointerLeave = useCallback(() => setTooltip(null), [])

  const numWeeks = grid[0]?.length ?? 0
  if (numWeeks === 0) {
    return (
      <div className="flex items-center justify-center min-h-[200px] text-text-tertiary text-sm font-sans">
        {language === 'zh' ? '暂无数据' : 'No data yet'}
      </div>
    )
  }

  const formatPct = (v: number) => (v * 100).toFixed(1)

  return (
    <div ref={containerRef} className="relative">
      <div
        className="grid"
        style={{
          gridTemplateColumns: `40px repeat(${numWeeks}, 1fr)`,
          gap: '2px',
        }}
      >
        {/* Header row — week labels */}
        <div /> {/* empty corner */}
        {Array.from({ length: numWeeks }, (_, w) => (
          <div
            key={w}
            className="text-[9px] font-sans text-text-tertiary text-center leading-none py-0.5"
          >
            {w + 1}
          </div>
        ))}

        {/* Data rows */}
        {grid.map((row, dow) => (
          <>
            <div
              key={`label-${dow}`}
              className="text-[10px] font-sans text-text-tertiary leading-none flex items-center justify-end pr-1.5"
            >
              {dayLabels[dow]}
            </div>
            {row.map((cell, col) => (
              <div
                key={`${dow}-${col}`}
                className={cn(
                  'aspect-square rounded-[2px] transition-opacity duration-150',
                  cell.inRange && cell.intensity > 0 && 'cursor-default',
                )}
                style={{
                  backgroundColor: cell.inRange && cell.intensity > 0
                    ? `var(--event-accent-fill)`
                    : 'var(--surface-sunken)',
                  opacity: cell.inRange && cell.intensity > 0
                    ? getOpacity(cell.intensity, opacityLevels)
                    : cell.inRange
                      ? 0.35
                      : 0.12,
                }}
                onPointerEnter={(e) => handlePointerEnter(cell, e)}
                onPointerLeave={handlePointerLeave}
              />
            ))}
          </>
        ))}
      </div>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="absolute z-50 pointer-events-none bg-surface-raised border border-border-default shadow-tooltip px-2.5 py-1.5 rounded text-xs font-sans"
          style={{
            left: tooltip.x + 12,
            top: tooltip.y - 40,
          }}
        >
          <div className="text-text-primary font-medium">
            {dayLabels[grid.findIndex((r) => r.includes(tooltip.cell))]}{' '}
            {tooltip.cell.date.toLocaleDateString(language === 'zh' ? 'zh-CN' : 'en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </div>
          <div className="text-text-secondary font-mono text-[11px]">
            {tooltip.cell.hours.toFixed(1)}h ({formatPct(tooltip.cell.intensity)}%)
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-2 mt-3 justify-end">
        <span className="text-[10px] text-text-tertiary font-sans">
          {language === 'zh' ? '低' : 'Low'}
        </span>
        <div className="flex gap-0.5">
          {[0.10, 0.22, 0.38, 0.58, 0.82].map((op) => (
            <div
              key={op}
              className="w-3 h-3 rounded-[2px]"
              style={{
                backgroundColor: 'var(--event-accent-fill)',
                opacity: op,
              }}
            />
          ))}
        </div>
        <span className="text-[10px] text-text-tertiary font-sans">
          {language === 'zh' ? '高' : 'High'}
        </span>
      </div>
    </div>
  )
}

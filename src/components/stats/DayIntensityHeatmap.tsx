import { useMemo, useState, useRef, useCallback } from 'react'
import { startOfDay, addDays, differenceInDays } from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import type { Bucket } from '@/hooks/useStatsAggregation'

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const DAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_MS = 24 * 3600_000
const OPACITY_LEVELS = [0.10, 0.22, 0.38, 0.58, 0.82] as const

interface CellData {
  date: Date
  intensity: number
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

  const dayMap = new Map<number, number>()
  for (const event of events) {
    if (event.categoryId !== 'accent') continue
    const start = Math.max(event.startTime, periodStart.getTime())
    const end = Math.min(event.endTime, periodEnd.getTime())
    if (end <= start) continue

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

  const firstDay = startOfDay(periodStart)
  const firstDow = (firstDay.getDay() + 6) % 7
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

      grid[dow].push({ date: dayDate, intensity, hours, inRange })
    }
  }

  return grid
}

function computeThresholds(grid: CellData[][]): [number, number, number, number] {
  const values = grid
    .flat()
    .filter((c) => c.inRange && c.intensity > 0)
    .map((c) => c.intensity)
    .sort((a, b) => a - b)

  if (values.length === 0) return [0.05, 0.10, 0.20, 0.35]
  const n = values.length
  const idx = (pct: number) => Math.min(Math.floor(pct * (n - 1)), n - 1)
  return [values[idx(0.2)], values[idx(0.4)], values[idx(0.6)], values[idx(0.8)]]
}

function getHeatLevel(v: number, t: [number, number, number, number]): number {
  if (v <= 0) return 0
  if (v <= t[0]) return 1
  if (v <= t[1]) return 2
  if (v <= t[2]) return 3
  if (v <= t[3]) return 4
  return 5
}

function weekLabelInterval(numWeeks: number): number {
  if (numWeeks <= 6) return 1
  if (numWeeks <= 14) return 2
  if (numWeeks <= 30) return 4
  return 6
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

  const thresholds = useMemo(() => computeThresholds(grid), [grid])

  const dayLabels = language === 'zh' ? DAY_LABELS_ZH : DAY_LABELS
  const numWeeks = grid[0]?.length ?? 0

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

  if (numWeeks === 0) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm font-sans">
        {language === 'zh' ? '暂无数据' : 'No data yet'}
      </div>
    )
  }

  const formatPct = (v: number) => (v * 100).toFixed(1)
  const wlInterval = weekLabelInterval(numWeeks)

  const gridItems: React.ReactNode[] = []

  // Week number labels (top row)
  for (let w = 0; w < numWeeks; w++) {
    if (w % wlInterval === 0) {
      gridItems.push(
        <div
          key={`wl-${w}`}
          className="font-mono text-text-tertiary text-center select-none"
          style={{
            gridColumn: w + 2,
            gridRow: 1,
            fontSize: 10,
            lineHeight: '14px',
          }}
        >
          {w + 1}
        </div>,
      )
    }
  }

  // Day labels + data cells
  for (let dow = 0; dow < 7; dow++) {
    const row = grid[dow]

    gridItems.push(
      <div
        key={`dl-${dow}`}
        className="font-sans text-text-secondary text-right select-none"
        style={{
          gridColumn: 1,
          gridRow: dow + 2,
          fontSize: 10,
          paddingRight: '4px',
          lineHeight: 1,
        }}
      >
        {dayLabels[dow]}
      </div>,
    )

    for (let col = 0; col < numWeeks; col++) {
      const cell = row[col]
      const level = getHeatLevel(cell.intensity, thresholds)
      const hasData = cell.inRange && cell.intensity > 0

      gridItems.push(
        <div
          key={`c-${dow}-${col}`}
          className="rounded-[2px] transition-opacity duration-150"
          style={{
            gridColumn: col + 2,
            gridRow: dow + 2,
            backgroundColor: hasData
              ? 'var(--event-accent-fill)'
              : cell.inRange
                ? 'var(--surface-sunken)'
                : 'transparent',
            opacity: hasData
              ? OPACITY_LEVELS[level - 1]
              : cell.inRange
                ? 0.30
                : 0.08,
          }}
          onPointerEnter={(e) => handlePointerEnter(cell, e)}
          onPointerLeave={handlePointerLeave}
        />,
      )
    }
  }

  return (
    <div ref={containerRef} className="h-full flex flex-col">
      <div
        className="flex-1 min-h-0 w-full overflow-x-auto"
        style={{
          display: 'grid',
          gridTemplateColumns: `40px repeat(${numWeeks}, 1fr)`,
          gridTemplateRows: `auto repeat(7, 1fr)`,
          gap: '2px',
        }}
      >
        {gridItems}
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
      <div className="flex items-center gap-1.5 mt-2 text-[10px] font-sans text-text-tertiary select-none flex-shrink-0 justify-end">
        <span>{language === 'zh' ? '低' : 'Low'}</span>
        {OPACITY_LEVELS.map((opacity, i) => (
          <div
            key={`leg-${i}`}
            className="w-3 h-3 rounded-[2px] flex-shrink-0"
            style={{ backgroundColor: 'var(--event-accent-fill)', opacity }}
          />
        ))}
        <span>{language === 'zh' ? '高' : 'High'}</span>
        <span className="ml-2 text-text-tertiary/60">
          {language === 'zh'
            ? '主要矛盾时间 ÷ 24h'
            : 'Core Focus time ÷ 24h'}
        </span>
      </div>
    </div>
  )
}

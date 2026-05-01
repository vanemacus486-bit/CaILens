import { useRef, useState, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { Bucket } from '@/hooks/useStatsAggregation'
import { useCategoryColors } from '@/constants/categoryColors'
import { useAppSettingsStore } from '@/stores/settingsStore'

const DAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOUR_LABEL_COLS = [0, 3, 6, 9, 12, 15, 18, 21]
const OPACITY_LEVELS = [0.12, 0.30, 0.50, 0.72, 1.0] as const
const BLANK_OPACITY_LEVELS = [0.10, 0.22, 0.40, 0.60, 0.85] as const

type HeatmapMode = 'density' | 'blank'

interface HourHeatmapProps {
  bucket: Bucket
}

function computeThresholds(values: number[]): [number, number, number, number] {
  const nonZero = values.filter((v) => v > 0)
  if (nonZero.length === 0) return [0, 0, 0, 0]
  const sorted = [...nonZero].sort((a, b) => a - b)
  const n = sorted.length
  const idx = (pct: number) => Math.min(Math.floor(pct * (n - 1)), n - 1)
  return [
    sorted[idx(0.2)],
    sorted[idx(0.4)],
    sorted[idx(0.6)],
    sorted[idx(0.8)],
  ]
}

function getHeatLevel(v: number, t: [number, number, number, number]): number {
  if (v <= 0) return 0
  if (v <= t[0]) return 1
  if (v <= t[1]) return 2
  if (v <= t[2]) return 3
  if (v <= t[3]) return 4
  return 5
}

function formatHours(hours: number): string {
  return hours.toFixed(1) + 'h'
}

export function HourHeatmap({ bucket }: HourHeatmapProps) {
  const [mode, setMode] = useState<HeatmapMode>('density')
  const containerRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState<number>(Infinity)
  const colors = useCategoryColors()
  const fillColor = colors.accent.fill
  const language = useAppSettingsStore((s) => s.settings.language)

  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const dayLabels = language === 'zh' ? DAY_LABELS_ZH : DAY_LABELS_EN

  const thresholds = useMemo(() => {
    const allValues: number[] = []
    for (let d = 0; d < 7; d++) {
      const row = bucket.byHourSlot[d]
      if (!row) continue
      for (let h = 0; h < 24; h++) {
        allValues.push(row[h] ?? 0)
      }
    }
    return computeThresholds(allValues)
  }, [bucket.byHourSlot])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const cellSize = containerWidth < 700 ? 16 : 22
  const labelFontSize = containerWidth < 700 ? 9 : 10
  const blank = mode === 'blank'

  const gridItems: React.ReactNode[] = []

  // Hour labels (top row)
  for (const hour of HOUR_LABEL_COLS) {
    gridItems.push(
      <div
        key={`hl-${hour}`}
        className="font-mono text-text-tertiary text-center"
        style={{
          gridColumn: `${hour + 2} / span 1`,
          gridRow: 1,
          fontSize: labelFontSize,
          lineHeight: `${labelFontSize + 4}px`,
        }}
      >
        {hour}
      </div>,
    )
  }

  // Day labels + data cells
  for (let d = 0; d < 7; d++) {
    const daySlots = bucket.byHourSlot[d] ?? []

    gridItems.push(
      <div
        key={`dl-${d}`}
        className="font-sans text-text-secondary text-right"
        style={{
          gridColumn: 1,
          gridRow: d + 2,
          fontSize: labelFontSize,
          paddingRight: '4px',
          lineHeight: `${cellSize}px`,
        }}
      >
        {dayLabels[d]}
      </div>,
    )

    for (let h = 0; h < 24; h++) {
      const value = daySlots[h] ?? 0
      const level = getHeatLevel(value, thresholds)
      const hasData = level > 0

      // In blank mode: invert — show empty cells with color, filled cells transparent
      const showCell = blank ? !hasData : hasData

      const title = blank
        ? `${dayLabels[d]} ${h}:00 — ${hasData ? formatHours(value) : t('无记录', 'No data')}`
        : `${dayLabels[d]} ${h}:00 — ${formatHours(value)}`

      gridItems.push(
        <div
          key={`c-${d}-${h}`}
          title={title}
          className={cn(
            'rounded-sm',
            !showCell ? 'border border-dashed border-border-subtle' : '',
          )}
          style={{
            gridColumn: h + 2,
            gridRow: d + 2,
            width: cellSize,
            height: cellSize,
            backgroundColor: showCell
              ? (blank ? 'var(--event-stone-fill)' : fillColor)
              : 'transparent',
            opacity: showCell
              ? (blank ? BLANK_OPACITY_LEVELS[Math.min(level, 4)] : OPACITY_LEVELS[level - 1])
              : undefined,
          }}
        />,
      )
    }
  }

  // Legend row
  gridItems.push(
    <div
      key="legend"
      className="flex items-center gap-1.5 mt-2 text-xs font-sans text-text-tertiary"
      style={{
        gridColumn: '1 / -1',
        gridRow: 9,
      }}
    >
      <span>{t('少', 'Less')}</span>
      {(blank ? BLANK_OPACITY_LEVELS : OPACITY_LEVELS).map((opacity, i) => (
        <div
          key={`leg-${i}`}
          className="w-3.5 h-3.5 rounded-sm"
          style={{ backgroundColor: blank ? 'var(--event-stone-fill)' : fillColor, opacity }}
        />
      ))}
      <span className="mr-3">{t('多', 'More')}</span>
      <span>{blank ? t('空白 = 未记录', 'Filled = no data') : t('空白 = 无记录', 'Empty = no data')}</span>
    </div>,
  )

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-base p-4">
      {/* Mode toggle */}
      <div className="flex gap-0.5 bg-surface-sunken rounded p-0.5 w-fit mb-3">
        {(['density', 'blank'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'px-2.5 py-1 rounded-sm text-[11px] font-sans font-medium transition-all duration-150 cursor-pointer',
              mode === m
                ? 'bg-surface-base text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                : 'text-text-tertiary hover:text-text-primary',
            )}
          >
            {m === 'density' ? t('记录密度', 'Density') : t('空白分布', 'Blanks')}
          </button>
        ))}
      </div>

      <div ref={containerRef}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: `32px repeat(24, ${cellSize}px)`,
            gridTemplateRows: `${labelFontSize + 4}px repeat(7, ${cellSize}px) auto`,
            gap: '2px',
            alignItems: 'center',
          }}
        >
          {gridItems}
        </div>
      </div>
    </div>
  )
}

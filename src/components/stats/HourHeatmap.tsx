import { useRef, useState, useEffect, useMemo } from 'react'
import type { Bucket } from '@/hooks/useStatsAggregation'
import { useCategoryColors } from '@/constants/categoryColors'
import { useAppSettingsStore } from '@/stores/settingsStore'

const DAY_LABELS_ZH = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const DAY_LABELS_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const HOUR_LABEL_COLS = [0, 3, 6, 9, 12, 15, 18, 21]
const OPACITY_LEVELS = [0.12, 0.30, 0.50, 0.72, 1.0] as const

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

  const gridItems: React.ReactNode[] = []

  // Hour labels (top row)
  for (const hour of HOUR_LABEL_COLS) {
    gridItems.push(
      <div
        key={`hl-${hour}`}
        style={{
          gridColumn: `${hour + 2} / span 1`,
          gridRow: 1,
          fontSize: labelFontSize,
          fontFamily: 'var(--font-mono, JetBrains Mono, monospace)',
          color: 'var(--text-tertiary)',
          textAlign: 'center',
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

    // Day label (left column)
    gridItems.push(
      <div
        key={`dl-${d}`}
        style={{
          gridColumn: 1,
          gridRow: d + 2,
          fontSize: labelFontSize,
          fontFamily: 'var(--font-sans, Inter, sans-serif)',
          color: 'var(--text-secondary)',
          textAlign: 'right',
          paddingRight: '4px',
          lineHeight: `${cellSize}px`,
        }}
      >
        {dayLabels[d]}
      </div>,
    )

    // 24 hour cells
    for (let h = 0; h < 24; h++) {
      const value = daySlots[h] ?? 0
      const level = getHeatLevel(value, thresholds)
      const hasData = level > 0
      const title = `${dayLabels[d]} ${h}:00 — ${formatHours(value)}`

      gridItems.push(
        <div
          key={`c-${d}-${h}`}
          title={title}
          style={{
            gridColumn: h + 2,
            gridRow: d + 2,
            width: cellSize,
            height: cellSize,
            boxSizing: 'border-box',
            backgroundColor: hasData ? fillColor : 'transparent',
            opacity: hasData ? OPACITY_LEVELS[level - 1] : undefined,
            border: hasData
              ? 'none'
              : '1px dashed var(--border-subtle)',
            borderRadius: '2px',
          }}
        />,
      )
    }
  }

  // Legend row
  gridItems.push(
    <div
      key="legend"
      style={{
        gridColumn: '1 / -1',
        gridRow: 9,
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        marginTop: '8px',
        fontSize: '12px',
        fontFamily: 'var(--font-sans, Inter, sans-serif)',
        color: 'var(--text-tertiary)',
      }}
    >
      <span>{t('少', 'Less')}</span>
      {OPACITY_LEVELS.map((opacity, i) => (
        <div
          key={`leg-${i}`}
          style={{
            width: 14,
            height: 14,
            borderRadius: '2px',
            backgroundColor: fillColor,
            opacity,
          }}
        />
      ))}
      <span style={{ marginRight: '12px' }}>{t('多', 'More')}</span>
      <span>{t('空白 = 无记录', 'Empty = no data')}</span>
    </div>,
  )

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-base p-4">
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

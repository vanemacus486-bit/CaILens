import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import type { Bucket } from '@/hooks/useStatsAggregation'
import { useCategoryColors } from '@/constants/categoryColors'
import type { CategoryId } from '@/domain/category'

const CAT_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

const LINE_DASH: Record<CategoryId, string> = {
  accent: '',
  sage: '6 3',
  sand: '',
  sky: '3 3',
  rose: '',
  stone: '8 3',
}

const CAT_LABELS: Record<CategoryId, string> = {
  accent: 'Core Work',
  sage: 'Support Work',
  sand: 'Essentials',
  sky: 'Reading & Study',
  rose: 'Rest',
  stone: 'Other',
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

const PAD_L = 44
const PAD_R = 12
const PAD_T = 16
const PAD_B = 32
const SVG_H = 280
const PLOT_H = SVG_H - PAD_T - PAD_B

function ceilNice(v: number): number {
  if (v <= 0) return 10
  const m = 10 ** Math.floor(Math.log10(v))
  const r = v / m
  if (r <= 1) return m
  if (r <= 2) return 2 * m
  if (r <= 5) return 5 * m
  return 10 * m
}

function yPx(v: number, maxV: number): number {
  return PAD_T + PLOT_H - (v / maxV) * PLOT_H
}

function PointShape({ catId, fill }: { catId: CategoryId; fill: string }) {
  switch (catId) {
    case 'accent':
      return <circle r="3" fill={fill} />
    case 'sage':
      return <polygon points="0,-4 4,3 -4,3" fill={fill} />
    case 'sand':
      return <rect x="-3" y="-3" width="6" height="6" fill={fill} />
    case 'sky':
      return <polygon points="0,-4 4,0 0,4 -4,0" fill={fill} />
    case 'rose':
      return (
        <path
          d="M-1,-4 L1,-4 L1,-1 L4,-1 L4,1 L1,1 L1,4 L-1,4 L-1,1 L-4,1 L-4,-1 L-1,-1 Z"
          fill={fill}
        />
      )
    case 'stone':
      return (
        <g>
          <line x1="-4" y1="0" x2="4" y2="0" stroke={fill} strokeWidth="1.5" />
          <line x1="0" y1="-4" x2="0" y2="4" stroke={fill} strokeWidth="1.5" />
        </g>
      )
  }
}

function LegendItem({ catId, fill }: { catId: CategoryId; fill: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
        <rect x="1" y="1" width="12" height="12" rx="2" fill={fill} opacity="0.8" />
      </svg>
      <span>{CAT_LABELS[catId]}</span>
    </div>
  )
}

interface TrendChart12MProps {
  history: Bucket[]
}

export function TrendChart12M({ history }: TrendChart12MProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [width, setWidth] = useState(400)
  const colors = useCategoryColors()
  const [activeMonth, setActiveMonth] = useState<number | null>(null)
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const w = entry.contentBoxSize[0]?.inlineSize ?? entry.contentRect.width
        setWidth(w)
      }
    })
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])

  const cw = Math.max(0, width - PAD_L - PAD_R)

  const rawMax = useMemo(() => {
    let m = 0
    for (const b of history) {
      for (const c of CAT_IDS) {
        if (b.byCategory[c] > m) m = b.byCategory[c]
      }
    }
    return m
  }, [history])

  const niceMax = useMemo(() => ceilNice(rawMax), [rawMax])

  const yTicks = useMemo(() => {
    const step = niceMax / 4
    const arr: { v: number; label: string }[] = []
    for (let i = 0; i <= 4; i++) {
      const val = Math.round(step * i * 10) / 10
      arr.push({ v: val, label: `${val}h` })
    }
    return arr
  }, [niceMax])

  const noData = useMemo(() => history.map((b) => b.total === 0), [history])

  const xCenter = useCallback((i: number) => PAD_L + (i + 0.5) * (cw / 12), [cw])

  const lineSegments = useMemo(() => {
    const res: Record<CategoryId, { pts: string }[]> = {
      accent: [], sage: [], sand: [], sky: [], rose: [], stone: [],
    }
    for (const cat of CAT_IDS) {
      const segs: { pts: string }[] = []
      let buf: string[] = []
      for (let i = 0; i < history.length; i++) {
        if (!noData[i]) {
          const x = xCenter(i)
          const y = yPx(history[i].byCategory[cat], niceMax)
          buf.push(`${x.toFixed(1)},${y.toFixed(1)}`)
        } else if (buf.length > 0) {
          segs.push({ pts: buf.join(' ') })
          buf = []
        }
      }
      if (buf.length > 0) segs.push({ pts: buf.join(' ') })
      res[cat] = segs
    }
    return res
  }, [history, noData, xCenter, niceMax])

  const dataPoints = useMemo(() => {
    const res: Record<CategoryId, { x: number; y: number }[]> = {
      accent: [], sage: [], sand: [], sky: [], rose: [], stone: [],
    }
    for (const cat of CAT_IDS) {
      for (let i = 0; i < history.length; i++) {
        if (!noData[i]) {
          res[cat].push({
            x: xCenter(i),
            y: yPx(history[i].byCategory[cat], niceMax),
          })
        }
      }
    }
    return res
  }, [history, noData, xCenter, niceMax])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const rect = svgRef.current?.getBoundingClientRect()
      if (!rect) return
      const rx = e.clientX - rect.left
      let nearest = 0
      let nearDist = Infinity
      for (let i = 0; i < history.length; i++) {
        const d = Math.abs(rx - xCenter(i))
        if (d < nearDist) {
          nearDist = d
          nearest = i
        }
      }
      setActiveMonth(nearest)
      setMousePos({ x: e.clientX, y: e.clientY })
    },
    [history.length, xCenter],
  )

  const handleMouseLeave = useCallback(() => {
    setActiveMonth(null)
    setMousePos(null)
  }, [])

  if (history.length === 0) {
    return (
      <div
        ref={containerRef}
        style={{
          position: 'relative',
          width: '100%',
          height: SVG_H,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-tertiary)',
          fontSize: 14,
        }}
      >
        No data
      </div>
    )
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', width: '100%', height: SVG_H }}>
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          marginBottom: 8,
          fontSize: 12,
          color: 'var(--text-secondary)',
        }}
      >
        {CAT_IDS.map((cat) => (
          <LegendItem key={cat} catId={cat} fill={colors[cat]?.fill ?? ''} />
        ))}
      </div>

      <svg
        ref={svgRef}
        width="100%"
        height={SVG_H}
        role="img"
        aria-label="12 month category trend"
        style={{ display: 'block' }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <title>12 month trend chart</title>

        {yTicks.map((tick, i) => {
          const y = yPx(tick.v, niceMax)
          return (
            <g key={i}>
              <line
                x1={PAD_L}
                y1={y}
                x2={PAD_L + cw}
                y2={y}
                stroke="var(--border-subtle)"
                strokeDasharray="3 3"
              />
              <text
                x={PAD_L - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                fill="var(--text-tertiary)"
                fontSize="11"
                fontFamily="var(--font-mono, monospace)"
              >
                {tick.label}
              </text>
            </g>
          )
        })}

        {history.map((b, i) => (
          <text
            key={i}
            x={xCenter(i)}
            y={SVG_H - PAD_B + 16}
            textAnchor="middle"
            fill="var(--text-tertiary)"
            fontSize="11"
          >
            {MONTH_NAMES[b.start.getMonth()]}
          </text>
        ))}

        {CAT_IDS.map((cat) =>
          lineSegments[cat].map((seg, si) => (
            <polyline
              key={`${cat}-${si}`}
              points={seg.pts}
              fill="none"
              stroke={colors[cat]?.fill ?? ''}
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              strokeDasharray={LINE_DASH[cat] || undefined}
            />
          )),
        )}

        {CAT_IDS.map((cat) =>
          dataPoints[cat].map((pt, pi) => (
            <g
              key={`${cat}-${pi}`}
              transform={`translate(${pt.x.toFixed(1)},${pt.y.toFixed(1)})`}
            >
              <PointShape catId={cat} fill={colors[cat]?.fill ?? ''} />
            </g>
          )),
        )}

        {activeMonth !== null && (
          <line
            x1={xCenter(activeMonth)}
            y1={PAD_T}
            x2={xCenter(activeMonth)}
            y2={PAD_T + PLOT_H}
            stroke="var(--text-tertiary)"
            strokeDasharray="2 4"
            opacity="0.5"
          />
        )}
      </svg>

      {activeMonth !== null && mousePos !== null && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 15,
            top: mousePos.y + 15,
            background: 'var(--surface-raised)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 8,
            padding: '8px 12px',
            fontSize: 12,
            color: 'var(--text-primary)',
            zIndex: 1000,
            pointerEvents: 'none',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>
            {MONTH_NAMES[history[activeMonth].start.getMonth()]}
          </div>
          {CAT_IDS.map((cat) => {
            const h = history[activeMonth].byCategory[cat]
            return (
              <div
                key={cat}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  lineHeight: '1.6',
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 2,
                    background: colors[cat]?.fill ?? '',
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--text-secondary)' }}>{CAT_LABELS[cat]}</span>
                <span style={{ marginLeft: 'auto' }}>{h.toFixed(1)}h</span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

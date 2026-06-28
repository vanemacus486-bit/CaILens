/**
 * # StatsHeader — 复盘页图表统一标题区
 *
 * 渲染「小标题 + 可选分类色点横排(右上)」第 1 行，
 * 以及「‹ 无字滑块 ›」第 2 行。
 * - 无 segments 时只渲染标题（outfit / mood）
 * - 无 onNavigate 时不渲染箭头
 *
 * 滑块实现：固定宽轨 + 圆形滑块 + 等分不可见命中区。
 */

import { useLayoutEffect, useRef, useState } from 'react'

export interface SegmentedOption {
  id: string
  label: string
}

interface StatsHeaderProps {
  title: string
  segments?: SegmentedOption[]
  value?: string
  onChange?: (id: string) => void
  onNavigate?: (dir: -1 | 1) => void
  /** 右上角分类色点横排（由 StatsPage 注入） */
  rail?: React.ReactNode
}

function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

// ── 无字滑块 ────────────────────────────────────────────────

interface SegmentScrubberProps {
  segments: SegmentedOption[]
  value: string
  onChange: (id: string) => void
}

function SegmentScrubber({ segments, value, onChange }: SegmentScrubberProps) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [knobOffset, setKnobOffset] = useState(0)
  const [animated, setAnimated] = useState(false)

  const TRACK_WIDTH = 130
  const KNOB_DIAMETER = 12

  useLayoutEffect(() => {
    const track = trackRef.current
    if (!track) return

    const measure = () => {
      const idx = segments.findIndex((s) => s.id === value)
      if (idx < 0) return
      const available = TRACK_WIDTH - KNOB_DIAMETER
      const offset = segments.length > 1
        ? (idx / (segments.length - 1)) * available
        : available / 2
      setKnobOffset(offset)
    }

    measure()
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure)
      ro.observe(track)
      return () => ro.disconnect()
    }
    return
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, segments.map((s) => s.id).join('|')])

  useLayoutEffect(() => {
    if (knobOffset > 0 && !animated && !prefersReducedMotion()) {
      setAnimated(true)
    }
  }, [knobOffset, animated])

  return (
    <div className="scrubber" ref={trackRef}>
      <style>{SCRUBBER_CSS}</style>
      {/* 细横轨 */}
      <span className="scrubber-track" />
      {/* 圆形滑块 */}
      <span
        className="scrubber-knob"
        data-animated={animated}
        style={{ transform: `translateX(${knobOffset}px)` }}
      />
      {/* 等分透明命中区 */}
      {segments.map((seg, i) => {
        const zoneWidth = TRACK_WIDTH / segments.length
        return (
          <button
            key={seg.id}
            type="button"
            className="scrubber-zone"
            style={{
              left: i * zoneWidth,
              width: zoneWidth,
            }}
            title={seg.label}
            aria-label={seg.label}
            aria-current={seg.id === value ? 'true' : undefined}
            onClick={() => onChange(seg.id)}
          />
        )
      })}
    </div>
  )
}

const SCRUBBER_CSS = `
.scrubber {
  position: relative;
  width: 130px;
  height: 12px;
  flex-shrink: 0;
}

.scrubber-track {
  position: absolute;
  top: 3px;
  left: 0;
  right: 0;
  height: 6px;
  border-radius: 3px;
  background: var(--surface-sunken, var(--heatmap-bg-card));
  pointer-events: none;
}

.scrubber-knob {
  position: absolute;
  top: 0;
  left: 0;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--accent, var(--heatmap-ink-1));
  pointer-events: none;
  z-index: 1;
}

.scrubber-knob[data-animated="true"] {
  transition: transform 225ms ease-out;
}

@media (prefers-reduced-motion: reduce) {
  .scrubber-knob {
    transition: none !important;
  }
}

.scrubber-zone {
  position: absolute;
  top: 0;
  height: 100%;
  border: none;
  background: transparent;
  cursor: pointer;
  padding: 0;
  z-index: 2;
}
`

// ── 主组件 ──────────────────────────────────────────────────

export function StatsHeader({ title, segments, value, onChange, onNavigate, rail }: StatsHeaderProps) {
  const hasSegments = segments && segments.length > 0

  return (
    <div className="stats-header">
      <style>{STATS_HEADER_CSS}</style>

      {/* ── 第 1 行：标题 + 色点横排（右上） ───────────── */}
      <div className="stats-header-row1">
        <h1 className="stats-header-title">{title}</h1>
        {rail && <div className="stats-header-rail">{rail}</div>}
      </div>

      {/* ── 第 2 行：‹ 滑块 › ──────────────────────────────── */}
      {hasSegments && (
        <div className="stats-header-row2">
          {onNavigate && (
            <button
              onClick={() => onNavigate(-1)}
              className="stats-header-arrow"
              title="上一周期"
              aria-label="上一周期"
            >
              ‹
            </button>
          )}

          <SegmentScrubber
            segments={segments!}
            value={value!}
            onChange={(id) => onChange?.(id)}
          />

          {onNavigate && (
            <button
              onClick={() => onNavigate(1)}
              className="stats-header-arrow"
              title="下一周期"
              aria-label="下一周期"
            >
              ›
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const STATS_HEADER_CSS = `
.stats-header {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-bottom: 14px;
}

/* ── 第 1 行 ──────────────────────── */
.stats-header-row1 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.stats-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  line-height: 1.3;
  margin: 0;
  white-space: nowrap;
  letter-spacing: 0.02em;
}

.stats-header-rail {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

/* ── 第 2 行 ──────────────────────── */
.stats-header-row2 {
  display: flex;
  align-items: center;
  gap: 6px;
}

.stats-header-arrow {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 15px;
  color: var(--heatmap-ink-3);
  transition: color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
  line-height: 1;
  user-select: none;
  padding: 0;
}

.stats-header-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}

@media (max-width: 719px) {
  .stats-header {
    gap: 8px;
    margin-bottom: 12px;
  }
  .stats-header-title {
    font-size: 15px;
  }
  .stats-header-arrow {
    width: 20px;
    height: 20px;
    font-size: 14px;
  }
}
`

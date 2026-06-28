/**
 * # StatsHeader — 复盘页图表统一标题区
 *
 * 渲染「左上角大标题 + 标题下整条等分切换横条 + ‹ › 翻页箭头」模式。
 * - 无 segments 时只渲染标题（outfit / mood）
 * - 无 onNavigate 时不渲染箭头
 *
 * 横条各分段等宽连续，选中段升起（surface-raised + shadow + accent 文字），
 * 未选段平/沉（text-tertiary）。
 */

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
}

export function StatsHeader({ title, segments, value, onChange, onNavigate }: StatsHeaderProps) {
  const hasSegments = segments && segments.length > 0

  return (
    <div className="stats-header">
      <style>{STATS_HEADER_CSS}</style>

      {/* ── Title ─────────────────────────────── */}
      <h1 className="stats-header-title">{title}</h1>

      {/* ── Segmented bar + arrows ──────────────── */}
      {hasSegments && (
        <div className="stats-header-bar-row">
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

          <div className="stats-header-bar">
            {segments!.map((seg) => (
              <button
                key={seg.id}
                onClick={() => onChange?.(seg.id)}
                className={`stats-header-seg${value === seg.id ? ' stats-header-seg-active' : ''}`}
              >
                {seg.label}
              </button>
            ))}
          </div>

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
  gap: 12px;
  margin-bottom: 24px;
}

.stats-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
  margin: 0;
  white-space: nowrap;
}

.stats-header-bar-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.stats-header-bar {
  display: flex;
  flex: 1;
  gap: 3px;
  background: var(--surface-sunken, var(--heatmap-bg-card));
  border-radius: 8px;
  padding: 3px;
}

.stats-header-seg {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 12px;
  border-radius: 5px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.25s ease, color 0.25s ease, box-shadow 0.25s ease;
  white-space: nowrap;
  user-select: none;
}

.stats-header-seg:hover {
  color: var(--heatmap-ink-1);
}

.stats-header-seg-active {
  background: var(--surface-raised, var(--heatmap-bg));
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  color: var(--accent, var(--heatmap-ink-1));
  font-weight: 600;
}

.stats-header-arrow {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  color: var(--heatmap-ink-3);
  transition: color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
  line-height: 1;
  user-select: none;
}

.stats-header-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}

@media (max-width: 719px) {
  .stats-header-title {
    font-size: 22px;
  }
  .stats-header-seg {
    font-size: 12px;
    padding: 5px 8px;
  }
  .stats-header-arrow {
    width: 26px;
    height: 26px;
    font-size: 16px;
  }
}
`

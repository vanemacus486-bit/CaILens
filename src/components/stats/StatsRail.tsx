/**
 * # StatsRail — 复盘页右侧分类色圆点副栏
 *
 * 全高无边框纵向列，渲染 6 个分类色圆点。
 * - multi：多选（trend 视图），选中=实心 ●，未选=空心 ○
 * - single：单选（heatmap 视图），同上
 * - empty：占位列，无圆点（保持左右对称）
 *
 * <720px 隐藏（分类选择器由 StatsPage 降级为横向圆点）。
 */

import type { CategoryId } from '@/domain/category'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

interface StatsRailProps {
  mode: 'multi' | 'single' | 'empty'
  selected: CategoryId | CategoryId[]
  onToggle?: (id: CategoryId) => void   // multi mode
  onSelect?: (id: CategoryId) => void    // single mode
}

export function StatsRail({ mode, selected, onToggle, onSelect }: StatsRailProps) {
  if (mode === 'empty') {
    return (
      <div className="stats-rail">
        <style>{STATS_RAIL_CSS}</style>
      </div>
    )
  }

  return (
    <div className="stats-rail">
      <style>{STATS_RAIL_CSS}</style>
      <div className="stats-rail-dots">
        {CATEGORY_IDS.map((id) => {
          const isSelected = Array.isArray(selected) ? selected.includes(id) : selected === id
          return (
            <button
              key={id}
              className={`stats-rail-dot${isSelected ? ' stats-rail-dot-active' : ' stats-rail-dot-inactive'}`}
              style={{
                borderColor: `var(--event-${id}-fill)`,
                backgroundColor: isSelected ? `var(--event-${id}-fill)` : 'transparent',
              }}
              title={id}
              aria-label={id}
              onClick={() => {
                if (mode === 'multi') onToggle?.(id)
                else onSelect?.(id)
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

/**
 * # StatsRailCompact — 紧凑模式横向圆点（<720px 替代副栏）
 *
 * 与 StatsRail 共享相同的互动语义，但渲染为一行横排圆点。
 */
export function StatsRailCompact({ mode, selected, onToggle, onSelect }: StatsRailProps) {
  if (mode === 'empty') return null

  return (
    <div className="stats-rail-compact">
      {CATEGORY_IDS.map((id) => {
        const isSelected = Array.isArray(selected) ? selected.includes(id) : selected === id
        return (
          <button
            key={id}
            className={`stats-rail-dot${isSelected ? ' stats-rail-dot-active' : ' stats-rail-dot-inactive'}`}
            style={{
              borderColor: `var(--event-${id}-fill)`,
              backgroundColor: isSelected ? `var(--event-${id}-fill)` : 'transparent',
            }}
            title={id}
            aria-label={id}
            onClick={() => {
              if (mode === 'multi') onToggle?.(id)
              else onSelect?.(id)
            }}
          />
        )
      })}
      <style>{STATS_RAIL_COMPACT_CSS}</style>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const STATS_RAIL_CSS = `
.stats-rail {
  width: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 132px; /* 对齐到左侧栏首行标题高度 */
  border: none;
  background: transparent;
}

.stats-rail-dots {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
}

.stats-rail-dot {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}

.stats-rail-dot:hover {
  transform: scale(1.2);
}

.stats-rail-dot-active {
  box-shadow: 0 0 0 2px var(--surface-base);
}

.stats-rail-dot-inactive {
  background: transparent !important;
}

/* ── 隐藏副栏 ───────────────────────────────── */
@media (max-width: 719px) {
  .stats-rail {
    display: none;
  }
}

/* ── Compact horizontal dots ──────────────── */
.stats-rail-compact {
  display: none;
}
`

const STATS_RAIL_COMPACT_CSS = `
.stats-rail-compact {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  margin-bottom: 20px;
  width: 100%;
}
`

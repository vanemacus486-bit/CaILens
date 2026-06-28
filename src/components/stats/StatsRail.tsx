/**
 * # StatsRail — 复盘页分类色圆点横排
 *
 * 横排一行 6 个色点，供 StatsHeader 右上角 slot 使用。
 * - multi：多选（trend 视图），选中=实心 ●，未选=空心 ○
 * - single：单选（heatmap 视图），同上
 * - empty：不渲染
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
  if (mode === 'empty') return null

  return (
    <div className="stats-rail-horizontal">
      <style>{STATS_RAIL_CSS}</style>
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
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const STATS_RAIL_CSS = `
.stats-rail-horizontal {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stats-rail-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid;
  cursor: pointer;
  padding: 0;
  transition: background-color 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease;
  flex-shrink: 0;
}

.stats-rail-dot:hover {
  transform: scale(1.25);
}

.stats-rail-dot-active {
  box-shadow: 0 0 0 2px var(--surface-base);
}

.stats-rail-dot-inactive {
  background: transparent !important;
}
`

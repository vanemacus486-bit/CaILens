/**
 * # DietView — 饮食视图容器
 *
 * 顶部模式由 StatsPage → StatsHeader 控制，本组件只根据 mode prop 渲染子视图。
 */

import type { CalendarEvent } from '@/domain/event'
import { DietCalendarCard } from './DietCalendarCard'
import { DietFrequencyMatrix } from './DietFrequencyMatrix'

// ── Props ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  /** 外部控制的锚点日期（传递给子组件） */
  anchorDate?: Date
  /** 外部受控的子视图模式 */
  mode: 'timeline' | 'frequency'
  /** 模式切换回调 */
  onModeChange: (mode: 'timeline' | 'frequency') => void
}

// ── 组件 ────────────────────────────────────────────────────

export function DietView({ rangeEvents, anchorDate, mode, onModeChange: _omc }: Props) {
  void _omc
  return (
    <div className="dv-root">
      {mode === 'timeline' ? (
        <DietCalendarCard rangeEvents={rangeEvents} anchorDate={anchorDate} />
      ) : (
        <DietFrequencyMatrix rangeEvents={rangeEvents} anchorDate={anchorDate} />
      )}
      <style>{DV_CSS}</style>
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const DV_CSS = `
.dv-root {
  width: 100%;
}
`

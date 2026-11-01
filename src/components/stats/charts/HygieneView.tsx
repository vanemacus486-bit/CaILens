/**
 * # HygieneView — 卫生视图容器
 *
 * 顶部模式由 StatsPage → StatsHeader 控制，本组件只根据 mode prop 渲染子视图。
 */

import type { CalendarEvent } from '@/domain/event'
import type { HygieneActivityDef } from '@/domain/hygieneActivity'
import type { AppLanguage } from '@/i18n/types'
import { HygieneCalendarCard } from './HygieneCalendarCard'
import { HygieneFrequencyMatrix } from './HygieneFrequencyMatrix'

// ── Props ────────────────────────────────────────────────────

interface Props {
  rangeEvents: CalendarEvent[]
  activities: readonly HygieneActivityDef[]
  language: AppLanguage
  /** 外部控制的锚点日期（传递给子组件） */
  anchorDate?: Date
  /** 外部受控的子视图模式 */
  mode: 'timeline' | 'frequency'
  /** 模式切换回调 */
  onModeChange: (mode: 'timeline' | 'frequency') => void
}

// ── 组件 ────────────────────────────────────────────────────

export function HygieneView({ rangeEvents, activities, language, anchorDate, mode, onModeChange: _omc }: Props) {
  void _omc
  return (
    <div className="hv-root">
      {mode === 'timeline' ? (
        <HygieneCalendarCard
          rangeEvents={rangeEvents}
          activities={activities}
          language={language}
          anchorDate={anchorDate}
        />
      ) : (
        <HygieneFrequencyMatrix
          rangeEvents={rangeEvents}
          activities={activities}
          anchorDate={anchorDate}
        />
      )}
      <style>{HV_CSS}</style>
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const HV_CSS = `
.hv-root {
  width: 100%;
}
`

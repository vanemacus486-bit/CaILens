/**
 * # EasternStatsShell — 复盘页面 Shell
 *
 * 顶级 Tab 容器 + 子视图容器。
 * Tab 为一级导航（作息/日常），带 200ms fade + slide 过渡。
 * 各 Tab 内部的子视图由各自的子组件管理。
 */

import { type ReactNode } from 'react'
import { useTabTransition } from '@/hooks/useTabTransition'


/** 一级 Tab */
export type StatsTab = 'routine' | 'lifestyle'

/** 作息视图的子视图 */
export type RoutineViewMode = 'trend' | 'heatmap' | 'sleep'

/** 日常视图的子视图 */
export type LifestyleViewMode = 'diet' | 'outfit' | 'hygiene'

/** 兼容旧的 view mode（逐步淘汰） */
export type StatsViewMode = RoutineViewMode

interface TabDefinition {
  id: StatsTab
  label: string
}

export const STATS_TABS: readonly TabDefinition[] = [
  { id: 'routine',     label: '作息' },
  { id: 'lifestyle',   label: '日常' },
]

interface Props {
  currentTab: StatsTab
  onTabChange: (tab: StatsTab) => void
  children: ReactNode
}

export function EasternStatsShell({ currentTab, onTabChange, children }: Props) {
  const { visible, className } = useTabTransition(currentTab)

  return (
    <div className="eastern-shell-root">
      <style>{SHELL_CSS}</style>

      {/* ── 一级 Tab 栏 ──────────────────────────── */}
      <div className="shell-tabs">
        {STATS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`shell-tab${currentTab === tab.id ? ' shell-tab-active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 当前 Tab 内容 ──────────────────────────── */}
      <div className={`shell-content ${className}`}>
        {visible && children}
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const SHELL_CSS = `
.eastern-shell-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Noto Sans SC', sans-serif;
}

/* ── Content ────────────────────────────── */
.shell-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
}

@media (max-width: 719px) {
  .shell-content {
    padding: 16px 10px;
  }
}
`

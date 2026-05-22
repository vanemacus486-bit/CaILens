/**
 * # EasternStatsShell — 复盘页面 Shell
 *
 * 顶级 Tab 容器 + 子视图容器。
 * Tab 为一级导航（作息/日常/身体/关联），
 * 各 Tab 内部的子视图由各自的子组件管理。
 */

import type { ReactNode } from 'react'
import type { AppLanguage } from '@/domain/settings'

/** 一级 Tab */
export type StatsTab = 'routine' | 'lifestyle' | 'body' | 'correlation'

/** 作息视图的子视图 */
export type RoutineViewMode = 'trend' | 'heatmap' | 'sleep' | 'steady'

/** 日常视图的子视图 */
export type LifestyleViewMode = 'diet' | 'outfit' | 'hygiene' | 'leisure'

/** 兼容旧的 view mode（逐步淘汰） */
export type StatsViewMode = RoutineViewMode

interface TabDefinition {
  id: StatsTab
  labelZh: string
  labelEn: string
}

export const STATS_TABS: readonly TabDefinition[] = [
  { id: 'routine',     labelZh: '作息', labelEn: 'Routine' },
  { id: 'lifestyle',   labelZh: '日常', labelEn: 'Lifestyle' },
  { id: 'body',        labelZh: '身体', labelEn: 'Body' },
  { id: 'correlation', labelZh: '关联', labelEn: 'Insights' },
]

interface Props {
  language: AppLanguage
  currentTab: StatsTab
  onTabChange: (tab: StatsTab) => void
  children: ReactNode
}

export function EasternStatsShell({ language, currentTab, onTabChange, children }: Props) {

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
            {language === 'zh' ? tab.labelZh : tab.labelEn}
          </button>
        ))}
      </div>

      {/* ── 当前 Tab 内容 ──────────────────────────── */}
      <div className="shell-content" key={currentTab}>
        {children}
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

/* ── Tab bar ────────────────────────────── */
.shell-tabs {
  display: flex;
  gap: 0;
  border-bottom: 1px solid var(--heatmap-rule);
  padding: 0 16px;
  flex-shrink: 0;
  background: var(--heatmap-bg);
}
.shell-tab {
  padding: 10px 24px;
  font-family: 'Noto Serif SC', serif;
  font-size: 15px;
  font-weight: 400;
  color: var(--heatmap-ink-3);
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.2s ease, border-color 0.2s ease;
  letter-spacing: 0.08em;
}
.shell-tab:hover {
  color: var(--heatmap-ink-1);
}
.shell-tab-active {
  color: var(--heatmap-ink-1);
  font-weight: 500;
  border-bottom-color: var(--accent);
}

/* ── Content ────────────────────────────── */
.shell-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px 16px;
}

@media (max-width: 719px) {
  .shell-tab {
    padding: 10px 16px;
    font-size: 14px;
  }
  .shell-content {
    padding: 16px 10px;
  }
}
`
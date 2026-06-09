/**
 * # EasternStatsShell — 复盘页面 Shell
 *
 * 顶级 Tab 容器 + 子视图容器。
 * Tab 为一级导航（作息/日常），带 200ms fade + slide 过渡。
 * 各 Tab 内部的子视图由各自的子组件管理。
 */

import { type ReactNode, useEffect, useRef, useState } from 'react'


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

const DURATION = 200

export function EasternStatsShell({ currentTab, onTabChange, children }: Props) {
  const prevTabRef = useRef(currentTab)
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')

  useEffect(() => {
    const prev = prevTabRef.current
    if (prev !== currentTab) {
      prevTabRef.current = currentTab
      setPhase('exit')
      const t1 = setTimeout(() => {
        setPhase('enter')
        const t2 = setTimeout(() => setPhase('idle'), DURATION)
        return t2
      }, DURATION)
      return () => clearTimeout(t1)
    }
  }, [currentTab])

  const contentClass = phase === 'exit'
    ? 'shell-tab-exit'
    : phase === 'enter'
      ? 'shell-tab-enter'
      : 'shell-tab-visible'

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
      <div className={`shell-content ${contentClass}`}>
        {phase !== 'exit' && children}
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
  transition: opacity 200ms ease-out, transform 200ms ease-out;
  opacity: 1;
  transform: translateY(0);
}
.shell-tab-enter {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
  opacity: 0;
  transform: translateY(6px);
}
.shell-tab-exit {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
  opacity: 0;
  transform: translateY(6px);
}
.shell-tab-visible {
  transition: opacity 200ms ease-out, transform 200ms ease-out;
  opacity: 1;
  transform: translateY(0);
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

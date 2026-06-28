/**
 * # EasternStatsShell — 复盘页布局容器
 *
 * 改为横向 flex：[可滚动正文区] + [StatsRail 全高列]
 * - 正文区承载 StatsHeader + 图表
 * - 副栏始终渲染（empty 模式占位），保持 7 个视图左右对称
 */

import { type ReactNode } from 'react'

export type RoutineViewMode = 'trend' | 'heatmap' | 'sleep' | 'diet' | 'hygiene' | 'outfit' | 'mood'

interface Props {
  children: ReactNode
  rail?: ReactNode
}

export function EasternStatsShell({ children, rail }: Props) {
  return (
    <div className="eastern-shell-root">
      <style>{SHELL_CSS}</style>
      <div className="shell-flex-row">
        <div className="shell-content">
          {children}
        </div>
        {rail}
      </div>
    </div>
  )
}

const SHELL_CSS = `
.eastern-shell-root {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
}

.shell-flex-row {
  flex: 1;
  display: flex;
  flex-direction: row;
  overflow: hidden;
}

.shell-content {
  flex: 1;
  overflow-y: auto;
  padding: 32px 16px;
  display: flex;
  flex-direction: column;
  /* 顶对齐，内容超高时自然滚动 */
  justify-content: flex-start;
}

@media (max-width: 719px) {
  .shell-content {
    padding: 16px 10px;
  }
}
`

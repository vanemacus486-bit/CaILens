import { type ReactNode } from 'react'

export type RoutineViewMode = 'trend' | 'heatmap' | 'sleep' | 'diet' | 'hygiene' | 'outfit'

interface Props {
  children: ReactNode
}

export function EasternStatsShell({ children }: Props) {
  return (
    <div className="eastern-shell-root">
      <style>{SHELL_CSS}</style>
      <div className="shell-content">
        {children}
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

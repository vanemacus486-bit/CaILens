/**
 * # ProgressBar — 通用进度条原语
 *
 * 规格见设计文档：轨道 background: var(--surface-sunken)，圆角 999px；
 * 填充层宽度动画 transition: width 400ms ease-out；填充色用分类色或 accent。
 */

import { cn } from '@/lib/utils'

interface ProgressBarProps {
  percent: number            // 0–100
  color?: string             // CSS 值，默认 var(--accent)
  height?: number            // 默认 8（总进度）/ 6（子进度）
  label?: string             // 左侧标签
  showPercent?: boolean      // 右侧百分比文字
  className?: string
}

export function ProgressBar({
  percent,
  color = 'var(--accent)',
  height = 8,
  label,
  showPercent = true,
  className,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, percent))

  return (
    <div className={cn('flex items-center gap-3', className)}>
      {label && (
        <span className="font-sans text-xs text-text-secondary whitespace-nowrap min-w-0 truncate">
          {label}
        </span>
      )}
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height, backgroundColor: 'var(--surface-sunken)' }}
      >
        <div
          className="h-full rounded-full transition-all ease-out"
          style={{
            width: `${clamped}%`,
            backgroundColor: color,
            transitionDuration: '400ms',
          }}
        />
      </div>
      {showPercent && (
        <span className="font-mono text-xs text-text-tertiary whitespace-nowrap tabular-nums">
          {clamped}%
        </span>
      )}
    </div>
  )
}

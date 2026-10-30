/**
 * # EmptyState — 待办清单空态
 *
 * 保留原有调用签名（`variant="all" | "starred"`），内部改为复用
 * `components/ui/EmptyState`，让「空」在全站是同一套观感。
 *
 * - `all`：整页级，大图标 + 标题 + 描述（full 变体）
 * - `starred`：轻量一行，不喧宾夺主（inline 变体的居中版）
 */

import { ListChecks, Star } from 'lucide-react'
import { EmptyState as SharedEmptyState } from '@/components/ui/EmptyState'

export type EmptyStateVariant = 'all' | 'starred'

export function EmptyState({ variant = 'all' }: { variant?: EmptyStateVariant }) {
  if (variant === 'starred') {
    return (
      <div className="flex items-center justify-center gap-2 py-16 text-center select-none">
        <Star size={15} strokeWidth={1.75} className="shrink-0 text-text-tertiary/60" fill="currentColor" />
        <span className="text-sm font-sans text-text-tertiary">
          点亮任务右侧的 ☆，重要的事会自动聚到这里
        </span>
      </div>
    )
  }

  return (
    <SharedEmptyState
      variant="full"
      icon={ListChecks}
      title="开始你的第一件事吧"
      description="还没添加任何任务，点击上方「添加任务」写下今日待办"
    />
  )
}

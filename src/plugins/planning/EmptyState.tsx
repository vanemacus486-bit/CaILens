/**
 * # EmptyState — 空清单提示
 *
 * 「所有任务」空态：居中插画 + 标题 + 副标题（图标带极慢上下浮动呼吸动画）。
 * 「已加星标」空态：克制的一行字（更轻、更舒服）。
 * CaILens 暖色风格，适配深浅色与 6 套视觉风格。
 */

import { ListChecks, Star } from 'lucide-react'

const BREATH_KEYFRAMES = `
@keyframes float-breath {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
`

export type EmptyStateVariant = 'all' | 'starred'

export function EmptyState({ variant = 'all' }: { variant?: EmptyStateVariant }) {
  // 「已加星标」：一行字即可，不喧宾夺主
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
    <>
      <style>{BREATH_KEYFRAMES}</style>
      <div className="flex flex-col items-center justify-center py-24 text-center select-none">
        <div
          className="mb-8 text-text-tertiary/40 dark:text-text-tertiary/30"
          style={{ animation: 'float-breath 4s ease-in-out infinite' }}
        >
          <ListChecks size={80} strokeWidth={1} />
        </div>
        <h3 className="text-lg font-sans font-medium text-text-secondary mb-3">
          开始你的第一件事吧
        </h3>
        <p className="text-sm font-sans text-text-tertiary max-w-[280px] leading-relaxed">
          还没添加任何任务，点击上方'添加任务'写下今日待办
        </p>
      </div>
    </>
  )
}

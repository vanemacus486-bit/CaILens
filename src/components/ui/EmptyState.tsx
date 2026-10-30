import type { MouseEvent, ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 统一空态。
 *
 * 之前项目里「空」有 3 套观感：周视图一行小字、规划页 80px 插画 + 标题 + 副标题、
 * 移动日视图一个可点按钮。同一个产品里「什么都没有」应该是同一件事。
 *
 * 变体按**容器能否被点击**区分，不是按视觉大小：
 *
 * - `inline`：容器本身已被占用（周视图列空白处点击 = 新建事件）。空态必须
 *   `pointer-events-none`，否则会吃掉列的点按。这是约束，不是偷懒。
 * - `action`：容器是死的，空态自己提供唯一入口（移动日视图）。
 * - `full`：整页级空态（规划页），带呼吸动画的大图标。
 *
 * 传 `action` 且 variant='inline' 时会被忽略——避免出现「看起来能点但点不动」。
 */
export type AppEmptyStateVariant = 'inline' | 'action' | 'full'

export interface EmptyStateAction {
  label: string
  onClick: (event: MouseEvent<HTMLButtonElement>) => void
}

export interface EmptyStateProps {
  variant?: AppEmptyStateVariant
  icon?: LucideIcon
  title?: string
  description?: string
  action?: EmptyStateAction
  breathing?: boolean
  children?: ReactNode
  className?: string
}

const BREATH_KEYFRAMES = `
@keyframes empty-state-breath {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-3px); }
}
`

export function EmptyState({
  variant = 'inline',
  icon: Icon,
  title,
  description,
  action,
  breathing = true,
  children,
  className,
}: EmptyStateProps) {
  const effectiveAction = variant === 'inline' ? undefined : action

  if (variant === 'full') {
    return (
      <>
        {breathing && <style>{BREATH_KEYFRAMES}</style>}
        <div className={cn('flex flex-col items-center justify-center py-24 text-center select-none', className)}>
          {Icon && (
            <div
              className="mb-8 text-text-tertiary/40 dark:text-text-tertiary/30"
              style={breathing ? { animation: 'empty-state-breath 4s ease-in-out infinite' } : undefined}
            >
              <Icon size={80} strokeWidth={1} />
            </div>
          )}
          {title && <h3 className="mb-3 font-sans text-lg font-medium text-text-secondary">{title}</h3>}
          {description && (
            <p className="max-w-[280px] font-sans text-sm leading-relaxed text-text-tertiary">{description}</p>
          )}
          {effectiveAction && (
            <button
              type="button"
              onClick={effectiveAction.onClick}
              className="mt-6 inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-raised px-3.5 py-2 font-sans text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              {Icon && <Icon size={14} strokeWidth={1.75} />}
              {effectiveAction.label}
            </button>
          )}
          {children}
        </div>
      </>
    )
  }

  if (variant === 'action') {
    return (
      <div className={cn('flex items-center justify-center py-10 select-none', className)}>
        {effectiveAction ? (
          <button
            type="button"
            onClick={effectiveAction.onClick}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-border-subtle bg-surface-raised px-3 py-1.5 font-sans text-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
          >
            {Icon && <Icon size={15} strokeWidth={1.75} />}
            {effectiveAction.label}
          </button>
        ) : (
          <div className="flex items-center gap-2 text-text-tertiary">
            {Icon && <Icon size={12} strokeWidth={1.75} />}
            <span className="font-sans text-xs">{title ?? description}</span>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className={cn('pointer-events-none flex select-none items-center gap-2 text-text-tertiary', className)}>
      {Icon && (
        <span className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-border-subtle">
          <Icon size={10} strokeWidth={2} />
        </span>
      )}
      <span className="font-sans text-xs">{title ?? description}</span>
      {children}
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsSectionProps {
  /** 卡片上方的分组标题（Obsidian 里「账户」「高级」那一层）。 */
  title?: string
  description?: string
  /** 分组标题右侧的操作（如「重置全部」）。 */
  action?: ReactNode
  /** 锚点：设置项搜索可以直接滚到这里。 */
  anchor?: string
  /** 测试用 data-testid（插件分组等需要稳定选择器的场景）。 */
  testId?: string
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** 行之间是否画分隔线。图表、卡片网格这类内容应传 false。 */
  divided?: boolean
}

/**
 * 一组设置行。
 *
 * 结构照 Obsidian：**组标题在卡片外**，卡片本身只装行；行与行之间是细线，
 * 不是每行一张卡片。这是与旧实现最大的差别——旧版每行一个 `rounded-xl`
 * 卡片，一屏里全是框，层级反而看不出来。
 */
export function SettingsSection({
  title,
  description,
  action,
  anchor,
  testId,
  children,
  className,
  bodyClassName,
  divided = true,
}: SettingsSectionProps) {
  return (
    <section
      id={anchor}
      data-settings-section={anchor}
      data-settings-item={anchor}
      data-testid={testId}
      className={cn('flex scroll-mt-6 flex-col gap-2.5', className)}
    >
      {(title || action) && (
        <div className="flex flex-wrap items-end justify-between gap-3 px-0.5">
          <div className="min-w-0">
            {title && (
              <h2 className="font-sans text-sm font-medium text-text-secondary">
                {title}
              </h2>
            )}
            {description && (
              <p className="mt-0.5 font-sans text-xs leading-relaxed text-text-tertiary">
                {description}
              </p>
            )}
          </div>
          {action && <div className="flex shrink-0 items-center gap-1.5">{action}</div>}
        </div>
      )}

      <div
        className={cn(
          'overflow-hidden rounded-xl border border-border-subtle/70 bg-surface-raised',
          divided && 'divide-y divide-border-subtle/70',
          bodyClassName,
        )}
      >
        {children}
      </div>
    </section>
  )
}

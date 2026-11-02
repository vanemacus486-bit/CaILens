import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface SettingsRowProps {
  /** 主标题。 */
  title: ReactNode
  /** 标题下的说明文字（Obsidian 每行都有这一句）。 */
  description?: ReactNode
  /** 右侧控件；`stacked` 时落到标题下方。 */
  children?: ReactNode
  /**
   * `inline`：标题左、控件右（开关、下拉、按钮）。
   * `stacked`：控件换行放在说明下方（宽度较大的按钮组、表单）。
   */
  layout?: 'inline' | 'stacked'
  /** 设置项搜索用的锚点。 */
  anchor?: string
  /** 整行下方的附加内容（更新进度、说明文字），与行同属一个分隔单元。 */
  footer?: ReactNode
  className?: string
  controlClassName?: string
}

/**
 * 一条设置项：左侧标题 + 说明，右侧控件。
 *
 * 所有设置页都从这里出，不再各自写 `AboutRow` / `SettingsRow` / `PluginRow`。
 */
export function SettingsRow({
  title,
  description,
  children,
  layout = 'inline',
  anchor,
  footer,
  className,
  controlClassName,
}: SettingsRowProps) {
  return (
    <div
      data-settings-item={anchor}
      className={cn('scroll-mt-4 px-5 py-4', className)}
    >
      <div
        className={cn(
          'flex',
          layout === 'inline'
            ? 'items-start justify-between gap-6 max-[820px]:flex-col max-[820px]:items-stretch max-[820px]:gap-3'
            : 'flex-col gap-3',
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="font-sans text-sm font-medium leading-snug text-text-primary">
            {title}
          </div>
          {description && (
            <div className="mt-1 font-sans text-xs leading-relaxed text-text-tertiary">
              {description}
            </div>
          )}
        </div>

        {children && (
          <div
            className={cn(
              'flex items-center gap-2',
              layout === 'inline'
                ? 'shrink-0 justify-end pt-0.5 max-[820px]:justify-start max-[820px]:pt-0'
                : 'flex-wrap',
              controlClassName,
            )}
          >
            {children}
          </div>
        )}
      </div>

      {footer && <div className="mt-3">{footer}</div>}
    </div>
  )
}

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type Tone = 'warning' | 'danger' | 'info' | 'accent'

interface SettingsNoticeProps {
  tone?: Tone
  title?: string
  children?: ReactNode
  className?: string
}

const TONE: Record<Tone, string> = {
  warning: 'border-event-rose-fill/30 bg-event-rose-bg/40',
  danger: 'border-event-rose-fill/40 bg-event-rose-bg/60',
  info: 'border-border-subtle bg-surface-sunken/70',
  accent: 'border-accent/20 bg-accent/10',
}

const TITLE_TONE: Record<Tone, string> = {
  warning: 'text-color-text-danger',
  danger: 'text-color-text-danger',
  info: 'text-text-secondary',
  accent: 'text-accent',
}

/**
 * 设置页的提示条（快捷键冲突、更新错误、录制中…）。
 * 统一内边距与圆角，不再让每处各写一套配色。
 */
export function SettingsNotice({
  tone = 'info',
  title,
  children,
  className,
}: SettingsNoticeProps) {
  return (
    <div
      role={tone === 'danger' || tone === 'warning' ? 'alert' : 'status'}
      className={cn('rounded-lg border px-4 py-3', TONE[tone], className)}
    >
      {title && (
        <p
          className={cn(
            'font-sans text-xs font-medium leading-relaxed',
            TITLE_TONE[tone],
          )}
        >
          {title}
        </p>
      )}
      {children && (
        <div
          className={cn(
            'font-sans text-xs leading-relaxed text-text-secondary',
            title && 'mt-1',
          )}
        >
          {children}
        </div>
      )}
    </div>
  )
}

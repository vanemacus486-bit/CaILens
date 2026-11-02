import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md'

interface SettingsButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const VARIANT: Record<Variant, string> = {
  primary:
    'border-transparent bg-accent text-white hover:bg-accent-hover',
  secondary:
    'border-border-subtle bg-surface-base text-text-secondary hover:border-border-default hover:bg-surface-sunken hover:text-text-primary',
  ghost:
    'border-transparent bg-transparent text-text-tertiary hover:bg-surface-sunken hover:text-text-primary',
  danger:
    'border-event-rose-fill/30 bg-event-rose-bg/40 text-color-text-danger hover:bg-event-rose-bg/70',
}

const SIZE: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-xs',
  md: 'h-8 px-3 text-xs',
}

/**
 * 设置页按钮。四种语义、两种高度，避免每页自己拼一组长 class。
 */
export function SettingsButton({
  variant = 'secondary',
  size = 'sm',
  className,
  type = 'button',
  ...rest
}: SettingsButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border font-sans font-medium transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      {...rest}
    />
  )
}

import { cn } from '@/lib/utils'

interface SettingsToggleProps {
  checked: boolean
  onChange: (next: boolean) => void
  /** 无障碍名称；必填，开关本身没有可见文字。 */
  label: string
  disabled?: boolean
}

/**
 * 统一的开关。
 *
 * 旧实现里「关于」页和插件页各写了一份，尺寸与滑块位置还不一样
 * （一个 `left-0.5 / left-[18px]`，一个用 transform）。这里只留一份。
 */
export function SettingsToggle({
  checked,
  onChange,
  label,
  disabled = false,
}: SettingsToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full border-none p-0 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-raised',
        disabled && 'cursor-not-allowed opacity-50',
        checked ? 'bg-accent' : 'bg-surface-sunken ring-1 ring-inset ring-border-subtle',
      )}
    >
      <span
        className={cn(
          'absolute left-[2px] top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow-sm transition-transform duration-200',
          checked && 'translate-x-[18px]',
        )}
      />
    </button>
  )
}

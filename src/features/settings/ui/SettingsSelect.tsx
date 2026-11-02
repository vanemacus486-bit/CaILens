import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SettingsSelectItem<T extends string> {
  id: T
  label: string
}

interface SettingsSelectProps<T extends string> {
  value: T
  onChange: (next: T) => void
  items: readonly SettingsSelectItem<T>[]
  /** 无障碍名称；视觉上由左侧设置行标题承担。 */
  label: string
  disabled?: boolean
  className?: string
}

/**
 * 右对齐下拉选择。
 *
 * 语言有 6 个候选，塞进分段控件会挤成一行小字；Obsidian 的做法就是下拉。
 * 原生 `<select>` 保留键盘与读屏行为，只改外观。
 */
export function SettingsSelect<T extends string>({
  value,
  onChange,
  items,
  label,
  disabled = false,
  className,
}: SettingsSelectProps<T>) {
  return (
    <div className={cn('relative inline-flex items-center', className)}>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          'h-8 cursor-pointer appearance-none rounded-lg border border-border-subtle bg-surface-base pl-3 pr-8 text-xs font-sans text-text-primary',
          'transition-colors duration-200 hover:border-border-default hover:bg-surface-sunken',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30',
          'disabled:cursor-not-allowed disabled:opacity-50',
        )}
      >
        {items.map((item) => (
          <option key={item.id} value={item.id}>
            {item.label}
          </option>
        ))}
      </select>
      <ChevronDown
        size={13}
        strokeWidth={1.75}
        className="pointer-events-none absolute right-2.5 text-text-tertiary"
      />
    </div>
  )
}

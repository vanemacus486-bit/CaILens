import { cn } from '@/lib/utils'

// ── Types ───────────────────────────────────────────────

export interface AutocompleteSuggestion {
  title: string
  count: number
}

interface AutocompleteDropdownProps {
  /** 完整建议列表（已排序去重） */
  suggestions: AutocompleteSuggestion[]
  /** 当前高亮索引 (0-based) */
  selectedIndex: number
  /** 用户选择了某个建议 */
  onSelect: (title: string) => void
}

// ── Component ───────────────────────────────────────────

export function AutocompleteDropdown({ suggestions, selectedIndex, onSelect }: AutocompleteDropdownProps) {
  if (suggestions.length === 0) return null

  return (
    <div
      className={cn(
        'mt-1',
        'bg-surface-raised border border-border-default rounded-lg',
        'shadow-tooltip overflow-hidden',
      )}
    >
      {suggestions.map((s, i) => (
        <button
          key={s.title}
          onMouseDown={(e) => {
            e.preventDefault() // prevent blur
            onSelect(s.title)
          }}
          className={cn(
            'w-full flex items-center justify-between px-3 py-2 text-left',
            'text-sm text-text-primary font-sans',
            'transition-colors duration-75 cursor-pointer',
            i === selectedIndex ? 'bg-surface-sunken' : 'hover:bg-surface-sunken/50',
          )}
        >
          <span className="truncate">{s.title}</span>
          <span className="text-xs text-text-quaternary flex-shrink-0 ml-2">{s.count}</span>
        </button>
      ))}
    </div>
  )
}

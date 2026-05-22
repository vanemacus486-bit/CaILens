import { useMemo } from 'react'
import type { CalendarEvent } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { cn } from '@/lib/utils'
import { useEventStore } from '@/stores/eventStore'

// ── Helpers ─────────────────────────────────────────────

interface RecentEntry {
  title: string
  count: number
}

/**
 * 从事件列表中提取前 N 个最频繁的标题（按分类过滤）。
 * 只取最近 90 天内的有效事件。
 */
function topRecentTitles(
  events: CalendarEvent[],
  categoryId: CategoryId | null,
  max: number,
): RecentEntry[] {
  const cutoff = Date.now() - 90 * 86_400_000
  const filtered = events.filter((e) => {
    if (!e.title.trim()) return false
    if (e.endTime < cutoff) return false
    if (categoryId && e.categoryId !== categoryId) return false
    return true
  })

  const freq = new Map<string, number>()
  for (const e of filtered) {
    freq.set(e.title, (freq.get(e.title) ?? 0) + 1)
  }

  return Array.from(freq.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([title, count]) => ({ title, count }))
}

// ── Props ───────────────────────────────────────────────

interface RecentPillsProps {
  /** 按分类过滤；null 表示全部 */
  categoryId: CategoryId | null
  /** 点击药丸时的回调 */
  onSelect: (title: string) => void
  max?: number
}

// ── Component ───────────────────────────────────────────

export function RecentPills({ categoryId, onSelect, max = 5 }: RecentPillsProps) {
  const allEvents = useEventStore((s) => s.allEvents)

  const entries = useMemo(
    () => topRecentTitles(allEvents, categoryId, max),
    [allEvents, categoryId, max],
  )

  if (entries.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {entries.map((entry) => (
        <button
          key={entry.title}
          onClick={() => onSelect(entry.title)}
          className={cn(
            'text-xs text-text-secondary bg-surface-sunken',
            'border border-border-subtle rounded-full',
            'px-2.5 py-1 hover:bg-surface-base',
            'transition-colors duration-150 cursor-pointer',
            'truncate max-w-[180px]',
          )}
          title={`${entry.title} · ${entry.count}`}
        >
          {entry.title}
        </button>
      ))}
    </div>
  )
}

import { useMemo } from 'react'
import { startOfWeek, addDays } from 'date-fns'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useEventStore } from '@/stores/eventStore'
import { computeBucket } from '@/hooks/useStatsAggregation'
import type { CategoryId } from '@/domain/category'
import { BudgetBar } from './BudgetBar'
import { CategorySettingItem } from './CategorySettingItem'

export function SettingsCategories() {
  const categories = useCategoryStore((s) => s.categories)
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const language = useAppSettingsStore((s) => s.settings.language)
  const updateCategory = useCategoryStore((s) => s.updateCategory)
  const reclassifyAllEvents = useEventStore((s) => s.reclassifyAllEvents)

  // Compute this week's per-category tracked hours
  const trackedByCategory = useMemo(() => {
    const now = new Date()
    const weekStart = startOfWeek(now, { weekStartsOn: 1 })
    const weekEnd = addDays(weekStart, 7)
    const bucket = computeBucket(rangeEvents, weekStart.getTime(), weekEnd.getTime())
    return bucket.byCategory
  }, [rangeEvents])

  const handleNameCommit = (id: CategoryId, newName: string) => {
    fireAndForget(updateCategory(id, { name: newName }), 'update category name')
  }

  const handleBudgetChange = (id: CategoryId, value: number) => {
    if (value > 0 && value <= 168) {
      fireAndForget(updateCategory(id, { weeklyBudget: value }), 'update budget')
    }
  }

  const persistFolders = (id: CategoryId, folders: typeof categories[0]['folders']) => {
    void updateCategory(id, { folders }).then(() => reclassifyAllEvents()).catch((err) => {
      console.error('[SettingsCategories] update folders:', err)
    })
  }

  const handleAddKeyword = (id: CategoryId, keyword: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const folders = cat.folders.map((f) => ({ ...f, keywords: [...f.keywords] }))
    if (folders.length === 0) return
    if (!folders[0].keywords.includes(keyword)) {
      folders[0].keywords = [...folders[0].keywords, keyword]
    }
    persistFolders(id, folders)
  }

  const handleRemoveKeyword = (id: CategoryId, keyword: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const folders = cat.folders.map((f) => ({
      ...f,
      keywords: f.keywords.filter((k) => k !== keyword),
    }))
    persistFolders(id, folders)
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          分类
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          每周 168 小时如何分配 · 管理关键词自动分类
        </p>
      </div>

      {/* Budget allocation summary */}
      <BudgetBar categories={categories} />

      {/* Category setting items — vertical list */}
      <div className="flex flex-col gap-3">
        {categories.map((cat) => (
          <CategorySettingItem
            key={cat.id}
            category={cat}
            language={language}
            trackedHours={trackedByCategory[cat.id]}
            onNameCommit={handleNameCommit}
            onBudgetChange={handleBudgetChange}
            onAddKeyword={handleAddKeyword}
            onRemoveKeyword={handleRemoveKeyword}
          />
        ))}
      </div>
    </div>
  )
}

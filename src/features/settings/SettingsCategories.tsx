import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useEventStore } from '@/stores/eventStore'
import type { CategoryId } from '@/domain/category'
import { BudgetBar } from './BudgetBar'
import { CategoryCard } from './CategoryCard'

export function SettingsCategories() {
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const updateCategory = useCategoryStore((s) => s.updateCategory)
  const reclassifyAllEvents = useEventStore((s) => s.reclassifyAllEvents)

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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-[22px] font-medium text-text-primary">
            {'分类'}
          </h1>
          <p className="text-[13px] text-text-tertiary mt-1 font-sans">
            {'每周 168 小时如何分配'}
          </p>
        </div>
      </div>

      <BudgetBar categories={categories} />

      <div className="grid grid-cols-2 max-sm:grid-cols-1 gap-3">
        {categories.map((cat) => (
          <CategoryCard
            key={cat.id}
            category={cat}
            language={language}
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

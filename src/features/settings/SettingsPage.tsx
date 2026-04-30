import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import type { CategoryId, KeywordFolder } from '@/domain/category'
import { CategoryNameEditor } from './CategoryNameEditor'
import { FolderKeywordEditor } from './FolderKeywordEditor'

export function SettingsPage() {
  const categories  = useCategoryStore((s) => s.categories)
  const updateName  = useCategoryStore((s) => s.updateCategoryName)
  const updateFolders       = useCategoryStore((s) => s.updateCategoryFolders)
  const reclassifyAllEvents = useEventStore((s) => s.reclassifyAllEvents)
  const settings           = useAppSettingsStore((s) => s.settings)
  const setLanguage        = useAppSettingsStore((s) => s.setLanguage)

  const language = settings.language
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const handleNameCommit = (id: CategoryId, newName: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const updated = language === 'zh'
      ? { zh: newName, en: cat.name.en }
      : { zh: cat.name.zh, en: newName }
    void updateName(id, updated)
  }

  const handleFoldersChange = (id: CategoryId, folders: KeywordFolder[]) => {
    void updateFolders(id, folders).then(() => reclassifyAllEvents())
  }

  return (
    <div className="h-full flex flex-col bg-surface-base text-text-primary">
      {/* Header */}
      <div className="flex items-center gap-4 px-6 py-4 border-b border-border-subtle">
        <Link
          to="/"
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors duration-200"
        >
          <ArrowLeft size={18} strokeWidth={1.75} />
        </Link>
        <h1 className="font-serif text-lg text-text-primary">
          {t('设置', 'Settings')}
        </h1>
      </div>

      <div className="flex-1 w-full px-8 py-8 flex flex-col gap-6 overflow-y-auto">
        {/* Language switcher */}
        <section>
          <p className="text-xs font-sans text-text-tertiary mb-2">
            {t('界面语言', 'Language')}
          </p>
          <div className="flex gap-1 w-48">
            {(['zh', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => void setLanguage(lang)}
                className={cn(
                  'flex-1 py-1.5 text-sm font-sans rounded-lg transition-colors duration-150',
                  language === lang
                    ? 'bg-surface-raised text-text-primary'
                    : 'text-text-secondary hover:bg-surface-raised',
                )}
              >
                {lang === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </section>

        <div className="h-px bg-border-subtle" />

        {/* Categories */}
        <section>
          <p className="text-xs font-sans text-text-tertiary mb-3">
            {t('分类与关键词', 'Categories & Keywords')}
          </p>
          <div className="grid grid-cols-1 gap-4 max-w-2xl">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="rounded-xl border border-border-subtle bg-surface-base px-4 py-3 flex flex-col gap-3"
              >
                {/* Category name row */}
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: `var(--event-${cat.id}-text)` }}
                  />
                  <CategoryNameEditor
                    id={cat.id}
                    name={cat.name[language]}
                    onCommit={handleNameCommit}
                  />
                </div>

                {/* Folders & keywords */}
                <div className="pl-[18px]">
                  <FolderKeywordEditor
                    folders={cat.folders ?? []}
                    onChange={(folders) => handleFoldersChange(cat.id, folders)}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

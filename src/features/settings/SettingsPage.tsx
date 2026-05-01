import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import type { CategoryId, KeywordFolder } from '@/domain/category'
import { CategoryNameEditor } from './CategoryNameEditor'
import { FolderKeywordEditor } from './FolderKeywordEditor'
import { ExportSection } from '@/components/stats/ExportSection'

export function SettingsPage() {
  const categories           = useCategoryStore((s) => s.categories)
  const updateName           = useCategoryStore((s) => s.updateCategoryName)
  const updateBudget         = useCategoryStore((s) => s.updateCategoryBudget)
  const updateFolders        = useCategoryStore((s) => s.updateCategoryFolders)
  const reclassifyAllEvents  = useEventStore((s) => s.reclassifyAllEvents)
  const settings             = useAppSettingsStore((s) => s.settings)
  const setLanguage          = useAppSettingsStore((s) => s.setLanguage)

  const language = settings.language
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const [expandedCats, setExpandedCats] = useState<Set<CategoryId>>(new Set())

  const toggleExpand = (id: CategoryId) => {
    setExpandedCats((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const handleNameCommit = (id: CategoryId, newName: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    const updated = language === 'zh'
      ? { zh: newName, en: cat.name.en }
      : { zh: cat.name.zh, en: newName }
    void updateName(id, updated)
  }

  const handleBudgetChange = (id: CategoryId, value: number) => {
    if (value > 0 && value <= 168) void updateBudget(id, value)
  }

  const handleFoldersChange = (id: CategoryId, folders: KeywordFolder[]) => {
    void updateFolders(id, folders).then(() => reclassifyAllEvents())
  }

  const totalKeywords = (folders: KeywordFolder[]): number =>
    folders.reduce((sum, f) => sum + f.keywords.length, 0)

  const allKeywords = (folders: KeywordFolder[]): string[] =>
    folders.flatMap((f) => f.keywords)

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

      <div className="flex-1 w-full max-w-2xl mx-auto px-8 py-8 flex flex-col gap-8 overflow-y-auto">
        {/* ── Section 1: Language ────────────────────────── */}
        <section>
          <h2 className="font-serif text-sm font-semibold text-text-primary mb-3">
            {t('界面', 'Interface')}
          </h2>
          <div className="bg-surface-raised border border-border-subtle rounded-xl px-5 py-4">
            <p className="text-xs text-text-tertiary mb-3">
              {t('界面语言', 'Language')}
            </p>
            <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
              {(['zh', 'en'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => void setLanguage(lang)}
                  className={cn(
                    'px-4 py-1.5 rounded-md text-sm font-sans font-medium transition-all duration-150 cursor-pointer',
                    language === lang
                      ? 'bg-surface-base text-text-primary shadow-[0_1px_3px_rgba(0,0,0,0.08)]'
                      : 'text-text-secondary hover:text-text-primary',
                  )}
                >
                  {lang === 'zh' ? '中文' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* ── Section 2: Categories ──────────────────────── */}
        <section>
          <h2 className="font-serif text-sm font-semibold text-text-primary mb-3">
            {t('分类', 'Categories')}
          </h2>
          <div className="flex flex-col gap-3">
            {categories.map((cat) => {
              const expanded = expandedCats.has(cat.id)
              const kwCount = totalKeywords(cat.folders ?? [])
              const kwPreview = allKeywords(cat.folders ?? [])

              return (
                <div
                  key={cat.id}
                  className="rounded-xl border border-border-subtle bg-surface-raised px-5 py-4 flex flex-col gap-3"
                >
                  {/* Row 1: color dot + name + budget */}
                  <div className="flex items-center gap-3">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: `var(--event-${cat.id}-text)` }}
                    />
                    <div className="flex-1 min-w-0">
                      <CategoryNameEditor
                        id={cat.id}
                        name={cat.name[language]}
                        onCommit={handleNameCommit}
                      />
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className="text-[11px] text-text-tertiary select-none">
                        {t('每周预算', 'Weekly budget')}
                      </span>
                      <input
                        type="number"
                        min={1}
                        max={168}
                        defaultValue={cat.weeklyBudget}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10)
                          if (!isNaN(v)) handleBudgetChange(cat.id, v)
                          else e.target.value = String(cat.weeklyBudget)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                        }}
                        className="w-12 px-2 py-0.5 text-xs font-mono text-text-primary bg-surface-base border border-border-subtle rounded-md text-center focus:outline-none focus:border-border-default"
                      />
                      <span className="text-[11px] text-text-tertiary select-none">h</span>
                    </div>
                  </div>

                  {/* Row 2: keywords — collapsed preview or expanded editor */}
                  <div className="pl-[22px]">
                    {kwCount === 0 ? (
                      <button
                        onClick={() => toggleExpand(cat.id)}
                        className="text-[11px] text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer"
                      >
                        {expanded
                          ? t('收起', 'Collapse')
                          : t('+ 添加关键词', '+ Add keywords')}
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => toggleExpand(cat.id)}
                          className="flex items-center gap-1.5 text-[11px] text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer w-full text-left"
                        >
                          {expanded
                            ? <ChevronDown size={12} strokeWidth={2} />
                            : <ChevronRight size={12} strokeWidth={2} />
                          }
                          <span>
                            {kwCount} {t('个关键词', 'keywords')}
                          </span>
                          {!expanded && (
                            <span className="truncate text-text-tertiary/60">
                              — {kwPreview.slice(0, 4).join(', ')}
                              {kwPreview.length > 4 && ` +${kwPreview.length - 4}`}
                            </span>
                          )}
                        </button>
                        {expanded && (
                          <div className="mt-2">
                            <FolderKeywordEditor
                              folders={cat.folders ?? []}
                              onChange={(folders) => handleFoldersChange(cat.id, folders)}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ── Section 3: Data ────────────────────────────── */}
        <section>
          <h2 className="font-serif text-sm font-semibold text-text-primary mb-3">
            {t('数据', 'Data')}
          </h2>
          <ExportSection language={language} />
        </section>
      </div>
    </div>
  )
}

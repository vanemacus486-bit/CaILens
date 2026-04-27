import { useState, useRef } from 'react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { CATEGORY_NAME_MAX_LENGTH } from '@/domain/category'
import type { CategoryId } from '@/domain/category'

// ── 单个分类名称编辑行 ─────────────────────────────────────

interface CategoryRowProps {
  id:       CategoryId
  name:     string   // 当前语言下的名称
  onCommit: (id: CategoryId, value: string) => void
}

function CategoryRow({ id, name, onCommit }: CategoryRowProps) {
  const [editing, setEditing] = useState(false)
  const [value,   setValue]   = useState(name)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleFocus = () => {
    setEditing(true)
    setValue(name)
  }

  const commit = () => {
    setEditing(false)
    const trimmed = value.trim()
    if (trimmed && trimmed !== name) {
      onCommit(id, trimmed)
    } else {
      setValue(name)  // 取消时还原
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter')  { e.preventDefault(); commit() }
    if (e.key === 'Escape') { setValue(name); setEditing(false); inputRef.current?.blur() }
  }

  return (
    <div className="flex items-center gap-2">
      {/* 颜色圆点（不可改） */}
      <span
        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
        style={{ backgroundColor: `var(--event-${id}-text)` }}
      />
      {/* 名称输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={editing ? value : name}
        maxLength={CATEGORY_NAME_MAX_LENGTH}
        onChange={(e) => setValue(e.target.value)}
        onFocus={handleFocus}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex-1 px-2 py-1 text-sm font-sans rounded-lg',
          'bg-transparent border border-transparent',
          'text-text-primary',
          'hover:border-border-subtle focus:border-border-default',
          'focus:outline-none transition-colors duration-150',
        )}
      />
    </div>
  )
}

// ── SettingsPopover ────────────────────────────────────────

interface SettingsPopoverProps {
  trigger: React.ReactNode
}

export function SettingsPopover({ trigger }: SettingsPopoverProps) {
  const categories       = useCategoryStore((s) => s.categories)
  const updateName       = useCategoryStore((s) => s.updateCategoryName)
  const settings         = useAppSettingsStore((s) => s.settings)
  const setLanguage      = useAppSettingsStore((s) => s.setLanguage)

  const language = settings.language

  const handleNameCommit = (id: CategoryId, newName: string) => {
    const cat = categories.find((c) => c.id === id)
    if (!cat) return
    // 只更新当前语言的名称，另一语言保持不变
    const updated = language === 'zh'
      ? { zh: newName, en: cat.name.en }
      : { zh: cat.name.zh, en: newName }
    void updateName(id, updated)
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>

      <PopoverContent
        side="right"
        align="end"
        className="w-72 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="p-4 flex flex-col gap-4">
          {/* 语言切换 */}
          <div>
            <p className="text-xs font-sans text-text-tertiary mb-2">
              {language === 'zh' ? '界面语言（仅分类名）' : 'Language (category names only)'}
            </p>
            <div className="flex gap-1">
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
          </div>

          <div className="h-px bg-border-subtle" />

          {/* 分类列表 */}
          <div>
            <p className="text-xs font-sans text-text-tertiary mb-2">
              {language === 'zh' ? '分类' : 'Categories'}
            </p>
            <div className="flex flex-col gap-1">
              {categories.map((cat) => (
                <CategoryRow
                  key={cat.id}
                  id={cat.id}
                  name={cat.name[language]}
                  onCommit={handleNameCommit}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

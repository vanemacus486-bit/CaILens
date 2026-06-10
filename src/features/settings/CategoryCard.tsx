import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { CategoryId } from '@/domain/category'
import { flattenFolderKeywords } from '@/domain/category'
import { CategoryNameEditor } from './CategoryNameEditor'
import type { Category } from '@/domain/category'

interface CategoryCardProps {
  category: Category
  language: 'zh' | 'en'
  onNameCommit: (id: CategoryId, name: string) => void
  onBudgetChange: (id: CategoryId, budget: number) => void
  onAddKeyword: (id: CategoryId, keyword: string) => void
  onRemoveKeyword: (id: CategoryId, keyword: string) => void
}

export function CategoryCard({
  category,
  language,
  onNameCommit,
  onBudgetChange,
  onAddKeyword,
  onRemoveKeyword,
}: CategoryCardProps) {
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetValue, setBudgetValue] = useState(String(category.weeklyBudget))
  const [addingKeyword, setAddingKeyword] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [budgetError, setBudgetError] = useState(false)
  const [removingKeyword, setRemovingKeyword] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const keywordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allKeywords = flattenFolderKeywords(category.folders ?? [])

  const handleBudgetClick = () => {
    setEditingBudget(true)
    setBudgetValue(String(category.weeklyBudget))
    setBudgetError(false)
    inputRef.current?.focus()
  }

  const commitBudget = () => {
    setEditingBudget(false)
    const v = parseInt(budgetValue, 10)
    if (!isNaN(v) && v > 0 && v <= 168 && v !== category.weeklyBudget) {
      onBudgetChange(category.id, v)
      setBudgetError(false)
    } else if (budgetValue.trim() !== String(category.weeklyBudget)) {
      setBudgetError(true)
      setTimeout(() => setBudgetError(false), 600)
      setBudgetValue(String(category.weeklyBudget))
    } else {
      setBudgetValue(String(category.weeklyBudget))
    }
  }

  const commitKeyword = () => {
    const trimmed = newKeyword.trim()
    if (trimmed.length >= 2) {
      onAddKeyword(category.id, trimmed)
    }
    setNewKeyword('')
    setAddingKeyword(false)
  }

  const scheduleRemoveKeyword = (kw: string) => () => {
    if (keywordTimeoutRef.current) {
      clearTimeout(keywordTimeoutRef.current)
      keywordTimeoutRef.current = null
    }
    setRemovingKeyword(kw)
    setTimeout(() => {
      onRemoveKeyword(category.id, kw)
      setRemovingKeyword(null)
    }, 2000)
  }

  const cancelRemoveKeyword = (kw: string) => (e: React.MouseEvent) => {
    e.stopPropagation()
    if (kw === removingKeyword) {
      if (keywordTimeoutRef.current) {
        clearTimeout(keywordTimeoutRef.current)
        keywordTimeoutRef.current = null
      }
      setRemovingKeyword(null)
    }
  }

  return (
    <div className="rounded-xl bg-surface-raised border border-border-subtle px-4 py-3.5 flex flex-col gap-3 hover:border-border-default transition-colors duration-200">
      {/* Header row: color dot + name + budget */}
      <div className="flex items-center gap-2.5">
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 ring-1 ring-border-subtle"
          style={{ backgroundColor: `var(--event-${category.id}-text)` }}
        />
        <div className="flex-1 min-w-0">
          <CategoryNameEditor
            id={category.id}
            name={category.name}
            onCommit={onNameCommit}
          />
        </div>
        <div className="flex-shrink-0">
          {editingBudget ? (
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={168}
              value={budgetValue}
              onChange={(e) => setBudgetValue(e.target.value)}
              onBlur={commitBudget}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitBudget()
                if (e.key === 'Escape') {
                  setEditingBudget(false)
                  setBudgetValue(String(category.weeklyBudget))
                }
              }}
              className={cn(
                'w-16 px-2 py-1 text-xs font-mono text-text-primary bg-surface-sunken border rounded-lg text-center focus:ring-2 focus:ring-accent/30 focus:outline-none transition-shadow duration-150',
                budgetError
                  ? 'border-color-text-danger animate-shake'
                  : 'border-border-default',
              )}
              autoFocus
            />
          ) : (
            <button
              onClick={handleBudgetClick}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary bg-surface-sunken hover:bg-surface-base transition-colors duration-150 cursor-pointer border-none"
            >
              <span className="font-medium text-text-primary">{category.weeklyBudget}</span>
              <span className="text-[10px] text-text-tertiary">h</span>
            </button>
          )}
        </div>
      </div>

      {/* Keywords section */}
      <div className="flex flex-wrap items-center gap-1.5 pl-5">
        {allKeywords.map((kw) => {
          const isRemoving = kw === removingKeyword
          return (
            <span
              key={kw}
              className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans transition-all duration-200',
                isRemoving
                  ? 'opacity-40 bg-color-text-danger/10'
                  : 'text-text-secondary bg-surface-sunken',
              )}
            >
              {kw}
              <button
                onClick={isRemoving ? cancelRemoveKeyword(kw) : scheduleRemoveKeyword(kw)}
                className={cn(
                  'inline-flex items-center justify-center w-3.5 h-3.5 rounded-full border-none bg-transparent cursor-pointer transition-colors duration-150',
                  isRemoving
                    ? 'text-color-text-danger'
                    : 'text-text-tertiary hover:text-color-text-danger',
                )}
                style={{ fontSize: 12, lineHeight: 1 }}
                aria-label={isRemoving ? '撤销' : `Remove ${kw}`}
                title={isRemoving ? '点击撤销' : undefined}
              >
                {isRemoving ? '↩' : '×'}
              </button>
            </span>
          )
        })}

        {/* Inline keyword input — Tag Input mode */}
        <input
          type="text"
          value={addingKeyword ? newKeyword : ''}
          onChange={(e) => setNewKeyword(e.target.value)}
          onBlur={commitKeyword}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitKeyword()
            if (e.key === 'Escape') {
              setNewKeyword('')
              setAddingKeyword(false)
            }
            // Enter/Escape on empty input toggles the input on/off
            if ((e.key === 'Escape') && !addingKeyword) {
              setAddingKeyword(false)
            }
          }}
          onFocus={() => {
            if (!addingKeyword) setAddingKeyword(true)
          }}
          placeholder={addingKeyword
            ? (language === 'zh' ? '关键词...' : 'keyword...')
            : (language === 'zh' ? '添加关键词...' : '+ Add keyword...')
          }
          className={cn(
            'px-1 py-0.5 text-xs font-sans bg-transparent border-b transition-colors duration-150',
            addingKeyword
              ? 'border-border-default text-text-primary placeholder-text-tertiary focus-visible:outline-none focus-visible:border-accent'
              : 'border-transparent text-text-tertiary placeholder-text-tertiary hover:border-border-subtle hover:text-text-secondary cursor-text',
          )}
          autoFocus={addingKeyword}
          style={{ minWidth: addingKeyword ? 80 : 64 }}
        />
      </div>
    </div>
  )
}

import { useState, useRef } from 'react'
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
  const inputRef = useRef<HTMLInputElement>(null)

  const allKeywords = flattenFolderKeywords(category.folders ?? [])

  const handleBudgetClick = () => {
    setEditingBudget(true)
    setBudgetValue(String(category.weeklyBudget))
    inputRef.current?.focus()
  }

  const commitBudget = () => {
    setEditingBudget(false)
    const v = parseInt(budgetValue, 10)
    if (!isNaN(v) && v > 0 && v <= 168 && v !== category.weeklyBudget) {
      onBudgetChange(category.id, v)
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

  const removeKeyword = (kw: string) => () => {
    onRemoveKeyword(category.id, kw)
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
              className="w-16 px-2 py-1 text-xs font-mono text-text-primary bg-surface-sunken border border-border-default rounded-lg text-center focus:ring-2 focus:ring-accent/30 focus:outline-none transition-shadow duration-150"
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
        {allKeywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans text-text-secondary bg-surface-sunken group/kw"
          >
            {kw}
            <button
              onClick={removeKeyword(kw)}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full text-text-tertiary hover:text-color-text-danger transition-colors duration-150 cursor-pointer border-none bg-transparent"
              style={{ fontSize: 12, lineHeight: 1 }}
              aria-label={`Remove ${kw}`}
            >
              ×
            </button>
          </span>
        ))}

        {addingKeyword ? (
          <input
            type="text"
            value={newKeyword}
            onChange={(e) => setNewKeyword(e.target.value)}
            onBlur={commitKeyword}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitKeyword()
              if (e.key === 'Escape') {
                setNewKeyword('')
                setAddingKeyword(false)
              }
            }}
            placeholder={language === 'zh' ? '关键词...' : 'keyword...'}
            className="px-1 py-0.5 text-xs font-sans bg-transparent border-b border-border-default text-text-primary placeholder-text-tertiary focus-visible:outline-none focus-visible:border-accent transition-colors duration-150"
            autoFocus
            style={{ minWidth: 80 }}
          />
        ) : (
          <button
            onClick={() => setAddingKeyword(true)}
            className="px-2 py-0.5 text-xs font-sans text-text-tertiary hover:text-text-secondary transition-colors duration-150 cursor-pointer border-none bg-transparent"
          >
            {language === 'zh' ? '+ 添加关键词' : '+ Add keyword'}
          </button>
        )}
      </div>
    </div>
  )
}

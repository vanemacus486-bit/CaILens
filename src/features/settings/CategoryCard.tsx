import { useState } from 'react'
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

  const allKeywords = flattenFolderKeywords(category.folders ?? [])

  const handleBudgetClick = () => {
    setEditingBudget(true)
    setBudgetValue(String(category.weeklyBudget))
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

  return (
    <div
      className="rounded-lg border bg-surface-raised px-3.5 py-3 flex flex-col gap-2"
      style={{ borderColor: 'rgba(128,128,128,0.12)' }}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2.5">
          <span
            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
            style={{ backgroundColor: `var(--event-${category.id}-text)` }}
          />
          <div className="flex-1 min-w-0">
            <CategoryNameEditor
              id={category.id}
              name={category.name}
              onCommit={onNameCommit}
            />
          </div>
        </div>

        <div className="ml-5">
          {editingBudget ? (
            <input
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
              className="w-16 px-1.5 py-1 text-xs font-mono text-text-primary bg-surface-sunken border border-border-subtle rounded text-center focus:border-border-default focus-visible:outline-none"
              autoFocus
            />
          ) : (
            <button
              onClick={handleBudgetClick}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-mono bg-surface-sunken text-text-secondary hover:text-text-primary cursor-pointer transition-colors duration-150 border-none"
            >
              <span className="font-medium text-text-primary">{category.weeklyBudget}</span>
              <span className="text-[10px] text-text-tertiary">h</span>
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pl-5">
        {allKeywords.map((kw) => (
          <span
            key={kw}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-sans text-text-secondary bg-surface-sunken"
          >
            {kw}
            <button
              onClick={() => onRemoveKeyword(category.id, kw)}
              className="inline-flex items-center justify-center w-3.5 h-3.5 rounded-full opacity-50 hover:opacity-100 transition-opacity cursor-pointer border-none bg-transparent text-text-tertiary hover:text-color-text-danger"
              style={{ fontSize: 10, lineHeight: 1 }}
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
            className="px-2 py-0.5 text-xs font-sans bg-transparent border-b border-border-default text-text-primary placeholder-text-tertiary focus-visible:outline-none focus-visible:border-accent"
            autoFocus
            style={{ minWidth: 80 }}
          />
        ) : (
          <button
            onClick={() => setAddingKeyword(true)}
            className="px-2 py-0.5 text-xs font-sans text-text-tertiary hover:text-text-primary transition-colors duration-150 cursor-pointer border-none bg-transparent"
          >
            {language === 'zh' ? '+ 添加' : '+ Add'}
          </button>
        )}
      </div>
    </div>
  )
}

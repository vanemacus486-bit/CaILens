import { useState, useRef } from 'react'
import { translate } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import type { CategoryId } from '@/domain/category'
import { flattenFolderKeywords } from '@/domain/category'
import { CategoryNameEditor } from './CategoryNameEditor'
import type { Category } from '@/domain/category'
import type { AppLanguage } from '@/i18n/types'

interface CategorySettingItemProps {
  category: Category
  language: AppLanguage
  trackedHours: number
  onNameCommit: (id: CategoryId, name: string) => void
  onBudgetChange: (id: CategoryId, budget: number) => void
  onAddKeyword: (id: CategoryId, keyword: string) => void
  onRemoveKeyword: (id: CategoryId, keyword: string) => void
}

/** Format hours for display: whole or 1 decimal */
function fmtH(h: number): string {
  return h >= 10 ? h.toFixed(0) : h.toFixed(1)
}

export function CategorySettingItem({
  category,
  language,
  trackedHours,
  onNameCommit,
  onBudgetChange,
  onAddKeyword,
  onRemoveKeyword,
}: CategorySettingItemProps) {
  const [editingBudget, setEditingBudget] = useState(false)
  const [budgetValue, setBudgetValue] = useState(String(category.weeklyBudget))
  const [budgetError, setBudgetError] = useState(false)
  const [keywordsExpanded, setKeywordsExpanded] = useState(false)
  const [newKeyword, setNewKeyword] = useState('')
  const [removingKeyword, setRemovingKeyword] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const keywordTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const allKeywords = flattenFolderKeywords(category.folders ?? [])

  const handleBudgetClick = () => {
    setEditingBudget(true)
    setBudgetValue(String(category.weeklyBudget))
    setBudgetError(false)
    setTimeout(() => inputRef.current?.focus(), 0)
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
  }

  const scheduleRemoveKeyword = (kw: string) => () => {
    if (keywordTimeoutRef.current) {
      clearTimeout(keywordTimeoutRef.current)
      keywordTimeoutRef.current = null
    }
    setRemovingKeyword(kw)
    keywordTimeoutRef.current = setTimeout(() => {
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
    <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden transition-colors duration-200 hover:border-border-default">
      {/* ── Main row: name + description + controls ── */}
      <div className="px-5 py-4 flex items-center gap-4">
        {/* Color dot */}
        <span
          className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5 self-start"
          style={{ backgroundColor: `var(--event-${category.id}-text)` }}
        />

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <CategoryNameEditor
            id={category.id}
            name={category.name}
            onCommit={onNameCommit}
          />
          <p className="text-[11px] text-text-tertiary mt-0.5 font-sans leading-relaxed">
            {translate('category.autoClassify', language)}
            {allKeywords.length > 0 && ` · ${allKeywords.length} ${translate('common.keywords', language)}`}
          </p>
        </div>

        {/* Budget control */}
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
                'w-14 px-2 py-1 text-xs font-mono text-text-primary bg-surface-sunken border rounded-lg text-center focus:ring-2 focus:ring-accent/30 focus:outline-none transition-shadow duration-150',
                budgetError
                  ? 'border-color-text-danger animate-shake'
                  : 'border-border-default',
              )}
              autoFocus
            />
          ) : (
            <button
              onClick={handleBudgetClick}
              className="inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-mono text-text-secondary hover:text-text-primary bg-transparent hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none"
              title={translate('category.editBudget', language)}
            >
              <span className="font-medium text-text-primary">{category.weeklyBudget}</span>
              <span className="text-[10px] text-text-tertiary">h</span>
            </button>
          )}
        </div>

        {/* Tracked hours this week */}
        <div className="flex-shrink-0 w-16 text-right">
          <span className="text-xs font-mono text-text-tertiary">
            {fmtH(trackedHours)}h
          </span>
          <span className="block text-[10px] text-text-tertiary/60 font-sans">
            {translate('category.thisWeek', language)}
          </span>
        </div>
      </div>

      {/* ── Keywords section (expandable) ── */}
      <div className="border-t border-border-subtle">
        <button
          onClick={() => setKeywordsExpanded(!keywordsExpanded)}
          className={cn(
            'w-full flex items-center gap-1.5 px-5 py-2 text-xs font-sans text-text-tertiary hover:text-text-secondary transition-colors duration-150 cursor-pointer border-none bg-transparent',
            keywordsExpanded && 'text-text-secondary',
          )}
        >
          <span className={cn(
            'inline-block transition-transform duration-200 text-[9px]',
            keywordsExpanded && 'rotate-90',
          )}>
            ▶
          </span>
          {translate('category.manageKeywords', language)}
          {allKeywords.length > 0 && (
            <span className="text-text-tertiary/60">({allKeywords.length})</span>
          )}
        </button>

        {keywordsExpanded && (
          <div className="px-5 pb-3.5 pt-1">
            {/* Existing keyword tags */}
            {allKeywords.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mb-3">
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
              </div>
            ) : (
              <p className="text-[11px] text-text-tertiary font-sans mb-3">
                {translate('category.noKeywords', language)}
              </p>
            )}

            {/* Add keyword input */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitKeyword()
                }}
                placeholder={translate('category.keywordPlaceholder', language)}
                className="flex-1 max-w-[200px] px-2.5 py-1.5 text-xs font-sans text-text-primary bg-surface-sunken border border-border-subtle rounded-lg placeholder-text-tertiary focus:ring-2 focus:ring-accent/30 focus:outline-none transition-shadow duration-150"
              />
              <button
                onClick={commitKeyword}
                disabled={newKeyword.trim().length < 2}
                className="px-3 py-1.5 rounded-lg text-xs font-sans font-medium bg-surface-sunken border border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150 cursor-pointer"
              >
                {translate('common.add', language)}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * # QuickCreateCard — 右键快速创建待办卡片
 *
 * 风格仿照 FloatingEventCard（日历输出框）：
 * - 分类色边框 + 背景色 tint
 * - 底部 5 个分类胶囊（与 FloatingEventCard 相同动画）
 * - Inline autocomplete（从已有待办标题搜索）
 * - Alt+1~5 切换分类，Enter 创建，Esc 关闭
 * - 标题自动分类（classifyEvent）
 *
 * 优先级由右键格子的上下文决定，不在卡片内提供切换。
 * 不再包含日期快捷选项和项目选择器。
 */

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import type { CategoryId } from '@/domain/category'
import type { TodoPriority } from '@/domain/todo'
import { classifyEvent } from '@/domain/icsImport'
import { useCategoryStore } from '@/stores/categoryStore'

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

const CATEGORY_NAMES: Record<CategoryId, string> = {
  accent: '主要矛盾',
  sage: '次要矛盾',
  sand: '庶务时间',
  sky: '个人提升',
  rose: '娱乐休息',
  stone: '睡眠时长',
}

const CATEGORY_BY_ALT_KEY: Record<string, CategoryId> = {
  '1': 'accent',
  '2': 'sage',
  '3': 'sand',
  '4': 'sky',
  '5': 'rose',
}

// ── Props ──────────────────────────────────────────────────

interface QuickCreateCardProps {
  x: number
  y: number
  defaultCategoryId: CategoryId
  /** 优先级由右键格子决定，仅透传，不在卡片内展示/修改 */
  priority: TodoPriority
  /** 已有待办标题列表，用于 inline autocomplete */
  existingTitles: string[]
  onCreate: (input: { title: string; categoryId: CategoryId; priority: TodoPriority }) => void
  onClose: () => void
}

// ── 组件 ──────────────────────────────────────────────────

export function QuickCreateCard({
  x, y,
  defaultCategoryId,
  priority,
  existingTitles,
  onCreate,
  onClose,
}: QuickCreateCardProps) {
  const categories = useCategoryStore((s) => s.categories)

  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId>(defaultCategoryId)
  const [userChangedCategory, setUserChangedCategory] = useState(false)

  // Inline autocomplete
  const [inlineSuggestion, setInlineSuggestion] = useState<string | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── 弹框位置修正 ──────────────────────────────────────

  const adjustedX = Math.min(x, window.innerWidth - 292)
  const adjustedY = Math.min(y, window.innerHeight - 280)

  // ── autoFocus ──────────────────────────────────────────

  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [])

  // ── 点击外部关闭 ──────────────────────────────────────

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (cardRef.current && !cardRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // ── Esc 关闭 ──────────────────────────────────────────

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  // ── 标题自动分类 ──────────────────────────────────────

  useEffect(() => {
    if (userChangedCategory) return
    if (!title.trim()) return
    const matched = classifyEvent(title, categories)
    if (matched && matched !== categoryId && CATEGORY_IDS.includes(matched as CategoryId)) {
      setCategoryId(matched as CategoryId)
    }
  }, [title, categories, userChangedCategory, categoryId])

  // ── Inline autocomplete (debounced) ───────────────────

  const titleFreqMap = useMemo(() => {
    const freq = new Map<string, number>()
    for (const t of existingTitles) {
      if (!t.trim()) continue
      freq.set(t, (freq.get(t) ?? 0) + 1)
    }
    return freq
  }, [existingTitles])

  useEffect(() => {
    const q = title.trim().toLowerCase()
    if (q.length < 1) {
      setInlineSuggestion(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const matches = Array.from(titleFreqMap.entries())
        .sort((a, b) => b[1] - a[1])
        .filter(([t]) => t.toLowerCase().startsWith(q) && t.toLowerCase() !== q)
      setInlineSuggestion(matches.length > 0 ? matches[0][0] : null)
    }, 100)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [title, titleFreqMap])

  // ── 创建 ──────────────────────────────────────────────

  const handleCreate = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate({ title: trimmed, categoryId, priority })
  }, [title, categoryId, priority, onCreate])

  // ── 键盘处理 ──────────────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab → accept inline suggestion
    if (e.key === 'Tab' && !e.shiftKey) {
      if (inlineSuggestion) {
        e.preventDefault()
        setTitle(inlineSuggestion)
        setInlineSuggestion(null)
      }
      return
    }

    // Alt+1~5 → category switching
    if (e.altKey && CATEGORY_BY_ALT_KEY[e.key]) {
      e.preventDefault()
      const newCatId = CATEGORY_BY_ALT_KEY[e.key]
      setCategoryId(newCatId)
      setUserChangedCategory(true)
      setInlineSuggestion(null)
      return
    }

    // Enter → create
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
      return
    }
  }, [inlineSuggestion, handleCreate])

  // ── 派生 ──────────────────────────────────────────────

  const catColor = `var(--event-${categoryId}-fill)`
  const placeholderText = (() => {
    switch (categoryId) {
      case 'accent': return '主要矛盾…'
      case 'sage': return '次要矛盾…'
      case 'sand': return '杂务…'
      case 'sky': return '个人提升…'
      case 'rose': return '休息娱乐…'
      default: return '输入待办标题…'
    }
  })()

  // ── 渲染 ──────────────────────────────────────────────

  return (
    <div
      className="fixed inset-0 z-50"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={cardRef}
        className="absolute rounded-xl border p-4 w-72 shadow-dialog animate-scale-up"
        style={{
          left: adjustedX,
          top: adjustedY,
          borderColor: catColor,
          borderWidth: '1.5px',
          backgroundColor: `var(--event-${categoryId}-bg)`,
        }}
      >
        {/* ── 标题输入（带 inline autocomplete） ── */}
        <div
          className="relative border rounded-md transition-all duration-300 mb-3"
          style={{
            borderColor: catColor,
            borderWidth: '1.5px',
            backgroundColor: `color-mix(in srgb, var(--surface-raised) 88%, transparent)`,
          }}
        >
          {/* Inline suggestion text (behind input) */}
          {inlineSuggestion && (
            <div className="absolute inset-0 flex items-center px-3 py-2 pointer-events-none z-0">
              <span className="text-sm font-sans whitespace-pre text-text-tertiary">
                {inlineSuggestion}
              </span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setInlineSuggestion(null) }}
            onKeyDown={handleKeyDown}
            placeholder={title && inlineSuggestion ? '' : placeholderText}
            className="relative z-10 w-full font-sans text-sm text-text-primary bg-transparent border-0 rounded-md px-3 py-2 h-[36px] focus:outline-none focus:ring-0 placeholder:text-text-tertiary"
            style={{ caretColor: 'var(--text-primary)' }}
          />
        </div>

        {/* ── 分类胶囊（仿 FloatingEventCard 动画） ── */}
        <div className="flex items-center justify-center gap-2.5 h-8">
          {CATEGORY_IDS.map((catId) => {
            const isSel = catId === categoryId
            const dist = Math.abs(
              CATEGORY_IDS.indexOf(catId) - CATEGORY_IDS.indexOf(categoryId)
            )
            return (
              <button
                key={catId}
                type="button"
                onClick={() => {
                  setCategoryId(catId)
                  setUserChangedCategory(true)
                  setInlineSuggestion(null)
                }}
                className="transition-all duration-300 ease-out cursor-pointer flex-shrink-0 rounded-full border-none bg-transparent p-0"
                style={{
                  width: isSel ? '32px' : dist <= 1 ? '22px' : '16px',
                  height: isSel ? '8px' : '5px',
                  transform: `translateY(${isSel ? -4 : 0}px)`,
                  opacity: isSel ? 1 : dist <= 1 ? 0.5 : 0.25,
                  backgroundColor: `var(--event-${catId}-fill)`,
                }}
                title={CATEGORY_NAMES[catId]}
              />
            )
          })}
        </div>

        {/* ── 提示文字 ── */}
        <div className="flex items-center justify-between mt-3 pt-2 border-t border-border-subtle/50">
          <span className="text-[10px] font-sans text-text-quaternary">
            {'Enter 创建 · Esc 取消 · Alt+1~5 分类'}
          </span>
        </div>
      </div>
    </div>
  )
}

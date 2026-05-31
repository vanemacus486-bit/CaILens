import { useState, useRef, useEffect, useCallback } from 'react'
import { addDays } from 'date-fns'
import { X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCategoryStore } from '@/stores/categoryStore'

import { getEventRepo } from '@/data/getRepositories'
import { classifyEvent } from '@/domain/icsImport'
import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput, TypedEventData, SleepSubType } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { SleepPanel } from './SubPanels'

// ── Types ───────────────────────────────────────────────

export type CardMode =
  | 'input'          // 默认打字模式
  | 'chores'         // 庶务 → 显示图标
  | 'meal-food'      // 庶务→吃饭 → 输入食物
  | 'growth'         // 个人提升 → 阅读/运动图标
  | 'growth-read'    // 个人提升→阅读
  | 'growth-sport'   // 个人提升→运动
  | 'leisure'        // 娱乐放松
  | 'sleep'          // 睡眠

interface FloatingEventCardProps {
  open: boolean
  anchorEl: HTMLElement
  defaultTimes: { start: number; end: number }
  defaultColor?: EventColor
  editingEvent?: CalendarEvent
  onClose: () => void
  onSave: (input: CreateEventInput) => Promise<string>
  onUpdate: (input: UpdateEventInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

// ── Helpers ─────────────────────────────────────────────

const CATEGORY_NAMES: Record<CategoryId, [string, string]> = {
  accent: ['主要矛盾', 'Core Focus'],
  sage:   ['次要矛盾', 'Support'],
  sand:   ['庶务时间', 'Chores'],
  sky:    ['个人提升', 'Growth'],
  rose:   ['娱乐放松', 'Leisure'],
  stone:  ['睡眠时间', 'Sleep'],
}

const CATEGORY_BY_ALT_KEY: Record<string, CategoryId> = {
  '1': 'accent',
  '2': 'sage',
  '3': 'sand',
  '4': 'sky',
  '5': 'rose',
  '6': 'stone',
}

function modeFromCategory(catId: CategoryId): CardMode {
  switch (catId) {
    case 'accent': case 'sage': return 'input'
    case 'sand':  return 'chores'
    case 'sky':   return 'growth'
    case 'rose':  return 'leisure'
    case 'stone': return 'sleep'
    default:      return 'input'
  }
}

function tsToStr(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function strToTs(date: Date, s: string): number {
  const [h, m] = s.split(':').map(Number)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), h, m).getTime()
}

function isNextDayEnd(startStr: string, endStr: string): boolean {
  return startStr.length > 0 && endStr.length > 0 && endStr <= startStr
}

// ── Aggregate recent items ──────────────────────────────


function isMealTitle(text: string): boolean {
  const mealKeywords = ['吃饭', '早餐', '午餐', '晚餐', '宵夜', '午饭', '晚饭']
  const t = text.trim()
  return mealKeywords.some(k => t === k || t.startsWith(k))
}

// ═══════════════════════════════════════════════════════════
//  Component
// ═══════════════════════════════════════════════════════════

export function FloatingEventCard({
  open, anchorEl, defaultTimes, defaultColor,
  editingEvent, onClose, onSave, onUpdate, onDelete,
}: FloatingEventCardProps) {
  const categories   = useCategoryStore((s) => s.categories)
  const isEditing    = !!editingEvent
  const localDate = new Date(defaultTimes.start)

  // ── Core state ──────────────────────────────────────

  const [mode, setMode] = useState<CardMode>(() => {
    if (editingEvent?.typedData?.type === 'sleep') return 'sleep'
    if (editingEvent?.typedData?.type === 'meal') return 'meal-food'
    return modeFromCategory(editingEvent?.categoryId ?? defaultColor ?? 'accent')
  })

  const [categoryId, setCategoryId] = useState<CategoryId>(
    editingEvent?.categoryId ?? defaultColor ?? 'accent',
  )
  const [title, setTitle] = useState(editingEvent?.title ?? '')
  const [userChangedCategory, setUserChangedCategory] = useState(false)

  // Sub-mode states
  const [sleepType, setSleepType] = useState<SleepSubType>(
    editingEvent?.typedData?.type === 'sleep' ? editingEvent.typedData.sleepType : 'main',
  )
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5 | null>(
    editingEvent?.typedData?.type === 'sleep' ? (editingEvent.typedData.quality ?? null) : null,
  )

  // Time editing
  const [startStr, setStartStr] = useState(tsToStr(defaultTimes.start))
  const [endStr, setEndStr] = useState(tsToStr(defaultTimes.end))
  const [showTimeEdit, setShowTimeEdit] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inline autocomplete suggestion
  const [inlineSuggestion, setInlineSuggestion] = useState<string | null>(null)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // ── Derived ─────────────────────────────────────────

  const currentCategoryName = CATEGORY_NAMES[categoryId]
  const catColor = `var(--event-${categoryId}-fill)`

  // ── Top 3 recent titles for current category ─────────
  // (removed — no longer displayed)

  // ── Auto-classify when title changes ────────────────

  useEffect(() => {
    if (userChangedCategory) return
    if (!title.trim()) return
    const matched = classifyEvent(title, categories)
    if (matched && matched !== categoryId) {
      setCategoryId(matched)
      setMode(modeFromCategory(matched))
    }
  }, [title, categories, userChangedCategory, categoryId])

  // ── Focus input on mount ────────────────────────────

  useEffect(() => {
    if (!open) return

    const timer = setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
    return () => clearTimeout(timer)
  }, [open, mode])

  // ── Inline suggestion (debounced) ─────────────────────

  useEffect(() => {
    const q = title.trim().toLowerCase()
    if (q.length < 1) {
      setInlineSuggestion(null)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const repo = getEventRepo()
        const results = await repo.search(q, 8)
        const freq = new Map<string, number>()
        for (const e of results) {
          if (e.categoryId !== categoryId) continue
          if (!e.title.trim()) continue
          freq.set(e.title, (freq.get(e.title) ?? 0) + 1)
        }
        const matches = Array.from(freq.entries())
          .sort((a, b) => b[1] - a[1])
          .filter(([t]) => t.toLowerCase().startsWith(q) && t.toLowerCase() !== q)
        setInlineSuggestion(matches.length > 0 ? matches[0][0] : null)
      } catch {
        setInlineSuggestion(null)
      }
    }, 100)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [title, categoryId])

  // ── Keyboard handler ────────────────────────────────

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

    // Alt+1~6 → category switching
    if (e.altKey && CATEGORY_BY_ALT_KEY[e.key]) {
      e.preventDefault()
      const newCatId = CATEGORY_BY_ALT_KEY[e.key]
      setCategoryId(newCatId)
      setUserChangedCategory(true)
      setMode(modeFromCategory(newCatId))
      setError(null)
      setInlineSuggestion(null)
      return
    }

    // Enter → save
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveRef.current()
      return
    }

    // Escape → close card or go back to chores
    if (e.key === 'Escape') {
      e.preventDefault()
      if (mode === 'meal-food') {
        setMode('chores')
        setTitle('')
        setInlineSuggestion(null)
      } else {
        onClose()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inlineSuggestion, categoryId, mode])

  // ── Save logic ──────────────────────────────────────

  function getTimeError(): string | null {
    if (!startStr) return '请设置开始时间'
    if (!endStr) return '请设置结束时间'
    const s = strToTs(localDate, startStr)
    const endDate = isNextDayEnd(startStr, endStr) ? addDays(localDate, 1) : localDate
    const e = strToTs(endDate, endStr)
    if (isNaN(s) || isNaN(e)) return '无效时间'
    if (e <= s) return '结束时间必须在开始时间之后'
    return null
  }

  async function handleSave(overrideTitle?: string) {
    // If user typed a meal keyword (吃饭 etc.) in chores/input mode,
    // switch to meal-food mode instead of saving
    const effectiveTitle = overrideTitle ?? title
    if (!overrideTitle && (mode === 'chores' || mode === 'input') && isMealTitle(effectiveTitle)) {
      setMode('meal-food')
      setTitle('')
      setInlineSuggestion(null)
      return
    }

    const timeErr = getTimeError()
    if (timeErr) { setError(timeErr); return }

    const endDate = isNextDayEnd(startStr, endStr) ? addDays(localDate, 1) : localDate
    const startTime = strToTs(localDate, startStr)
    const endTime = strToTs(endDate, endStr)

    // Build typedData based on mode
    let typedData: TypedEventData | undefined
    let eventTitle = effectiveTitle

    if (mode === 'sleep' || (editingEvent?.typedData?.type === 'sleep')) {
      typedData = {
        type: 'sleep',
        sleepType,
        quality: quality ?? undefined,
        bedtime: startTime,
        wakeTime: endTime,
      } as TypedEventData
      eventTitle = sleepType === 'main' ? '睡觉' : sleepType === 'nap' ? '小睡' : '失眠'
    } else if (mode === 'meal-food' || (editingEvent?.typedData?.type === 'meal')) {
      typedData = {
        type: 'meal',
        mealOrder: inferMealOrder(startTime),
        foodTags: [],
        source: 'home',
      } as TypedEventData
      eventTitle = title || '吃饭'
    }

    // Also set typedKey
    const typedKey = typedData?.type ?? null

    const input = {
      title: eventTitle,
      startTime,
      endTime,
      color: categoryId as EventColor,
      categoryId,
      typedKey,
      typedData,
    }

    try {
      if (isEditing && editingEvent) {
        await onUpdate({ id: editingEvent.id, ...input })
      } else {
        await onSave(input)
      }
      onClose()
    } catch {
      setError('保存失败')
    }
  }

  // ── Delete handler ───────────────────────────────────

  async function handleDelete() {
    if (!editingEvent) return
    try {
      await onDelete(editingEvent.id)
      onClose()
    } catch {
      setError('删除失败')
    }
  }

  // ── Switch category (from click or Alt+1~6) ────────

  const switchCategory = useCallback((newCatId: CategoryId) => {
    setCategoryId(newCatId)
    setUserChangedCategory(true)
    setMode(modeFromCategory(newCatId))
    setError(null)
  }, [])

  // ── Render helpers ──────────────────────────────────

  const renderCategoryLine = () => (
    <div className="flex items-center gap-1.5">
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
      <span className="text-xs text-text-tertiary font-sans">{currentCategoryName[0]}</span>
    </div>
  )

  // ── Render sleep mode ───────────────────────────────

  function renderSleepMode() {
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
            <span className="font-mono text-xs text-text-secondary">{startStr} – {endStr}</span>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary cursor-pointer p-1">
            <X size={16} />
          </button>
        </div>

        <SleepPanel
          sleepType={sleepType}
          quality={quality}
          onChangeSleepType={setSleepType}
          onChangeQuality={setQuality}
        />

        {error && <p className="text-xs text-color-text-danger mt-2 font-sans">{error}</p>}

        {renderCategoryLine()}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-4">
          {isEditing && (
            <button onClick={handleDelete} className="font-sans text-xs text-color-text-danger bg-transparent border border-color-text-danger/30 rounded-md px-3 py-1.5 cursor-pointer hover:bg-color-text-danger/10 transition-colors">
              {'删除'}
            </button>
          )}
          <button
            onClick={() => handleSave()}
            className="font-sans text-xs font-medium text-white bg-accent border-none rounded-md px-4 py-1.5 cursor-pointer hover:bg-accent-hover transition-colors"
          >
            {isEditing ? '保存' : '记录'}
          </button>
        </div>
      </>
    )
  }

  // ── Default render (input / chores / growth / leisure / growth sub-modes) ──

  function renderDefaultMode() {
    const placeholderText = (() => {
      switch (mode) {
        case 'chores': return '做了哪些杂务？'
        case 'meal-food': return '例如：牛肉面'
        case 'growth': return '学了/练了什么？'
        case 'leisure': return '怎么放松的？'
        default: return '这段时间在做什么？'
      }
    })()

    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
            <span className="font-mono text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors" onClick={() => setShowTimeEdit(!showTimeEdit)}>
              {startStr} – {endStr}
            </span>
            {mode === 'meal-food' && (
              <span className="text-xs text-text-tertiary font-sans ml-1">🍚 吃饭</span>
            )}
          </div>
          <button
            onClick={mode === 'meal-food' ? () => { setMode('chores'); setTitle(''); setInlineSuggestion(null) } : onClose}
            className="text-text-tertiary hover:text-text-primary cursor-pointer p-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Collapsible time editor */}
        {showTimeEdit && (
          <div className="flex gap-2 mb-2 animate-slide-down">
            <input type="time" value={startStr} onChange={(e) => { setStartStr(e.target.value); setError(null) }}
              className="flex-1 font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-2 py-1.5 focus:border-border-default focus-visible:outline-none" />
            <input type="time" value={endStr} onChange={(e) => { setEndStr(e.target.value); setError(null) }}
              className="flex-1 font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded-md px-2 py-1.5 focus:border-border-default focus-visible:outline-none" />
          </div>
        )}

        {/* Main input with inline suggestion + category tint */}
        <div
          className="relative border rounded-md transition-all duration-300"
          style={{
            borderColor: `var(--event-${categoryId}-fill)`,
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
            className={cn(
              'relative z-10 w-full font-sans text-sm text-text-primary',
              'bg-transparent border-0 rounded-md',
              'px-3 py-2 h-[36px]',
              'focus:outline-none focus:ring-0',
              'placeholder:text-text-tertiary',
            )}
            style={{ caretColor: 'var(--text-primary)' }}
          />
        </div>

        {/* Capsules — category selector */}
        <div className="flex items-center justify-center gap-2.5 mt-3 h-8">
          {(['accent','sage','sand','sky','rose','stone'] as const).map((catId) => {
            const isSel = catId === categoryId
            const dist = Math.abs(
              ['accent','sage','sand','sky','rose','stone'].indexOf(catId) -
              ['accent','sage','sand','sky','rose','stone'].indexOf(categoryId)
            )
            return (
              <button
                key={catId}
                onClick={() => switchCategory(catId)}
                className="transition-all duration-300 ease-out cursor-pointer flex-shrink-0 rounded-full"
                style={{
                  width: isSel ? '32px' : dist <= 1 ? '22px' : '16px',
                  height: isSel ? '8px' : '5px',
                  transform: `translateY(${isSel ? -4 : 0}px)`,
                  opacity: isSel ? 1 : dist <= 1 ? 0.5 : 0.25,
                  backgroundColor: `var(--event-${catId}-fill)`,
                }}
              />
            )
          })}
        </div>


        {error && <p className="text-xs text-color-text-danger mt-1 font-sans">{error}</p>}

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3">
          {isEditing && (
            <button onClick={handleDelete} className="font-sans text-xs text-color-text-danger bg-transparent border border-color-text-danger/30 rounded-md px-3 py-1.5 cursor-pointer hover:bg-color-text-danger/10 transition-colors">
              {'删除'}
            </button>
          )}
          <button
            onClick={() => handleSave()}
            className="font-sans text-xs font-medium text-white bg-accent border-none rounded-md px-4 py-1.5 cursor-pointer hover:bg-accent-hover transition-colors"
          >
            {isEditing ? '保存' : '记录'}
          </button>
        </div>
      </>
    )
  }

  // ═══════════════════════════════════════════════════════
  //  Main render
  // ═══════════════════════════════════════════════════════

  if (!open) return null

  const content = mode === 'sleep' ? renderSleepMode()
    : renderDefaultMode()

  return (
    <Popover open>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        side="right"
        sideOffset={8}
        collisionPadding={16}
        className="w-72 p-4 rounded-xl border-border-default max-md:!w-[calc(100vw-1rem)] max-md:max-w-72"
        style={{
          backgroundColor: `var(--event-${categoryId}-bg)`,
        }}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

// ── Helper ─────────────────────────────────────────────

function inferMealOrder(timeMs: number): 'breakfast' | 'lunch' | 'dinner' | 'night_snack' {
  const h = new Date(timeMs).getHours()
  if (h < 10) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 21) return 'dinner'
  return 'night_snack'
}

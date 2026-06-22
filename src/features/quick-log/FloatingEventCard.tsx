import { useState, useRef, useEffect, useCallback } from 'react'
import { X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCategoryStore } from '@/stores/categoryStore'
import { getEventRepo } from '@/data/getRepositories'
import { classifyEvent } from '@/domain/icsImport'
import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput, TypedEventData, SleepSubType } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { inferHygieneActivity, findHygieneActivity, DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { RecentPills } from './RecentPills'
import { AutocompleteDropdown, type AutocompleteSuggestion } from './AutocompleteDropdown'

// ── Types ───────────────────────────────────────────────

export type CardMode =
  | 'input'         // 默认打字模式
  | 'chores'        // 庶务
  | 'meal-food'     // 吃饭 → 输入食物
  | 'growth'        // 个人提升 → 未指定
  | 'leisure'       // 娱乐放松
  | 'sleep'         // 睡眠

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
  /** 记录并继续：用上一条的结束时间立即开下一条 */
  onContinue?: (nextStart: number, nextEnd: number, color: EventColor) => void
}

// ── Helpers ─────────────────────────────────────────────

const CATEGORY_BY_ALT_KEY: Record<string, CategoryId> = {
  '1': 'accent',
  '2': 'sage',
  '3': 'sand',
  '4': 'sky',
  '5': 'rose',
  '6': 'stone',
}

// 底部分类点的顺序与 Alt 数字键一一对应
const CATEGORY_DOTS: { id: CategoryId; altKey: string }[] = [
  { id: 'accent', altKey: '1' },
  { id: 'sage',   altKey: '2' },
  { id: 'sand',   altKey: '3' },
  { id: 'sky',    altKey: '4' },
  { id: 'rose',   altKey: '5' },
  { id: 'stone',  altKey: '6' },
]

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

function formatDuration(min: number): string {
  if (min <= 0) return ''
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m}分`
  if (m === 0) return `${h}时`
  return `${h}时${m}分`
}

function dateLabel(ts: number): string {
  const d = new Date(ts)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

function isMealTitle(text: string): boolean {
  const mealKeywords = ['吃饭', '早餐', '午餐', '晚餐', '宵夜', '午饭', '晚饭']
  const t = text.trim()
  return mealKeywords.some(k => t === k || t.startsWith(k))
}

function inferMealOrder(timeMs: number): 'breakfast' | 'lunch' | 'dinner' | 'night_snack' {
  const h = new Date(timeMs).getHours()
  if (h < 10) return 'breakfast'
  if (h < 16) return 'lunch'
  if (h < 21) return 'dinner'
  return 'night_snack'
}

// ── Component ───────────────────────────────────────────

export function FloatingEventCard({
  open, anchorEl, defaultTimes, defaultColor,
  editingEvent, onClose, onSave, onUpdate, onDelete, onContinue,
}: FloatingEventCardProps) {
  const categories = useCategoryStore((s) => s.categories)
  const hygieneActivities = useAppSettingsStore((s) => s.settings.hygieneActivities) ?? DEFAULT_HYGIENE_ACTIVITIES
  const isEditing = !!editingEvent

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
  const [manualCategory, setManualCategory] = useState(false)

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

  // Cross-day flag
  const [crossDay, setCrossDay] = useState(() => {
    const endD = new Date(defaultTimes.end)
    const startD = new Date(defaultTimes.start)
    return endD.toDateString() !== startD.toDateString()
  })

  // Display end timestamp
  const effectiveEndTs = (() => {
    const [eh, em] = endStr.split(':').map(Number)
    const base = new Date(defaultTimes.start)
    const ts = new Date(base.getFullYear(), base.getMonth(), base.getDate(), eh, em).getTime()
    return crossDay ? ts + 24 * 60 * 60 * 1000 : ts
  })()

  // Effective start timestamp + live duration (minutes)
  const effectiveStartTs = (() => {
    const [sh, sm] = startStr.split(':').map(Number)
    const base = new Date(defaultTimes.start)
    return new Date(base.getFullYear(), base.getMonth(), base.getDate(), sh, sm).getTime()
  })()
  const durationMin = Math.max(0, Math.round((effectiveEndTs - effectiveStartTs) / 60_000))

  // Autocomplete suggestions below input
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const [selectedIndex, setSelectedIndex] = useState(-1)

  // 键位提示行：只在前几次使用时出现，老用户自动消失
  const [showHint] = useState(() => {
    try { return Number(localStorage.getItem('cailens.cardHintSeen') ?? '0') < 6 }
    catch { return false }
  })

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSaveRef = useRef(handleSave)
  handleSaveRef.current = handleSave

  // Popover 锚点：包成 virtualRef 以匹配 Radix Measurable 接口
  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl

  // ── Derived ─────────────────────────────────────────

  const catColor = `var(--event-${categoryId}-fill)`

  // 卫生提示：新建且非睡眠/吃饭模式时，标题命中卫生关键词则提示将记为"卫生"事件
  const hygieneHintId = !isEditing && mode !== 'sleep' && mode !== 'meal-food'
    ? inferHygieneActivity(title, hygieneActivities)
    : null
  const hygieneHint = hygieneHintId ? findHygieneActivity(hygieneActivities, hygieneHintId) : null

  // ── Auto-classify when title changes ────────────────

  useEffect(() => {
    if (userChangedCategory) return
    if (!title.trim()) return
    const matched = classifyEvent(title, categories)
    if (matched && matched !== categoryId) {
      setCategoryId(matched)
      setUserChangedCategory(true)
      setMode(modeFromCategory(matched))
    }
  }, [title, categories, userChangedCategory, categoryId])

  // ── Focus input on mount ────────────────────────────

  useEffect(() => {
    if (!open) return
    const timer = setTimeout(() => inputRef.current?.focus(), 50)
    return () => clearTimeout(timer)
  }, [open, mode])

  // ── Autocomplete suggestions (debounced) ────────────

  useEffect(() => {
    const q = title.trim().toLowerCase()
    if (q.length < 2) {
      setSuggestions([])
      setSelectedIndex(-1)
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const repo = getEventRepo()
        const results = await repo.search(q, 40)
        const freq = new Map<string, number>()
        for (const e of results) {
          if (e.categoryId !== categoryId) continue
          if (!e.title.trim()) continue
          freq.set(e.title, (freq.get(e.title) ?? 0) + 1)
        }
        const matches = Array.from(freq.entries())
          .filter(([t]) => t.toLowerCase().includes(q) && t.toLowerCase() !== q)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([t, count]) => ({ title: t, count }))
        setSuggestions(matches)
        setSelectedIndex(-1)
      } catch {
        setSuggestions([])
      }
    }, 150)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [title, categoryId])

  // ── Category selection (shared by Alt+1~6 and dots) ──

  const selectCategory = useCallback((newCatId: CategoryId) => {
    setCategoryId(newCatId)
    setUserChangedCategory(true)
    setManualCategory(true)
    setMode(modeFromCategory(newCatId))
    setError(null)
    setSuggestions([])
    setSelectedIndex(-1)
  }, [])

  const acceptSuggestion = useCallback((s: AutocompleteSuggestion) => {
    setTitle(s.title)
    setSuggestions([])
    setSelectedIndex(-1)
  }, [])

  // ── Keyboard handler ────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const hasList = suggestions.length > 0

    // ↑↓ → navigate suggestions (-1 = back to typed text)
    if (hasList && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setSelectedIndex((i) =>
        e.key === 'ArrowDown'
          ? Math.min(suggestions.length - 1, i + 1)
          : Math.max(-1, i - 1),
      )
      return
    }

    // Tab → accept highlighted (or top) suggestion
    if (e.key === 'Tab' && !e.shiftKey) {
      if (hasList) {
        e.preventDefault()
        acceptSuggestion(suggestions[selectedIndex >= 0 ? selectedIndex : 0])
      }
      return
    }

    // Alt+1~6 → category switching
    if (e.altKey && CATEGORY_BY_ALT_KEY[e.key]) {
      e.preventDefault()
      selectCategory(CATEGORY_BY_ALT_KEY[e.key])
      return
    }

    // Enter → 两段式：候选高亮时先采用，否则保存（⇧⏎ 记录并继续）
    if (e.key === 'Enter') {
      e.preventDefault()
      if (hasList && selectedIndex >= 0) {
        acceptSuggestion(suggestions[selectedIndex])
        return
      }
      handleSaveRef.current(e.shiftKey)
      return
    }

    // Escape → 先收候选，再退吃饭子模式，最后关卡片
    if (e.key === 'Escape') {
      e.preventDefault()
      if (hasList) {
        setSuggestions([])
        setSelectedIndex(-1)
      } else if (mode === 'meal-food') {
        setMode('chores')
        setTitle('')
      } else {
        onClose()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions, selectedIndex, mode, selectCategory, acceptSuggestion])

  // ── Save logic ──────────────────────────────────────

  function getTimeError(): string | null {
    if (!startStr) return '请设置开始时间'
    if (!endStr) return '请设置结束时间'
    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    const startD = new Date(defaultTimes.start)
    const startTs = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), sh, sm).getTime()
    const endD = new Date(startD)
    endD.setHours(eh, em, 0, 0)
    let endTs = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), eh, em).getTime()
    if (crossDay) endTs += 24 * 60 * 60 * 1000
    if (isNaN(startTs) || isNaN(endTs)) return '无效时间'
    if (endTs <= startTs) return '结束时间必须在开始时间之后'
    return null
  }

  async function handleSave(continueAfter = false) {
    const effectiveTitle = title
    if ((mode === 'chores' || mode === 'input') && isMealTitle(effectiveTitle)) {
      setMode('meal-food')
      setTitle('')
      setSuggestions([])
      return
    }

    const timeErr = getTimeError()
    if (timeErr) { setError(timeErr); return }

    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    const startD = new Date(defaultTimes.start)
    const startTime = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), sh, sm).getTime()
    const endD = new Date(startD)
    endD.setHours(eh, em, 0, 0)
    let endTime = new Date(endD.getFullYear(), endD.getMonth(), endD.getDate(), eh, em).getTime()
    if (crossDay) endTime += 24 * 60 * 60 * 1000

    let typedData: TypedEventData | undefined
    let eventTitle = effectiveTitle
    let saveCategory: CategoryId = categoryId

    if (mode === 'sleep' || editingEvent?.typedData?.type === 'sleep') {
      typedData = {
        type: 'sleep',
        sleepType,
        quality: quality ?? undefined,
        bedtime: startTime,
        wakeTime: endTime,
      } as TypedEventData
      eventTitle = sleepType === 'main' ? '睡觉' : sleepType === 'nap' ? '小睡' : '失眠'
    } else if (mode === 'meal-food' || editingEvent?.typedData?.type === 'meal') {
      typedData = {
        type: 'meal',
        mealOrder: inferMealOrder(startTime),
        foodTags: [],
        source: 'home',
      } as TypedEventData
      eventTitle = title || '吃饭'
    } else if (
      editingEvent?.typedData?.type === 'hygiene' ||
      inferHygieneActivity(effectiveTitle, hygieneActivities)
    ) {
      const existing = editingEvent?.typedData
      const activityId =
        existing && existing.type === 'hygiene'
          ? existing.activity
          : inferHygieneActivity(effectiveTitle, hygieneActivities)
      if (activityId) {
        const def = findHygieneActivity(hygieneActivities, activityId)
        typedData = { type: 'hygiene', activity: activityId } as TypedEventData
        eventTitle = effectiveTitle.trim() || def?.name || '卫生'
        // 卫生默认归"庶务"，除非用户用 Alt+数字手动选了分类
        if (!manualCategory && !isEditing) saveCategory = 'sand'
      }
    }

    const input = {
      title: eventTitle,
      startTime,
      endTime,
      color: saveCategory as EventColor,
      categoryId: saveCategory,
      typedKey: typedData?.type ?? null,
      typedData,
    }

    try {
      if (isEditing && editingEvent) {
        await onUpdate({ id: editingEvent.id, ...input })
        onClose()
      } else {
        await onSave(input)
        try {
          const n = Number(localStorage.getItem('cailens.cardHintSeen') ?? '0')
          localStorage.setItem('cailens.cardHintSeen', String(n + 1))
        } catch { /* ignore */ }
        if (continueAfter && onContinue) {
          // 下一条接力：开始=本条结束，时长沿用本条，分类沿用
          onContinue(endTime, endTime + (endTime - startTime), saveCategory as EventColor)
        } else {
          onClose()
        }
      }
    } catch {
      setError('保存失败')
    }
  }

  // ── Duration quick chips ─────────────────────────────

  function applyDuration(min: number) {
    const end = effectiveStartTs + min * 60_000
    const endD = new Date(end)
    const startD = new Date(effectiveStartTs)
    setEndStr(`${String(endD.getHours()).padStart(2, '0')}:${String(endD.getMinutes()).padStart(2, '0')}`)
    setCrossDay(endD.toDateString() !== startD.toDateString())
    setError(null)
  }

  // ── Delete ───────────────────────────────────────────

  async function handleDelete() {
    if (!editingEvent) return
    try { await onDelete(editingEvent.id); onClose() }
    catch { setError('删除失败') }
  }

  // ── Render helpers ──────────────────────────────────

  const headerTime = `${dateLabel(defaultTimes.start)} ${startStr} – ${
    crossDay ? dateLabel(effectiveEndTs + 24*60*60*1000) : dateLabel(effectiveEndTs)
  } ${endStr}`

  const placeholderText = (() => {
    switch (mode) {
      case 'chores': return '做了哪些杂务？'
      case 'meal-food': return '例如：牛肉面'
      case 'growth': return '学了/练了什么？'
      case 'leisure': return '怎么放松的？'
      default: return '这段时间在做什么？'
    }
  })()

  const timeRange = `${startStr} – ${
    crossDay ? dateLabel(effectiveEndTs + 24*60*60*1000) + ' ' : ''
  }${endStr}`

  // ── Sleep mode ───────────────────────────────────────

  function renderSleepMode() {
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: catColor }} />
            <span className="font-mono text-xs text-text-secondary">{timeRange}</span>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary cursor-pointer p-1" aria-label="关闭">
            <X size={16} />
          </button>
        </div>

        {/* Sleep type */}
        <div className="flex gap-1 mb-4">
          {([
            { key: 'main' as const, label: '睡觉' },
            { key: 'nap' as const, label: '小睡' },
            { key: 'insomnia' as const, label: '失眠' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => setSleepType(t.key)}
              className={cn(
                'flex-1 py-2 rounded-lg text-xs font-sans font-medium transition-all duration-200 cursor-pointer border',
                sleepType === t.key
                  ? 'border-border-default text-text-primary bg-surface-raised'
                  : 'border-transparent text-text-tertiary hover:bg-surface-sunken bg-surface-sunken',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Quality */}
        <div className="mb-4">
          <div className="text-xs text-text-tertiary mb-2 font-sans">睡眠质量</div>
          <div className="flex justify-between gap-1">
            {([1, 2, 3, 4, 5] as const).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={cn(
                  'flex-1 flex flex-col items-center gap-0.5 py-1.5 rounded-lg transition-all duration-200 cursor-pointer',
                  quality === q
                    ? 'bg-surface-raised ring-1 ring-text-secondary scale-105'
                    : 'bg-surface-sunken text-text-tertiary hover:bg-surface-base',
                )}
              >
                <span className="text-base leading-none">{q <= 2 ? '😩' : q <= 3 ? '🙂' : '😌'}</span>
                <span className="text-[10px] leading-tight">
                  {quality === q ? ['', '较差', '不好', '一般', '良好', '很好'][q] : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-xs text-color-text-danger mt-1 font-sans">{error}</p>}

        <div className="flex justify-end gap-2 mt-3">
          {isEditing && (
            <button onClick={handleDelete} className="font-sans text-xs text-color-text-danger bg-transparent border border-color-text-danger/30 rounded-md px-3 py-1.5 cursor-pointer hover:bg-color-text-danger/10 transition-colors">
              删除
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

  // ── Default mode ─────────────────────────────────────

  function renderDefaultMode() {
    const showRecent = !isEditing && title.trim().length === 0
    const showList = suggestions.length > 0
    return (
      <>
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
            <button
              onClick={() => setShowTimeEdit(!showTimeEdit)}
              className="font-mono text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors truncate"
            >
              {headerTime}
              {durationMin > 0 && (
                <span className="text-text-tertiary">{` · ${formatDuration(durationMin)}`}</span>
              )}
            </button>
            {mode === 'meal-food' && (
              <span className="text-xs text-text-tertiary font-sans flex-shrink-0">吃饭</span>
            )}
            {hygieneHint && (
              <span className="text-xs text-text-tertiary font-sans flex-shrink-0">
                {`卫生 · ${hygieneHint.name}`}
              </span>
            )}
          </div>
          <button
            onClick={mode === 'meal-food'
              ? () => { setMode('chores'); setTitle(''); setSuggestions([]) }
              : onClose
            }
            className="text-text-tertiary hover:text-text-primary cursor-pointer p-1 flex-shrink-0"
            aria-label="关闭"
          >
            <X size={16} />
          </button>
        </div>

        {/* Collapsible time editor */}
        {showTimeEdit && (
          <div className="mb-2 animate-slide-down">
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={startStr}
                onChange={(e) => { setStartStr(e.target.value); setError(null) }}
                className="flex-1 font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded px-2 py-1.5 focus:border-border-default focus-visible:outline-none"
              />
              <button
                onClick={() => { setCrossDay(!crossDay); setError(null) }}
                className={cn(
                  'px-2 py-1.5 rounded text-xs font-sans border transition-colors cursor-pointer flex-shrink-0',
                  crossDay
                    ? 'bg-accent/10 border-accent/40 text-accent'
                    : 'bg-surface-sunken border-border-subtle text-text-tertiary hover:bg-surface-base',
                )}
                title="次日"
              >
                次日
              </button>
              <input
                type="time"
                value={endStr}
                onChange={(e) => { setEndStr(e.target.value); setError(null) }}
                className="flex-1 font-mono text-xs text-text-primary bg-surface-sunken border border-border-subtle rounded px-2 py-1.5 focus:border-border-default focus-visible:outline-none"
              />
            </div>
            {/* Duration quick chips */}
            <div className="flex gap-1.5 mt-1.5">
              {[15, 30, 60, 120].map((min) => (
                <button
                  key={min}
                  onClick={() => applyDuration(min)}
                  className={cn(
                    'flex-1 py-1 rounded text-xs font-sans border transition-colors cursor-pointer',
                    durationMin === min
                      ? 'bg-accent/10 border-accent/40 text-accent'
                      : 'bg-surface-sunken border-border-subtle text-text-tertiary hover:bg-surface-base',
                  )}
                >
                  {min < 60 ? `${min}分` : `${min / 60}时`}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Main input */}
        <div className="relative mb-1">
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setSelectedIndex(-1) }}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className={cn(
              'w-full font-sans text-sm text-text-primary',
              'bg-transparent border-0',
              'pl-2 pr-2 py-2 h-[36px]',
              'focus:outline-none focus:ring-0',
              'placeholder:text-text-tertiary',
            )}
            style={{
              borderLeft: `2px solid ${catColor}`,
              caretColor: 'var(--text-primary)',
            }}
          />
        </div>

        {/* Autocomplete dropdown (while typing) */}
        {showList && (
          <AutocompleteDropdown
            suggestions={suggestions}
            selectedIndex={selectedIndex}
            onSelect={(t) => { setTitle(t); setSuggestions([]); setSelectedIndex(-1); inputRef.current?.focus() }}
          />
        )}

        {/* Recent pills (empty input) */}
        {showRecent && !showList && (
          <RecentPills
            categoryId={categoryId}
            onSelect={(t) => { setTitle(t); inputRef.current?.focus() }}
            max={5}
          />
        )}

        {/* Keyboard hint (first few uses) */}
        {showHint && showRecent && !showList && (
          <div className="px-2 mt-1.5 text-[10px] leading-tight text-text-tertiary/70 font-sans">
            ⇥ 补全 · ⌥1–6 选分类 · ⇧⏎ 记录并继续
          </div>
        )}

        {/* Error */}
        {error && <p className="text-xs text-color-text-danger mt-1 font-sans">{error}</p>}

        {/* Category dots */}
        <div className="flex items-center gap-2 mt-3">
          {CATEGORY_DOTS.map(({ id, altKey }) => {
            const name = categories.find((c) => c.id === id)?.name ?? id
            const active = id === categoryId
            return (
              <button
                key={id}
                type="button"
                onClick={() => selectCategory(id)}
                title={`${name} · ⌥${altKey}`}
                aria-label={name}
                aria-pressed={active}
                className={cn(
                  'w-5 h-5 rounded-full transition-all duration-150 cursor-pointer',
                  active
                    ? 'ring-2 ring-text-secondary scale-110'
                    : 'opacity-50 hover:opacity-100',
                )}
                style={{ backgroundColor: `var(--event-${id}-fill)` }}
              />
            )
          })}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 mt-3">
          {isEditing && (
            <button
              onClick={handleDelete}
              className="font-sans text-xs text-color-text-danger bg-transparent border border-color-text-danger/30 rounded-md px-3 py-1.5 cursor-pointer hover:bg-color-text-danger/10 transition-colors"
            >
              删除
            </button>
          )}
          {!isEditing && (
            <button
              onClick={() => handleSave(true)}
              title="记录并继续下一条 (⇧⏎)"
              className="font-sans text-xs font-medium text-text-secondary bg-transparent border border-border-default rounded-md px-3 py-1.5 cursor-pointer hover:bg-surface-sunken transition-colors"
            >
              继续 ⇧⏎
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

  // ── Main render ──────────────────────────────────────

  if (!open) return null

  const content = mode === 'sleep' ? renderSleepMode() : renderDefaultMode()

  return (
    <Popover open>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        side="right"
        sideOffset={8}
        collisionPadding={16}
        className="w-72 p-4 rounded-xl border-border-default max-md:!w-[calc(100vw-1rem)] max-md:max-w-72"
        style={{ backgroundColor: `var(--event-${categoryId}-bg)` }}
        onPointerDownOutside={onClose}
        onEscapeKeyDown={onClose}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

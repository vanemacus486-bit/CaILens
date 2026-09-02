import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { Utensils, X } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { useCategoryStore } from '@/stores/categoryStore'
import { getEventRepo } from '@/data/getRepositories'
import { classifyEvent } from '@/domain/icsImport'
import type { CalendarEvent, CreateEventInput, EventColor, UpdateEventInput, TypedEventData, SleepSubType } from '@/domain/event'
import type { CategoryId } from '@/domain/category'
import { inferHygieneActivity, findHygieneActivity, DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AutocompleteSuggestion } from './AutocompleteDropdown'
import { useIsMobile } from '@/hooks/useMediaQuery'
import eatingCatImage from '@/assets/illustrations/eating-cat.webp'

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

// 底部分类条的顺序与 Alt 数字键一一对应
const CATEGORY_BARS: { id: CategoryId; altKey: string }[] = [
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

interface ParsedMealEntry {
  isMeal: boolean
  foodTitle: string
}

function parseMealEntry(text: string): ParsedMealEntry {
  const trimmed = text.trim()
  const mealLabelMatch = trimmed.match(/^(早餐|早饭|午餐|午饭|晚餐|晚饭|宵夜|夜宵|吃饭)(?:[\s:：·,，、-]+|$)(.*)$/)
  if (mealLabelMatch) return { isMeal: true, foodTitle: mealLabelMatch[2].trim() }

  const eatingMatch = trimmed.match(/^(吃了|吃)(.*)$/)
  if (eatingMatch) {
    return {
      isMeal: true,
      foodTitle: eatingMatch[2].replace(/^[\s:：·,，、-]+/, '').trim(),
    }
  }

  return { isMeal: false, foodTitle: trimmed }
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
  const isMobile = useIsMobile()

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

  // Autocomplete suggestions + inline completion
  const [suggestions, setSuggestions] = useState<AutocompleteSuggestion[]>([])
  const topSuggestion = suggestions.length > 0 ? suggestions[0] : null
  const completionSuffix = useMemo(() => {
    if (!topSuggestion || !title.trim()) return ''
    const typed = title.trim().toLowerCase()
    const full = topSuggestion.title.toLowerCase()
    if (full === typed || !full.startsWith(typed)) return ''
    return topSuggestion.title.slice(typed.length)
  }, [topSuggestion, title])
  const showInlineCompletion = completionSuffix.length > 0

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

  const mealIntent = mode === 'meal-food' || parseMealEntry(title).isMeal
  const visualCategoryId: CategoryId = mealIntent ? 'sand' : categoryId
  const catColor = `var(--event-${visualCategoryId}-fill)`

  // 卫生提示：新建且非睡眠/吃饭模式时，标题命中卫生关键词则提示将记为"卫生"事件
  const hygieneHintId = !isEditing && mode !== 'sleep' && mode !== 'meal-food'
    ? inferHygieneActivity(title, hygieneActivities)
    : null
  const hygieneHint = hygieneHintId ? findHygieneActivity(hygieneActivities, hygieneHintId) : null

  // ── Auto-classify when title changes ────────────────

  useEffect(() => {
    if (mode === 'meal-food') return
    if (userChangedCategory) return
    if (!title.trim()) return
    const matched = classifyEvent(title, categories)
    if (matched && matched !== categoryId) {
      setCategoryId(matched)
      setUserChangedCategory(true)
      setMode(modeFromCategory(matched))
    }
  }, [title, categories, userChangedCategory, categoryId, mode])

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
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const repo = getEventRepo()
        const results = await repo.search(q, 40)
        const freq = new Map<string, number>()
        for (const e of results) {
          if (mode === 'meal-food') {
            if (e.typedData?.type !== 'meal') continue
          } else if (e.categoryId !== categoryId) {
            continue
          }
          if (!e.title.trim()) continue
          freq.set(e.title, (freq.get(e.title) ?? 0) + 1)
        }
        const matches = Array.from(freq.entries())
          .filter(([t]) => t.toLowerCase().includes(q) && t.toLowerCase() !== q)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([t, count]) => ({ title: t, count }))
        setSuggestions(matches)
      } catch {
        setSuggestions([])
      }
    }, 150)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [title, categoryId, mode])

  // ── Category selection (shared by Alt+1~6 and dots) ──

  const selectCategory = useCallback((newCatId: CategoryId) => {
    setCategoryId(newCatId)
    setUserChangedCategory(true)
    setManualCategory(true)
    setMode(modeFromCategory(newCatId))
    setError(null)
    setSuggestions([])
  }, [])

  const acceptSuggestion = useCallback((s: AutocompleteSuggestion) => {
    setTitle(s.title)
    setSuggestions([])
  }, [])

  // ── Keyboard handler ────────────────────────────────

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Tab → accept inline completion
    if (e.key === 'Tab' && !e.shiftKey) {
      if (topSuggestion) {
        e.preventDefault()
        acceptSuggestion(topSuggestion)
      }
      return
    }

    // Alt+1~6 → category switching
    if (e.altKey && CATEGORY_BY_ALT_KEY[e.key]) {
      e.preventDefault()
      selectCategory(CATEGORY_BY_ALT_KEY[e.key])
      return
    }

    // Enter → 直接保存当前文字（Tab 才用来采纳推荐）
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRef.current(e.shiftKey)
      return
    }

    // Escape → 先退吃饭子模式，再关卡片
    if (e.key === 'Escape') {
      e.preventDefault()
      if (mode === 'meal-food') {
        setMode('chores')
        setTitle('')
      } else {
        onClose()
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topSuggestion, mode, selectCategory, acceptSuggestion])

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
    const parsedMeal = parseMealEntry(effectiveTitle)
    const shouldSaveAsMeal = mode === 'meal-food' || editingEvent?.typedData?.type === 'meal' || parsedMeal.isMeal

    if (parsedMeal.isMeal && !parsedMeal.foodTitle && mode !== 'meal-food' && editingEvent?.typedData?.type !== 'meal') {
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
    } else if (shouldSaveAsMeal) {
      const existingMeal = editingEvent?.typedData?.type === 'meal' ? editingEvent.typedData : null
      saveCategory = 'sand'
      typedData = {
        type: 'meal',
        mealOrder: existingMeal?.mealOrder ?? inferMealOrder(startTime),
        foodTags: existingMeal?.foodTags ?? [],
        source: existingMeal?.source ?? 'home',
      } as TypedEventData
      eventTitle = parsedMeal.isMeal ? parsedMeal.foodTitle || '吃饭' : title.trim() || '吃饭'
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

  const headerTime = crossDay
    ? `${dateLabel(defaultTimes.start)} ${startStr} – ${dateLabel(effectiveEndTs)} ${endStr}`
    : `${dateLabel(defaultTimes.start)} ${startStr} – ${endStr}`

  const placeholderText = (() => {
    switch (mode) {
      case 'chores': return '做了哪些杂务？'
      case 'meal-food': return '吃了什么？例如：牛肉面、鸡蛋'
      case 'growth': return '学了/练了什么？'
      case 'leisure': return '怎么放松的？'
      default: return '这段时间在做什么？'
    }
  })()

  const timeRange = `${startStr} – ${
    crossDay ? dateLabel(effectiveEndTs) + ' ' : ''
  }${endStr}`

  // ── Sleep mode ───────────────────────────────────────

  function renderSleepMode() {
    return (
      <>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: catColor }} />
            <button
              onClick={() => setShowTimeEdit(!showTimeEdit)}
              className="font-mono text-xs text-text-secondary cursor-pointer hover:text-text-primary transition-colors truncate"
            >
              {timeRange}
              {durationMin > 0 && (
                <span className="text-text-tertiary">{` · ${formatDuration(durationMin)}`}</span>
              )}
            </button>
          </div>
          <button onClick={onClose} className="text-text-tertiary hover:text-text-primary cursor-pointer p-1 flex-shrink-0" aria-label="关闭">
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
                <span className="text-base leading-none">{q === 1 ? '😫' : q === 2 ? '😞' : q === 3 ? '😐' : q === 4 ? '🙂' : '😊'}</span>
                <span className="text-[10px] leading-tight">
                  {quality === q ? ['', '较差', '不好', '一般', '良好', '很好'][q] : ''}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Collapsible time editor */}
        {showTimeEdit && (
          <div className="mb-4 animate-slide-down">
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

  // ── Meal mode ────────────────────────────────────────

  function renderMealMode() {
    return (
      <>
        <div
          className="relative -mx-5 -mt-5 mb-4 h-[116px] overflow-hidden border-b border-border-subtle"
          style={{
            background: 'linear-gradient(135deg, color-mix(in srgb, var(--event-sand-bg) 84%, var(--surface-raised)), color-mix(in srgb, var(--surface-raised) 88%, transparent))',
          }}
        >
          <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-3">
            <button
              type="button"
              onClick={() => setShowTimeEdit(!showTimeEdit)}
              className="inline-flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1 font-mono text-[11px] text-text-secondary transition-colors duration-150 hover:text-text-primary"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full bg-event-sand-fill" />
              <span className="truncate">{timeRange}</span>
              {durationMin > 0 && <span className="flex-shrink-0 text-text-tertiary">{formatDuration(durationMin)}</span>}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-tertiary transition-[transform,background-color,color] duration-150 hover:bg-surface-raised/70 hover:text-text-primary active:scale-[0.94]"
              aria-label="关闭"
            >
              <X size={15} />
            </button>
          </div>

          <div className="absolute bottom-3 left-5 z-10">
            <div className="text-[10px] font-medium uppercase tracking-[0.16em] text-event-sand-text/80">Meal note</div>
            <div className="mt-1 font-serif text-[17px] font-medium text-text-primary">记下这一顿</div>
          </div>

          <img
            src={eatingCatImage}
            alt=""
            width={720}
            height={335}
            draggable={false}
            className="pointer-events-none absolute -bottom-2 -right-3 h-[92px] w-[198px] select-none object-contain object-bottom opacity-90 dark:opacity-70 dark:brightness-75"
          />
        </div>

        {showTimeEdit && (
          <div className="mb-4 rounded-xl border border-border-subtle bg-surface-raised/55 p-2.5">
            <div className="flex items-center gap-1.5">
              <input
                type="time"
                value={startStr}
                onChange={(event) => { setStartStr(event.target.value); setError(null) }}
                className="flex-1 rounded-lg border border-border-subtle bg-surface-sunken px-2 py-1.5 font-mono text-xs text-text-primary focus:border-event-sand-fill focus-visible:outline-none"
              />
              <button
                type="button"
                onClick={() => { setCrossDay(!crossDay); setError(null) }}
                className={cn(
                  'flex-shrink-0 rounded-lg border px-2 py-1.5 text-xs transition-[transform,background-color,color,border-color] duration-150 active:scale-[0.97]',
                  crossDay
                    ? 'border-event-sand-fill bg-event-sand-bg text-event-sand-text'
                    : 'border-border-subtle bg-surface-sunken text-text-tertiary',
                )}
              >
                次日
              </button>
              <input
                type="time"
                value={endStr}
                onChange={(event) => { setEndStr(event.target.value); setError(null) }}
                className="flex-1 rounded-lg border border-border-subtle bg-surface-sunken px-2 py-1.5 font-mono text-xs text-text-primary focus:border-event-sand-fill focus-visible:outline-none"
              />
            </div>
          </div>
        )}

        <label className="mb-2 block text-[11px] font-medium tracking-[0.06em] text-text-secondary" htmlFor="meal-food-input">
          吃了什么
        </label>
        <div className="flex items-center gap-2.5 rounded-xl border border-border-default bg-surface-raised/75 px-3 shadow-[inset_0_1px_0_var(--surface-lit)] transition-[border-color,box-shadow] duration-150 focus-within:border-event-sand-fill focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--event-sand-fill)_13%,transparent),inset_0_1px_0_var(--surface-lit)]">
          <Utensils size={16} className="flex-shrink-0 text-event-sand-text" aria-hidden="true" />
          <input
            id="meal-food-input"
            ref={inputRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="牛肉面、鸡蛋、青菜"
            className="h-12 min-w-0 flex-1 bg-transparent font-sans text-[15px] text-text-primary outline-none placeholder:text-text-tertiary/70"
          />
        </div>

        {showInlineCompletion && topSuggestion && (
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault()
              acceptSuggestion(topSuggestion)
            }}
            className="mt-2 inline-flex max-w-full items-center gap-1.5 rounded-lg bg-surface-raised/55 px-2.5 py-1.5 text-left text-[11px] text-text-secondary transition-[transform,background-color,color] duration-150 hover:bg-surface-raised hover:text-text-primary active:scale-[0.98]"
          >
            <span className="truncate">补全为「{topSuggestion.title}」</span>
            <span className="flex-shrink-0 font-mono text-text-quaternary">{topSuggestion.count} 次 · Tab</span>
          </button>
        )}

        {error && <p className="mt-2 text-xs text-color-text-danger">{error}</p>}

        <div className="mt-4 flex items-center gap-2">
          <span className="min-w-0 flex-1 text-[10px] text-text-tertiary">只写食物名称，按 Enter 也可记下</span>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-lg px-3 py-2 text-xs text-color-text-danger transition-[transform,background-color] duration-150 hover:bg-color-text-danger/10 active:scale-[0.97]"
            >
              删除
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave()}
            className="rounded-lg bg-event-sand-fill px-5 py-2.5 text-xs font-semibold text-white transition-[transform,filter] duration-150 hover:brightness-95 active:scale-[0.97] dark:text-[#29251e]"
          >
            {isEditing ? '保存' : '记下'}
          </button>
        </div>
      </>
    )
  }

  // ── Default mode ─────────────────────────────────────

  function renderDefaultMode() {
    const showRecent = !isEditing && title.trim().length === 0
    const showMealShortcut = showRecent
    const activeCategoryName = categories.find((category) => category.id === categoryId)?.name ?? categoryId

    return (
      <>
        <div className="relative -mx-5 -mt-5 mb-4 border-b border-border-subtle bg-surface-raised/55 px-4 py-3 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowTimeEdit(!showTimeEdit)}
              className="inline-flex min-w-0 flex-1 items-center gap-2 rounded-md px-1 py-1 font-mono text-[11px] text-text-secondary transition-colors duration-150 hover:text-text-primary"
            >
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: catColor }} />
              <span className="truncate">{headerTime}</span>
              {durationMin > 0 && <span className="flex-shrink-0 text-text-tertiary">{formatDuration(durationMin)}</span>}
            </button>
            <span className="max-w-[76px] truncate rounded-full border border-border-subtle bg-surface-base/60 px-2 py-1 text-[10px] font-medium text-text-secondary" title={activeCategoryName}>
              {activeCategoryName}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-text-tertiary transition-[transform,background-color,color] duration-150 hover:bg-surface-sunken hover:text-text-primary active:scale-[0.94]"
              aria-label="关闭"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        {showTimeEdit && (
          <div className="mb-4 rounded-xl border border-border-subtle bg-surface-raised/55 p-2.5">
            <div className="flex items-center gap-1.5">
              <input type="time" value={startStr} onChange={(event) => { setStartStr(event.target.value); setError(null) }} className="flex-1 rounded-lg border border-border-subtle bg-surface-sunken px-2 py-1.5 font-mono text-xs text-text-primary focus:border-border-default focus-visible:outline-none" />
              <button
                type="button"
                onClick={() => { setCrossDay(!crossDay); setError(null) }}
                className={cn(
                  'flex-shrink-0 rounded-lg border px-2 py-1.5 text-xs transition-[transform,background-color,color,border-color] duration-150 active:scale-[0.97]',
                  crossDay ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border-subtle bg-surface-sunken text-text-tertiary',
                )}
                title="次日"
              >次日</button>
              <input type="time" value={endStr} onChange={(event) => { setEndStr(event.target.value); setError(null) }} className="flex-1 rounded-lg border border-border-subtle bg-surface-sunken px-2 py-1.5 font-mono text-xs text-text-primary focus:border-border-default focus-visible:outline-none" />
            </div>
            <div className="mt-2 flex gap-1.5">
              {[15, 30, 60, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => applyDuration(minutes)}
                  className={cn(
                    'flex-1 rounded-md border py-1 text-[10px] transition-[transform,background-color,color,border-color] duration-150 active:scale-[0.97]',
                    durationMin === minutes ? 'border-border-default bg-surface-raised text-text-primary' : 'border-transparent bg-surface-sunken text-text-tertiary',
                  )}
                >
                  {minutes < 60 ? `${minutes}分` : `${minutes / 60}时`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div
          className="relative rounded-xl border border-border-default bg-surface-raised/75 shadow-[inset_0_1px_0_var(--surface-lit)] transition-[border-color,box-shadow] duration-150 focus-within:shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_10%,transparent),inset_0_1px_0_var(--surface-lit)]"
          style={{ borderLeftWidth: 3, borderLeftColor: catColor }}
        >
          {showInlineCompletion && (
            <div className={cn('pointer-events-none absolute inset-0 z-0 flex h-12 items-center overflow-hidden whitespace-nowrap pl-3', showMealShortcut ? 'pr-[98px]' : 'pr-3')} aria-hidden="true">
              <span className="text-text-primary">{title}</span>
              <span className="text-sm italic text-text-quaternary">{completionSuffix}</span>
              <span className="ml-1 text-[10px] text-text-quaternary">{topSuggestion!.count}</span>
            </div>
          )}
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholderText}
            className={cn(
              'relative z-10 h-12 w-full bg-transparent pl-3 font-sans text-[15px] outline-none placeholder:text-text-tertiary/75',
              showMealShortcut ? 'pr-[98px]' : 'pr-3',
              showInlineCompletion ? 'text-transparent' : 'text-text-primary',
            )}
            style={{ caretColor: 'var(--text-primary)' }}
          />
          {showMealShortcut && (
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => { setMode('meal-food'); setTitle(''); setSuggestions([]); inputRef.current?.focus() }}
              className="absolute right-1.5 top-1/2 z-20 inline-flex -translate-y-1/2 items-center gap-1.5 rounded-lg border border-event-sand-fill/30 bg-event-sand-bg/80 px-2.5 py-1.5 text-[11px] font-medium text-event-sand-text transition-[transform,background-color,border-color] duration-150 hover:border-event-sand-fill/50 hover:bg-event-sand-bg active:scale-[0.97]"
              aria-label="记录吃了什么"
            >
              <Utensils size={12} aria-hidden="true" />饮食
            </button>
          )}
        </div>

        {hygieneHint && <div className="mt-2 inline-flex items-center rounded-lg bg-surface-raised/55 px-2.5 py-1.5 text-[11px] text-text-secondary">将记录为卫生 · {hygieneHint.name}</div>}

        {showHint && showRecent && (
          <div className="mt-2 flex items-center gap-3 px-1 text-[10px] text-text-tertiary/75">
            <span>Enter 记录</span><span>Shift + Enter 继续</span><span>Tab 补全</span>
          </div>
        )}

        {error && <p className="mt-2 text-xs text-color-text-danger">{error}</p>}

        <div className="mt-4 flex items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            {CATEGORY_BARS.map(({ id, altKey }) => {
              const name = categories.find((category) => category.id === id)?.name ?? id
              const active = id === categoryId
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectCategory(id)}
                  title={`${name} · Alt+${altKey}`}
                  aria-label={name}
                  aria-pressed={active}
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border transition-[transform,background-color,border-color] duration-150 active:scale-[0.94]',
                    active ? 'border-border-default bg-surface-raised' : 'border-transparent bg-transparent hover:bg-surface-sunken',
                  )}
                >
                  <span className={cn('rounded-full transition-[width,height,opacity] duration-150', active ? 'h-3.5 w-3.5 opacity-100' : 'h-2.5 w-2.5 opacity-60')} style={{ backgroundColor: `var(--event-${id}-fill)` }} />
                </button>
              )
            })}
          </div>
          {isEditing && <button type="button" onClick={handleDelete} className="rounded-lg px-3 py-2 text-xs text-color-text-danger transition-[transform,background-color] duration-150 hover:bg-color-text-danger/10 active:scale-[0.97]">删除</button>}
          {!isEditing && <button type="button" onClick={() => handleSave(true)} title="记录并继续下一条 (Shift+Enter)" className="rounded-lg border border-border-default bg-surface-raised/55 px-3 py-2 text-xs font-medium text-text-secondary transition-[transform,background-color,color] duration-150 hover:bg-surface-raised hover:text-text-primary active:scale-[0.97]">继续</button>}
          <button type="button" onClick={() => handleSave()} className="rounded-lg bg-accent px-4 py-2 text-xs font-semibold text-white transition-[transform,background-color] duration-150 hover:bg-accent-hover active:scale-[0.97]">
            {isEditing ? '保存' : '记录'}
          </button>
        </div>
      </>
    )
  }

  // ── Main render ──────────────────────────────────────

  if (!open) return null

  const content = mode === 'sleep'
    ? renderSleepMode()
    : mode === 'meal-food'
      ? renderMealMode()
      : renderDefaultMode()

  return (
    <Popover open>
      <PopoverAnchor virtualRef={virtualRef} />
      <PopoverContent
        side={isMobile ? 'top' : 'right'}
        align={isMobile ? 'end' : 'start'}
        sideOffset={8}
        collisionPadding={16}
        className={cn(
          'p-5 rounded-xl border-border-default max-md:!w-[calc(100vw-1rem)]',
          mode === 'meal-food' ? 'w-[352px] max-md:max-w-[352px] overflow-hidden' : 'w-[352px] max-md:max-w-[352px]',
        )}
        style={{
          background: mode === 'meal-food'
            ? 'var(--event-sand-bg)'
            : `color-mix(in srgb, var(--surface-raised) 92%, var(--event-${visualCategoryId}-bg))`,
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

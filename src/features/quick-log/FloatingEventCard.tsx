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
import { computeQuickCaptureSpan } from '@/domain/quickCaptureSpan'
import { parseEventDraft } from '@/domain/eventDraft'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { AutocompleteSuggestion } from './AutocompleteDropdown'
import { CardInput } from './CardInput'
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

// ── 睡眠时间横轴 ────────────────────────────────────────
// 轴把「时钟盘」展开成直线：20:00 → 次日 12:00，共 16 小时。
// 轴本身不携带日期，跨天由「醒来 < 入睡」自动判定。
const BAND_BASE_MIN = 20 * 60
const BAND_SPAN_MIN = 16 * 60

/** 新建睡眠时的默认时长：从锚点倒推 8 小时 */
const SLEEP_DEFAULT_SPAN_MIN = 8 * 60

/** "HH:MM" → 轴上的分钟偏移（0…960），跨零点的时刻归到轴的后半段 */
function clockToBandOffset(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0
  const sinceBase = (h * 60 + m - BAND_BASE_MIN + 1440) % 1440
  return Math.max(0, Math.min(BAND_SPAN_MIN, sinceBase))
}

/** 轴上的分钟偏移 → "HH:MM" */
function bandOffsetToClock(offset: number): string {
  const total = (BAND_BASE_MIN + offset + 1440) % 1440
  const h = Math.floor(total / 60)
  const m = total % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
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
  /** 用户手动改过时间后，输入框里的时间不再覆盖它 */
  const [timeTouched, setTimeTouched] = useState(false)

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

  // ── 输入即事件块：整句话解析成标题 + 起止 ──────────────
  // 用户没动过时间控件时，输入里的「9:00-10:30」或「45分钟」直接决定块的区间。
  const draft = useMemo(
    () => parseEventDraft(title, {
      baseDate: new Date(defaultTimes.start).setHours(0, 0, 0, 0),
      now: Date.now(),
      defaultCategoryId: categoryId,
      categories,
      defaultSpan: { start: effectiveStartTs, end: effectiveEndTs },
    }),
    // effectiveStartTs/effectiveEndTs 由 startStr/endStr 派生，已在下面依赖里
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [title, defaultTimes.start, categoryId, categories, startStr, endStr, crossDay],
  )

  // 解析出显式/时长时间时，把时间控件同步过去（输入框与头部时间条保持一致）
  useEffect(() => {
    if (timeTouched) return
    if (draft.timeSource === 'default') return
    const nextStart = tsToStr(draft.startTime)
    const nextEnd = tsToStr(draft.endTime)
    setStartStr((prev) => (prev === nextStart ? prev : nextStart))
    setEndStr((prev) => (prev === nextEnd ? prev : nextEnd))
    setCrossDay(new Date(draft.endTime).toDateString() !== new Date(draft.startTime).toDateString())
  }, [draft, timeTouched])

  // 跨天自动判定：醒来时刻早于入睡即视为次日，不再要用户点「次日」开关
  useEffect(() => {
    if (!timeTouched) return
    const [sh, sm] = startStr.split(':').map(Number)
    const [eh, em] = endStr.split(':').map(Number)
    if (![sh, sm, eh, em].every(Number.isFinite)) return
    setCrossDay(eh * 60 + em < sh * 60 + sm)
  }, [startStr, endStr, timeTouched])

  // 睡眠的默认区间：新建时一打开就是「昨晚」——从锚点倒推 8 小时。
  // E 版主张「打开即答案」：早上补记昨晚只需一次回车，不用先填两个时刻。
  useEffect(() => {
    if (isEditing || mode !== 'sleep' || timeTouched) return
    const end = defaultTimes.start
    const start = end - SLEEP_DEFAULT_SPAN_MIN * 60_000
    setStartStr(tsToStr(start))
    setEndStr(tsToStr(end))
    setCrossDay(new Date(end).toDateString() !== new Date(start).toDateString())
  }, [isEditing, mode, timeTouched, defaultTimes.start])

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

  // 刚存下的那条：用于底部「已存」回执 + Ctrl+Z 撤销
  const [lastSaved, setLastSaved] = useState<
    { id: string; title: string; start: number; end: number } | null
  >(null)

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  /** 睡眠时间横轴的轨道元素，拖拽时按它的宽度换算时间 */
  const sleepBandRef = useRef<HTMLDivElement>(null)
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

    // Enter → 保存并留在原地接着记（连续补记是主路径）；Esc 才退出
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSaveRef.current(true)
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

  async function handleSave(stayOpen = false) {
    // 标题里被解析掉的时间/时长片段不再进标题
    const effectiveTitle = draft.title
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
        const savedId = await onSave(input)
        try {
          const n = Number(localStorage.getItem('cailens.cardHintSeen') ?? '0')
          localStorage.setItem('cailens.cardHintSeen', String(n + 1))
        } catch { /* ignore */ }

        if (!stayOpen) {
          onClose()
          return
        }

        // 连续补记：留在原地、清空标题、时间推进到「本条结束 → 现在」
        const next = computeQuickCaptureSpan({ lastEventEnd: endTime, now: Date.now(), trustAnchor: true })
        setLastSaved({ id: savedId, title: eventTitle, start: startTime, end: endTime })
        setTitle('')
        setSuggestions([])
        setError(null)
        setStartStr(tsToStr(next.start))
        setEndStr(tsToStr(next.end))
        setCrossDay(new Date(next.end).toDateString() !== new Date(next.start).toDateString())
        onContinue?.(next.start, next.end, saveCategory as EventColor)
        requestAnimationFrame(() => inputRef.current?.focus())
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
    setTimeTouched(true)
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

  // ── Sleep mode ───────────────────────────────────────

  function renderSleepMode() {
    const SLEEP_TYPES = [
      { key: 'main' as const, label: '睡觉' },
      { key: 'nap' as const, label: '小睡' },
      { key: 'insomnia' as const, label: '失眠' },
    ]
    const QUALITY_LABELS = ['', '很差', '差', '一般', '好', '很好']
    // 五档从左到右：很好 → 很差（好端在左），quality 5 在最左
    const QUALITY_ORDER: Array<1 | 2 | 3 | 4 | 5> = [5, 4, 3, 2, 1]

    // 主数字：时长按 8h00m 排版，不足 1 小时只留分钟
    const heroDuration =
      durationMin <= 0
        ? '—'
        : durationMin < 60
          ? `${durationMin}m`
          : `${Math.floor(durationMin / 60)}h${String(durationMin % 60).padStart(2, '0')}m`

    const heroCaption =
      sleepType === 'nap'
        ? '小睡一会儿'
        : sleepType === 'insomnia'
          ? '躺着没睡着'
          : durationMin >= 7 * 60
            ? '这一觉睡够了'
            : durationMin > 0
              ? '睡得有点少'
              : '还没填时间'

    // 微调：只动醒来时刻，跨天由「入睡 > 醒来」自动判定
    function nudgeSleep(deltaMin: number) {
      const [sh, sm] = startStr.split(':').map(Number)
      const [eh, em] = endStr.split(':').map(Number)
      const startD = new Date(defaultTimes.start)
      const startTs = new Date(startD.getFullYear(), startD.getMonth(), startD.getDate(), sh, sm).getTime()
      const endD = new Date(startD)
      endD.setHours(eh, em, 0, 0)
      let endTs = endD.getTime()
      if (crossDay) endTs += 24 * 60 * 60 * 1000
      endTs = Math.max(startTs + 10 * 60_000, endTs + deltaMin * 60_000)
      const next = new Date(endTs)
      setEndStr(`${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`)
      setCrossDay(next.toDateString() !== new Date(startTs).toDateString())
      setTimeTouched(true)
      setError(null)
    }

    // 横轴上的位置（0–100%）
    const startPct = (clockToBandOffset(startStr) / BAND_SPAN_MIN) * 100
    const endPct = (clockToBandOffset(endStr) / BAND_SPAN_MIN) * 100

    // 拖动横轴上的圆点：5 分钟粒度，入睡与醒来至少隔 30 分钟
    function beginSleepDrag(which: 'start' | 'end') {
      return (ev: React.PointerEvent<HTMLButtonElement>) => {
        ev.preventDefault()
        const el = sleepBandRef.current
        if (!el) return

        const apply = (clientX: number) => {
          const rect = el.getBoundingClientRect()
          if (rect.width <= 0) return
          const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
          const off = Math.round((ratio * BAND_SPAN_MIN) / 5) * 5
          if (which === 'start') {
            const curEnd = clockToBandOffset(endStr)
            setStartStr(bandOffsetToClock(Math.max(0, Math.min(off, curEnd - 30))))
          } else {
            const curStart = clockToBandOffset(startStr)
            setEndStr(bandOffsetToClock(Math.min(BAND_SPAN_MIN, Math.max(off, curStart + 30))))
          }
          setTimeTouched(true)
          setError(null)
        }

        apply(ev.clientX)

        const onMove = (e: PointerEvent) => apply(e.clientX)
        const onUp = () => {
          window.removeEventListener('pointermove', onMove)
          window.removeEventListener('pointerup', onUp)
        }
        window.addEventListener('pointermove', onMove)
        window.addEventListener('pointerup', onUp)
      }
    }

    return (
      <>
        {/* 纸头：与默认模式同构 */}
        <div
          data-card-head="paper"
          className="flex items-baseline gap-2 border-b px-[15px] pb-[7px] pt-[9px]"
          style={{ borderColor: 'var(--paper-card-rule)' }}
        >
          <button
            type="button"
            onClick={() => setShowTimeEdit(!showTimeEdit)}
            className="inline-flex min-w-0 flex-1 items-baseline gap-2 text-left font-mono text-[10.5px] tracking-[0.01em] transition-opacity duration-150 hover:opacity-70"
            style={{ color: 'var(--paper-card-ink)' }}
          >
            <span
              className="inline-block h-[5px] w-[5px] flex-shrink-0"
              style={{ backgroundColor: catColor, borderRadius: '50%' }}
            />
            <span className="truncate">{headerTime}</span>
            {durationMin > 0 && (
              <span className="flex-shrink-0 text-[9px]" style={{ color: 'var(--paper-card-ink-3)' }}>
                {formatDuration(durationMin)}
              </span>
            )}
          </button>
          <span
            data-card-cat="paper"
            className="max-w-[86px] truncate font-serif text-[9.5px] tracking-[0.04em]"
            style={{ color: 'var(--paper-card-accent)' }}
          >
            睡眠
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:opacity-60"
            style={{ color: 'var(--paper-card-ink-3)' }}
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        <div className="px-[15px] pb-1 pt-[10px]">
          {/* 主数字：这一觉的时长 */}
          <div className="relative py-4 text-center">
            {/* Zzz 漂浮：沿用 index.css 里 EventDetailCard 那套 sleep-zzz，
                自带 prefers-reduced-motion 保护，纯装饰故 aria-hidden */}
            <span
              aria-hidden="true"
              className="animate-sleep-zzz pointer-events-none absolute select-none"
              style={{ left: 'calc(50% + 50px)', top: 20, fontFamily: 'var(--font-display)', fontSize: 11, color: 'var(--paper-card-ink-4)', animationDelay: '0s' }}
            >
              z
            </span>
            <span
              aria-hidden="true"
              className="animate-sleep-zzz pointer-events-none absolute select-none"
              style={{ left: 'calc(50% + 62px)', top: 10, fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--paper-card-ink-4)', animationDelay: '0.9s' }}
            >
              z
            </span>
            <span
              aria-hidden="true"
              className="animate-sleep-zzz pointer-events-none absolute select-none"
              style={{ left: 'calc(50% + 76px)', top: 2, fontFamily: 'var(--font-display)', fontSize: 17, color: 'var(--paper-card-ink-4)', animationDelay: '1.8s' }}
            >
              Z
            </span>
            <div
              className="font-mono text-[34px] leading-none tracking-[-0.02em]"
              style={{ color: 'var(--paper-card-ink)' }}
            >
              {heroDuration}
            </div>
            <div
              className="mt-2 font-serif text-[10.5px] tracking-[0.04em]"
              style={{ color: 'var(--paper-card-ink-3)' }}
            >
              {heroCaption}
            </div>
          </div>

          {/* 时间横轴：拖两个圆点直接定区间 */}
          <div className="pb-4">
            <div
              className="mb-2 flex items-baseline justify-between font-mono text-[9px] tracking-[0.06em]"
              style={{ color: 'var(--paper-card-ink-3)' }}
            >
              <span>入睡 {startStr}</span>
              <span>
                醒来 {endStr}
                {crossDay ? ' · 次日' : ''}
              </span>
            </div>

            <div ref={sleepBandRef} data-sleep-band="" className="relative mx-2 h-7 touch-none select-none">
              <div
                className="absolute left-0 right-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{ backgroundColor: 'var(--paper-card-rule)' }}
              />
              <div
                className="absolute top-1/2 h-[2px] -translate-y-1/2 rounded-full"
                style={{
                  left: `${startPct}%`,
                  width: `${Math.max(0, endPct - startPct)}%`,
                  backgroundColor: 'color-mix(in srgb, var(--paper-card-accent) 50%, transparent)',
                }}
              />
              {([
                ['start', startPct, startStr],
                ['end', endPct, endStr],
              ] as const).map(([which, pct, clock]) => (
                <button
                  key={which}
                  type="button"
                  onPointerDown={beginSleepDrag(which)}
                  aria-label={`调整${which === 'start' ? '入睡' : '醒来'}时间，当前 ${clock}`}
                  className="absolute top-1/2 flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab items-center justify-center active:cursor-grabbing"
                  style={{ left: `${pct}%` }}
                >
                  <span
                    className="block h-[11px] w-[11px] rounded-full"
                    style={{
                      backgroundColor: 'var(--paper-card-bg)',
                      border: '1.5px solid var(--paper-card-accent)',
                      boxShadow: '0 0 0 3px var(--paper-card-bg)',
                    }}
                  />
                </button>
              ))}
            </div>

            <div
              className="mt-1 flex justify-between px-2 font-mono text-[8px] tracking-[0.06em]"
              style={{ color: 'var(--paper-card-ink-4)' }}
            >
              <span>20:00</span>
              <span>0:00</span>
              <span>4:00</span>
              <span>8:00</span>
              <span>12:00</span>
            </div>
          </div>

          {/* 质量：五档刻度，好端在最左 */}
          <div className="px-1 pb-3">
            <div
              className="relative mx-2 h-[2px] rounded-full"
              style={{ backgroundColor: 'var(--paper-card-rule)' }}
            >
              {QUALITY_ORDER.map((q, i) => {
                const active = quality === q
                return (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(active ? null : q)}
                    aria-pressed={active}
                    aria-label={QUALITY_LABELS[q]}
                    className="absolute top-1/2 flex h-[22px] w-[22px] -translate-x-1/2 -translate-y-1/2 items-center justify-center transition-transform duration-200 hover:scale-110"
                    style={{ left: `${(i / (QUALITY_ORDER.length - 1)) * 100}%` }}
                  >
                    <span
                      className="block rounded-full transition-all duration-200"
                      style={{
                        width: active ? 11 : 4,
                        height: active ? 11 : 4,
                        backgroundColor: active ? 'var(--paper-card-bg)' : 'var(--paper-card-ink-4)',
                        border: active ? '1.5px solid var(--paper-card-accent)' : 'none',
                        boxShadow: active ? '0 0 0 3px var(--paper-card-bg)' : 'none',
                      }}
                    />
                  </button>
                )
              })}
            </div>
            <div className="mt-3.5 flex justify-between px-1">
              {QUALITY_ORDER.map((q) => {
                const active = quality === q
                return (
                  <span
                    key={q}
                    className="font-serif text-[9.5px] tracking-[0.02em] transition-colors duration-200"
                    style={{
                      color: active ? 'var(--paper-card-ink)' : 'var(--paper-card-ink-4)',
                      borderBottom: active
                        ? '1px solid color-mix(in srgb, var(--paper-card-accent) 55%, transparent)'
                        : '1px solid transparent',
                      paddingBottom: active ? 2 : 0,
                    }}
                  >
                    {QUALITY_LABELS[q]}
                  </span>
                )
              })}
            </div>
          </div>

          {/* 微调：±15 / ±30 分钟 */}
          <div
            className="flex items-center justify-center gap-1 border-b pb-3"
            style={{ borderColor: 'var(--paper-card-rule)' }}
          >
            {([-30, -15, 15, 30] as const).map((min) => (
              <button
                key={min}
                type="button"
                onClick={() => nudgeSleep(min)}
                className="rounded-sm px-2.5 py-1 font-mono text-[9.5px] tracking-[0.03em] transition-colors duration-150 hover:opacity-70"
                style={{ color: 'var(--paper-card-ink-3)' }}
              >
                {min > 0 ? `+${min}m` : `${min}m`}
              </button>
            ))}
          </div>

          {/* 睡眠类型：居中的三个字，选中的加下划线 */}
          <div className="flex justify-center gap-4 pt-3">
            {SLEEP_TYPES.map((t) => {
              const active = sleepType === t.key
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setSleepType(t.key)}
                  aria-pressed={active}
                  className="pb-1 font-serif text-[12px] tracking-[0.02em] transition-colors duration-150"
                  style={{
                    color: active ? 'var(--paper-card-ink)' : 'var(--paper-card-ink-3)',
                    borderBottom: active ? '1px solid var(--paper-card-accent)' : '1px solid transparent',
                  }}
                >
                  {t.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 时间编辑：下划线 */}
        {showTimeEdit && (
          <div
            className="mb-3 border-b px-[15px] pb-2.5 pt-3"
            style={{ borderColor: 'var(--paper-card-rule)' }}
            data-card-time="paper"
          >
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startStr}
                onChange={(e) => { setStartStr(e.target.value); setTimeTouched(true); setError(null) }}
                className="flex-1 border-0 border-b bg-transparent px-0 py-1 font-mono text-[11px] outline-none"
                style={{ borderColor: 'var(--paper-card-rule)', color: 'var(--paper-card-ink)' }}
              />
              {/* 跨天不用开关：醒来早于入睡即自动判为次日 */}
              <span
                className="flex-shrink-0 px-1 py-1 font-serif text-[10.5px] tracking-[0.02em]"
                style={{ color: crossDay ? 'var(--paper-card-accent)' : 'var(--paper-card-ink-4)' }}
                aria-hidden={!crossDay}
              >
                {crossDay ? '次日' : '当天'}
              </span>
              <input
                type="time"
                value={endStr}
                onChange={(e) => { setEndStr(e.target.value); setTimeTouched(true); setError(null) }}
                className="flex-1 border-0 border-b bg-transparent px-0 py-1 font-mono text-[11px] outline-none"
                style={{ borderColor: 'var(--paper-card-rule)', color: 'var(--paper-card-ink)' }}
              />
            </div>
            <div className="mt-2 flex gap-1">
              {[15, 30, 60, 120].map((min) => (
                <button
                  key={min}
                  type="button"
                  onClick={() => applyDuration(min)}
                  className="flex-1 py-1 font-mono text-[9px] tracking-[0.04em] transition-opacity duration-150 hover:opacity-70"
                  style={{
                    color: durationMin === min ? 'var(--paper-card-ink)' : 'var(--paper-card-ink-3)',
                    borderBottom: durationMin === min ? '1px solid var(--paper-card-ink-3)' : '1px solid transparent',
                  }}
                >
                  {min < 60 ? `${min}分` : `${min / 60}时`}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <p className="px-[15px] pt-1 font-serif text-[10.5px]" style={{ color: 'var(--color-text-danger)' }}>
            {error}
          </p>
        )}

        {/* 纸脚 */}
        <div className="mt-2 flex items-center justify-end gap-2 px-[15px] pb-[11px] pt-[6px]">
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-sm px-[11px] py-[5px] font-serif text-[11px] tracking-[0.02em] transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--color-text-danger)' }}
            >
              删除
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave()}
            className="rounded-sm px-[11px] py-[5px] font-serif text-[11px] font-medium tracking-[0.02em] transition-[filter] duration-150 hover:brightness-110"
            style={{ backgroundColor: 'var(--paper-card-accent)', color: 'var(--paper-card-bg)' }}
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
        {/* 纸头 */}
        <div
          data-card-head="paper"
          className="flex items-baseline gap-2 border-b px-[15px] pb-[7px] pt-[9px]"
          style={{ borderColor: 'var(--paper-card-rule)' }}
        >
          <button
            type="button"
            onClick={() => setShowTimeEdit(!showTimeEdit)}
            className="inline-flex min-w-0 flex-1 items-baseline gap-2 text-left font-mono text-[10.5px] tracking-[0.01em] transition-opacity duration-150 hover:opacity-70"
            style={{ color: 'var(--paper-card-ink)' }}
          >
            <span
              className="inline-block h-[5px] w-[5px] flex-shrink-0"
              style={{ backgroundColor: 'var(--event-sand-fill)', borderRadius: '50%' }}
            />
            <span className="truncate">{headerTime}</span>
            {durationMin > 0 && (
              <span className="flex-shrink-0 text-[9px]" style={{ color: 'var(--paper-card-ink-3)' }}>
                {formatDuration(durationMin)}
              </span>
            )}
          </button>
          <span
            data-card-cat="paper"
            className="max-w-[86px] truncate font-serif text-[9.5px] tracking-[0.04em]"
            style={{ color: 'var(--event-sand-text)' }}
          >
            饮食
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:opacity-60"
            style={{ color: 'var(--paper-card-ink-3)' }}
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        {/* 纸上的插图带：猫坐在纸上，不是渐变横幅 */}
        <div className="relative h-[74px] overflow-hidden px-[15px]">
          <div className="pt-2.5 font-mono text-[8.5px] uppercase tracking-[0.16em]" style={{ color: 'var(--paper-card-ink-4)' }}>
            Meal note
          </div>
          <div className="mt-0.5 font-serif text-[15px] font-medium" style={{ color: 'var(--paper-card-ink)' }}>
            记下这一顿
          </div>
          <img
            src={eatingCatImage}
            alt=""
            width={720}
            height={335}
            draggable={false}
            className="pointer-events-none absolute -bottom-1 right-2 h-[68px] w-[146px] select-none object-contain object-bottom opacity-80 dark:opacity-55 dark:brightness-75"
          />
        </div>

        {/* 时间编辑：下划线 */}
        {showTimeEdit && (
          <div
            className="mb-2 border-b px-[15px] pb-2.5"
            style={{ borderColor: 'var(--paper-card-rule)' }}
            data-card-time="paper"
          >
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startStr}
                onChange={(event) => { setStartStr(event.target.value); setTimeTouched(true); setError(null) }}
                className="flex-1 border-0 border-b bg-transparent px-0 py-1 font-mono text-[11px] outline-none"
                style={{ borderColor: 'var(--paper-card-rule)', color: 'var(--paper-card-ink)' }}
              />
              <button
                type="button"
                onClick={() => { setCrossDay(!crossDay); setTimeTouched(true); setError(null) }}
                className="flex-shrink-0 px-1 py-1 font-serif text-[10.5px] tracking-[0.02em] transition-opacity duration-150 hover:opacity-70"
                style={{ color: crossDay ? 'var(--event-sand-text)' : 'var(--paper-card-ink-3)' }}
                title="次日"
              >
                次日
              </button>
              <input
                type="time"
                value={endStr}
                onChange={(event) => { setEndStr(event.target.value); setTimeTouched(true); setError(null) }}
                className="flex-1 border-0 border-b bg-transparent px-0 py-1 font-mono text-[11px] outline-none"
                style={{ borderColor: 'var(--paper-card-rule)', color: 'var(--paper-card-ink)' }}
              />
            </div>
          </div>
        )}

        <div className="px-[15px] pb-1 pt-1">
          <label
            className="mb-1 block font-mono text-[9px] tracking-[0.09em]"
            style={{ color: 'var(--paper-card-ink-3)' }}
            htmlFor="meal-food-input"
          >
            吃了什么
          </label>
          <CardInput
            id="meal-food-input"
            inputRef={inputRef}
            value={title}
            onChange={setTitle}
            onKeyDown={handleKeyDown}
            placeholder="牛肉面、鸡蛋、青菜"
            accent="var(--event-sand-fill)"
            ghostSuffix={showInlineCompletion ? completionSuffix : ''}
            rightSlot={<Utensils size={14} className="mr-1 flex-shrink-0" style={{ color: 'var(--event-sand-text)' }} aria-hidden="true" />}
          />
        </div>

        {(showInlineCompletion && topSuggestion) || error ? (
          <div className="px-[15px]">
            {showInlineCompletion && topSuggestion && (
              <button
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault()
                  acceptSuggestion(topSuggestion)
                }}
                className="mt-1 inline-flex max-w-full items-center gap-1.5 py-0.5 text-left font-serif text-[10.5px] italic transition-opacity duration-150 hover:opacity-70"
                style={{ color: 'var(--paper-card-ink-3)' }}
              >
                <span className="truncate">补全为「{topSuggestion.title}」</span>
                <span className="flex-shrink-0 font-mono text-[9px] not-italic">{topSuggestion.count} 次 · Tab</span>
              </button>
            )}
            {error && (
              <p className="mt-1 font-serif text-[10.5px]" style={{ color: 'var(--color-text-danger)' }}>{error}</p>
            )}
          </div>
        ) : null}

        {/* 纸脚 */}
        <div className="mt-3 flex items-center gap-[7px] px-[15px] pb-[11px] pt-[6px]">
          <span className="min-w-0 flex-1 font-serif text-[10px] italic" style={{ color: 'var(--paper-card-ink-4)' }}>
            只写食物名称，按 Enter 也可记下
          </span>
          {isEditing && (
            <button
              type="button"
              onClick={handleDelete}
              className="rounded-sm px-[11px] py-[5px] font-serif text-[11px] tracking-[0.02em] transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--color-text-danger)' }}
            >
              删除
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSave()}
            className="rounded-sm px-[11px] py-[5px] font-serif text-[11px] font-medium tracking-[0.02em] transition-[filter] duration-150 hover:brightness-110"
            style={{ backgroundColor: 'var(--event-sand-fill)', color: 'var(--paper-card-bg)' }}
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
        {/* 纸头：时间用等宽字体、分类名用衬线裸文字，没有胶囊也没有底条 */}
        <div
          data-card-head="paper"
          className="flex items-baseline gap-2 border-b px-[15px] pb-[7px] pt-[9px]"
          style={{ borderColor: 'var(--paper-card-rule)' }}
        >
          <button
            type="button"
            onClick={() => setShowTimeEdit(!showTimeEdit)}
            className="inline-flex min-w-0 flex-1 items-baseline gap-2 text-left font-mono text-[10.5px] tracking-[0.01em] transition-opacity duration-150 hover:opacity-70"
            style={{ color: 'var(--paper-card-ink)' }}
          >
            <span
              className="inline-block h-[5px] w-[5px] flex-shrink-0"
              style={{ backgroundColor: catColor, borderRadius: '50%' }}
            />
            <span className="truncate">{headerTime}</span>
            {durationMin > 0 && (
              <span className="flex-shrink-0 text-[9px]" style={{ color: 'var(--paper-card-ink-3)' }}>
                {formatDuration(durationMin)}
              </span>
            )}
          </button>
          <span
            data-card-cat="paper"
            className="max-w-[86px] truncate font-serif text-[9.5px] tracking-[0.04em]"
            style={{ color: 'var(--paper-card-accent)' }}
            title={activeCategoryName}
          >
            {activeCategoryName}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-150 hover:opacity-60"
            style={{ color: 'var(--paper-card-ink-3)' }}
            aria-label="关闭"
          >
            <X size={14} />
          </button>
        </div>

        {/* 时间编辑也是纸上的：下划线输入 + 文字按钮，没有圆角盒子 */}
        {showTimeEdit && (
          <div
            className="mb-3 border-b px-[15px] pb-2.5 pt-3"
            style={{ borderColor: 'var(--paper-card-rule)' }}
            data-card-time="paper"
          >
            <div className="flex items-center gap-2">
              <input
                type="time"
                value={startStr}
                onChange={(event) => { setStartStr(event.target.value); setTimeTouched(true); setError(null) }}
                className="flex-1 border-0 border-b bg-transparent px-0 py-1 font-mono text-[11px] outline-none"
                style={{ borderColor: 'var(--paper-card-rule)', color: 'var(--paper-card-ink)' }}
              />
              <button
                type="button"
                onClick={() => { setCrossDay(!crossDay); setTimeTouched(true); setError(null) }}
                className="flex-shrink-0 px-1 py-1 font-serif text-[10.5px] tracking-[0.02em] transition-opacity duration-150 hover:opacity-70"
                style={{ color: crossDay ? 'var(--paper-card-accent)' : 'var(--paper-card-ink-3)' }}
                title="次日"
              >次日</button>
              <input
                type="time"
                value={endStr}
                onChange={(event) => { setEndStr(event.target.value); setTimeTouched(true); setError(null) }}
                className="flex-1 border-0 border-b bg-transparent px-0 py-1 font-mono text-[11px] outline-none"
                style={{ borderColor: 'var(--paper-card-rule)', color: 'var(--paper-card-ink)' }}
              />
            </div>
            <div className="mt-2 flex gap-1">
              {[15, 30, 60, 120].map((minutes) => (
                <button
                  key={minutes}
                  type="button"
                  onClick={() => applyDuration(minutes)}
                  className="flex-1 py-1 font-mono text-[9px] tracking-[0.04em] transition-opacity duration-150 hover:opacity-70"
                  style={{
                    color: durationMin === minutes ? 'var(--paper-card-ink)' : 'var(--paper-card-ink-3)',
                    borderBottom: durationMin === minutes ? '1px solid var(--paper-card-ink-3)' : '1px solid transparent',
                  }}
                >
                  {minutes < 60 ? `${minutes}分` : `${minutes / 60}时`}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="px-[15px] pb-1 pt-[10px]">
        <CardInput
          inputRef={inputRef}
          value={title}
          onChange={setTitle}
          onKeyDown={handleKeyDown}
          placeholder={placeholderText}
          accent={catColor}
          ghostSuffix={showInlineCompletion ? completionSuffix : ''}
          ghostCount={showInlineCompletion ? topSuggestion!.count : undefined}
          rightSlot={showMealShortcut ? (
            <button
              type="button"
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => { setMode('meal-food'); setTitle(''); setSuggestions([]); inputRef.current?.focus() }}
              className="inline-flex flex-shrink-0 items-center gap-1 px-1.5 py-1 font-serif text-[10.5px] tracking-[0.02em] transition-opacity duration-150 hover:opacity-70"
              style={{ color: 'var(--paper-card-ink-3)' }}
              aria-label="记录吃了什么"
            >
              <Utensils size={11} aria-hidden="true" />饮食
            </button>
          ) : undefined}
        />
        </div>

        {(hygieneHint || (showHint && showRecent) || lastSaved || error) && (
          <div className="px-[15px]">
            {hygieneHint && (
              <div className="mt-1 font-serif text-[10.5px] italic" style={{ color: 'var(--paper-card-ink-3)' }}>
                将记录为卫生 · {hygieneHint.name}
              </div>
            )}

            {showHint && showRecent && (
              <div className="mt-1 flex items-center gap-3 font-mono text-[9px] tracking-[0.03em]" style={{ color: 'var(--paper-card-ink-3)' }}>
                <span>Enter 记录并继续</span><span>Tab 补全</span><span>Esc 关闭</span>
              </div>
            )}

            {lastSaved && (
              <div className="mt-1 flex items-center gap-2 font-mono text-[9px]" style={{ color: 'var(--paper-card-ink-2)' }}>
                <span className="min-w-0 truncate">
                  已存「{lastSaved.title || '未命名'}」 {tsToStr(lastSaved.start)}–{tsToStr(lastSaved.end)}
                </span>
              </div>
            )}

            {error && <p className="mt-1 font-serif text-[10.5px]" style={{ color: 'var(--color-text-danger)' }}>{error}</p>}
          </div>
        )}

        {/* 纸脚：裸圆点 + 文字按钮，没有方块边框 */}
        <div className="mt-3 flex items-center gap-[7px] px-[15px] pb-[11px] pt-[6px]">
          <div data-card-dots="paper" className="flex min-w-0 flex-1 items-center gap-[7px]">
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
                  className="grid h-[13px] w-[13px] place-items-center rounded-full p-0 transition-all duration-150"
                  style={{
                    border: active ? '1px solid var(--paper-card-edge)' : '1px solid transparent',
                    background: active ? 'color-mix(in srgb, var(--paper-card-lit) 80%, transparent)' : 'transparent',
                  }}
                >
                  <span
                    className="block rounded-full transition-all duration-150"
                    style={{
                      width: active ? 8 : 6,
                      height: active ? 8 : 6,
                      opacity: active ? 1 : 0.42,
                      backgroundColor: `var(--event-${id}-fill)`,
                    }}
                  />
                </button>
              )
            })}
          </div>
          <div className="ml-auto flex items-center gap-2">
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-sm px-[11px] py-[5px] font-serif text-[11px] tracking-[0.02em] transition-colors duration-150 hover:opacity-70"
                style={{ color: 'var(--color-text-danger)' }}
              >
                删除
              </button>
            )}
            {!isEditing && (
              <button
                type="button"
                onClick={() => handleSave(true)}
                title="记录并继续下一条 (Shift+Enter)"
                className="rounded-sm border border-transparent px-[11px] py-[5px] font-serif text-[11px] tracking-[0.02em] transition-colors duration-150 hover:opacity-70"
                style={{ color: 'var(--paper-card-ink-2)' }}
              >
                继续
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSave()}
              className="rounded-sm px-[11px] py-[5px] font-serif text-[11px] font-medium tracking-[0.02em] transition-[filter] duration-150 hover:brightness-110"
              style={{ backgroundColor: 'var(--paper-card-accent)', color: 'var(--paper-card-bg)' }}
            >
              {isEditing ? '保存' : '记录'}
            </button>
          </div>
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
        side="right"
        align="start"
        sideOffset={8}
        collisionPadding={16}
        data-skin="paper"
        className={cn(
          'max-md:!w-[calc(100vw-1rem)]',
          mode === 'meal-food' ? 'w-[352px] max-md:max-w-[352px] overflow-hidden' : 'w-[352px] max-md:max-w-[352px]',
        )}
        style={mode === 'meal-food'
          ? {
              ['--paper-card-accent' as string]: catColor,
              background: 'var(--event-sand-bg)',
              padding: '20px',
              borderRadius: 3,
              border: '1px solid var(--paper-card-edge)',
            }
          : {
              // 纸：容器自己不留 padding，由各区块负责 —— 否则 20px + 15px 叠成 35px
              // 强调色由当前分类注入，覆盖 tokens.css 里的兜底值
              ['--paper-card-accent' as string]: catColor,
              background: 'var(--paper-card-bg)',
              padding: 0,
              borderRadius: 3,
              border: '1px solid var(--paper-card-edge)',
              borderLeft: '3px solid var(--paper-card-accent)',
              boxShadow: 'inset 0 1px 0 var(--paper-card-lit), 0 2px 8px rgba(43,38,32,0.045)',
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

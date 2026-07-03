/**
 * # WeekSidebar — 周/月视图左侧面板
 *
 * 精简浅色面板：导航切换 + 缩小版月视图 + 日期标记（右键标记 + 提醒列表）+ 设置。
 * 显隐由顶栏左上角 ☰ 控制（uiStore.sidebarExpanded，见 App.tsx Layout），
 * 本组件只负责内容，不再常驻、不含品牌名与折叠按钮。
 *
 * 自驱动：从 store 读语言，从 URL 读视图参数，导航直接更新 URL。
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  format,
  getISOWeek,
} from 'date-fns'
import type { DayMark } from '@/domain/dayMark'
import { marksOnDay, upcomingMarks, formatRelativeDay } from '@/domain/dayMark'
import { startOfLocalDay } from '@/domain/habitPlan'
import type { EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { computeDailyCoverage } from '@/domain/coverage'
import { computeStreak } from '@/domain/stats'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { useDomainNav } from '@/components/nav/domainNav'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { AccountMenu } from '@/components/nav/AccountMenu'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { useIsMobile } from '@/hooks/useMediaQuery'

const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

/** 手写风圆圈 —— 不规则椭圆 + 顶部小缺口，像用笔圈了一下 */
function HandDrawnCircle() {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[25px] h-[25px] overflow-visible"
      fill="none"
    >
      <path
        d="M19 5.5 C13 3.5 6.5 5.5 5 11 C3.8 15.5 6 21 11.5 22.5 C17 24 23.5 21 24 15 C24.4 10 21.5 6 16 5.5"
        stroke="var(--accent)"
        strokeWidth="1.6"
        strokeLinecap="round"
        transform="rotate(-4 14 14)"
      />
    </svg>
  )
}

/** 手写风标记圈 —— 与 HandDrawnCircle 路径微差 + 墨色描边，一眼可辨「非今天但有标记」 */
function HandDrawnMarkRing() {
  return (
    <svg
      viewBox="0 0 28 28"
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[25px] h-[25px] overflow-visible"
      fill="none"
      data-testid="mark-ring"
    >
      <path
        d="M19.5 5 C13 3 6.5 5.5 5 11.5 C4 15.5 6.2 21.5 11.5 22.8 C17 24 22.5 21 23 15.5 C23.5 10 20.5 5.5 16 5"
        stroke="var(--text-tertiary)"
        strokeWidth="1.6"
        strokeLinecap="round"
        transform="rotate(2 14 14)"
      />
    </svg>
  )
}

/** 手写风横线 —— 贯穿单元格底部，相邻格首尾相接成「当前周」整行下划线 */
function HandDrawnWeekUnderline() {
  return (
    <svg
      viewBox="0 0 28 6"
      preserveAspectRatio="none"
      aria-hidden="true"
      className="pointer-events-none absolute left-0 right-0 bottom-[1px] w-full h-1.5 overflow-visible"
      fill="none"
    >
      <path
        d="M0 3.2 C5 2 10 4.6 14 3.2 C18 1.9 23 4.4 28 3.2"
        stroke="var(--accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

/** 标记圆点 —— 仅今天+有标记时出现，在数字下方 */
function MarkDot({ color }: { color?: EventColor | null }) {
  const fill = color ? `var(--event-${color}-fill)` : 'var(--accent)'
  return (
    <span
      className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full pointer-events-none"
      style={{ backgroundColor: fill }}
      data-testid="mark-dot"
    />
  )
}

/**
 * 今日摘要卡 —— 大字日期 + 已记录时长/覆盖率/连续天数。
 * 数据由父组件传入，取数失败时静默降级（日期行始终显示）。
 */
function TodaySummaryCard({
  todayDate,
  weekday,
  weekNumber,
  recordedHours,
  coveragePct,
  streakDays,
  hasData,
}: {
  todayDate: string
  weekday: string
  weekNumber: number
  recordedHours: string
  coveragePct: string
  streakDays: string
  hasData: boolean
}) {
  return (
    <div className="px-0.5 mb-2 select-none">
      {/* 大字日期 */}
      <div
        className="text-[22px] leading-tight font-medium text-text-primary"
        style={{ fontFamily: "'Source Serif 4', serif" }}
      >
        {todayDate}
      </div>
      {/* 星期 · 第 X 周 */}
      <div className="text-xs text-text-secondary mt-0.5 mb-2">
        {weekday} · {weekNumber}
      </div>
      {/* 分隔线 */}
      <div className="h-px bg-border-subtle mb-2" />
      {/* 数据行 */}
      {hasData ? (
        <div className="flex items-center gap-1 text-[11px] text-text-secondary flex-wrap">
          <span className="whitespace-nowrap">
            <span className="font-mono">{recordedHours}</span>h
          </span>
          <span className="text-text-quaternary">·</span>
          <span className="whitespace-nowrap">
            {coveragePct}%
          </span>
          <span className="text-text-quaternary">·</span>
          <span className="whitespace-nowrap">
            {streakDays}
          </span>
        </div>
      ) : (
        <div className="text-[11px] text-text-quaternary">
          · · ·
        </div>
      )}
    </div>
  )
}

/** 覆盖率墨杠 —— 单条短杠，墨色深浅随覆盖率分档。 */
function CoverageBar({ pct }: { pct: number }) {
  const style =
    pct <= 0
      ? {}
      : pct < 40
        ? { backgroundColor: 'var(--text-tertiary)', opacity: 0.4 }
        : pct < 75
          ? { backgroundColor: 'var(--text-secondary)', opacity: 0.7 }
          : { backgroundColor: 'var(--text-primary)', opacity: 0.9 }

  if (pct <= 0) return null

  return (
    <span
      className="block mx-auto w-[10px] h-[2px] rounded-full pointer-events-none"
      style={style}
    />
  )
}
/**
 * 日期标记编辑器弹窗。
 * 右键点击某天后弹出，可新建/编辑/删除该日标记。
 */
function DayMarkEditor({
  day,
  existingMarks,
  onSave,
  onUpdate,
  onDelete,
  onClose,
  t,
}: {
  day: Date
  existingMarks: DayMark[]
  onSave: (label: string, color?: EventColor | null) => void
  onUpdate: (mark: DayMark) => void
  onDelete: (id: string) => void
  onClose: () => void
  t: (key: TranslationKey, ...args: (string | number)[]) => string
}) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState<EventColor | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dayLabel = format(day, t('dayMark.dateFormat'))

  const editingMark = editingId ? existingMarks.find((m) => m.id === editingId) : null

  // Reset form when editing a specific mark
  useEffect(() => {
    if (editingMark) {
      setLabel(editingMark.label)
      setColor(editingMark.color ?? null)
    } else {
      setLabel('')
      setColor(null)
    }
  }, [editingId, editingMark])

  // Focus input on open
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50)
  }, [])

  const handleSave = useCallback(() => {
    const trimmed = label.trim()
    if (!trimmed) return
    if (editingMark) {
      onUpdate({ ...editingMark, label: trimmed, color })
    } else {
      onSave(trimmed, color)
    }
    setLabel('')
    setColor(null)
    setEditingId(null)
    inputRef.current?.focus()
  }, [label, color, editingMark, onSave, onUpdate])

  const handleDelete = useCallback(() => {
    if (editingMark) {
      onDelete(editingMark.id)
      setEditingId(null)
      setLabel('')
      setColor(null)
    }
  }, [editingMark, onDelete])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleSave()
      }
    },
    [handleSave],
  )

  const startEditing = useCallback((mark: DayMark) => {
    setEditingId(mark.id)
  }, [])

  return (
    <DialogContent className="max-w-sm">
      <DialogTitle>
        {t('dayMark.whatIsThisDayFor')}
      </DialogTitle>
      <DialogDescription className="text-text-tertiary text-xs mt-1">
        {dayLabel}
        {existingMarks.length > 0 && (
          <span className="ml-2">
            {t('dayMark.countSuffix', existingMarks.length)}
          </span>
        )}
      </DialogDescription>

      {/* 已有标记列表 */}
      {existingMarks.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
          {existingMarks.map((m) => (
            <div
              key={m.id}
              className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-base transition-colors text-sm"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: m.color
                    ? `var(--event-${m.color}-fill)`
                    : 'var(--accent)',
                }}
              />
              <span className="flex-1 truncate text-text-primary">{m.label}</span>
              {editingId === m.id ? (
                <span className="text-xs text-text-tertiary italic">
                  {t('dayMark.editing')}
                </span>
              ) : (
                <button
                  onClick={() => startEditing(m)}
                  className="text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer border-none bg-transparent p-0.5"
                >
                  {t('dayMark.edit')}
                </button>
              )}
              <button
                onClick={() => onDelete(m.id)}
                className="text-text-quaternary hover:text-text-danger transition-colors cursor-pointer border-none bg-transparent p-0.5"
                aria-label={t('dayMark.deleteMark')}
              >
                <X size={12} strokeWidth={2} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 分隔 + 添加/编辑表单 */}
      <div className="mt-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <input
            ref={inputRef}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              editingMark
                ? t('dayMark.editNote')
                : t('dayMark.placeholder')
            }
            className="flex-1 h-9 px-3 rounded-lg border border-border-subtle bg-surface-base text-sm text-text-primary outline-none placeholder:text-text-quaternary focus:border-accent transition-colors"
          />
        </div>

        {/* 颜色选择 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-text-tertiary flex-shrink-0">
            {t('dayMark.color')}:
          </span>
          <div className="flex gap-1.5">
            {EVENT_COLORS.map((ec) => {
              const selected = color === ec || (!color && ec === 'accent' && !editingMark)
              return (
                <button
                  key={ec}
                  onClick={() => setColor(ec === color ? null : ec)}
                  className={`w-[18px] h-[18px] rounded-full border-2 transition-all cursor-pointer ${
                    selected
                      ? 'border-text-primary scale-110'
                      : 'border-transparent hover:scale-110'
                  }`}
                  style={{ backgroundColor: `var(--event-${ec}-fill)` }}
                  title={ec}
                  aria-label={ec}
                />
              )
            })}
            <button
              onClick={() => setColor(null)}
              className={`w-[18px] h-[18px] rounded-full border-2 transition-all cursor-pointer bg-transparent ${
                color === null && !editingMark
                  ? 'border-text-primary scale-110'
                  : 'border-border-subtle hover:scale-110'
              }`}
              title={t('settings.default')}
              aria-label={t('dayMark.defaultColor')}
            />
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 justify-end">
          {editingMark && (
            <button
              onClick={handleDelete}
              className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-text-danger hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent"
            >
              <Trash2 size={12} />
              {t('common.delete')}
            </button>
          )}
          <button
            onClick={handleSave}
            className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-105 active:brightness-95 transition-[filter] cursor-pointer border-none"
          >
            {editingMark ? t('dayMark.update') : t('common.save')}
          </button>
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs text-text-tertiary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent"
          >
            {t('common.cancel')}
          </button>
        </div>
      </div>
    </DialogContent>
  )
}

export function WeekSidebar() {
  // ── All hooks first (rule of hooks) ──
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useAppSettingsStore((s) => s.settings.language)
  const isMobile = useIsMobile()
  const { activeMode, navItems, handleModeChange } = useDomainNav()
  const dayMarks = useAppSettingsStore((s) => s.settings.dayMarks)
  const addDayMark = useAppSettingsStore((s) => s.addDayMark)
  const updateDayMark = useAppSettingsStore((s) => s.updateDayMark)
  const deleteDayMark = useAppSettingsStore((s) => s.deleteDayMark)

  const [editorDay, setEditorDay] = useState<Date | null>(null)

  // ── Sidebar summary & coverage state ──
  const queryRange = useEventStore((s) => s.queryRange)
  const [summaryData, setSummaryData] = useState<{
    recordedHours: string
    coveragePct: string
    streakDays: string
    hasData: boolean
    dailyCoverage: Map<number, number>
  }>({ recordedHours: '', coveragePct: '', streakDays: '', hasData: false, dailyCoverage: new Map() })

  const t = useT()
  const viewMode = (searchParams.get('view') as 'week' | 'month' | null) ?? 'week'

  const openEditor = useCallback((day: Date) => setEditorDay(day), [])
  const closeEditor = useCallback(() => setEditorDay(null), [])

  const handleSaveMark = useCallback(
    (label: string, color?: EventColor | null) => {
      if (!editorDay) return
      addDayMark(startOfLocalDay(editorDay.getTime()), label, color)
    },
    [editorDay, addDayMark],
  )

  const handleUpdateMark = useCallback(
    (mark: DayMark) => {
      updateDayMark(mark)
    },
    [updateDayMark],
  )

  const handleDeleteMark = useCallback(
    (id: string) => {
      deleteDayMark(id)
    },
    [deleteDayMark],
  )

  // ── 点击迷你月历某天：更新 URL ──
  const handleSelectDate = useCallback((day: Date) => {
    if (viewMode === 'month') {
      const monthStart = new Date(day.getFullYear(), day.getMonth(), 1)
      setSearchParams(
        { view: 'month', date: formatISODate(monthStart) },
        { replace: true },
      )
    } else {
      const ws = getWeekStart(day, 1)
      setSearchParams(
        { week: formatISODate(ws) },
        { replace: true },
      )
    }
  }, [viewMode, setSearchParams])

  // ── 从 URL 取值 ──
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ? parseISODate(weekParam) : getWeekStart(new Date(), 1)

  const selectedDay = (() => {
    const dateParam = searchParams.get('date')
    if (dateParam && searchParams.get('view') === 'month') {
      const parsed = parseISODate(dateParam)
      if (!isNaN(parsed.getTime())) return parsed
    }
    return weekStart
  })()

  // 决定高亮基准日：周模式取该周周四（多数天所在月，跨月周不会偏向周一所在的月），月模式看 selectedDay
  const anchorDate = viewMode === 'week' ? addDays(weekStart, 3) : selectedDay
  const anchorMonthKey = format(anchorDate, 'yyyy-MM')

  // 迷你月历当前显示的月份；主视图跨月时自动跟随
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(anchorDate))

  // 仅在主视图基准月变化时同步，避免覆盖用户手动翻月
  useEffect(() => {
    setViewMonth(startOfMonth(anchorDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorMonthKey])

  // ── 加载摘要卡 & 月历覆盖数据 ──
  // 组件挂载、月历翻页、视图模式变化时重新取数
  useEffect(() => {
    const now = Date.now()
    const todayStart = startOfLocalDay(now)
    const tomorrowStart = todayStart + 86_400_000

    // 摘要卡范围：今天 - 60 天（streak 需要）
    const summaryRangeStart = todayStart - 60 * 86_400_000
    const summaryRangeEnd = tomorrowStart

    // 迷你月历覆盖范围（从 viewMonth 直接算，不依赖 days 变量）
    const calStart = startOfWeek(viewMonth, { weekStartsOn: 1 })
    const calEnd = endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 })
    const calStartMs = startOfLocalDay(calStart.getTime())
    const calEndMs = startOfLocalDay(calEnd.getTime()) + 86_400_000

    const rangeStart = Math.min(summaryRangeStart, calStartMs)
    const rangeEnd = Math.max(summaryRangeEnd, calEndMs)

    queryRange(rangeStart, rangeEnd)
      .then((events) => {
        // 1) 每日覆盖率
        const coverageMap = computeDailyCoverage(events, rangeStart, rangeEnd)

        // 2) 今日数据
        const todayMs = coverageMap.get(todayStart) ?? 0
        const elapsed = now - todayStart // 分母：今天到现在
        const pct = elapsed > 0 ? Math.round((todayMs / elapsed) * 100) : 0
        const hours = (todayMs / 3_600_000).toFixed(1)

        // 3) 连续天数
        const streak = computeStreak(events, now)
        const streakLabel = streak >= 60 ? '60+' : String(streak)

        setSummaryData({
          recordedHours: hours,
          coveragePct: String(Math.min(pct, 100)),
          streakDays: streakLabel,
          hasData: true,
          dailyCoverage: coverageMap,
        })
      })
      .catch(() => {
        // 静默降级：只显示日期行
        setSummaryData((prev) => ({ ...prev, hasData: false, dailyCoverage: new Map() }))
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMonth, viewMode, queryRange])

  const handlePrevMonth = useCallback(() => setViewMonth((m) => subMonths(m, 1)), [])
  const handleNextMonth = useCallback(() => setViewMonth((m) => addMonths(m, 1)), [])

  // ── 移动端不渲染（由 Layout 控制）──
  if (isMobile) return null

  // ── 派生值 ──
  const editorOpen = editorDay !== null
  const editorMarks = editorDay
    ? marksOnDay(dayMarks ?? [], startOfLocalDay(editorDay.getTime()))
    : []
  const reminders = upcomingMarks(dayMarks ?? [], Date.now())

  const activeWeekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const activeWeekEnd = endOfWeek(anchorDate, { weekStartsOn: 1 })

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  const weekdays = WEEKDAYS_EN // use short English weekday abbreviations for compact display
  const monthLabel = (() => {
    const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
    return viewMonth.toLocaleDateString(locale, { year: 'numeric', month: 'long' })
  })()

  return (
    <aside className="w-64 flex-shrink-0 flex flex-col bg-surface-raised border border-border-subtle rounded-2xl shadow-lg overflow-hidden m-3 max-md:hidden">
      {/* ── 滚动内容区 ── */}
      <div className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-3 overflow-y-auto">
        {/* ── 今日摘要卡 ── */}
        <TodaySummaryCard
          todayDate={(() => {
            const now = new Date()
            const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
            return now.toLocaleDateString(locale, { month: 'long', day: 'numeric' })
          })()}
          weekday={(() => {
            const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
            return new Date().toLocaleDateString(locale, { weekday: 'short' })
          })()}
          weekNumber={getISOWeek(new Date())}
          recordedHours={summaryData.recordedHours}
          coveragePct={summaryData.coveragePct}
          streakDays={summaryData.streakDays}
          hasData={summaryData.hasData}
        />

        {/* ── 域导航：日历 / 规划 / 复盘 ── */}
        <SlideSegmented
          items={navItems}
          value={activeMode}
          onChange={handleModeChange}
          shareKey="domain"
          stretch
          shortcuts={{ calendar: 'Alt+1', plan: 'Alt+2', review: 'Alt+3' }}
        />

        {/* ── 缩小版月视图 ── */}
        <div>
          {/* 月份导航 */}
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={handlePrevMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent"
              aria-label={language === 'zh' ? '上个月' : 'Previous month'}
            >
              <ChevronLeft size={14} strokeWidth={1.75} />
            </button>
            <span className="font-serif text-[13px] font-medium text-text-primary select-none">
              {monthLabel}
            </span>
            <button
              onClick={handleNextMonth}
              className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent"
              aria-label={language === 'zh' ? '下个月' : 'Next month'}
            >
              <ChevronRight size={14} strokeWidth={1.75} />
            </button>
          </div>

          {/* 星期表头 */}
          <div className="grid grid-cols-7 mb-0.5">
            {weekdays.map((w, i) => (
              <div
                key={i}
                className="h-6 flex items-center justify-center font-sans text-[10px] text-text-quaternary select-none"
              >
                {w}
              </div>
            ))}
          </div>

          {/* 日期网格 */}
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const inMonth = isSameMonth(day, viewMonth)
              const inActiveWeek = day >= activeWeekStart && day <= activeWeekEnd
              // 圈出今天；周模式额外在当前周整行下画手写横线
              const isCircled = isToday(day)
              const showUnderline = viewMode === 'week' && inActiveWeek

              // 日期标记相关
              const dayMs = startOfLocalDay(day.getTime())
              const marksForDay = marksOnDay(dayMarks ?? [], dayMs)
              const hasMark = marksForDay.length > 0
              // 环层：橙圈已占据时不再画墨圈；点层仅在橙圈+标记时出现
              const showMarkRing = !isCircled && hasMark
              const showMarkDot = isCircled && hasMark
              // 标记圆点的颜色取第一条标记色
              const dotColor = hasMark ? (marksForDay[0].color ?? null) : null

              // 覆盖率墨杠
              const coverMs = summaryData.dailyCoverage.get(dayMs) ?? 0
              const DAY_MS = 86_400_000
              const nowTs = Date.now()
              let coverPct = 0
              if (dayMs < nowTs) {
                // 今天分母用到现在，其它天用完整 24h
                const denom = dayMs + DAY_MS > nowTs
                  ? nowTs - dayMs
                  : DAY_MS
                coverPct = denom > 0 ? Math.round((coverMs / denom) * 100) : 0
              }

              return (
                <ContextMenu key={day.getTime()}>
                  <ContextMenuTrigger asChild>
                    <button
                      onClick={() => handleSelectDate(day)}
                      className={[
                        'relative h-8 w-full font-sans text-xs cursor-pointer border-none bg-transparent transition-colors duration-150 rounded-md',
                        !inMonth ? 'text-text-quaternary/40'
                          : isCircled ? 'text-text-primary font-medium'
                          : 'text-text-primary hover:bg-surface-base',
                      ].join(' ')}
                    >
                      {showUnderline && <HandDrawnWeekUnderline />}
                      {isCircled && <HandDrawnCircle />}
                      {showMarkRing && <HandDrawnMarkRing />}
                      {showMarkDot && <MarkDot color={dotColor} />}
                      <span className="relative z-10">{format(day, 'd')}</span>
                      {/* 覆盖率墨杠：在数字下方 */}
                      <CoverageBar pct={coverPct} />
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {marksForDay.length === 0 ? (
                      <ContextMenuItem
                        onSelect={() => openEditor(day)}
                      >
                        {t('dayMark.markThisDay')}
                      </ContextMenuItem>
                    ) : (
                      <>
                        <ContextMenuItem
                          onSelect={() => openEditor(day)}
                        >
                          {t('dayMark.editMark')}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {marksForDay.map((m) => (
                          <ContextMenuItem
                            key={m.id}
                            onSelect={() => deleteDayMark(m.id)}
                            className="text-text-danger"
                          >
                            {t('dayMark.removeLabel', m.label)}
                          </ContextMenuItem>
                        ))}
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>
        </div>

        {/* ── 提醒列表 ── */}
        {reminders.length > 0 && (
          <div>
            <div className="text-[11px] font-sans font-medium text-text-secondary mb-1.5 tracking-wide">
              {t('dayMark.reminders')}
            </div>
            <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
              {reminders.map((mark) => {
                const markDate = new Date(mark.date)
                return (
                  <div
                    key={mark.id}
                    onClick={() => handleSelectDate(markDate)}
                    className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer text-left hover:bg-surface-base transition-colors group"
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSelectDate(markDate) }}
                  >
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: mark.color
                          ? `var(--event-${mark.color}-fill)`
                          : 'var(--accent)',
                      }}
                    />
                    <span className="text-text-tertiary flex-shrink-0 min-w-[4ch]">
                      {formatRelativeDay(mark.date, Date.now(), language)}
                    </span>
                    <span className="text-text-quaternary flex-shrink-0">
                      {format(markDate, 'M/d')}
                    </span>
                    <span className="flex-1 truncate text-text-primary min-w-0">
                      {mark.label}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteDayMark(mark.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-text-quaternary hover:text-text-danger cursor-pointer border-none bg-transparent p-0.5 flex-shrink-0"
                      aria-label={t('common.delete')}
                    >
                      <X size={10} strokeWidth={2} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── 账户（底部固定）── */}
      <div className="px-4 pb-4 pt-2 border-t border-border-subtle flex-shrink-0">
        <AccountMenu variant="sidebar" />
      </div>

      {/* ── 日期标记编辑器弹窗 ── */}
      <Dialog open={editorOpen} onOpenChange={(open) => { if (!open) closeEditor() }}>
        {editorDay && (
          <DayMarkEditor
            day={editorDay}
            existingMarks={editorMarks}
            onSave={handleSaveMark}
            onUpdate={handleUpdateMark}
            onDelete={handleDeleteMark}
            onClose={closeEditor}
            t={t}
          />
        )}
      </Dialog>
    </aside>
  )
}

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
  addMonths,
  subMonths,
  isSameMonth,
  isToday,
  format,
} from 'date-fns'
import type { DayMark } from '@/domain/dayMark'
import { marksOnDay, upcomingMarks, formatRelativeDay } from '@/domain/dayMark'
import { startOfLocalDay } from '@/domain/habitPlan'
import type { EventColor } from '@/domain/event'
import { EVENT_COLORS } from '@/domain/event'
import { formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
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
  t: (zh: string, en: string) => string
}) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState<EventColor | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dayLabel = format(day, t('M月d日', 'MMM d'))

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
        {t('这天是干嘛的？', 'What is this day for?')}
      </DialogTitle>
      <DialogDescription className="text-text-tertiary text-xs mt-1">
        {dayLabel}
        {existingMarks.length > 0 && (
          <span className="ml-2">
            {t(`（已有 ${existingMarks.length} 条）`, `(${existingMarks.length} mark(s))`)}
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
                  {t('编辑中…', 'editing…')}
                </span>
              ) : (
                <button
                  onClick={() => startEditing(m)}
                  className="text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer border-none bg-transparent p-0.5"
                >
                  {t('编辑', 'Edit')}
                </button>
              )}
              <button
                onClick={() => onDelete(m.id)}
                className="text-text-quaternary hover:text-text-danger transition-colors cursor-pointer border-none bg-transparent p-0.5"
                aria-label={t('删除标记', 'Delete mark')}
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
                ? t('编辑备注…', 'Edit note…')
                : t('交房租 / 体检 / DDL…', 'Rent / Checkup / Deadline…')
            }
            className="flex-1 h-9 px-3 rounded-lg border border-border-subtle bg-surface-base text-sm text-text-primary outline-none placeholder:text-text-quaternary focus:border-accent transition-colors"
          />
        </div>

        {/* 颜色选择 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-text-tertiary flex-shrink-0">
            {t('颜色', 'Color')}:
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
              title={t('默认', 'Default')}
              aria-label={t('默认色', 'Default color')}
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
              {t('删除', 'Delete')}
            </button>
          )}
          <button
            onClick={handleSave}
            className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-105 active:brightness-95 transition-[filter] cursor-pointer border-none"
          >
            {editingMark ? t('更新', 'Update') : t('保存', 'Save')}
          </button>
          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs text-text-tertiary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent"
          >
            {t('取消', 'Cancel')}
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

  // 决定高亮基准日：周模式看 weekStart，月模式看 selectedDay
  const anchorDate = viewMode === 'week' ? weekStart : selectedDay
  const anchorMonthKey = format(anchorDate, 'yyyy-MM')

  // 迷你月历当前显示的月份；主视图跨月时自动跟随
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(anchorDate))

  // 仅在主视图基准月变化时同步，避免覆盖用户手动翻月
  useEffect(() => {
    setViewMonth(startOfMonth(anchorDate))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anchorMonthKey])

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
    <aside className="w-56 flex-shrink-0 flex flex-col bg-surface-raised border border-border-subtle rounded-2xl shadow-lg overflow-hidden m-3 max-md:hidden">
      {/* ── 滚动内容区 ── */}
      <div className="flex-1 flex flex-col gap-4 px-4 pt-4 pb-3 overflow-y-auto">
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
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent>
                    {marksForDay.length === 0 ? (
                      <ContextMenuItem
                        onSelect={() => openEditor(day)}
                      >
                        {t('标记此日…', 'Mark this day…')}
                      </ContextMenuItem>
                    ) : (
                      <>
                        <ContextMenuItem
                          onSelect={() => openEditor(day)}
                        >
                          {t('编辑标记…', 'Edit mark…')}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        {marksForDay.map((m) => (
                          <ContextMenuItem
                            key={m.id}
                            onSelect={() => deleteDayMark(m.id)}
                            className="text-text-danger"
                          >
                            {t(`清除「${m.label}」`, `Remove "${m.label}"`)}
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
              {t('提醒', 'Reminders')}
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
                      aria-label={t('删除', 'Delete')}
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

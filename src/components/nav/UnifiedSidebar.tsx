/**
 * # UnifiedSidebar — 统一侧栏：日历 / 规划 / 复盘
 *
 * 替代 WeekSidebar + SimpleSidebar 两套侧栏。
 * 顶部固定域导航，内容区按路由动态切换，底部固定账户信息。
 * 移动端隐藏（由 Layout 控制）。
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  TrendingUp,
  LayoutGrid,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Star,
  Trash2,
  X,
  Plus,
  Edit3,
  Palette,
  Moon,
  Utensils,
  Droplets,
} from 'lucide-react'
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
} from 'date-fns'
import type { DayMark } from '@/domain/dayMark'
import { marksOnDay, upcomingMarks, formatRelativeDay } from '@/domain/dayMark'
import { startOfLocalDay } from '@/domain/habitPlan'
import type { EventColor } from '@/domain/event'
import { EVENT_COLORS, EVENT_COLOR_LABELS } from '@/domain/event'
import { formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { activeLocationAt } from '@/domain/location'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'
import type { CategoryId } from '@/domain/category'
import { useLocationStore } from '@/stores/locationStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useTodoListStore } from '@/stores/todoListStore'
import { DragSortableList } from '@/components/ui/DragSortableList'
import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { AccountMenu } from '@/components/nav/AccountMenu'
import { useDomainNav } from '@/components/nav/domainNav'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { DayLocationPickerDialog } from '@/features/month-view/DayLocationPickerDialog'

const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

const STATS_VIEWS: { id: RoutineViewMode; labelKey: string; description: string; icon: typeof TrendingUp; spark: number[] }[] = [
  { id: 'trend', labelKey: 'stats.trend', description: '分类趋势对比', icon: TrendingUp, spark: [2, 7, 4, 10, 6, 8] },
  { id: 'heatmap', labelKey: 'stats.heatmap', description: '时间分布密度', icon: LayoutGrid, spark: [5, 3, 6, 8, 4, 7] },
  { id: 'sleep', labelKey: 'stats.sleep', description: '平均与节律稳定', icon: Moon, spark: [5, 4, 3, 5, 7, 6] },
  { id: 'diet', labelKey: 'stats.diet', description: '记录与规律', icon: Utensils, spark: [3, 6, 6, 4, 7, 5] },
  { id: 'hygiene', labelKey: 'stats.hygiene', description: '频率与稳定性', icon: Droplets, spark: [4, 4, 6, 5, 6, 6] },
]

const CATEGORY_IDS: readonly CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

// ═══════════════════════════════════════════════════════════════
// 手绘装饰组件（从 WeekSidebar 移植）
// ═══════════════════════════════════════════════════════════════

/** 手写风圆圈 */
function HandDrawnCircle() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[25px] h-[25px] overflow-visible"
      fill="none">
      <path d="M19 5.5 C13 3.5 6.5 5.5 5 11 C3.8 15.5 6 21 11.5 22.5 C17 24 23.5 21 24 15 C24.4 10 21.5 6 16 5.5"
        stroke="var(--accent)" strokeWidth="1.6" strokeLinecap="round" transform="rotate(-4 14 14)" />
    </svg>
  )
}

/** 手写风标记圈 */
function HandDrawnMarkRing() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[25px] h-[25px] overflow-visible"
      fill="none" data-testid="mark-ring">
      <path d="M19.5 5 C13 3 6.5 5.5 5 11.5 C4 15.5 6.2 21.5 11.5 22.8 C17 24 22.5 21 23 15.5 C23.5 10 20.5 5.5 16 5"
        stroke="var(--text-tertiary)" strokeWidth="1.6" strokeLinecap="round" transform="rotate(2 14 14)" />
    </svg>
  )
}

/** 手写风横线 */
function HandDrawnWeekUnderline() {
  return (
    <svg viewBox="0 0 28 6" preserveAspectRatio="none" aria-hidden="true"
      className="pointer-events-none absolute left-0 right-0 bottom-[1px] w-full h-1.5 overflow-visible"
      fill="none">
      <path d="M0 3.2 C5 2 10 4.6 14 3.2 C18 1.9 23 4.4 28 3.2"
        stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

/** 标记圆点 */
function MarkDot({ color }: { color?: EventColor | null }) {
  const fill = color ? `var(--event-${color}-fill)` : 'var(--accent)'
  return (
    <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-1 h-1 rounded-full pointer-events-none"
      style={{ backgroundColor: fill }} data-testid="mark-dot" />
  )
}

// ═══════════════════════════════════════════════════════════════
// DayMark 编辑器弹窗（从 WeekSidebar 移植）
// ═══════════════════════════════════════════════════════════════

function DayMarkEditor({
  day, existingMarks, onSave, onUpdate, onDelete, onClose, t,
}: {
  day: Date; existingMarks: DayMark[]; onSave: (label: string, color?: EventColor | null) => void
  onUpdate: (mark: DayMark) => void; onDelete: (id: string) => void; onClose: () => void
  t: (key: TranslationKey, ...args: (string | number)[]) => string
}) {
  const [label, setLabel] = useState('')
  const [color, setColor] = useState<EventColor | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const dayLabel = format(day, t('dayMark.dateFormat'))
  const editingMark = editingId ? existingMarks.find((m) => m.id === editingId) : null

  useEffect(() => {
    if (editingMark) { setLabel(editingMark.label); setColor(editingMark.color ?? null) }
    else { setLabel(''); setColor(null) }
  }, [editingId, editingMark])

  useEffect(() => { setTimeout(() => inputRef.current?.focus(), 50) }, [])

  const handleSave = useCallback(() => {
    const trimmed = label.trim()
    if (!trimmed) return
    if (editingMark) onUpdate({ ...editingMark, label: trimmed, color })
    else onSave(trimmed, color)
    setLabel(''); setColor(null); setEditingId(null)
    inputRef.current?.focus()
  }, [label, color, editingMark, onSave, onUpdate])

  const handleDelete = useCallback(() => {
    if (editingMark) { onDelete(editingMark.id); setEditingId(null); setLabel(''); setColor(null) }
  }, [editingMark, onDelete])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave() }
  }, [handleSave])

  return (
    <DialogContent className="max-w-sm">
      <DialogTitle>{t('dayMark.whatIsThisDayFor')}</DialogTitle>
      <DialogDescription className="text-text-tertiary text-xs mt-1">
        {dayLabel}{existingMarks.length > 0 && <span className="ml-2">{t('dayMark.countSuffix', existingMarks.length)}</span>}
      </DialogDescription>
      {existingMarks.length > 0 && (
        <div className="mt-3 space-y-1.5 max-h-[120px] overflow-y-auto">
          {existingMarks.map((m) => (
            <div key={m.id} className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-surface-base transition-colors text-sm">
              <span className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: m.color ? `var(--event-${m.color}-fill)` : 'var(--accent)' }} />
              <span className="flex-1 truncate text-text-primary">{m.label}</span>
              {editingId === m.id
                ? <span className="text-xs text-text-tertiary italic">{t('dayMark.editing')}</span>
                : <button onClick={() => setEditingId(m.id)}
                    className="text-xs text-text-tertiary hover:text-text-primary transition-colors cursor-pointer border-none bg-transparent p-0.5">{t('dayMark.edit')}</button>}
              <button onClick={() => onDelete(m.id)}
                className="text-text-quaternary hover:text-text-danger transition-colors cursor-pointer border-none bg-transparent p-0.5"><X size={12} strokeWidth={2} /></button>
            </div>
          ))}
        </div>
      )}
      <div className="mt-3 pt-3 border-t border-border-subtle">
        <div className="flex items-center gap-2 mb-2">
          <input ref={inputRef} value={label} onChange={(e) => setLabel(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={editingMark ? t('dayMark.editNote') : t('dayMark.placeholder')}
            className="flex-1 h-9 px-3 rounded-lg border border-border-subtle bg-surface-base text-sm text-text-primary outline-none placeholder:text-text-quaternary focus:border-accent transition-colors" />
        </div>
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs text-text-tertiary flex-shrink-0">{t('dayMark.color')}:</span>
          <div className="flex gap-1.5">
            {EVENT_COLORS.map((ec) => {
              const selected = color === ec || (!color && ec === 'accent' && !editingMark)
              return (
                <button key={ec} onClick={() => setColor(ec === color ? null : ec)}
                  className={`w-[18px] h-[18px] rounded-full border-2 transition-all cursor-pointer ${selected ? 'border-text-primary scale-110' : 'border-transparent hover:scale-110'}`}
                  style={{ backgroundColor: `var(--event-${ec}-fill)` }} />
              )
            })}
            <button onClick={() => setColor(null)}
              className={`w-[18px] h-[18px] rounded-full border-2 transition-all cursor-pointer bg-transparent ${color === null && !editingMark ? 'border-text-primary scale-110' : 'border-border-subtle hover:scale-110'}`} />
          </div>
        </div>
        <div className="flex items-center gap-2 justify-end">
          {editingMark && (
            <button onClick={handleDelete}
              className="flex items-center gap-1 h-8 px-3 rounded-lg text-xs text-text-danger hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent">
              <Trash2 size={12} />{t('common.delete')}</button>)}
          <button onClick={handleSave}
            className="h-8 px-4 rounded-lg bg-accent text-white text-xs font-medium hover:brightness-105 active:brightness-95 transition-[filter] cursor-pointer border-none">
            {editingMark ? t('dayMark.update') : t('common.save')}</button>
          <button onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs text-text-tertiary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent">{t('common.cancel')}</button>
        </div>
      </div>
    </DialogContent>
  )
}

// ═══════════════════════════════════════════════════════════════
// WeekSidebar 头部 — 迷你月历 + 本周摘要
// ═══════════════════════════════════════════════════════════════

function CalendarSection({
  weekStart, selectedDay, viewMode, handleSelectDate,
  dayMarks, addDayMark, updateDayMark, deleteDayMark, t,
}: {
  weekStart: Date; selectedDay: Date; viewMode: 'week' | 'month'
  handleSelectDate: (day: Date) => void
  dayMarks: DayMark[]; addDayMark: (date: number, label: string, color?: EventColor | null) => Promise<DayMark>
  updateDayMark: (mark: DayMark) => Promise<void>; deleteDayMark: (id: string) => Promise<void>
  t: (key: TranslationKey, ...args: (string | number)[]) => string
}) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const [editorDay, setEditorDay] = useState<Date | null>(null)
  const [viewMonth, setViewMonth] = useState(() => startOfMonth(selectedDay))

  useEffect(() => { setViewMonth(startOfMonth(selectedDay)) }, [selectedDay.getTime()])

  const handlePrevMonth = useCallback(() => setViewMonth((m) => subMonths(m, 1)), [])
  const handleNextMonth = useCallback(() => setViewMonth((m) => addMonths(m, 1)), [])

  const anchorDate = viewMode === 'week' ? addDays(weekStart, 3) : selectedDay
  const activeWeekStart = startOfWeek(anchorDate, { weekStartsOn: 1 })
  const activeWeekEnd = endOfWeek(anchorDate, { weekStartsOn: 1 })

  const days = eachDayOfInterval({
    start: startOfWeek(viewMonth, { weekStartsOn: 1 }),
    end: endOfWeek(endOfMonth(viewMonth), { weekStartsOn: 1 }),
  })

  const monthLabel = (() => {
    const locale = LANGUAGE_LOCALE[language] ?? 'zh-CN'
    return viewMonth.toLocaleDateString(locale, { year: 'numeric', month: 'long' })
  })()

  const editorMarks = editorDay ? marksOnDay(dayMarks, startOfLocalDay(editorDay.getTime())) : []

  return (
    <>
      <div className="week-ledger-section week-ledger-calendar">
        <div className="flex items-center justify-between mb-2">
          <button onClick={handlePrevMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent">
            <ChevronLeft size={14} strokeWidth={1.75} /></button>
          <span className="font-serif text-[13px] font-medium text-text-primary select-none">{monthLabel}</span>
          <button onClick={handleNextMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent">
            <ChevronRight size={14} strokeWidth={1.75} /></button>
        </div>
        <div className="grid grid-cols-7 mb-0.5">
          {WEEKDAYS_EN.map((w, i) => (
            <div key={i}
              className="h-6 flex items-center justify-center font-sans text-[10px] text-text-quaternary select-none">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {days.map((day) => {
            const inMonth = isSameMonth(day, viewMonth)
            const inActiveWeek = day >= activeWeekStart && day <= activeWeekEnd
            const isCircled = isToday(day)
            const showUnderline = viewMode === 'week' && inActiveWeek
            const dayMs = startOfLocalDay(day.getTime())
            const marksForDay = marksOnDay(dayMarks, dayMs)
            const hasMark = marksForDay.length > 0
            const showMarkRing = !isCircled && hasMark
            const showMarkDot = isCircled && hasMark
            const dotColor = hasMark ? (marksForDay[0].color ?? null) : null

            return (
              <ContextMenu key={day.getTime()}>
                <ContextMenuTrigger asChild>
                  <button onClick={() => handleSelectDate(day)}
                    className={[
                      'relative h-8 w-full font-sans text-xs cursor-pointer border-none bg-transparent transition-colors duration-150 rounded-md',
                      !inMonth ? 'text-text-quaternary/40'
                        : isCircled ? 'text-text-primary font-medium'
                        : 'text-text-primary hover:bg-surface-base',
                    ].join(' ')}>
                    {showUnderline && <HandDrawnWeekUnderline />}
                    {isCircled && <HandDrawnCircle />}
                    {showMarkRing && <HandDrawnMarkRing />}
                    {showMarkDot && <MarkDot color={dotColor} />}
                    <span className="relative z-10">{format(day, 'd')}</span>
                  </button>
                </ContextMenuTrigger>
                <ContextMenuContent>
                  {marksForDay.length === 0 ? (
                    <ContextMenuItem onSelect={() => setEditorDay(day)}>{t('dayMark.markThisDay')}</ContextMenuItem>
                  ) : (
                    <>
                      <ContextMenuItem onSelect={() => setEditorDay(day)}>{t('dayMark.editMark')}</ContextMenuItem>
                      <ContextMenuSeparator />
                      {marksForDay.map((m) => (
                        <ContextMenuItem key={m.id} onSelect={() => deleteDayMark(m.id)} className="text-text-danger">
                          {t('dayMark.removeLabel', m.label)}</ContextMenuItem>
                      ))}
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </div>

      <Dialog open={editorDay !== null} onOpenChange={(open) => { if (!open) setEditorDay(null) }}>
        {editorDay && (
          <DayMarkEditor
            day={editorDay} existingMarks={editorMarks}
            onSave={(label, color) => { if (editorDay) addDayMark(startOfLocalDay(editorDay.getTime()), label, color); setEditorDay(null) }}
            onUpdate={(mark) => { updateDayMark(mark); setEditorDay(null) }}
            onDelete={(id) => { deleteDayMark(id); setEditorDay(null) }}
            onClose={() => setEditorDay(null)} t={t} />
        )}
      </Dialog>
    </>
  )
}

// ═══════════════════════════════════════════════════════════════
// 主组件
// ═══════════════════════════════════════════════════════════════

export function UnifiedSidebar() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isMobile = useIsMobile()
  const t = useT()

  // ── 确定当前域 ──
  const currentPath = location.pathname
  const isWeek = currentPath.startsWith('/week')
  const isAction = currentPath.startsWith('/action')
  const isStats = currentPath.startsWith('/stats')

  // ── Week 域共享数据 ──
  const dayMarks = useAppSettingsStore((s) => s.settings.dayMarks) ?? []
  const addDayMark = useAppSettingsStore((s) => s.addDayMark)
  const updateDayMark = useAppSettingsStore((s) => s.updateDayMark)
  const deleteDayMark = useAppSettingsStore((s) => s.deleteDayMark)
  const dayLocations = useLocationStore((s) => s.dayLocations)

  const [locationPickerDay, setLocationPickerDay] = useState<number | null>(null)

  const viewMode = (searchParams.get('view') as 'week' | 'month' | null) ?? 'week'
  const weekParam = searchParams.get('week')
  const weekStart = weekParam ? parseISODate(weekParam) : getWeekStart(new Date(), 1)
  const selectedDay = (() => {
    const dateParam = searchParams.get('date')
    if (dateParam && viewMode === 'month') {
      const parsed = parseISODate(dateParam)
      if (!isNaN(parsed.getTime())) return parsed
    }

    if (viewMode === 'week') {
      const today = new Date()
      const weekEnd = addDays(weekStart, 7)
      if (today >= weekStart && today < weekEnd) return today
    }

    return weekStart
  })()

  const handleSelectDate = useCallback((day: Date) => {
    const next = new URLSearchParams(searchParams)
    if (viewMode === 'month') {
      next.set('date', formatISODate(day))
    } else {
      const ws = getWeekStart(day, 1)
      next.set('week', formatISODate(ws))
      next.delete('view')
    }
    setSearchParams(next, { replace: true })
  }, [searchParams, viewMode, setSearchParams])

  // Week: reminders
  const reminders = upcomingMarks(dayMarks, Date.now())

  // Week: day location picker
  const handleLocationPickerClose = useCallback(() => setLocationPickerDay(null), [])

  // ── Action 域数据 ──
  const lists = useTodoListStore((s) => s.lists)
  const visibleListIds = useTodoListStore((s) => s.visibleListIds)
  const toggleVisibility = useTodoListStore((s) => s.toggleListVisibility)
  const renameListStore = useTodoListStore((s) => s.renameList)
  const changeListCategory = useTodoListStore((s) => s.changeListCategory)
  const deleteListStore = useTodoListStore((s) => s.deleteList)
  const createList = useTodoListStore((s) => s.createList)
  const reorderLists = useTodoListStore((s) => s.reorderLists)

  const todoFilter = (searchParams.get('filter') as 'all' | 'starred' | null) ?? 'all'
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const setTodoFilter = useCallback((v: 'all' | 'starred') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'all') next.delete('filter')
    else next.set('filter', v)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // ── Stats 域数据 ──
  const rawView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'
  const routineView = rawView

  const setRoutineView = useCallback((v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const { activeMode, navItems, handleModeChange } = useDomainNav()

  // 移动端不渲染
  if (isMobile) return null

  return (
    <aside className="floating-side-panel app-sidebar max-md:hidden">
      {/* ── 滚动内容区 ── */}
      <div className="week-ledger-body">
        {/* ── 域导航（与顶栏同款切换器）── */}
        <header className="week-ledger-header" style={{ marginBottom: '14px' }}>
          <SlideSegmented
            items={navItems}
            value={activeMode}
            onChange={handleModeChange}
            shareKey="desktop-domain"
            stretch
            shortcuts={{ calendar: 'Alt+1', plan: 'Alt+2', review: 'Alt+3' }}
          />
        </header>

        {/* ── 日历域内容 ── */}
        {isWeek && (
          <>
            <CalendarSection
              weekStart={weekStart} selectedDay={selectedDay} viewMode={viewMode}
              handleSelectDate={handleSelectDate}
              dayMarks={dayMarks} addDayMark={addDayMark} updateDayMark={updateDayMark} deleteDayMark={deleteDayMark}
              t={t} />

            {/* 提醒列表 */}
            {reminders.length > 0 && (
              <div>
                <div className="text-[11px] font-sans font-medium text-text-secondary mb-1.5 tracking-wide">
                  {t('dayMark.reminders')}
                </div>
                <div className="flex flex-col gap-0.5 max-h-[180px] overflow-y-auto">
                  {reminders.map((mark) => {
                    const markDate = new Date(mark.date)
                    return (
                      <div key={mark.id} onClick={() => handleSelectDate(markDate)}
                        className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer text-left hover:bg-surface-base transition-colors group"
                        role="button" tabIndex={0}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSelectDate(markDate) }}>
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: mark.color ? `var(--event-${mark.color}-fill)` : 'var(--accent)' }} />
                        <span className="text-text-tertiary w-[5rem] text-right flex-shrink-0">
                          {formatRelativeDay(mark.date, Date.now(), useAppSettingsStore.getState().settings.language)}</span>
                        <span className="text-text-quaternary w-[3rem] text-right flex-shrink-0">
                          {format(markDate, 'M/d')}</span>
                        <span className="flex-1 truncate text-text-primary min-w-0">{mark.label}</span>
                        <button onClick={(e) => { e.stopPropagation(); deleteDayMark(mark.id) }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-text-quaternary hover:text-text-danger cursor-pointer border-none bg-transparent p-0.5 flex-shrink-0">
                          <X size={10} strokeWidth={2} /></button>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── 规划域内容 ── */}
        {isAction && (
          <>
            {/* 任务筛选 */}
            <div className="flex flex-col gap-0.5">
              {([
                { id: 'all' as const, labelKey: 'sidebar.allTasks', icon: CheckCircle },
                { id: 'starred' as const, labelKey: 'sidebar.starred', icon: Star },
              ]).map((v) => {
                const Icon = v.icon
                const selected = v.id === todoFilter
                return (
                  <button key={v.id} type="button" onClick={() => setTodoFilter(v.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer border-none transition-all duration-200 ease-out font-sans leading-none ${
                      selected
                        ? 'bg-accent text-white font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8'
                    }`}>
                    <Icon size={16} strokeWidth={1.75} className={selected ? 'text-white' : 'text-text-tertiary'} />
                    <span>{t(v.labelKey)}</span>
                  </button>
                )
              })}
            </div>

            {/* 任务列表 */}
            <div className="flex flex-col gap-0.5 mt-6">
              <div className="px-3 py-1 text-[11px] font-sans font-medium text-text-tertiary uppercase tracking-wider">
                {t('sidebar.lists')}
              </div>
              <DragSortableList items={lists} keyExtractor={(list) => list.id} onReorder={reorderLists}>
                {(list, _index, { isDragging, dropPosition, dragEventHandlers }) => {
                  const checked = visibleListIds.includes(list.id)
                  const isDefault = list.id === 'default'
                  return (
                    <div key={list.id} className="relative">
                      {dropPosition === 'before' && (
                        <div className="absolute top-0 left-2 right-2 h-0.5 bg-accent rounded-full -translate-y-1/2 z-10 pointer-events-none" />)}
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <button type="button" {...dragEventHandlers} onClick={() => toggleVisibility(list.id)}
                            className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] cursor-pointer border-none transition-all duration-200 ease-out font-sans leading-none select-none ${
                              isDragging ? 'opacity-40' : ''} ${
                              checked ? 'text-text-primary font-medium' : 'text-text-tertiary'} 
                              hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8`}>
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              checked ? 'bg-accent border-accent text-white' : 'border-text-tertiary/40'}`}>
                              {checked && (
                                <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                                  <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                                </svg>)}
                            </div>
                            {list.categoryId && (
                              <span className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: `var(--event-${list.categoryId}-fill)` }} />)}
                            {renamingId === list.id ? (
                              <input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)}
                                onBlur={() => { const t = renameDraft.trim(); if (t && t !== list.name) renameListStore(list.id, t); setRenamingId(null) }}
                                onKeyDown={(e) => { if (e.key === 'Enter') { const t = renameDraft.trim(); if (t && t !== list.name) renameListStore(list.id, t); setRenamingId(null); (e.target as HTMLInputElement).blur() }; if (e.key === 'Escape') setRenamingId(null) }}
                                className="flex-1 bg-surface-sunken border border-border-subtle rounded px-1 py-0.5 text-[13px] font-sans text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-accent" autoFocus
                                onClick={(e) => e.stopPropagation()} />
                            ) : (
                              <span className="truncate">{list.name}</span>)}
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-44">
                          <ContextMenuSub>
                            <ContextMenuSubTrigger><Palette size={14} /><span>{t('sidebar.changeCategory')}</span></ContextMenuSubTrigger>
                            <ContextMenuSubContent className="w-auto p-2">
                              <div className="flex items-center gap-1.5">
                                {CATEGORY_IDS.map((cid) => {
                                  const active = list.categoryId === cid
                                  return (
                                    <ContextMenuItem key={cid} aria-label={EVENT_COLOR_LABELS[cid]}
                                      onSelect={() => changeListCategory(list.id, active ? null : cid)}
                                      className={`w-5 h-5 p-0 justify-center rounded-full border-2 transition-transform focus:scale-110 ${active ? 'border-text-primary scale-110' : 'border-transparent'}`}
                                      style={{ backgroundColor: `var(--event-${cid}-fill)` }} />)
                                })}
                              </div>
                            </ContextMenuSubContent>
                          </ContextMenuSub>
                          {!isDefault && (
                            <>
                              <ContextMenuSeparator />
                              <ContextMenuItem onSelect={() => { setRenamingId(list.id); setRenameDraft(list.name) }}>
                                <Edit3 size={14} /><span>{t('sidebar.rename')}</span></ContextMenuItem>
                              <ContextMenuItem onSelect={() => setDeleteConfirmId(list.id)} className="text-danger focus:text-danger">
                                <Trash2 size={14} /><span>{t('sidebar.deleteList')}</span></ContextMenuItem>
                            </>
                          )}
                        </ContextMenuContent>
                      </ContextMenu>
                      {dropPosition === 'after' && (
                        <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full translate-y-1/2 z-10 pointer-events-none" />)}
                    </div>
                  )
                }}
              </DragSortableList>

              {creating ? (
                <div className="px-3 py-1">
                  <input value={createDraft} onChange={(e) => setCreateDraft(e.target.value)}
                    onBlur={() => { const t = createDraft.trim(); if (t) createList(t); setCreating(false); setCreateDraft('') }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { const t = createDraft.trim(); if (t) createList(t); setCreating(false); setCreateDraft('') }; if (e.key === 'Escape') { setCreating(false); setCreateDraft('') } }}
                    placeholder={t('sidebar.newList')}
                    className="w-full bg-surface-sunken border border-border-subtle rounded px-2 py-1 text-[13px] font-sans text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-1 focus-visible:ring-accent" autoFocus />
                </div>
              ) : (
                <button type="button" onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-sans text-text-tertiary hover:text-accent hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer border-none">
                  <Plus size={14} /><span>{t('sidebar.newList')}</span></button>
              )}
            </div>
          </>
        )}

        {/* ── 复盘域内容 ── */}
        {isStats && (
          <>
            <div className="review-ledger-nav">
              {STATS_VIEWS.map((v) => {
                const Icon = v.icon
                const selected = v.id === routineView
                return (
                  <button key={v.id} type="button" onClick={() => setRoutineView(v.id)}
                    className={selected ? 'is-active' : ''}>
                    <Icon size={17} strokeWidth={1.7} />
                    <span><strong>{t(v.labelKey as TranslationKey)}</strong><small>{v.description}</small></span>
                    <i className="review-ledger-spark" aria-hidden="true">
                      {v.spark.map((height, index) => <b key={index} style={{ height: `${height}px` }} />)}
                    </i>
                  </button>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── 底部固定：账户 ── */}
      <div className="week-ledger-footer" style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <AccountMenu variant="sidebar" />
      </div>

      {/* ── Day Location picker ── */}
      {locationPickerDay !== null && (
        <DayLocationPickerDialog
          date={locationPickerDay}
          initialName={activeLocationAt(dayLocations, locationPickerDay)?.locationName ?? undefined}
          onClose={handleLocationPickerClose} />
      )}

      {/* 删除确认弹窗 */}
      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('sidebar.deleteList')}</AlertDialogTitle>
          <AlertDialogDescription>{t('sidebar.deleteListDesc')}</AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel className="px-3 py-1.5 text-sm font-sans rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-sunken transition-colors">
              {t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={async () => {
              if (deleteConfirmId) {
                const { getTodoRepo } = await import('@/data/getRepositories')
                const todos = await getTodoRepo().getByListId(deleteConfirmId)
                await Promise.all(todos.map((t) => getTodoRepo().delete(t.id)))
                deleteListStore(deleteConfirmId)
                setDeleteConfirmId(null)
              }
            }}
              className="px-3 py-1.5 text-sm font-sans rounded-lg bg-danger text-white hover:bg-danger/80 transition-colors">
              {t('common.delete')}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </aside>
  )
}

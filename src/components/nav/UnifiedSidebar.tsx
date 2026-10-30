/**
 * # UnifiedSidebar — 统一侧栏：日历 / 规划 / 复盘
 *
 * 替代 WeekSidebar + SimpleSidebar 两套侧栏。
 * 顶部固定域导航，内容区按路由动态切换，底部固定账户信息。
 * 移动端隐藏（由 Layout 控制）。
 */

import { PluginDomainPanel } from '@/plugins/PluginSidebar'
import { PluginNav } from '@/plugins/PluginNav'
import { useRef, useState, useEffect, useCallback } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import {
  ChevronLeft,
  ChevronRight,
  Trash2,
  X,
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
import { EVENT_COLORS } from '@/domain/event'
import { formatISODate, getWeekStart, parseISODate } from '@/domain/time'
import { activeLocationAt } from '@/domain/location'
import { useLocationStore } from '@/stores/locationStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import { LANGUAGE_LOCALE } from '@/i18n/types'
import { AccountMenu } from '@/components/nav/AccountMenu'
import { useDomainNav } from '@/components/nav/domainNav'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
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
import { DayLocationPickerDialog } from '@/features/month-view/DayLocationPickerDialog'

const WEEKDAYS_EN = ['M', 'T', 'W', 'T', 'F', 'S', 'S']



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
          <span className="font-serif text-sm font-medium text-text-primary select-none">{monthLabel}</span>
          <button onClick={handleNextMonth}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-base transition-colors cursor-pointer border-none bg-transparent">
            <ChevronRight size={14} strokeWidth={1.75} /></button>
        </div>
        <div className="grid grid-cols-7 mb-0.5">
          {WEEKDAYS_EN.map((w, i) => (
            <div key={i}
              className="h-6 flex items-center justify-center font-sans text-2xs text-text-quaternary select-none">{w}</div>
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
  const t = useT()

  // ── 确定当前域 ──
  const currentPath = location.pathname
  const isWeek = currentPath.startsWith('/week')

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

  const { activeMode, navItems, handleModeChange } = useDomainNav()


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
                <div className="text-xs font-sans font-medium text-text-secondary mb-1.5 tracking-wide">
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

        {/* 当前域内容由插件提供；关闭插件后为空 */}
        <PluginDomainPanel />

        {/* 插件贡献的独立入口（非域页面，如补记）。
            与 PluginDomainPanel 分开挂：域面板占满域内导航，这里放域外的单页入口。 */}
        <PluginNav className="mt-2" />

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

    </aside>
  )
}

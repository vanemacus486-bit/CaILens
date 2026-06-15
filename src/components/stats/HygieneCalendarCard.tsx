/**
 * # HygieneCalendarCard — 卫生日历
 *
 * 以周视图或月视图展示每日卫生活动记录。
 * 支持新增记录（日期 + 活动勾选），以及 prev/next/today 导航。
 */

import { useMemo, useState, useCallback } from 'react'
import {
  format,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addWeeks,
  addMonths,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  subDays,
} from 'date-fns'
import type { CalendarEvent } from '@/domain/event'
import type { DailyHygiene, HygieneActivity } from '@/domain/dailyContext'
import { HYGIENE_ACTIVITY_LABELS } from '@/domain/dailyContext'
import { useDailyContextStore } from '@/stores/dailyContextStore'
import type { AppLanguage } from '@/domain/settings'
import { formatISODate } from '@/domain/time'
import { WeekTimeAxis, type AxisDay } from './WeekTimeAxis'

// ── 类型 ────────────────────────────────────────────────────

type ViewMode = 'week' | 'month'

interface Props {
  records: DailyHygiene[]
  rangeEvents: CalendarEvent[]
  language: AppLanguage
}

// ── 活动颜色 ────────────────────────────────────────────────

const ACTIVITY_COLORS: Record<HygieneActivity, string> = {
  shower:      'var(--tag-hygiene-shower)',
  brush_teeth: 'var(--tag-hygiene-brush-teeth)',
  skincare:    'var(--tag-hygiene-skincare)',
  shave:       'var(--tag-hygiene-shave)',
  hair_wash:   'var(--tag-hygiene-hair-wash)',
  nail_care:   'var(--tag-hygiene-nail-care)',
}

const ACTIVITY_ICONS: Record<HygieneActivity, string> = {
  shower:      '🚿',
  brush_teeth: '🪥',
  skincare:    '🧴',
  shave:       '🪒',
  hair_wash:   '🧖',
  nail_care:   '💅',
}

const ALL_ACTIVITIES: HygieneActivity[] = [
  'shower', 'brush_teeth', 'skincare', 'shave', 'hair_wash', 'nail_care',
]

// ── 辅助 ────────────────────────────────────────────────────

function fmtTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function hourOfDay(ts: number): number {
  const d = new Date(ts)
  return d.getHours() + d.getMinutes() / 60
}

/** 判断标题是否匹配洗澡 */
function isShowerTitle(title?: string): boolean {
  if (!title) return false
  const t = title.trim().toLowerCase()
  return t === '洗澡' || t === 'shower' || t.includes('洗澡') || t.includes('shower')
}

// ── 组件 ────────────────────────────────────────────────────

export function HygieneCalendarCard({ records, rangeEvents, language }: Props) {
  const [viewMode, setViewMode] = useState<ViewMode>('week')
  const [anchorDate, setAnchorDate] = useState(() => new Date())

  const saveHygiene  = useDailyContextStore((s) => s.saveHygiene)
  const loadHygiene  = useDailyContextStore((s) => s.loadHygiene)

  // ── 记录面板状态 ─────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [recordDate, setRecordDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [selected, setSelected] = useState<HygieneActivity[]>([])

  // ── 计算当前视图范围 ──────────────────────────────────

  const viewRange = useMemo(() => {
    if (viewMode === 'week') {
      const start = startOfWeek(anchorDate, { weekStartsOn: 1 })
      const end = endOfWeek(anchorDate, { weekStartsOn: 1 })
      return { start: start.getTime(), end: end.getTime() + 86_400_000 }
    } else {
      const start = startOfMonth(anchorDate)
      const end = endOfMonth(anchorDate)
      return { start: start.getTime(), end: end.getTime() + 86_400_000 }
    }
  }, [viewMode, anchorDate])

  // ── 构建日期→卫生记录映射 ──────────────────────────

  const hygieneByDate = useMemo(() => {
    const map = new Map<string, DailyHygiene>()
    for (const r of records) {
      map.set(r.date, r)
    }
    return map
  }, [records])

  // ── 筛选洗澡事件（从主日历事件中按标题匹配） ────────
  const showerEventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>()
    for (const e of rangeEvents) {
      if (!isShowerTitle(e.title)) continue
      if (e.startTime >= viewRange.start && e.startTime < viewRange.end) {
        const dk = formatISODate(new Date(e.startTime))
        const list = map.get(dk) ?? []
        list.push(e)
        map.set(dk, list)
      }
    }
    return map
  }, [rangeEvents, viewRange])

  // ── 判断：某天是否有洗澡事件块 ──────────────────────
  function hasShowerEvent(dateKey: string): boolean {
    return (showerEventsByDate.get(dateKey)?.length ?? 0) > 0
  }

  // ── 导航 ──────────────────────────────────────────────

  const goPrev = useCallback(() => {
    setAnchorDate((d) =>
      viewMode === 'week' ? addWeeks(d, -1) : addMonths(d, -1),
    )
  }, [viewMode])

  const goNext = useCallback(() => {
    setAnchorDate((d) =>
      viewMode === 'week' ? addWeeks(d, 1) : addMonths(d, 1),
    )
  }, [viewMode])

  const goToday = useCallback(() => {
    setAnchorDate(new Date())
  }, [])

  const changeViewMode = useCallback((vm: ViewMode) => {
    if (vm === viewMode) return
    setViewMode(vm)
    setAnchorDate(new Date())
  }, [viewMode])

  // ── 标题 ──────────────────────────────────────────────

  const titleLabel = useMemo(() => {
    if (viewMode === 'week') {
      const start = new Date(viewRange.start)
      const end = new Date(viewRange.end - 86_400_000)
      return `${format(start, 'yyyy年M月d日')} — ${format(end, 'M月d日')}`
    }
    return format(new Date(viewRange.start), 'yyyy年M月')
  }, [viewMode, viewRange])

  const today = useMemo(() => new Date(), [])

  // ── 月视图网格数据 ────────────────────────────────────

  const monthGrid = useMemo(() => {
    if (viewMode !== 'month') return null
    const monthStart = new Date(viewRange.start)
    const monthEnd = new Date(viewRange.end - 86_400_000)
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 })
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 })
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd })
    const weeks: Date[][] = []
    for (let i = 0; i < allDays.length; i += 7) {
      weeks.push(allDays.slice(i, i + 7))
    }
    return { weeks, monthStart }
  }, [viewMode, viewRange])

  // ── 周视图数据 ────────────────────────────────────────

  const weekDays = useMemo(() => {
    if (viewMode !== 'week') return []
    const start = new Date(viewRange.start)
    const end = new Date(viewRange.end - 86_400_000)
    const days = eachDayOfInterval({ start, end })
    return days.map((day) => {
      const dateKey = format(day, 'yyyy-MM-dd')
      const record = hygieneByDate.get(dateKey)
      const showers = showerEventsByDate.get(dateKey) ?? []
      return { date: dateKey, day, record, showers }
    })
  }, [viewMode, viewRange, hygieneByDate, showerEventsByDate])

  // ── 周视图时刻轴数据 ──────────────────

  const hygieneDays: AxisDay[] = useMemo(
    () =>
      weekDays.map(({ date, day, record, showers }) => {
        const idx = day.getDay() === 0 ? 6 : day.getDay() - 1
        const wd =
          language === 'zh'
            ? ['周一', '周二', '周三', '周四', '周五', '周六', '周日'][idx]
            : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx]
        const dayLabel = `${wd} ${day.getMonth() + 1}/${day.getDate()}`

        const timed = showers.map((sev) => ({
          id: sev.id,
          hour: hourOfDay(sev.startTime),
          timeLabel: fmtTime(sev.startTime),
          color: 'var(--tag-hygiene-shower)',
          label: sev.title || (language === 'zh' ? '洗澡' : 'Shower'),
        }))

        // 去重：当天有洗澡事件块时，丢掉记录里的 shower 勾选（避免重复）
        const acts = (record?.activities ?? []).filter(
          (a) => !(a === 'shower' && showers.length > 0),
        )
        const allDay = acts.map((a) => ({
          id: a,
          color: ACTIVITY_COLORS[a],
          label: language === 'zh' ? HYGIENE_ACTIVITY_LABELS[a].zh : HYGIENE_ACTIVITY_LABELS[a].en,
        }))

        return { date, dayLabel, isToday: isSameDay(day, today), timed, allDay }
      }),
    [weekDays, language, today],
  )

  // ── 保存与取消 ────────────────────────────

  const handleSave = useCallback(async () => {
    if (selected.length === 0) return
    await saveHygiene(recordDate, selected)
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), 90), 'yyyy-MM-dd')
    await loadHygiene(start, end)
    setIsRecording(false)
    setSelected([])
    setRecordDate(format(new Date(), 'yyyy-MM-dd'))
  }, [selected, recordDate, saveHygiene, loadHygiene])

  const handleCancel = useCallback(() => {
    setIsRecording(false)
    setSelected([])
    setRecordDate(format(new Date(), 'yyyy-MM-dd'))
  }, [])

  const toggleActivity = useCallback((activity: HygieneActivity) => {
    setSelected((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity],
    )
  }, [])

  // ── 当前选中日期的已有记录 ─────────────────
  const alreadyRecorded = useMemo(
    () => records.some((r) => r.date === recordDate && r.activities.length > 0),
    [records, recordDate],
  )

  // ── 渲染 ──────────────────────────────────────────────

  return (
    <div className="hcc-root">
      <style>{HCC_CSS}</style>

      {/* ── 头部：导航 + 视图切换 + 记录按钮 ──── */}
      <div className="hcc-header">
        <div className="hcc-nav-row">
          <button onClick={goPrev} className="hcc-nav-arrow" title="上一周期">‹</button>
          <span className="hcc-title">{titleLabel}</span>
          <button onClick={goNext} className="hcc-nav-arrow" title="下一周期">›</button>

          <button onClick={goToday} className="hcc-today-btn">今天</button>

          {!isRecording && (
            <button
              className="hcc-record-btn"
              onClick={() => { setSelected([]); setIsRecording(true); setRecordDate(format(new Date(), 'yyyy-MM-dd')) }}
            >
              {'记录'}
            </button>
          )}

          {/* 视图切换 pills */}
          <div className="hcc-view-pills">
            {(['week', 'month'] as ViewMode[]).map((vm) => (
              <button
                key={vm}
                onClick={() => changeViewMode(vm)}
                className={`hcc-view-pill${viewMode === vm ? ' hcc-view-pill-active' : ''}`}
              >
                {vm === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── 记录面板 ──────────────────────────── */}
      {isRecording && (
        <div className="hcc-recording">
          <div className="hcc-recording-title">
            {'记录卫生'}
            {alreadyRecorded && <span className="hcc-done-badge">{'已有记录 ✓'}</span>}
          </div>
          <input
            type="date"
            value={recordDate}
            onChange={(e) => setRecordDate(e.target.value)}
            className="hcc-date-input"
          />
          <div className="hcc-checkbox-grid">
            {ALL_ACTIVITIES.map((activity) => {
              const label = HYGIENE_ACTIVITY_LABELS[activity]
              return (
                <label key={activity} className="hcc-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(activity)}
                    onChange={() => toggleActivity(activity)}
                    className="hcc-checkbox-input"
                  />
                  <span className="hcc-checkbox-icon">{ACTIVITY_ICONS[activity]}</span>
                  <span className="hcc-checkbox-label">
                    {language === 'zh' ? label.zh : label.en}
                  </span>
                </label>
              )
            })}
          </div>
          <div className="hcc-recording-actions">
            <button
              className="hcc-save-btn"
              onClick={handleSave}
              disabled={selected.length === 0}
            >
              {'保存'}
            </button>
            <button className="hcc-cancel-btn" onClick={handleCancel}>
              {'取消'}
            </button>
          </div>
        </div>
      )}

      {/* ── 周视图 ──────────────────────────────────── */}
      {viewMode === 'week' && (
        <WeekTimeAxis
          days={hygieneDays}
          allDayLabel={language === 'zh' ? '全天' : 'All day'}
        />
      )}

      {/* ── 月视图 ──────────────────────────────────── */}
      {viewMode === 'month' && monthGrid && (
        <div className="hcc-month-view">
          {/* 周标题 */}
          <div className="hcc-month-weekdays">
            {['一', '二', '三', '四', '五', '六', '日'].map((d) => (
              <div key={d} className="hcc-month-weekday">{d}</div>
            ))}
          </div>

          {/* 日历网格 */}
          {monthGrid.weeks.map((week, wi) => (
            <div key={wi} className="hcc-month-week">
              {week.map((day) => {
                const dateKey = format(day, 'yyyy-MM-dd')
                const record = hygieneByDate.get(dateKey)
                const isToday = isSameDay(day, today)
                const inMonth = isSameMonth(day, monthGrid.monthStart)

                return (
                  <div
                    key={dateKey}
                    className={`hcc-month-day${isToday ? ' hcc-month-today' : ''}${!inMonth ? ' hcc-month-other' : ''}`}
                  >
                    <span className="hcc-month-daynum">
                      {format(day, 'd')}
                    </span>

                    <div className="hcc-month-dots">
                      {/* 洗澡事件块有则显示 🚿 */}
                      {hasShowerEvent(dateKey) && (
                        <span className="hcc-month-dot-shower" title="洗澡事件">🚿</span>
                      )}
                      {/* 卫生记录活动圆点 */}
                      {record && record.activities.length > 0 && (
                        <>
                          {ALL_ACTIVITIES
                            .filter((act) => record.activities.includes(act))
                            .map((act) => (
                              <span
                                key={act}
                                className="hcc-month-dot"
                                style={{ background: ACTIVITY_COLORS[act] }}
                                title={language === 'zh' ? HYGIENE_ACTIVITY_LABELS[act].zh : HYGIENE_ACTIVITY_LABELS[act].en}
                              />
                            ))}
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      )}

      {/* ── 图例 ──────────────────────────────────── */}
      <div className="hcc-legend">
        <span className="hcc-legend-item">
          <span className="hcc-legend-icon">🚿</span>
          <span className="hcc-legend-label">{language === 'zh' ? '洗澡事件' : 'Shower'}</span>
        </span>
        {ALL_ACTIVITIES.map((act) => (
          <span key={act} className="hcc-legend-item">
            <span className="hcc-legend-icon">{ACTIVITY_ICONS[act]}</span>
            <span
              className="hcc-legend-dot"
              style={{ background: ACTIVITY_COLORS[act] }}
            />
            {language === 'zh' ? HYGIENE_ACTIVITY_LABELS[act].zh : HYGIENE_ACTIVITY_LABELS[act].en}
          </span>
        ))}
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const HCC_CSS = `
.hcc-root {
  width: 100%;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  color: var(--heatmap-ink-1);
}

/* ── Header / Navigation ────────────────────── */
.hcc-header {
  margin-bottom: 16px;
}
.hcc-nav-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.hcc-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 20px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  min-width: 180px;
  text-align: center;
}
.hcc-nav-arrow {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 16px;
  color: var(--heatmap-ink-3);
  transition: color 0.2s ease, background-color 0.2s ease;
  flex-shrink: 0;
}
.hcc-nav-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.hcc-today-btn {
  padding: 3px 10px;
  border-radius: 5px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg-card);
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  transition: color 0.2s ease;
}
.hcc-today-btn:hover {
  color: var(--heatmap-ink-1);
}
.hcc-record-btn {
  padding: 3px 12px;
  border-radius: 5px;
  border: 1px solid var(--accent);
  background: transparent;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  color: var(--accent);
  transition: all 0.15s ease;
}
.hcc-record-btn:hover {
  background: var(--accent);
  color: white;
}
.hcc-view-pills {
  display: flex;
  gap: 2px;
  margin-left: auto;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
}
.hcc-view-pill {
  padding: 3px 12px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.hcc-view-pill:hover {
  color: var(--heatmap-ink-1);
}
.hcc-view-pill-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Recording panel ──────────────────────── */
.hcc-recording {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--accent);
  margin-bottom: 16px;
}
.hcc-recording-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--heatmap-ink-1);
  display: flex;
  align-items: center;
  gap: 8px;
}
.hcc-done-badge {
  font-size: 11px;
  color: var(--color-text-success);
  background: rgba(45, 125, 70, 0.08);
  padding: 2px 8px;
  border-radius: 20px;
}
.hcc-date-input {
  display: block;
  width: 100%;
  margin-bottom: 12px;
  padding: 8px 12px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 13px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: var(--heatmap-bg);
  color: var(--heatmap-ink-1);
  outline: none;
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}
.hcc-date-input:focus {
  border-color: var(--accent);
}
.hcc-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}
.hcc-checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  transition: all 0.15s ease;
}
.hcc-checkbox-item:hover {
  border-color: var(--accent);
  background: rgba(201, 100, 66, 0.04);
}
.hcc-checkbox-input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
}
.hcc-checkbox-icon {
  font-size: 14px;
  line-height: 1;
}
.hcc-checkbox-label {
  font-size: 12px;
  color: var(--heatmap-ink-1);
  user-select: none;
}
.hcc-recording-actions {
  display: flex;
  gap: 8px;
}
.hcc-save-btn {
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  transition: opacity 0.15s ease;
}
.hcc-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.hcc-save-btn:not(:disabled):hover {
  opacity: 0.85;
}
.hcc-cancel-btn {
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: transparent;
  color: var(--heatmap-ink-2);
  cursor: pointer;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  transition: all 0.15s ease;
}
.hcc-cancel-btn:hover {
  border-color: var(--heatmap-ink-3);
  color: var(--heatmap-ink-1);
}

/* ── Month view ─────────────────────────────── */
.hcc-month-view {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.hcc-month-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
  margin-bottom: 2px;
}
.hcc-month-weekday {
  text-align: center;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
  font-size: 11px;
  font-weight: 600;
  color: var(--heatmap-ink-3);
  padding: 4px 0;
}
.hcc-month-week {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 2px;
}
.hcc-month-day {
  position: relative;
  aspect-ratio: 1;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  padding: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: default;
  transition: background-color 0.15s ease;
  overflow: visible;
}
.hcc-month-day:hover {
  background: var(--heatmap-bg);
}
.hcc-month-other {
  opacity: 0.3;
}
.hcc-month-today {
  border-color: var(--accent);
}
.hcc-month-daynum {
  font-family: 'JetBrains Mono', monospace;
  font-size: 12px;
  color: var(--heatmap-ink-2);
  line-height: 1;
}
.hcc-month-today .hcc-month-daynum {
  color: var(--accent);
  font-weight: 700;
}
.hcc-month-dots {
  display: flex;
  gap: 2px;
  margin-top: 2px;
  flex-wrap: wrap;
  justify-content: center;
}
.hcc-month-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.hcc-month-dot-shower {
  font-size: 10px;
  line-height: 1;
}

/* ── Legend ──────────────────────────────────── */
.hcc-legend {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  flex-wrap: wrap;
}
.hcc-legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}
.hcc-legend-icon {
  font-size: 12px;
}
.hcc-legend-label {
  font-size: 11px;
  color: var(--heatmap-ink-3);
}
.hcc-legend-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
`

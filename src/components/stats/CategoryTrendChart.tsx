import { useMemo, useState, useEffect, useCallback, useRef } from 'react'
import { format } from 'date-fns'
import {
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { RechartsTooltip } from './RechartsTooltip'
import type { Category, CategoryId } from '@/domain/category'
import type { CalendarEvent } from '@/domain/event'
import type { DataMaturity } from '@/domain/maturity'
import type { Granularity, Bucket } from '@/hooks/useStatsAggregation'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']
const CAT_STORAGE_KEY = 'cailens-trend-categories'
const CORE_GROUP_KEY = 'cailens-trend-core-group'
const DAY_MS = 24 * 60 * 60_000

const CORE_GROUP = {
  id: 'core-group',
  nameZh: '核心投入',
  nameEn: 'Core Focus',
  categoryIds: ['accent', 'sage'] as CategoryId[],
}

// ── Helpers ──────────────────────────────────────────────────

function formatBucketLabel(bucket: Bucket, periodType: Granularity): string {
  const d = bucket.start
  if (periodType === 'day') return format(d, 'MM.dd')
  if (periodType === 'week') return format(d, 'MM.dd')
  return format(d, 'yyyy-MM')
}

function periodLabel(periodType: Granularity): string {
  switch (periodType) {
    case 'day':     return '日趋势'
    case 'week':    return '周趋势'
    case 'month':   return '月趋势'
  }
}

function periodDesc(periodType: Granularity): string {
  switch (periodType) {
    case 'day':     return '过去 14 天的每日投入变化'
    case 'week':    return '过去 8 周的逐周投入变化'
    case 'month':   return '过去 12 个月的逐月投入变化'
  }
}

function periodDays(periodType: Granularity): number {
  switch (periodType) {
    case 'day':     return 1
    case 'week':    return 7
    case 'month':   return 30.44
  }
}

function loadSelection(): CategoryId[] {
  try {
    const raw = localStorage.getItem(CAT_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.every((v) => CATEGORY_IDS.includes(v))) {
        return parsed
      }
    }
  } catch { /* ignore */ }
  return ['accent']
}

function saveSelection(ids: CategoryId[]) {
  try { localStorage.setItem(CAT_STORAGE_KEY, JSON.stringify(ids)) } catch { /* ignore */ }
}

function loadCoreGroup(): boolean {
  try {
    const raw = localStorage.getItem(CORE_GROUP_KEY)
    return raw === 'true'
  } catch { return true }
}

function saveCoreGroup(enabled: boolean) {
  try { localStorage.setItem(CORE_GROUP_KEY, String(enabled)) } catch { /* ignore */ }
}

// ── Component ────────────────────────────────────────────────

interface CategoryTrendChartProps {
  history: Bucket[]
  categories: Category[]
  periodType: Granularity
  maturity: DataMaturity
  onNavigate?: (dir: -1 | 1) => void
  onPeriodChange?: (p: Granularity) => void
  /** 事件标题集成 */
  allEvents?: CalendarEvent[]
  eventTitle?: string
  eventHistory?: Bucket[]
  onEventTitleChange?: (title: string) => void
}

export function CategoryTrendChart({
  history,
  categories,
  periodType,
  maturity,
  onNavigate,
  onPeriodChange,
  allEvents = [],
  eventTitle = '',
  eventHistory = [],
  onEventTitleChange,
}: CategoryTrendChartProps) {
  const [selected, setSelected] = useState<CategoryId[]>(loadSelection)
  const [groupEnabled, setGroupEnabled] = useState(loadCoreGroup)
  const [isCompact, setIsCompact] = useState(false)
  const [eventInput, setEventInput] = useState(eventTitle)
  const [eventOpen, setEventOpen] = useState(false)
  const eventRef = useRef<HTMLDivElement>(null)

  // Sync eventTitle from URL
  useEffect(() => { setEventInput(eventTitle) }, [eventTitle])

  // Click outside to close event dropdown
  useEffect(() => {
    if (!eventOpen) return
    const handler = (e: MouseEvent) => {
      if (eventRef.current && !eventRef.current.contains(e.target as Node)) setEventOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [eventOpen])

  // Unique event titles sorted by frequency
  const eventSuggestions = useMemo(() => {
    const freq = new Map<string, number>()
    for (const e of allEvents) {
      const t = e.title.trim()
      if (!t) continue
      freq.set(t, (freq.get(t) ?? 0) + 1)
    }
    return Array.from(freq.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
  }, [allEvents])

  const filteredEvents = useMemo(() => {
    if (!eventInput.trim()) return eventSuggestions.slice(0, 20)
    const q = eventInput.toLowerCase()
    return eventSuggestions
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 20)
  }, [eventSuggestions, eventInput])

  useEffect(() => { saveSelection(selected) }, [selected])
  useEffect(() => { saveCoreGroup(groupEnabled) }, [groupEnabled])

  useEffect(() => {
    const check = () => setIsCompact(window.innerWidth < 720)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const toggleCategory = useCallback((id: CategoryId) => {
    setSelected((prev) => {
      if (prev.includes(id)) {
        if (prev.length === 1) return prev
        return prev.filter((x) => x !== id)
      }
      return [...prev, id]
    })
  }, [])

  const toggleGroup = useCallback(() => {
    setGroupEnabled((prev) => !prev)
  }, [])

  const catMap = useMemo(() => {
    const map = new Map<CategoryId, Category>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  /* ── Chart data ──────────────────────────── */

  const coreGroupCategories = useMemo(
    () => CORE_GROUP.categoryIds.filter((id) => selected.includes(id)),
    [selected],
  )

  const groupDataKey = `__group__${CORE_GROUP.id}`

  const chartData = useMemo(() => {
    const eventDataKey = '__event__'
    // Build event data map
    const eventMap = new Map<string, number>()
    for (const b of eventHistory) {
      eventMap.set(formatBucketLabel(b, periodType), b.total)
    }

    return history.map((b) => {
      const label = formatBucketLabel(b, periodType)
      const row: Record<string, string | number> = {
        label,
      }
      for (const id of CATEGORY_IDS) {
        row[id] = b.byCategory[id] ?? 0
      }
      let sum = 0
      for (const id of CORE_GROUP.categoryIds) {
        sum += (b.byCategory[id] as number) ?? 0
      }
      row[groupDataKey] = sum
      if (eventTitle) {
        row[eventDataKey] = eventMap.get(label) ?? 0
      }
      return row
    })
  }, [history, periodType, eventTitle, eventHistory])

  const dynamicMax = useMemo(() => {
    if (chartData.length === 0) return 80
    let maxVal = 0
    for (const row of chartData) {
      for (const id of selected) {
        const v = row[id] as number
        if (v > maxVal) maxVal = v
      }
      if (groupEnabled) {
        const v = (row[groupDataKey] as number) || 0
        if (v > maxVal) maxVal = v
      }
      if (eventTitle) {
        const v = (row['__event__'] as number) || 0
        if (v > maxVal) maxVal = v
      }
    }
    if (maxVal === 0) return 80
    const scaled = maxVal * 1.15
    return Math.ceil(scaled / 10) * 10
  }, [chartData, selected, groupEnabled, eventTitle])

  const budgetLine = useMemo(() => {
    if (categories.length === 0) return 0
    let total = 0
    let count = 0
    for (const id of selected) {
      const cat = catMap.get(id)
      if (cat && cat.weeklyBudget > 0) {
        const days = periodDays(periodType)
        total += cat.weeklyBudget * (days / 7)
        count++
      }
    }
    return count > 0 ? total / count : 0
  }, [categories, selected, periodType, catMap])

  /* ── Stats ───────────────────────────────── */

  const stats = useMemo(() => {
    if (history.length === 0) return null
    const current = history[history.length - 1]
    const prev = history.length >= 2 ? history[history.length - 2] : null

    const selectedTotal = selected.reduce((sum, id) => sum + (current.byCategory[id] || 0), 0)

    const days = (current.end.getTime() - current.start.getTime()) / DAY_MS
    const dailyAvg = days > 0 ? selectedTotal / days : 0

    // Peak category
    let peakId: CategoryId = selected[0] || 'accent'
    let peakHours = 0
    for (const id of selected) {
      const h = current.byCategory[id] || 0
      if (h > peakHours) { peakHours = h; peakId = id }
    }

    // WoW change
    let wowPct: number | null = null
    let wowAbs: number | null = null
    if (prev) {
      const prevTotal = selected.reduce((sum, id) => sum + (prev.byCategory[id] || 0), 0)
      wowAbs = selectedTotal - prevTotal
      wowPct = prevTotal > 0 ? (wowAbs / prevTotal) * 100 : null
    }

    return { selectedTotal, dailyAvg, peakId, peakHours, wowPct, wowAbs, hasPrev: prev !== null }
  }, [history, selected])

  /* ── Insight ─────────────────────────────── */

  const insight = useMemo(() => {
    if (history.length < 2) return null
    const current = history[history.length - 1]
    const prev = history[history.length - 2]

    const deltas = selected
      .map((id) => ({
        id,
        name: catMap.get(id)?.name ?? id,
        delta: (current.byCategory[id] || 0) - (prev.byCategory[id] || 0),
      }))
      .filter((d) => Math.abs(d.delta) >= 0.3)
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))

    if (deltas.length === 0) return null

    const up = deltas.filter((d) => d.delta > 0)
    const down = deltas.filter((d) => d.delta < 0)

    const parts: string[] = []
    if (up.length > 0) {
      parts.push(up.map((d) => `${d.name} ↑${d.delta.toFixed(1)}h`).join('、'))
    }
    if (down.length > 0) {
      parts.push(down.map((d) => `${d.name} ↓${Math.abs(d.delta).toFixed(1)}h`).join('、'))
    }

    if (parts.length === 0) return null

    return `较上期变化：${parts.join('；')}`
  }, [history, selected, catMap])

  /* ── Maturity gate ───────────────────────── */

  if (maturity.maturityLevel === 'cold') {
    return (
      <div className="trend-root" style={{ paddingTop: 40 }}>
        <style>{TREND_CSS}</style>
        <div className="flex items-center justify-center min-h-[240px] text-sm font-sans" style={{ color: 'var(--heatmap-ink-3)' }}>
          {'记录天数不足，趋势图需要至少 3 天数据'}
        </div>
      </div>
    )
  }

  /* ── Render ──────────────────────────────── */

  return (
    <div className="trend-root">
      <style>{TREND_CSS}</style>

      {/* ── Title area ─────────────────────────────────── */}
      <div className={`trend-title-area${isCompact ? ' trend-title-compact' : ''}`}>
        <div className="trend-title-left">
          <div className="trend-title-row">
            {onNavigate && (
              <button
                onClick={() => onNavigate(-1)}
                className="trend-title-arrow"
                title={'上一周期'}
              >‹</button>
            )}
            <span className="trend-title-main">
              {periodLabel(periodType)}
            </span>
            {onNavigate && (
              <button
                onClick={() => onNavigate(1)}
                className="trend-title-arrow"
                title={'下一周期'}
              >›</button>
            )}
            {/* Period toggle pills */}
            {onPeriodChange && (
              <div className="trend-title-periods">
                {(['day', 'week', 'month'] as Granularity[]).map((p) => (
                  <button
                    key={p}
                    onClick={() => onPeriodChange(p)}
                    className={`trend-title-period${periodType === p ? ' trend-title-period-active' : ''}`}
                  >
                    {p === 'day' ? '日' : p === 'week' ? '周' : '月'}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="trend-title-desc">{periodDesc(periodType)}</p>
        </div>

        {/* Category pills */}
        <div className="trend-pills">
          {CATEGORY_IDS.map((id) => {
            const cat = catMap.get(id)
            const active = selected.includes(id)
            return (
              <button
                key={id}
                onClick={() => toggleCategory(id)}
                className={`trend-pill${active ? ' trend-pill-active' : ''}`}
                style={
                  active
                    ? { backgroundColor: `var(--event-${id}-fill)`, color: '#F1EADB' }
                    : undefined
                }
              >
                {cat?.name ?? id}
              </button>
            )
          })}

          {/* Core focus group pill */}
          <button
            onClick={toggleGroup}
            className={`trend-pill${groupEnabled ? ' trend-pill-active' : ''}`}
            style={
              groupEnabled
                ? { backgroundColor: `var(--accent)`, color: '#F1EADB' }
                : undefined
            }
          >
            <span
              className="trend-pill-dot"
              style={{ backgroundColor: 'var(--accent)' }}
            />
            {CORE_GROUP.nameZh}
          </button>
        </div>

        {/* ── Event title selector ──────────────────── */}
        {onEventTitleChange && (
          <div ref={eventRef} className="trend-event-selector" style={{ position: 'relative', marginTop: 12, width: 260 }}>
            <input
              type="text"
              value={eventInput}
              onChange={(e) => { setEventInput(e.target.value); setEventOpen(true) }}
              onFocus={() => setEventOpen(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && filteredEvents.length > 0) {
                  onEventTitleChange(filteredEvents[0])
                  setEventOpen(false)
                }
                if (e.key === 'Escape') setEventOpen(false)
              }}
              placeholder={'🔍 搜索事件标题叠加趋势…'}
              style={{
                width: '100%',
                padding: '5px 10px',
                fontSize: 12,
                fontFamily: "'Noto Sans SC', sans-serif",
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: 'var(--surface-raised)',
                color: 'var(--text-primary)',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {eventTitle && (
              <button
                onClick={() => { onEventTitleChange(''); setEventInput('') }}
                style={{
                  position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', fontSize: 14,
                  color: 'var(--text-tertiary)', padding: '2px 6px',
                }}
                title={'清除'}
              >×</button>
            )}
            {eventOpen && filteredEvents.length > 0 && (
              <div
                style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
                  maxHeight: 200, overflowY: 'auto',
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-default)', borderRadius: 6,
                  marginTop: 2, boxShadow: 'var(--shadow-dialog)',
                }}
              >
                {filteredEvents.map((t) => (
                  <button
                    key={t}
                    onClick={() => { onEventTitleChange(t); setEventInput(t); setEventOpen(false) }}
                    style={{
                      display: 'block', width: '100%', textAlign: 'left',
                      padding: '5px 10px', fontSize: 12,
                      fontFamily: "'Noto Sans SC', sans-serif",
                      color: 'var(--text-primary)', background: 'transparent',
                      border: 'none', cursor: 'pointer',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--surface-sunken)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Chart ───────────────────────────────────────── */}
      <div className="trend-chart-container">
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart data={chartData} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--border-subtle)"
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={{ stroke: 'var(--border-subtle)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--text-tertiary)', fontFamily: "'JetBrains Mono', monospace" }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v: number) => `${v.toFixed(1)}h`}
              width={48}
              domain={[0, dynamicMax]}
            />
            <Tooltip content={<RechartsTooltip decimals={1} />} />

            {/* Stacked area + total line for core focus group */}
            {groupEnabled && coreGroupCategories.length > 0 && coreGroupCategories.map((id) => (
              <Area
                key={id}
                dataKey={id}
                stackId="core-group"
                fill={`var(--event-${id}-fill)`}
                fillOpacity={0.2}
                stroke={`var(--event-${id}-fill)`}
                strokeWidth={1}
                name={catMap.get(id)?.name ?? id}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls={false}
              />
            ))}
            {groupEnabled && coreGroupCategories.length > 0 && (
              <Line
                dataKey={groupDataKey}
                name={CORE_GROUP.nameZh}
                stroke="var(--accent)"
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
                connectNulls={false}
              />
            )}

            {/* Individual lines for categories not in group, or when group is off */}
            {selected
              .filter((id) => !groupEnabled || !CORE_GROUP.categoryIds.includes(id))
              .map((id) => {
                const cat = catMap.get(id)
                return (
                  <Line
                    key={id}
                    type="monotone"
                    dataKey={id}
                    name={cat?.name ?? id}
                    stroke={`var(--event-${id}-fill)`}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3, strokeWidth: 0 }}
                    connectNulls={false}
                  />
                )
              })}

            {/* ── Event title overlay line ─────────── */}
            {eventTitle && (
              <Line
                type="monotone"
                dataKey="__event__"
                name={eventTitle}
                stroke="var(--accent)"
                strokeWidth={3}
                strokeDasharray="6 3"
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent)' }}
                connectNulls={false}
              />
            )}

            {/* Budget reference line */}
            {budgetLine > 0 && (
              <ReferenceLine
                y={budgetLine}
                stroke="var(--color-text-warning)"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `${'预算'} ${budgetLine.toFixed(1)}h`,
                  position: 'insideTopRight',
                  fill: 'var(--color-text-warning)',
                  fontSize: 10,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* ── Legend ────────────────────────────────────────── */}
      <div className="trend-legend">
        {selected.map((id) => {
          const cat = catMap.get(id)
          return (
            <span key={id} className="trend-legend-item">
              <span className="trend-legend-dot" style={{ background: `var(--event-${id}-fill)` }} />
              {cat?.name ?? id}
            </span>
          )
        })}
        {groupEnabled && coreGroupCategories.length > 0 && (
          <span className="trend-legend-item">
            <span className="trend-legend-line" style={{ borderColor: 'var(--accent)', borderTopWidth: 2.5 }} />
            {CORE_GROUP.nameZh}
          </span>
        )}
        {budgetLine > 0 && (
          <span className="trend-legend-item">
            <span className="trend-legend-dash" style={{ borderColor: 'var(--color-text-warning)' }} />
            {'预算'}
          </span>
        )}
        {eventTitle && (
          <span className="trend-legend-item">
            <span className="trend-legend-line" style={{ borderColor: 'var(--accent)', borderTopWidth: 3, borderTopStyle: 'dashed' }} />
            {eventTitle.length > 14 ? eventTitle.slice(0, 14) + '…' : eventTitle}
          </span>
        )}
        <span className="trend-legend-note">
          {'每点 = 一个周期'}
        </span>
      </div>

      {/* ── Maturity warning ────────────────────────────── */}
      {maturity.maturityLevel === 'warming' && (
        <p
          className="trend-warming"
          style={{
            textAlign: 'center',
            marginTop: 16,
            fontSize: 11,
            fontFamily: "'Noto Sans SC', sans-serif",
            color: 'var(--heatmap-ink-3)',
          }}
        >
          {'数据预热中，趋势仅供参考'}
        </p>
      )}

      {/* ── Stats bar ────────────────────────────────────── */}
      {stats && (
        <div className={`trend-stats-bar${isCompact ? ' trend-stats-compact' : ''}`}>
          {/* Total */}
          <div className="trend-stat">
            <div className="trend-stat-label">{'总投入'}</div>
            <div className="trend-stat-value">
              {stats.selectedTotal.toFixed(1)}
              <span className="trend-stat-unit">h</span>
            </div>
            <div className="trend-stat-detail">
              {'最近一个周期'}
            </div>
          </div>

          {/* Daily avg */}
          <div className="trend-stat">
            <div className="trend-stat-label">{'日 均'}</div>
            <div className="trend-stat-value">
              {stats.dailyAvg.toFixed(1)}
              <span className="trend-stat-unit">h</span>
            </div>
            <div className="trend-stat-detail">
              {(() => {
                const targetHrs = selected.reduce((sum, id) => {
                  const cat = catMap.get(id)
                  return sum + (cat?.weeklyBudget ?? 0)
                }, 0) / 7
                const pct = targetHrs > 0 ? Math.round((stats.dailyAvg / targetHrs) * 100) : null
                return pct !== null ? `达成 ${pct}%` : '日均'
              })()}
            </div>
          </div>

          {/* Peak category */}
          <div className="trend-stat">
            <div className="trend-stat-label">{'高 峰'}</div>
            <div className="trend-stat-value" style={{ color: `var(--event-${stats.peakId}-fill)` }}>
              {stats.peakHours.toFixed(1)}
              <span className="trend-stat-unit">h</span>
            </div>
            <div className="trend-stat-detail">
              {catMap.get(stats.peakId)?.name ?? stats.peakId}
            </div>
          </div>

          {/* WoW change */}
          <div className="trend-stat">
            <div className="trend-stat-label">{'环 比'}</div>
            <div
              className="trend-stat-value"
              style={{
                color: stats.wowPct !== null
                  ? (stats.wowPct >= 0 ? 'var(--color-text-success)' : 'var(--color-text-danger)')
                  : undefined,
              }}
            >
              {stats.wowPct !== null ? `${stats.wowPct >= 0 ? '+' : ''}${stats.wowPct.toFixed(0)}%` : '—'}
            </div>
            <div className="trend-stat-detail">
              {stats.hasPrev
                ? (stats.wowAbs !== null
                    ? `${stats.wowAbs >= 0 ? '+' : ''}${stats.wowAbs.toFixed(1)}h`
                    : '较上期')
                : '需要更多数据'}
            </div>
          </div>
        </div>
      )}

      {/* ── Insight bar ──────────────────────────────────── */}
      {insight && (
        <div className="trend-insight">
          <div className="trend-insight-icon">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" />
              <path d="M7 4V8M7 9.5V10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          <p className="trend-insight-text">{insight}</p>
        </div>
      )}

      {/* ── Event insight bar ────────────────────────────── */}
      {eventTitle && eventHistory.length > 0 && (
        <div className="trend-insight" style={{ marginTop: 16 }}>
          <div className="trend-insight-icon" style={{ color: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <circle cx="7" cy="7" r="6.5" stroke="currentColor" strokeWidth="0.8" />
              <path d="M7 4V8M7 9.5V10" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
            </svg>
          </div>
          <div className="trend-insight-text" style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <span>事件：<strong>{eventTitle}</strong></span>
            {(() => {
              const last = eventHistory[eventHistory.length - 1]
              const allNonZero = eventHistory.filter((b) => b.total > 0)
              const avg = allNonZero.length > 0
                ? allNonZero.reduce((s, b) => s + b.total, 0) / allNonZero.length
                : 0
              return (
                <>
                  <span>本期 <strong className="hm-dot" style={{ color: 'var(--accent)' }}>{last.total.toFixed(1)}h</strong></span>
                  <span>平均 <strong>{avg.toFixed(1)}h</strong></span>
                  <span>出现 <strong>{allNonZero.length}/{eventHistory.length}</strong> 个周期</span>
                </>
              )
            })()}
          </div>
        </div>
      )}


    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────────

const TREND_CSS = `
.trend-root {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

/* ── Title area ──────────────────────────── */
.trend-title-area {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}
.trend-title-compact {
  flex-direction: column;
}
.trend-title-left {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.trend-title-main {
  font-family: 'Noto Serif SC', serif;
  font-size: 28px;
  font-weight: 600;
  color: var(--heatmap-ink-1);
  line-height: 1.2;
  letter-spacing: 0.02em;
}
.trend-title-desc {
  font-family: 'Noto Serif SC', serif;
  font-size: 14px;
  font-style: italic;
  color: var(--heatmap-ink-3);
  margin: 0;
}
.trend-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.trend-title-arrow {
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
.trend-title-arrow:hover {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg-card);
}
.trend-title-periods {
  display: flex;
  gap: 2px;
  margin-left: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 6px;
  padding: 2px;
}
.trend-title-period {
  padding: 2px 8px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: var(--heatmap-ink-3);
  transition: background-color 0.2s ease, color 0.2s ease;
}
.trend-title-period:hover {
  color: var(--heatmap-ink-1);
}
.trend-title-period-active {
  color: var(--heatmap-ink-1);
  background: var(--heatmap-bg);
  font-weight: 600;
}

/* ── Pills ───────────────────────────────── */
.trend-pills {
  display: flex;
  gap: 6px;
  background: var(--heatmap-bg-card);
  border-radius: 999px;
  padding: 4px;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.trend-pill {
  padding: 6px 16px;
  border-radius: 999px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 13px;
  font-weight: 500;
  color: var(--heatmap-ink-2);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.25s ease, color 0.25s ease;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}
.trend-pill:hover {
  color: var(--heatmap-ink-1);
}
.trend-pill-active {
  font-weight: 600;
}
.trend-pill-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* ── Chart container ─────────────────────── */
.trend-chart-container {
  margin-top: 28px;
  position: relative;
}

/* ── Legend ──────────────────────────────── */
.trend-legend {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-top: 12px;
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: var(--heatmap-ink-3);
}
.trend-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.trend-legend-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.trend-legend-line {
  width: 20px;
  height: 0;
  border-top: 2px solid;
  flex-shrink: 0;
}
.trend-legend-dash {
  width: 20px;
  height: 0;
  border-top: 1.5px dashed;
  flex-shrink: 0;
}
.trend-legend-note {
  margin-left: auto;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  opacity: 0.65;
}

/* ── Stats bar ───────────────────────────── */
.trend-stats-bar {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  border-top: 1px solid var(--heatmap-rule);
  border-bottom: 1px solid var(--heatmap-rule);
  margin-top: 28px;
}
.trend-stats-compact {
  grid-template-columns: repeat(2, 1fr);
}
.trend-stat {
  padding: 24px 20px;
  border-right: 1px solid var(--heatmap-rule);
}
.trend-stat:last-child {
  border-right: none;
}
.trend-stats-compact .trend-stat:nth-child(even) {
  border-right: none;
}
.trend-stat-label {
  font-family: 'Noto Serif SC', serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.4em;
  margin-bottom: 8px;
}
.trend-stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  color: var(--heatmap-ink-1);
  line-height: 1.1;
  margin-bottom: 6px;
}
.trend-stat-unit {
  font-size: 14px;
  color: var(--heatmap-ink-2);
  margin-left: 2px;
}
.trend-stat-detail {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 11px;
  color: var(--heatmap-ink-3);
}

/* ── Insight bar ─────────────────────────── */
.trend-insight {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 20px;
  padding: 12px 16px;
  background: var(--color-bg-info);
  border-radius: 8px;
}
.trend-insight-icon {
  flex-shrink: 0;
  color: var(--color-text-info);
  margin-top: 1px;
}
.trend-insight-text {
  font-family: 'Noto Sans SC', sans-serif;
  font-size: 12px;
  color: var(--color-text-info);
  margin: 0;
  line-height: 1.5;
}

/* ── Responsive ──────────────────────────── */
@media (max-width: 719px) {
  .trend-title-main {
    font-size: 22px;
  }
  .trend-title-desc {
    font-size: 13px;
  }
  .trend-pills {
    width: 100%;
  }
  .trend-stat-value {
    font-size: 22px;
  }
  .trend-stat {
    padding: 18px 14px;
  }
}
`

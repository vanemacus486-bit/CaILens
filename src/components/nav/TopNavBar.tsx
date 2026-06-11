/**
 * # TopNavBar — 全局顶栏导航
 *
 * 单行：左侧导航标签（日历 / 规划 / 复盘）
 *       中间 flex-space
 *       右侧（仅 /week 路由时）周导航控件 + 视图切换
 *       最右：设置
 *
 * 日期文本点击回到本周（取代「今」按钮）。
 * 周导航通过 URL searchParams 驱动，WeekView 自动响应。
 */

import { useCallback, useMemo } from 'react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'
import { getISOWeek, addDays } from 'date-fns'
import { Settings, Search } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useUIStore } from '@/stores/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import {
  formatMonthDay,
  getWeekStart,
  addWeeks,
  formatISODate,
  parseISODate,
} from '@/domain/time'

// ── 导航项配置 ────────────────────────────────────────

type NavMode = 'calendar' | 'plan' | 'review'

const NAV_ITEMS: {
  mode: NavMode
  path: string
  labelZh: string
  labelEn: string
  shortcut: string
}[] = [
  { mode: 'calendar', path: '/week',   labelZh: '日历', labelEn: 'Calendar', shortcut: '1' },
  { mode: 'plan',     path: '/action', labelZh: '规划', labelEn: 'Plan',      shortcut: '2' },

  { mode: 'review',   path: '/stats',  labelZh: '复盘', labelEn: 'Review',    shortcut: '3' },
]

// ── 工具 ──────────────────────────────────────────────

function parseWeekParam(param: string | null): Date {
  if (!param) return getWeekStart(new Date(), 1)
  try {
    const parsed = parseISODate(param)
    if (isNaN(parsed.getTime())) return getWeekStart(new Date(), 1)
    return getWeekStart(parsed, 1)
  } catch {
    return getWeekStart(new Date(), 1)
  }
}

// ── 主组件 ───────────────────────────────────────────

export function TopNavBar() {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const language = useAppSettingsStore((s) => s.settings.language)
  const isMobile = useIsMobile()

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  // 当前导航
  const activeMode = NAV_ITEMS.find((m) =>
    location.pathname.startsWith(m.path),
  )?.mode ?? 'calendar'

  // 当前路由判断
  const isOnWeek = location.pathname.startsWith('/week')

  // 从 URL 解析周起始（仅 /week 时有效）
  const weekStart = useMemo(
    () => (isOnWeek ? parseWeekParam(searchParams.get('week')) : new Date()),
    [isOnWeek, searchParams],
  )

  const viewMode = (searchParams.get('view') as 'week' | 'day' | 'month' | null) ?? 'week'

  // 周导航
  const prevWeek = useCallback(() => {
    const prev = addWeeks(weekStart, -1)
    const next = new URLSearchParams(searchParams)
    next.set('week', formatISODate(prev))
    setSearchParams(next, { replace: true })
  }, [weekStart, searchParams, setSearchParams])

  const nextWeek = useCallback(() => {
    const nextW = addWeeks(weekStart, 1)
    const next = new URLSearchParams(searchParams)
    next.set('week', formatISODate(nextW))
    setSearchParams(next, { replace: true })
  }, [weekStart, searchParams, setSearchParams])

  const goToToday = useCallback(() => {
    const next = new URLSearchParams(searchParams)
    next.set('week', formatISODate(getWeekStart(new Date(), 1)))
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  // 视图切换
  const handleViewModeChange = useCallback(
    (mode: 'week' | 'day' | 'month') => {
      const next = new URLSearchParams(searchParams)
      if (mode === 'day') {
        next.set('view', 'day')
        next.set('date', formatISODate(new Date()))
      } else if (mode === 'month') {
        next.set('view', 'month')
        next.set('date', formatISODate(new Date()))
      } else {
        next.delete('view')
        next.delete('date')
      }
      setSearchParams(next, { replace: true })
    },
    [searchParams, setSearchParams],
  )

  // 日期标签
  const weekEnd = addDays(weekStart, 6)
  const rangeLabel = `${formatMonthDay(weekStart)} – ${formatMonthDay(weekEnd)}`
  const weekNum = getISOWeek(weekStart)

  return (
    <div className="flex items-center justify-between px-6 h-[52px] flex-shrink-0 border-b border-border-subtle">
      {/* ── 左：导航标签 ── */}
      <div className="flex items-center gap-6">
        {NAV_ITEMS.map((item) => {
          const isActive = item.mode === activeMode
          return (
            <button
              key={item.mode}
              onClick={() => navigate(item.path)}
              className="relative cursor-pointer bg-transparent border-none py-[2px] transition-colors duration-200"
              style={{
                color: isActive ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: isActive ? 500 : 400,
              }}
            >
              <span className="font-sans text-sm tracking-[-0.01em]">
                {t(item.labelZh, item.labelEn)}
              </span>
              {isActive && (
                <span
                  className="absolute left-0 right-0 bottom-[-2px] h-[2px] rounded-full"
                  style={{ backgroundColor: 'var(--accent)' }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* ── 中：弹性空间 ── */}
      <div className="flex-1" />

      {/* ── 周控件（仅 /week 路由 + 桌面端） ── */}
      {isOnWeek && !isMobile && (
        <div className="flex items-center gap-1.5 mr-3">
          {/* 周切换箭头 */}
          <button
            onClick={prevWeek}
            className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
            aria-label={t('上一周', 'Previous week')}
          >
            ‹
          </button>

          {/* 日期标签 — 点击回本周 */}
          <button
            onClick={goToToday}
            className="cursor-pointer bg-transparent border-none text-center min-w-[160px] hover:opacity-70 transition-opacity"
            title={t('回到本周', 'Go to this week')}
          >
            <span className="font-serif text-sm font-medium text-text-primary whitespace-nowrap block leading-tight">
              {rangeLabel}
            </span>
            <span className="font-mono text-[10px] text-text-tertiary whitespace-nowrap block leading-tight">
              {t(`第 ${weekNum} 周`, `Week ${weekNum}`)}
            </span>
          </button>

          <button
            onClick={nextWeek}
            className="w-7 h-7 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer text-lg leading-none"
            aria-label={t('下一周', 'Next week')}
          >
            ›
          </button>

          {/* 搜索 */}
          <button
            onClick={() => useUIStore.getState().setCommandPaletteOpen(true)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer ml-1"
            aria-label={t('搜索事件', 'Search events')}
          >
            <Search size={14} strokeWidth={1.75} />
          </button>

          {/* 视图切换分段控件 */}
          <div className="flex bg-surface-sunken rounded-md p-[2px] gap-0 ml-1">
            {(['day', 'week', 'month'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => handleViewModeChange(mode)}
                className={`font-sans text-xs font-medium rounded px-2.5 py-[3px] transition-colors duration-200 cursor-pointer border-none ${
                  viewMode === mode
                    ? 'bg-surface-raised text-accent shadow-sm'
                    : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                {mode === 'day' ? 'D' : mode === 'week' ? 'W' : 'M'}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── 右：设置 ── */}
      <button
        onClick={() => navigate('/settings')}
        className="w-8 h-8 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer flex-shrink-0"
        aria-label="Settings"
      >
        <Settings size={16} strokeWidth={1.75} />
      </button>
    </div>
  )
}

/**
 * # CompactSidebar — 侧栏内容紧凑版
 *
 * 复刻侧边栏的功能内容，用于悬停卡片中提供无侧栏环境下的快捷操作。
 * 侧栏收起时，AppHeader 的 ☰ 悬停菜单渲染的就是它。
 *
 * 域内容（规划过滤 / 复盘子视图）由插件通过 `<PluginDomainPanel />` 提供，
 * 这里不再有任何关于具体插件的分支或注释。
 */

import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Settings } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import { useDomainNav } from '@/components/nav/domainNav'
import { SlideSegmented } from '@/components/nav/SlideSegmented'
import { PluginDomainPanel } from '@/plugins/PluginSidebar'
import { PluginNav } from '@/plugins/PluginNav'
import { upcomingMarks, formatRelativeDay } from '@/domain/dayMark'
import { formatISODate, getWeekStart } from '@/domain/time'

export function CompactSidebar() {
  const location = useLocation()
  const navigate = useNavigate()
  const language = useAppSettingsStore((s) => s.settings.language)
  const dayMarks = useAppSettingsStore((s) => s.settings.dayMarks ?? [])
  const { activeMode, navItems, handleModeChange, shortcutHints } = useDomainNav()
  const t = useT()

  const isWeek = location.pathname.startsWith('/week') || location.pathname === '/'

  const handleOpenSettings = () => {
    import('@/stores/uiStore').then(({ useUIStore }) => {
      useUIStore.getState().setSettingsModalOpen(true)
    })
  }

  // ── /week 提醒 ──
  const reminders = useMemo(() => {
    if (!isWeek) return []
    return upcomingMarks(dayMarks, Date.now()).slice(0, 5)
  }, [isWeek, dayMarks])

  const handleReminderClick = (dateMs: number) => {
    const ws = getWeekStart(new Date(dateMs), 1)
    navigate(`/week?week=${formatISODate(ws)}&highlight=${formatISODate(new Date(dateMs))}`)
  }

  const btnBase =
    'w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer border-none transition-all duration-200 ease-out font-sans leading-none'
  const btnUnselected = 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8'

  return (
    <div className="flex flex-col gap-1 w-64">
      {/* ── 域导航 ── */}
      <SlideSegmented
        items={navItems}
        value={activeMode}
        onChange={handleModeChange}
        shareKey="domain"
        stretch
        shortcuts={shortcutHints}
      />

      <div className="h-px bg-border-subtle" />

      {/* 当前域内容由插件提供；关闭插件后为空 */}
      <PluginDomainPanel />

      {/* 插件贡献的独立入口（非域页面，如补记） */}
      <PluginNav compact />

      {/* ── /week：即将到来提醒 ── */}
      {isWeek && reminders.length > 0 && (
        <div className="flex flex-col gap-0.5">
          {reminders.map((mark) => (
            <button
              key={mark.id}
              type="button"
              onClick={() => handleReminderClick(mark.date)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs cursor-pointer text-left hover:bg-surface-base transition-colors border-none bg-transparent"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: mark.color
                    ? `var(--event-${mark.color}-fill)`
                    : 'var(--accent)',
                }}
              />
              <span className="flex-1 truncate text-text-primary min-w-0">{mark.label}</span>
              <span className="text-text-tertiary flex-shrink-0">
                {formatRelativeDay(mark.date, Date.now(), language)}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="h-px bg-border-subtle" />

      {/* ── 设置 ── */}
      <button type="button" onClick={handleOpenSettings} className={`${btnBase} ${btnUnselected}`}>
        <Settings size={16} strokeWidth={1.75} className="text-text-tertiary" />
        <span>{t('nav.settings')}</span>
      </button>
    </div>
  )
}

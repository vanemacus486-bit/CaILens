/**
 * # domainNav — 主域切换器的唯一数据源
 *
 * 日历域由主体独占（Alt+1），规划 / 复盘两个域由插件通过 `PluginDomain` 认领。
 * 这里把「主体固定域 + 已启用插件的域」合并成一条有序列表，供顶栏、侧栏、
 * 紧凑侧栏三个切换器共用 —— 主体不再硬编码 /action、/stats。
 *
 * 关闭插件后对应域自动消失，不需要任何 if 分支。
 */

import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  CalendarDays,
  CheckSquare,
  TrendingUp,
  BarChart3,
  ListChecks,
  Puzzle,
  type LucideIcon,
} from 'lucide-react'
import { translate } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { collectDomains } from '@/plugins/registry'

/** 白名单图标映射：避免 `import * as icons` 把整个 lucide 拉进首屏。 */
const ICONS: Record<string, LucideIcon> = {
  CalendarDays,
  CheckSquare,
  TrendingUp,
  BarChart3,
  ListChecks,
  Puzzle,
}

/** 日历域由主体独占，永远排在第一位。 */
export const CALENDAR_DOMAIN = {
  id: 'calendar',
  path: '/week',
  to: '/week',
  icon: 'CalendarDays',
  labelKey: 'nav.calendar',
  shortcutOrder: 1,
} as const

export interface DomainNavItem {
  id: string
  label: string
  icon: LucideIcon
  /** 该域的根路径，用于判断当前是否处于该域 */
  path: string
  /** 切换时跳转的路径 */
  to: string
  /** 同域但不在 path 前缀下的页面 */
  extraPaths?: string[]
  /** Alt+N 的 N */
  shortcutOrder: number
}

function isWithin(pathname: string, path: string): boolean {
  return pathname === path || pathname.startsWith(`${path}/`)
}

export function useDomainNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const language = useAppSettingsStore((s) => s.settings.language)
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)

  // 该切换器要在窄侧边栏里三项等分挤下完整文字，只精确适配中/英；
  // 其余语言词长差异太大（如 Calendario/Planificar），一律回退英文避免溢出截断。
  const labelLang = language === 'zh' ? 'zh' : 'en'

  const navItems = useMemo<DomainNavItem[]>(() => {
    const calendar: DomainNavItem = {
      id: CALENDAR_DOMAIN.id,
      label: translate(CALENDAR_DOMAIN.labelKey, labelLang),
      icon: ICONS[CALENDAR_DOMAIN.icon],
      path: CALENDAR_DOMAIN.path,
      to: CALENDAR_DOMAIN.to,
      shortcutOrder: CALENDAR_DOMAIN.shortcutOrder,
    }

    const pluginItems = collectDomains(overrides ?? {}).map(({ domain }) => ({
      id: domain.id,
      label: domain.labelKey
        ? translate(domain.labelKey as TranslationKey, labelLang)
        : domain.label,
      icon: ICONS[domain.icon] ?? Puzzle,
      path: domain.path,
      to: domain.to,
      shortcutOrder: domain.shortcutOrder,
      extraPaths: domain.extraPaths,
    }))

    return [calendar, ...pluginItems].sort((a, b) => a.shortcutOrder - b.shortcutOrder)
  }, [labelLang, overrides])

  // 最长前缀匹配：将来出现 /action/archive 这类子路径时，短前缀不会抢走归属。
  const activeMode = useMemo(() => {
    const hit = navItems
      .filter((item) =>
        isWithin(location.pathname, item.path) ||
        (item.extraPaths ?? []).some((p) => isWithin(location.pathname, p)),
      )
      .sort((a, b) => b.path.length - a.path.length)[0]
    return hit?.id ?? CALENDAR_DOMAIN.id
  }, [navItems, location.pathname])

  const shortcutHints = useMemo(
    () => Object.fromEntries(navItems.map((item) => [item.id, `Alt+${item.shortcutOrder}`])),
    [navItems],
  )

  const handleModeChange = (id: string) => {
    const target = navItems.find((item) => item.id === id)
    if (target) navigate(target.to)
  }

  return { activeMode, navItems, handleModeChange, shortcutHints }
}

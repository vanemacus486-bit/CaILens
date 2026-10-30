import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Rows3,
  Puzzle,
  BookOpen,
  Lightbulb,
  ListChecks,
  BarChart3,
  CheckSquare,
  TrendingUp,
  type LucideIcon,
} from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { cn } from '@/lib/utils'
import { collectNavItems } from './registry'

/**
 * 插件导航渲染。
 *
 * `PluginDefinition.navItems` 只是数据，真正的渲染必须有人做——否则插件注册了
 * 导航却永远看不见（这条路之前断过：`collectNavItems` 有实现、有单测，但零 UI 消费）。
 *
 * 图标用**白名单映射**而不是 `import * as icons`：后者会把整个 lucide 图标库
 * 拉进 bundle，首屏体积直接翻倍。插件想要新图标，在这里加一行即可。
 */
const ICONS: Record<string, LucideIcon> = {
  Rows3,
  Puzzle,
  BookOpen,
  Lightbulb,
  ListChecks,
  BarChart3,
  CheckSquare,
  TrendingUp,
}

export interface PluginNavProps {
  /** 紧凑模式：只显示图标（侧栏收起时用） */
  compact?: boolean
  className?: string
  /**
   * 点击入口后的回调。移动端抽屉菜单需要它来关闭自己；
   * 侧栏不需要（导航即离开，侧栏本来就常驻）。
   */
  onClickItem?: () => void
}

export function PluginNav({ compact = false, className, onClickItem }: PluginNavProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)

  const groups = useMemo(() => collectNavItems(overrides ?? {}), [overrides])
  const items = useMemo(
    () =>
      groups
        .flatMap((g) => g.items.map((item) => ({ ...item, pluginId: g.pluginId })))
        .sort((a, b) => a.order - b.order),
    [groups],
  )

  if (items.length === 0) return null

  return (
    <nav className={cn('flex flex-col gap-0.5', className)} aria-label="插件">
      {items.map((item) => {
        const Icon = ICONS[item.icon] ?? Puzzle
        const active = location.pathname === item.to
        return (
          <button
            key={`${item.pluginId}:${item.to}`}
            type="button"
            onClick={() => {
              navigate(item.to)
              onClickItem?.()
            }}
            aria-current={active ? 'page' : undefined}
            title={compact ? item.label : undefined}
            className={cn(
              'flex cursor-pointer items-center gap-2 rounded-lg border-none bg-transparent text-left transition-colors duration-200',
              compact ? 'h-9 w-9 justify-center' : 'px-3 py-1.5',
              active
                ? 'bg-surface-sunken text-text-primary'
                : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary',
            )}
          >
            <Icon size={15} strokeWidth={1.75} className="shrink-0" />
            {!compact && <span className="truncate font-sans text-sm">{item.label}</span>}
          </button>
        )
      })}
    </nav>
  )
}

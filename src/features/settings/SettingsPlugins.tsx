import { useMemo, useState } from 'react'
import { Package, Puzzle, Search } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { listPlugins } from '@/plugins/registry'
import {
  buildPluginCards,
  countPlugins,
  filterPluginCards,
  type PluginStatusFilter,
} from '@/plugins/marketplace'
import { cn } from '@/lib/utils'

/**
 * 插件市场（设置页里的「插件」标签）。
 *
 * 三件事：列出已注册插件、搜索 / 按启用状态筛选、逐个开关。
 * 不做「安装 / 卸载」—— 插件随应用一起编译，没有运行时下载。
 * 所有派生逻辑（卡片、筛选、计数）都在 `plugins/marketplace.ts`，这里只负责渲染。
 */

const STATUS_TABS: { id: PluginStatusFilter; label: string }[] = [
  { id: 'all', label: '全部' },
  { id: 'enabled', label: '已启用' },
  { id: 'disabled', label: '已停用' },
]

export function SettingsPlugins() {
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)
  const setPluginEnabled = useAppSettingsStore((s) => s.setPluginEnabled)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PluginStatusFilter>('all')

  const cards = useMemo(() => buildPluginCards(listPlugins(), overrides ?? {}), [overrides])
  const counts = useMemo(() => countPlugins(cards), [cards])
  const visible = useMemo(() => filterPluginCards(cards, { status, query }), [cards, status, query])

  if (cards.length === 0) {
    return (
      <div className="flex items-start gap-3 text-text-tertiary">
        <Puzzle size={18} className="mt-0.5 shrink-0" />
        <div className="text-sm leading-relaxed">
          <p className="text-text-secondary">还没有可用的插件。</p>
          <p className="mt-1">
            插件是随应用一起编译的可选模块，开关只影响入口是否注册，不影响已有数据。
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-3 text-text-tertiary">
        <Package size={18} className="mt-0.5 shrink-0" />
        <p className="text-sm leading-relaxed">
          插件随应用编译，无法在运行时下载。关闭插件只是隐藏它的入口与路由，数据保留。
        </p>
      </div>

      {/* 搜索 + 状态筛选 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[12rem] flex-1">
          <Search
            size={14}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索插件"
            aria-label="搜索插件"
            className="w-full rounded-lg border border-border-subtle bg-surface-base py-1.5 pl-8 pr-3 font-sans text-sm text-text-primary outline-none transition-colors duration-150 focus:border-accent"
          />
        </div>

        <div role="radiogroup" aria-label="按启用状态筛选" className="flex items-center gap-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="radio"
              aria-checked={status === tab.id}
              aria-label={tab.label}
              onClick={() => setStatus(tab.id)}
              className={cn(
                'cursor-pointer rounded-md border border-border-subtle px-2.5 py-1 font-sans text-xs transition-colors duration-150',
                status === tab.id
                  ? 'bg-surface-sunken text-text-primary'
                  : 'bg-transparent text-text-tertiary hover:text-text-secondary',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 计数条 */}
      <p data-testid="plugin-counts" className="text-xs text-text-tertiary">
        共 <span className="font-mono text-text-secondary">{counts.total}</span> 个 · 已启用{' '}
        <span className="font-mono text-text-secondary">{counts.enabled}</span> 个
        {counts.disabled > 0 && ` · 已停用 ${counts.disabled} 个`}
      </p>

      {/* 列表 / 空态 */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-tertiary">
          没有匹配的插件
        </div>
      ) : (
        <ul className="flex flex-col gap-2">
          {visible.map((plugin) => (
            <li
              key={plugin.id}
              className={cn(
                'flex items-start justify-between gap-4 rounded-lg border px-4 py-3 transition-colors duration-200',
                plugin.enabled
                  ? 'border-border-subtle bg-surface-raised'
                  : 'border-border-subtle bg-surface-base',
              )}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-sans text-sm font-medium text-text-primary">{plugin.name}</span>
                  <span className="font-mono text-xs text-text-tertiary">v{plugin.version}</span>
                  {!plugin.isOverridden && (
                    <span className="rounded px-1 py-0.5 text-2xs text-text-quaternary ring-1 ring-border-subtle">
                      默认
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs leading-relaxed text-text-tertiary">{plugin.description}</p>
                {plugin.tables.length > 0 && (
                  <p className="mt-1 font-mono text-xs text-text-tertiary">
                    表：{plugin.tables.join(', ')}
                  </p>
                )}
                <p className="mt-1 font-mono text-xs text-text-quaternary">
                  {plugin.routeCount} 个页面 · {plugin.navCount} 个入口
                </p>
              </div>

              <button
                type="button"
                role="switch"
                aria-checked={plugin.enabled}
                aria-label={`${plugin.name} ${plugin.enabled ? '已启用' : '已停用'}`}
                onClick={() => { void setPluginEnabled(plugin.id, !plugin.enabled) }}
                className={cn(
                  'relative mt-1 h-5 w-9 shrink-0 cursor-pointer rounded-full transition-colors duration-200',
                  plugin.enabled ? 'bg-accent' : 'bg-surface-sunken',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform duration-200',
                    plugin.enabled ? 'left-[18px]' : 'left-0.5',
                  )}
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

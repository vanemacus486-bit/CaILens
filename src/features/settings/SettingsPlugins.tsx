import { useMemo, useState } from 'react'
import { Package, Puzzle, Search } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { listPlugins } from '@/plugins/registry'
import type { PluginOrigin } from '@/plugins/types'
import {
  buildPluginCards,
  countPlugins,
  filterPluginCards,
  groupPluginCards,
  type PluginCard,
  type PluginStatusFilter,
} from '@/plugins/marketplace'
import { cn } from '@/lib/utils'
import { SettingsRow, SettingsSection, SettingsToggle } from './ui'

/**
 * 插件市场（设置页里的「核心插件 / 第三方插件」两页共用）。
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

interface SettingsPluginsProps {
  /** 只渲染某个来源分组；缺省渲染全部（带分组头）。 */
  onlyOrigin?: PluginOrigin
}

export function SettingsPlugins({ onlyOrigin }: SettingsPluginsProps = {}) {
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)
  const setPluginEnabled = useAppSettingsStore((s) => s.setPluginEnabled)

  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<PluginStatusFilter>('all')

  const cards = useMemo(() => {
    const all = buildPluginCards(listPlugins(), overrides ?? {})
    return onlyOrigin ? all.filter((c) => c.origin === onlyOrigin) : all
  }, [overrides, onlyOrigin])
  const counts = useMemo(() => countPlugins(cards), [cards])
  const visible = useMemo(() => filterPluginCards(cards, { status, query }), [cards, status, query])
  const sections = useMemo(() => groupPluginCards(visible), [visible])
  const hasFilter = status !== 'all' || query.trim().length > 0

  // 指定来源时不做整体空态 —— 交给分组渲染走 emptyHint，
  // 否则「第三方插件」页只会说「还没有可用的插件」，看不出这一类将来是什么。
  if (cards.length === 0 && !onlyOrigin) {
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
    <div
      className="flex flex-col gap-5"
      data-settings-item={
        onlyOrigin === 'core'
          ? 'core-plugins-list'
          : onlyOrigin === 'third-party'
            ? 'third-party-list'
            : undefined
      }
    >
      {/* 工具区：说明 + 搜索 + 状态筛选 + 计数 */}
      <div className="flex flex-col gap-3">
        <div className="flex items-start gap-3 text-text-tertiary">
          <Package size={18} className="mt-0.5 shrink-0" />
          <p className="text-sm leading-relaxed">
            插件随应用编译，无法在运行时下载。关闭插件只是隐藏它的入口与路由，数据保留。
          </p>
        </div>

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
              className="h-8 w-full rounded-lg border border-border-subtle bg-surface-base py-1.5 pl-8 pr-3 font-sans text-sm text-text-primary outline-none transition-colors duration-150 focus:border-border-default focus-visible:ring-2 focus-visible:ring-accent/25"
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

        <p data-testid="plugin-counts" className="text-xs text-text-tertiary">
          共 <span className="font-mono text-text-secondary">{counts.total}</span> 个 · 已启用{' '}
          <span className="font-mono text-text-secondary">{counts.enabled}</span> 个
          {counts.disabled > 0 && ` · 已停用 ${counts.disabled} 个`}
        </p>
      </div>

      {/* 分组列表 / 空态 */}
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border-subtle px-4 py-6 text-center text-sm text-text-tertiary">
          {hasFilter ? '没有匹配的插件' : '没有可用的插件'}
        </div>
      ) : (
        sections.map((section) => (
          <SettingsSection
            key={section.meta.id}
            testId={`plugin-group-${section.meta.id}`}
            title={section.meta.label}
            description={section.meta.description}
            action={
              <span className="font-mono text-xs text-text-quaternary">
                {section.cards.length}
              </span>
            }
          >
            {section.cards.length === 0 ? (
              <p className="px-5 py-4 text-xs leading-relaxed text-text-tertiary">
                {hasFilter ? '没有匹配的插件' : section.meta.emptyHint}
              </p>
            ) : (
              section.cards.map((plugin) => (
                <PluginRow
                  key={plugin.id}
                  plugin={plugin}
                  onChange={(enabled) => { void setPluginEnabled(plugin.id, enabled) }}
                />
              ))
            )}
          </SettingsSection>
        ))
      )}
    </div>
  )
}

interface PluginRowProps {
  plugin: PluginCard
  onChange: (enabled: boolean) => void
}

/** 单个插件行：名称 / 版本 / 默认标记 / 说明 / 表 / 计数 + 右侧开关。 */
function PluginRow({ plugin, onChange }: PluginRowProps) {
  const meta = [
    plugin.routeCount > 0 ? `${plugin.routeCount} 个页面` : null,
    plugin.navCount > 0 ? `${plugin.navCount} 个入口` : null,
    plugin.viewCount > 0 ? `${plugin.viewCount} 个视角` : null,
  ].filter(Boolean).join(' · ') || '无独立入口'

  return (
    <SettingsRow
      anchor={`plugin-${plugin.id}`}
      className={cn(!plugin.enabled && 'bg-surface-base/40')}
      title={
        <span className="flex flex-wrap items-center gap-2">
          <span>{plugin.name}</span>
          <span className="font-mono text-xs font-normal text-text-tertiary">
            v{plugin.version}
          </span>
          {!plugin.isOverridden && (
            <span className="rounded px-1 py-0.5 text-2xs font-normal text-text-quaternary ring-1 ring-border-subtle">
              默认
            </span>
          )}
        </span>
      }
      description={
        <>
          <p>{plugin.description}</p>
          {plugin.tables.length > 0 && (
            <p className="mt-1 font-mono text-xs text-text-tertiary">
              表：{plugin.tables.join(', ')}
            </p>
          )}
          <p className="mt-1 font-mono text-xs text-text-quaternary">{meta}</p>
        </>
      }
    >
      <SettingsToggle
        checked={plugin.enabled}
        onChange={onChange}
        label={`${plugin.name} ${plugin.enabled ? '已启用' : '已停用'}`}
      />
    </SettingsRow>
  )
}

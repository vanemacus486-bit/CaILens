import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Blocks,
  FolderOpen,
  Info,
  Keyboard,
  LayoutGrid,
  Package,
  Palette,
  Search,
  type LucideIcon,
} from 'lucide-react'
import { useUIStore, type SettingsTab } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { listPlugins } from '@/plugins/registry'
import { useT } from '@/i18n/useT'
import { cn } from '@/lib/utils'
import {
  SETTINGS_TAB_GROUPS,
  SETTINGS_TABS,
  resolveNavTab,
  type SettingsTabIcon,
  type TabDef,
} from './settingsTabs'
import {
  buildSettingsSearchIndex,
  fuzzyMatch,
  searchSettings,
  type SettingsSearchItem,
} from './settingsSearch'

/** 图标语义名 → 组件。数据侧只存字符串，避免 `.ts` 里出现组件值。 */
const ICONS: Record<SettingsTabIcon, LucideIcon> = {
  info: Info,
  palette: Palette,
  layout: LayoutGrid,
  folder: FolderOpen,
  keyboard: Keyboard,
  blocks: Blocks,
  package: Package,
}

export function filterTabs(tabs: readonly TabDef[], query: string): TabDef[] {
  if (!query.trim()) return [...tabs]
  return tabs.filter(
    (tab) =>
      fuzzyMatch(query, tab.labelZh) ||
      fuzzyMatch(query, tab.labelEn) ||
      fuzzyMatch(query, tab.descZh) ||
      fuzzyMatch(query, tab.descEn) ||
      (tab.keywords ?? []).some((kw) => fuzzyMatch(query, kw)),
  )
}

/** 跳转后高亮的持续时间，与 index.css 的 `.settings-row-flash` 对齐。 */
const FLASH_MS = 1600

interface SettingsNavProps {
  /** 当前页签；隐藏子页会被映射到侧栏里的父页签再高亮。 */
  activeTab: SettingsTab
  /** 选中后的额外回调（切页由 Nav 自己写 store，父组件不必再写一次）。 */
  onSelect?: (tab: SettingsTab) => void
  /** 弹窗打开时自动聚焦搜索框。 */
  autoFocusSearch?: boolean
  className?: string
}

/**
 * 设置侧栏（网页弹窗与桌面独立窗口共用）。
 *
 * 结构照 Obsidian：搜索框在最上，下面按组列出单行导航项，图标在左。
 * 输入关键词时，页签列表整体替换为**设置项级搜索结果**：点击后切到所属页、
 * 滚动到该行并短暂高亮。结果按页签分组，所以「语言」不会只告诉你它在哪一页，
 * 还会直接把你送到那一行。
 */
export function SettingsNav({
  activeTab,
  onSelect,
  autoFocusSearch = false,
  className,
}: SettingsNavProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const categories = useCategoryStore((s) => s.categories)
  const t = useT()
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)

  const [query, setQuery] = useState('')
  const [resultIndex, setResultIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement>(null)

  const navTab = resolveNavTab(activeTab)
  const hasQuery = query.trim().length > 0

  const visibleTabs = useMemo(() => filterTabs(SETTINGS_TABS, query), [query])
  const searchIndex = useMemo(
    () => buildSettingsSearchIndex({ plugins: listPlugins(), categories }),
    [categories],
  )
  const results = useMemo(
    () => (hasQuery ? searchSettings(query, searchIndex) : []),
    [hasQuery, query, searchIndex],
  )

  /** 按页签分组的结果，顺序与侧栏一致；扁平下标用于键盘选中。 */
  const resultGroups = useMemo(() => {
    let flat = 0
    return SETTINGS_TABS.flatMap((tab) => {
      const items = results
        .filter((item) => item.tab === tab.key)
        .map((item) => ({ item, index: flat++ }))
      return items.length > 0 ? [{ tab, items }] : []
    })
  }, [results])

  useEffect(() => {
    setResultIndex(0)
  }, [query])

  useEffect(() => {
    if (!autoFocusSearch) return
    const id = setTimeout(() => searchRef.current?.focus(), 50)
    return () => clearTimeout(id)
  }, [autoFocusSearch])

  const select = useCallback(
    (tab: TabDef) => {
      setActiveSettingsTab(tab.key)
      onSelect?.(tab.key)
    },
    [onSelect, setActiveSettingsTab],
  )

  /**
   * 切页 → 等 DOM 换页 → 滚动到锚点 → 高亮。
   *
   * 两次 rAF 覆盖「setState → 提交 → 浏览器布局」；目标行在条件渲染下
   * （如仅桌面显示的存储行、空插件组）可能不存在，此时静默放弃。
   */
  const goToItem = useCallback(
    (item: SettingsSearchItem) => {
      setActiveSettingsTab(item.tab)
      onSelect?.(item.tab)
      setQuery('')

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const el = document.querySelector<HTMLElement>(
            `[data-settings-item="${item.anchor}"]`,
          )
          if (!el) return
          const reduceMotion =
            typeof window.matchMedia === 'function' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches
          el.scrollIntoView({
            block: 'center',
            behavior: reduceMotion ? 'auto' : 'smooth',
          })
          el.classList.add('settings-row-flash')
          setTimeout(() => el.classList.remove('settings-row-flash'), FLASH_MS)
        })
      })
    },
    [onSelect, setActiveSettingsTab],
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (hasQuery) {
        if (results.length === 0) return
        if (e.key === 'ArrowDown') {
          e.preventDefault()
          setResultIndex((i) => (i + 1) % results.length)
        } else if (e.key === 'ArrowUp') {
          e.preventDefault()
          setResultIndex((i) => (i - 1 + results.length) % results.length)
        } else if (e.key === 'Enter') {
          e.preventDefault()
          goToItem(results[Math.min(resultIndex, results.length - 1)])
        }
        return
      }

      if (visibleTabs.length === 0) return
      const idx = visibleTabs.findIndex((tab) => tab.key === navTab)
      let nextIdx: number
      if (e.key === 'ArrowDown') {
        nextIdx = idx < 0 ? 0 : (idx + 1) % visibleTabs.length
        e.preventDefault()
      } else if (e.key === 'ArrowUp') {
        nextIdx = idx < 0 ? visibleTabs.length - 1 : (idx - 1 + visibleTabs.length) % visibleTabs.length
        e.preventDefault()
      } else if (e.key === 'Enter') {
        if (idx >= 0) {
          e.preventDefault()
          select(visibleTabs[idx])
        }
        return
      } else {
        return
      }
      if (nextIdx !== idx) select(visibleTabs[nextIdx])
    },
    [goToItem, hasQuery, navTab, resultIndex, results, select, visibleTabs],
  )

  return (
    <nav
      className={cn(
        'flex w-[248px] flex-shrink-0 flex-col overflow-hidden border-r border-border-subtle/70 bg-surface-sunken/40 max-[820px]:w-[200px]',
        className,
      )}
      onKeyDown={handleKeyDown}
      role={hasQuery ? undefined : 'tablist'}
      aria-orientation={hasQuery ? undefined : 'vertical'}
      aria-label={t('nav.settings')}
    >
      {/* 搜索 */}
      <div className="px-3 pb-2 pt-4">
        <div className="relative">
          <Search
            size={13}
            strokeWidth={1.75}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                if (query) {
                  e.stopPropagation()
                  setQuery('')
                } else {
                  searchRef.current?.blur()
                }
              }
            }}
            placeholder={t('settings.searchPlaceholder')}
            aria-label={t('settings.searchPlaceholder')}
            className="h-8 w-full rounded-lg border border-border-subtle/80 bg-surface-base pl-8 pr-3 font-sans text-xs text-text-primary placeholder:text-text-tertiary transition-colors duration-150 focus:border-border-default focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/25"
          />
        </div>
      </div>

      {/* 搜索结果 / 分组导航 */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-2.5 pb-5">
        {hasQuery ? (
          results.length === 0 ? (
            <p role="status" className="px-2.5 py-6 text-center font-sans text-xs leading-relaxed text-text-tertiary">
              {t('settings.searchNoResults')}
            </p>
          ) : (
            resultGroups.map((group) => (
              <div key={group.tab.key} className="flex flex-col gap-0.5">
                <span className="px-2.5 pb-1 pt-1 font-sans text-2xs font-medium uppercase tracking-wider text-text-quaternary">
                  {tl(group.tab.labelZh, group.tab.labelEn)}
                </span>
                {group.items.map(({ item, index }) => {
                  const active = index === resultIndex
                  return (
                    <button
                      key={`${item.tab}:${item.anchor}`}
                      type="button"
                      onClick={() => goToItem(item)}
                      onMouseEnter={() => setResultIndex(index)}
                      data-search-index={index}
                      aria-current={active || undefined}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2 rounded-lg border-none px-2.5 py-1.5 text-left transition-colors duration-150',
                        active
                          ? 'bg-surface-sunken text-text-primary'
                          : 'text-text-secondary hover:bg-surface-sunken/60 hover:text-text-primary',
                      )}
                    >
                      <span className="min-w-0 flex-1 truncate font-sans text-sm">
                        {tl(item.labelZh, item.labelEn)}
                      </span>
                      <span className="shrink-0 font-sans text-2xs text-text-quaternary">
                        {tl(group.tab.labelZh, group.tab.labelEn)}
                      </span>
                    </button>
                  )
                })}
              </div>
            ))
          )
        ) : (
          SETTINGS_TAB_GROUPS.map((group) => {
            const tabs = visibleTabs.filter((tab) => tab.group === group.id)
            return (
              <div key={group.id} className="flex flex-col gap-0.5">
                <span className="px-2.5 pb-1 pt-1 font-sans text-2xs font-medium uppercase tracking-wider text-text-quaternary">
                  {tl(group.labelZh, group.labelEn)}
                </span>
                {tabs.map((tab) => {
                  const Icon = ICONS[tab.icon]
                  const active = navTab === tab.key
                  return (
                    <button
                      key={tab.key}
                      id={`settings-tab-${tab.key}`}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      title={tl(tab.descZh, tab.descEn)}
                      onClick={() => select(tab)}
                      className={cn(
                        'flex w-full cursor-pointer items-center gap-2.5 rounded-lg border-none px-2.5 py-1.5 text-left transition-colors duration-150',
                        active
                          ? 'bg-surface-sunken text-text-primary'
                          : 'text-text-secondary hover:bg-surface-sunken/60 hover:text-text-primary',
                      )}
                    >
                      <Icon
                        size={15}
                        strokeWidth={1.75}
                        className={cn(
                          'shrink-0 transition-colors duration-150',
                          active ? 'text-text-secondary' : 'text-text-tertiary',
                        )}
                      />
                      <span className="truncate font-sans text-sm">
                        {tl(tab.labelZh, tab.labelEn)}
                      </span>
                    </button>
                  )
                })}
              </div>
            )
          })
        )}
      </div>
    </nav>
  )
}

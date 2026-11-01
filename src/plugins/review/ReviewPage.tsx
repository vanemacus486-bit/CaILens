/**
 * 复盘域宿主页。
 *
 * 五个子视图已经拆成独立插件（review-trend / -heatmap / -sleep / -diet / -hygiene），
 * 这里只做三件事：
 * 1. 拉数据范围（一次，别让五个插件各拉一遍）
 * 2. 从 registry 取「当前启用的子视图」，按 `?view=` 选中一格
 * 3. 渲染它声明的正文组件
 *
 * 宿主不认识任何具体视图：全部关闭时会显示一句提示，而不是白屏。
 */

import { createElement, lazy, Suspense, useEffect, useMemo, type ComponentType, type LazyExoticComponent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { fireAndForget } from '@/lib/fireAndForget'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useShortcutManager } from '@/hooks/useShortcutManager'
import type { ShortcutAction } from '@/domain/shortcuts'
import { collectDomainViews } from '@/plugins/registry'
import { EasternStatsShell } from '@/components/stats/EasternStatsShell'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'

const DOMAIN_ID = 'review'

// lazy() 必须在 render 之外创建：每次渲染新建组件类型会让 React 卸载重挂。
const cache = new Map<() => Promise<{ default: ComponentType }>, LazyExoticComponent<ComponentType>>()

function lazyOnce(loader: () => Promise<{ default: ComponentType }>): LazyExoticComponent<ComponentType> {
  let C = cache.get(loader)
  if (!C) {
    C = lazy(loader)
    cache.set(loader, C)
  }
  return C
}

export function ReviewPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const loadRange = useEventStore((s) => s.loadRange)
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const isLoading = useEventStore((s) => s.isLoading)
  const loadError = useEventStore((s) => s.loadError)
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)

  const views = useMemo(() => collectDomainViews(DOMAIN_ID, overrides ?? {}), [overrides])

  // `?view=` 指向一个被关掉的子视图时，回落到第一格，避免空白页
  const requested = searchParams.get('view') ?? views[0]?.id ?? ''
  const active = views.find((v) => v.id === requested) ?? views[0]

  useEffect(() => {
    const now = Date.now()
    fireAndForget(loadRange(now - 3 * 365 * 24 * 60 * 60_000, now), 'load stats range')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => { document.title = 'CaILens · 复盘' }, [])

  const setViewId = useMemo(
    () => (id: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (id === views[0]?.id) next.delete('view')
        else next.set('view', id)
        next.delete('lens')
        next.delete('event')
        return next
      }, { replace: true })
    },
    [setSearchParams, views],
  )

  const shortcutHandlers = useMemo<Partial<Record<ShortcutAction, () => void>>>(() => ({
    statsTab1: () => views[0] && setViewId(views[0].id),
    statsTab2: () => views[1] && setViewId(views[1].id),
    statsTab3: () => views[2] && setViewId(views[2].id),
    statsTab4: () => views[3] && setViewId(views[3].id),
    statsTab5: () => views[4] && setViewId(views[4].id),
  }), [views, setViewId])

  useShortcutManager(shortcutHandlers)

  return (
    <EasternStatsShell>
      <style>{REVIEW_PAGE_CSS}</style>

      {isLoading && rangeEvents.length === 0 && (
        <div className="flex items-center justify-center min-h-[400px] flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-text-tertiary" />
        </div>
      )}

      {loadError && (
        <div className="flex flex-col items-center justify-center gap-4 min-h-[400px] flex-1">
          <AlertCircle className="h-10 w-10 text-color-text-danger" />
          <p className="text-sm max-w-md text-center text-text-secondary" style={{ fontFamily: "'Source Serif 4', 'Noto Serif SC', serif" }}>
            {loadError}
          </p>
          <button
            onClick={() => loadRange(Date.now() - 3 * 365 * 24 * 60 * 60_000, Date.now())}
            className="inline-flex items-center justify-center rounded-lg text-white bg-accent px-4 py-2 text-sm font-medium transition-colors duration-200 cursor-pointer border-none"
          >
            重试
          </button>
        </div>
      )}

      {!isLoading && !loadError && (
        <div className="routine-container review-canvas">
          {active ? (
            <ErrorBoundary key={active.id}>
              <Suspense fallback={<div className="min-h-[240px]" />}>
                {createElement(lazyOnce(active.component))}
              </Suspense>
            </ErrorBoundary>
          ) : (
            <p className="py-16 text-center text-sm text-text-secondary">
              复盘的五个视角都被关掉了。到「设置 → 插件」里打开任意一个即可。
            </p>
          )}
        </div>
      )}
    </EasternStatsShell>
  )
}

const REVIEW_PAGE_CSS = `
.routine-container {
  width: 100%;
  max-width: none;
  margin: 0 auto;
  padding: 18px 20px 20px;
  border: 1px solid color-mix(in srgb, var(--border-subtle) 84%, transparent);
  border-radius: 18px;
  background: color-mix(in srgb, var(--surface-raised) 92%, var(--surface-base));
  box-shadow: inset 0 1px 0 var(--surface-lit);
}

@media (max-width: 719px) {
  .routine-container { padding: 14px 12px; border-radius: 14px; }
}
`

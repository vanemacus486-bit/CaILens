/**
 * # DomainViewNav — 域内子视图导航（顶栏 pills / 侧栏书脊两套皮肤）
 *
 * 子视图可能由**多个插件**各贡献一格（复盘域就是这样：五个图表五个插件）。
 * 因此导航不能写死在某个域插件里，只能由 registry 汇总后在这里渲染 ——
 * 这一层属于插件契约的一部分（`@/plugins/DomainViewNav`），主体不认识任何具体视图。
 */

import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  TrendingUp,
  LayoutGrid,
  Moon,
  Utensils,
  Droplets,
  Puzzle,
  type LucideIcon,
} from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import { collectDomainViews } from './registry'

/** 白名单图标映射：避免 `import * as icons` 把整个 lucide 拉进首屏。 */
const ICONS: Record<string, LucideIcon> = {
  TrendingUp,
  LayoutGrid,
  Moon,
  Utensils,
  Droplets,
  Puzzle,
}

interface Props {
  domainId: string
  /** `pills` 用于顶栏，`spine` 用于侧栏书脊式列表 */
  variant: 'pills' | 'spine'
}

export function DomainViewNav({ domainId, variant }: Props) {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const overrides = useAppSettingsStore((s) => s.settings.enabledPlugins)
  const views = useMemo(() => collectDomainViews(domainId, overrides ?? {}), [domainId, overrides])

  if (views.length === 0) return null

  const current = searchParams.get('view') ?? views[0].id

  const select = (id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id === views[0].id) next.delete('view')
      else next.set('view', id)
      return next
    }, { replace: true })
  }

  const label = (v: (typeof views)[number]) =>
    v.labelKey ? t(v.labelKey as TranslationKey) : v.label

  if (variant === 'pills') {
    return (
      <div className="stats-lens-tabs scrubber domain-view-pills" role="tablist">
        {views.map((v) => (
          <button
            key={v.id}
            type="button"
            role="tab"
            aria-selected={v.id === current}
            className={`scrubber-zone${v.id === current ? ' is-active' : ''}`}
            onClick={() => select(v.id)}
          >
            {label(v)}
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="review-ledger-nav">
      {views.map((v) => {
        const Icon = ICONS[v.icon] ?? Puzzle
        const selected = v.id === current
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => select(v.id)}
            className={selected ? 'is-active' : ''}
            aria-current={selected ? 'true' : undefined}
          >
            <Icon size={17} strokeWidth={1.7} />
            <span><strong>{label(v)}</strong></span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * # ReviewSidebarPanel — 复盘域的侧栏内容
 *
 * 从 UnifiedSidebar 的 `/stats` 分支抽出：五个复盘子视图入口。
 * 选中状态与页面共用 `?view=` 查询参数，所以侧栏不需要自己的状态。
 */

import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { TrendingUp, LayoutGrid, Moon, Utensils, Droplets, type LucideIcon } from 'lucide-react'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'
import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'

interface StatsViewItem {
  id: RoutineViewMode
  labelKey: TranslationKey
  description: string
  icon: LucideIcon
  spark: number[]
}

const STATS_VIEWS: StatsViewItem[] = [
  { id: 'trend', labelKey: 'stats.trend', description: '分类趋势对比', icon: TrendingUp, spark: [2, 7, 4, 10, 6, 8] },
  { id: 'heatmap', labelKey: 'stats.heatmap', description: '时间分布密度', icon: LayoutGrid, spark: [5, 3, 6, 8, 4, 7] },
  { id: 'sleep', labelKey: 'stats.sleep', description: '平均与节律稳定', icon: Moon, spark: [5, 4, 3, 5, 7, 6] },
  { id: 'diet', labelKey: 'stats.diet', description: '记录与规律', icon: Utensils, spark: [3, 6, 6, 4, 7, 5] },
  { id: 'hygiene', labelKey: 'stats.hygiene', description: '频率与稳定性', icon: Droplets, spark: [4, 4, 6, 5, 6, 6] },
]

export function ReviewSidebarPanel() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'

  const setRoutineView = useCallback((v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  return (
    <div className="review-ledger-nav">
      {STATS_VIEWS.map((v) => {
        const Icon = v.icon
        const selected = v.id === routineView
        return (
          <button key={v.id} type="button" onClick={() => setRoutineView(v.id)}
            className={selected ? 'is-active' : ''}>
            <Icon size={17} strokeWidth={1.7} />
            <span><strong>{t(v.labelKey)}</strong><small>{v.description}</small></span>
            <i className="review-ledger-spark" aria-hidden="true">
              {v.spark.map((height, index) => <b key={index} style={{ height: `${height}px` }} />)}
            </i>
          </button>
        )
      })}
    </div>
  )
}

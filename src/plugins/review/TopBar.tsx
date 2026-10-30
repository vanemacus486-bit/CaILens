/**
 * # ReviewTopBar — 复盘域的顶栏二级导航
 *
 * 五个子视图共用 `?view=` 查询参数，页面与侧栏读同一份状态。
 */

import { useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { SlidingPills } from '@/components/stats/SlidingPills'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'

const PILLS: { id: RoutineViewMode; label: string }[] = [
  { id: 'trend', label: '趋势' },
  { id: 'heatmap', label: '热力' },
  { id: 'sleep', label: '睡眠' },
  { id: 'diet', label: '饮食' },
  { id: 'hygiene', label: '卫生' },
]

export function ReviewTopBar() {
  const [searchParams, setSearchParams] = useSearchParams()
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'

  const setRoutineView = useCallback((v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  return <SlidingPills items={PILLS} value={routineView} onChange={setRoutineView} dividerAfter={2} />
}

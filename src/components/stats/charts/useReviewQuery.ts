/**
 * 复盘页 URL 查询状态的共享读取层。
 *
 * 五个子视图已拆成独立插件，每个插件都要自己读同一套 URL 参数
 * （`?view=` / `?period=` / `?date=`），所以解析逻辑必须只有一份，
 * 且放在主体（`components/`）而不是某个插件里 —— 否则插件之间要互相 import。
 *
 * 纯读取 + 纯写回，不含业务判断：锚点计算在 `domain/review.ts`。
 */

import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatISODate, parseISODate } from '@/domain/time'
import type { Granularity } from '@/hooks/useStatsAggregation'
import { anchorForPeriod, reviewViewAnchor } from '@/domain/review'

export interface ReviewQuery {
  /** 当前子视图 id（`?view=`，缺省为 trend） */
  viewId: string
  /** 趋势图的粒度（`?period=`） */
  period: Granularity
  /** URL 里的原始日期 */
  date: Date
  /** 按当前粒度取整后的锚点 */
  anchor: Date
  /** 按子视图自身步长取整后的锚点 */
  viewAnchor: Date
  /** 切换子视图；trend 作为默认值不出现在 URL 里 */
  setViewId: (id: string) => void
  /** 改 `?period=`（趋势图的日/周/月） */
  setPeriod: (p: string) => void
  /** 写回锚点日期（`?date=`）；趋势视图的周期步进用它 */
  setDate: (d: Date) => void
}

export function useReviewQuery(): ReviewQuery {
  const [searchParams, setSearchParams] = useSearchParams()

  const viewId = searchParams.get('view') ?? 'trend'
  const period = (searchParams.get('period') as Granularity | null) ?? 'week'
  const dateStr = searchParams.get('date') ?? formatISODate(new Date())

  const date = useMemo(() => {
    const d = parseISODate(dateStr)
    return isNaN(d.getTime()) ? new Date() : d
  }, [dateStr])

  const anchor = useMemo(() => anchorForPeriod(period, date), [period, date])
  const viewAnchor = useMemo(() => reviewViewAnchor(viewId, period, date), [viewId, period, date])

  const setViewId = useCallback((id: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      if (id === 'trend') next.delete('view')
      else next.set('view', id)
      next.delete('lens')
      next.delete('event')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const setPeriod = useCallback((p: string) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('period', p)
      return next
    }, { replace: true })
  }, [setSearchParams])

  /** 写回锚点日期；趋势视图的周期步进用它，格式与 ?date= 的既有约定一致 */
  const setDate = useCallback((d: Date) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      next.set('date', formatISODate(d))
      return next
    }, { replace: true })
  }, [setSearchParams])

  return { viewId, period, date, anchor, viewAnchor, setViewId, setPeriod, setDate }
}

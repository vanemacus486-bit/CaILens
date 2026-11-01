import { useCallback, useState } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { SleepScatterChart } from '@/components/stats/charts/SleepScatterChart'
import { StatsHeader } from '@/components/stats/charts/StatsHeader'
import { useReviewQuery } from '@/components/stats/charts/useReviewQuery'

const SEGMENTS = [
  { id: 'month', label: '月' },
  { id: 'quarter', label: '季' },
  { id: 'year', label: '年' },
]

type Mode = 'month' | 'quarter' | 'year'

export function SleepView() {
  const { viewAnchor } = useReviewQuery()
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const [mode, setMode] = useState<Mode>('month')

  const year = viewAnchor.getFullYear()
  const month = viewAnchor.getMonth()
  const title = mode === 'quarter'
    ? `睡眠 · Q${Math.floor(month / 4) + 1}`
    : mode === 'year'
      ? `睡眠 · ${year}年`
      : `睡眠 · ${year}年${month + 1}月`

  const onChange = useCallback((id: string) => setMode(id as Mode), [])

  return (
    <>
      <StatsHeader title={title} segments={SEGMENTS} value={mode} onChange={onChange} />
      <SleepScatterChart
        rangeEvents={rangeEvents}
        anchorDate={viewAnchor}
        viewMode={mode}
        onViewModeChange={setMode}
      />
    </>
  )
}

import { useCallback, useState } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { DietView } from '@/components/stats/charts/DietView'
import { StatsHeader } from '@/components/stats/charts/StatsHeader'
import { useReviewQuery } from '@/components/stats/charts/useReviewQuery'

const SEGMENTS = [
  { id: 'timeline', label: '时间线' },
  { id: 'frequency', label: '食物次数' },
]

type Mode = 'timeline' | 'frequency'

export function DietModeView() {
  const { viewAnchor } = useReviewQuery()
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const [mode, setMode] = useState<Mode>('timeline')

  const onChange = useCallback((id: string) => setMode(id as Mode), [])

  return (
    <>
      <StatsHeader title="饮食" segments={SEGMENTS} value={mode} onChange={onChange} />
      <DietView
        rangeEvents={rangeEvents}
        anchorDate={viewAnchor}
        mode={mode}
        onModeChange={setMode}
      />
    </>
  )
}

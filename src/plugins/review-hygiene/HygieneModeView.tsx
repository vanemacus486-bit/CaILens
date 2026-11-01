import { useCallback, useState } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { DEFAULT_HYGIENE_ACTIVITIES } from '@/domain/hygieneActivity'
import { HygieneView } from '@/components/stats/charts/HygieneView'
import { StatsHeader } from '@/components/stats/charts/StatsHeader'
import { useReviewQuery } from '@/components/stats/charts/useReviewQuery'

const SEGMENTS = [
  { id: 'timeline', label: '时间线' },
  { id: 'frequency', label: '活动次数' },
]

type Mode = 'timeline' | 'frequency'

export function HygieneModeView() {
  const { viewAnchor } = useReviewQuery()
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const language = useAppSettingsStore((s) => s.settings.language)
  const activities = useAppSettingsStore((s) => s.settings.hygieneActivities) ?? DEFAULT_HYGIENE_ACTIVITIES
  const [mode, setMode] = useState<Mode>('timeline')

  const onChange = useCallback((id: string) => setMode(id as Mode), [])

  return (
    <>
      <StatsHeader title="卫生" segments={SEGMENTS} value={mode} onChange={onChange} />
      <HygieneView
        rangeEvents={rangeEvents}
        activities={activities}
        language={language}
        anchorDate={viewAnchor}
        mode={mode}
        onModeChange={setMode}
      />
    </>
  )
}

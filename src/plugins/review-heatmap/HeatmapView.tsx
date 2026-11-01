import { useCallback, useEffect, useMemo, useState } from 'react'
import { useCategoryStore } from '@/stores/categoryStore'
import { useEventStore } from '@/stores/eventStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useShortcutManager } from '@/hooks/useShortcutManager'
import type { CategoryId } from '@/domain/category'
import type { ShortcutAction } from '@/domain/shortcuts'
import { YearHeatmap } from '@/components/stats/charts/YearHeatmap'
import { StatsHeader } from '@/components/stats/charts/StatsHeader'
import { StatsRail } from '@/components/stats/charts/StatsRail'
import { useReviewQuery } from '@/components/stats/charts/useReviewQuery'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

const SEGMENTS = [
  { id: 'roll', label: '近一年' },
  { id: 'year', label: '年度' },
]

export function HeatmapView() {
  const { viewAnchor } = useReviewQuery()
  const rangeEvents = useEventStore((s) => s.rangeEvents)
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)

  const [mode, setMode] = useState<'roll' | 'year'>('roll')
  const [selectedId, setSelectedId] = useState<CategoryId>('accent')

  // --c-active 是热力图取色的全局钩子，切分类时必须同步
  useEffect(() => {
    document.documentElement.style.setProperty('--c-active', `var(--event-${selectedId}-fill)`)
  }, [selectedId])

  const anchorYear = viewAnchor.getFullYear()
  const title = mode === 'year' ? `${anchorYear}年热力图` : '近365天热力图'

  const onChange = useCallback((id: string) => setMode(id as 'roll' | 'year'), [])

  const shortcutHandlers = useMemo<Partial<Record<ShortcutAction, () => void>>>(() => ({
    statsColor1: () => setSelectedId(CATEGORY_IDS[0]),
    statsColor2: () => setSelectedId(CATEGORY_IDS[1]),
    statsColor3: () => setSelectedId(CATEGORY_IDS[2]),
    statsColor4: () => setSelectedId(CATEGORY_IDS[3]),
    statsColor5: () => setSelectedId(CATEGORY_IDS[4]),
    statsColor6: () => setSelectedId(CATEGORY_IDS[5]),
  }), [])

  useShortcutManager(shortcutHandlers)

  return (
    <>
      <StatsHeader
        title={title}
        segments={SEGMENTS}
        value={mode}
        onChange={onChange}
        rail={<StatsRail mode="single" selected={selectedId} onSelect={setSelectedId} />}
      />
      <YearHeatmap
        rangeEvents={rangeEvents}
        categories={categories}
        language={language}
        anchorYear={anchorYear}
        selectedId={selectedId}
        onCategoryChange={setSelectedId}
        viewMode={mode}
        onViewModeChange={setMode}
      />
    </>
  )
}

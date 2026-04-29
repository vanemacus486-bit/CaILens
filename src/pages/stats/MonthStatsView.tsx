import { useEffect } from 'react'
import { startOfMonth, addMonths, subMonths } from 'date-fns'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

interface MonthStatsViewProps {
  monthAnchor: Date
}

export function MonthStatsView({ monthAnchor }: MonthStatsViewProps) {
  const loadRange      = useEventStore((s) => s.loadRange)
  const loadCategories = useCategoryStore((s) => s.loadCategories)
  const loadSettings   = useAppSettingsStore((s) => s.loadSettings)
  const language       = useAppSettingsStore((s) => s.settings.language)

  useEffect(() => {
    void loadCategories()
    void loadSettings()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const rangeStart = startOfMonth(subMonths(monthAnchor, 11)).getTime()
    const rangeEnd   = startOfMonth(addMonths(monthAnchor, 1)).getTime()
    void loadRange(rangeStart, rangeEnd)
  }, [monthAnchor, loadRange])

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  return (
    <div className="flex-1 w-full px-8 py-8 overflow-y-auto space-y-6">
      {/* PR 2: TrendChart12M will mount here */}
      <div id="trend-chart-slot" />

      {/* PR 3: MonthCompareCards will mount here */}
      <div id="compare-cards-slot" />

      {/* Placeholder until PR 2/3 are done */}
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-text-tertiary">
        <p className="font-serif text-lg">
          {t('月视图', 'Month View')}
        </p>
        <p className="text-sm font-sans">
          {t('开发中…', 'Coming soon…')}
        </p>
      </div>
    </div>
  )
}

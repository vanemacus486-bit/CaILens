import { Plus } from 'lucide-react'
import { useT } from '@/i18n/useT'

export function WeekEmptyState() {
  const t = useT()
  return (
    <div className="week-empty-hint flex items-center gap-2 select-none pointer-events-none">
      <span className="week-empty-hint-icon"><Plus size={12} /></span>
      <span>{t('week.emptyDayHint')}</span>
    </div>
  )
}

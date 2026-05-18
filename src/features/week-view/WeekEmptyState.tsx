import { useMemo } from 'react'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function WeekEmptyState() {
  const language = useAppSettingsStore((s) => s.settings.language)

  const dateWatermark = useMemo(() => {
    const now = new Date()
    return language === 'zh'
      ? `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
      : now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  }, [language])

  return (
    <div className="flex flex-col items-center gap-2 select-none pointer-events-none">
      <span className="font-serif text-[72px] text-text-quaternary/15 select-none leading-none">
        {dateWatermark}
      </span>
    </div>
  )
}

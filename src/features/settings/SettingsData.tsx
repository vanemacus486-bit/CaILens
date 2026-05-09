import { useAppSettingsStore } from '@/stores/settingsStore'
import { ExportSection } from '@/components/stats/ExportSection'

export function SettingsData() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {t('数据', 'Data')}
      </h1>
      <ExportSection language={language} />
    </div>
  )
}

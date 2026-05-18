import { useState } from 'react'
import { Upload } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { ExportSection } from '@/components/stats/ExportSection'
import { ImportSection } from '@/components/stats/ImportSection'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'

export function SettingsData() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {t('数据', 'Data')}
      </h1>

      <div className="flex flex-col gap-4">
        <button
          onClick={() => setImportOpen(true)}
          className="inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg text-sm font-sans font-medium text-text-secondary bg-surface-sunken border border-border-subtle hover:text-text-primary hover:bg-surface-raised transition-colors duration-200 cursor-pointer"
        >
          <Upload size={16} strokeWidth={1.75} />
          {t('导入 .ics', 'Import .ics')}
        </button>

        <ImportIcsDialog open={importOpen} onOpenChange={setImportOpen} />
      </div>

      <ImportSection language={language} />
      <ExportSection language={language} />
    </div>
  )
}

import { useState } from 'react'
import { Upload, EyeOff } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { ExportSection } from '@/components/stats/ExportSection'
import { ImportSection } from '@/components/stats/ImportSection'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'

export function SettingsData() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)
  const setRestrainedMode = useAppSettingsStore((s) => s.setRestrainedMode)
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

      {/* 克制模式开关 */}
      <div className="flex items-center justify-between py-3 px-4 bg-surface-sunken rounded-lg">
        <div className="flex items-start gap-3">
          <EyeOff size={18} strokeWidth={1.75} className="mt-0.5 text-text-tertiary flex-shrink-0" />
          <div>
            <p className="font-sans text-sm font-medium text-text-primary">
              {t('克制模式', 'Restrained Mode')}
            </p>
            <p className="font-sans text-xs text-text-tertiary mt-0.5">
              {t('只记录，不分析、不对照、不警告', 'Record only — no analysis, no comparisons, no alerts')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setRestrainedMode(!settings.restrainedMode)}
          className={[
            'relative inline-flex h-5 w-9 flex-shrink-0 rounded-full border-2 border-transparent transition-colors duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent',
            settings.restrainedMode ? 'bg-accent' : 'bg-border-default',
          ].join(' ')}
          role="switch"
          aria-checked={settings.restrainedMode ?? false}
        >
          <span
            className={[
              'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200',
              settings.restrainedMode ? 'translate-x-4' : 'translate-x-0',
            ].join(' ')}
          />
        </button>
      </div>

      <ImportSection language={language} />
      <ExportSection language={language} />
    </div>
  )
}

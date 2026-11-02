import { useState } from 'react'
import { Upload } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { isTauri } from '@/data/tauriFs'
import { useT } from '@/i18n/useT'
import { ExportSection } from '@/components/stats/ExportSection'
import { ImportSection } from '@/components/stats/ImportSection'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'
import { StorageFolderSelector } from './StorageFolderSelector'
import {
  SettingsButton,
  SettingsHeader,
  SettingsRow,
  SettingsSection,
} from './ui'

/**
 * 「文件」页：存储、导入、导出三组。
 *
 * 导入 / 导出组件原本自带卡片与标题（它们过去是统计页的独立区块），
 * 这里用 `embedded` 去掉外壳，只保留按钮组与结果提示，由 `SettingsRow` 统一排版。
 */
export function SettingsData() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const [importOpen, setImportOpen] = useState(false)
  const t = useT()

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader title={t('settings.file.title')} description={t('settings.file.desc')} />

      {isTauri() && (
        <SettingsSection title={t('settings.section.storage')}>
          <StorageFolderSelector />
        </SettingsSection>
      )}

      <SettingsSection title={t('settings.section.import')}>
        <SettingsRow
          anchor="file-import-ics"
          title="ICS 日历导入"
          description="从 .ics 文件导入日历事件"
        >
          <SettingsButton onClick={() => setImportOpen(true)}>
            <Upload size={13} strokeWidth={1.75} />
            选择 .ics 文件
          </SettingsButton>
        </SettingsRow>

        <SettingsRow
          anchor="file-import-json"
          title="JSON 导入"
          description="从导出的 JSON 文件恢复数据"
          layout="stacked"
          controlClassName="w-full"
        >
          <ImportSection language={language} embedded />
        </SettingsRow>
      </SettingsSection>

      <ImportIcsDialog open={importOpen} onOpenChange={setImportOpen} />

      <SettingsSection title={t('settings.section.export')}>
        <SettingsRow
          anchor="file-export"
          title={t('settings.file.exportTitle')}
          description="将所有数据导出为 JSON / CSV / ICS 文件，或生成加密备份"
          layout="stacked"
          controlClassName="w-full"
        >
          <ExportSection language={language} embedded />
        </SettingsRow>
      </SettingsSection>
    </div>
  )
}

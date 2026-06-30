import { useState } from 'react'
import { Upload, FileJson, Download, Folder } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { isTauri } from '@/data/tauriFs'
import { ExportSection } from '@/components/stats/ExportSection'
import { ImportSection } from '@/components/stats/ImportSection'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'
import { StorageFolderSelector } from './StorageFolderSelector'

export function SettingsData() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const [importOpen, setImportOpen] = useState(false)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          数据与档案
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          管理数据的导入导出与存储
        </p>
      </div>

      {/* Storage (桌面端) */}
      {isTauri() && (
        <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-1">
              <Folder size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
              <h2 className="text-xs font-sans font-medium text-text-secondary">
                存储
              </h2>
            </div>
            <p className="text-xs text-text-tertiary mb-3 ml-6">
              管理文件存储路径
            </p>
            <StorageFolderSelector />
          </div>
        </div>
      )}

      {/* ICS Import */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Upload size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
            <h2 className="text-xs font-sans font-medium text-text-secondary">
              ICS 日历导入
            </h2>
          </div>
          <p className="text-xs text-text-tertiary mb-3 ml-6">
            从 .ics 文件导入日历事件
          </p>
          <button
            onClick={() => setImportOpen(true)}
            className="inline-flex items-center gap-1.5 self-start px-3.5 py-1.5 rounded-lg text-xs font-sans font-medium text-text-secondary bg-surface-sunken border border-border-subtle hover:text-text-primary hover:bg-surface-raised hover:border-border-default transition-all duration-200 cursor-pointer"
          >
            <Upload size={13} strokeWidth={1.75} />
            选择 .ics 文件
          </button>
          <ImportIcsDialog open={importOpen} onOpenChange={setImportOpen} />
        </div>
      </div>

      {/* JSON Import */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <FileJson size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
            <h2 className="text-xs font-sans font-medium text-text-secondary">
              JSON 导入
            </h2>
          </div>
          <p className="text-xs text-text-tertiary mb-3 ml-6">
            从导出的 JSON 文件恢复数据
          </p>
          <ImportSection language={language} />
        </div>
      </div>

      {/* Export */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2 mb-1">
            <Download size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
            <h2 className="text-xs font-sans font-medium text-text-secondary">
              导出
            </h2>
          </div>
          <p className="text-xs text-text-tertiary mb-3 ml-6">
            将所有数据导出为 JSON 文件
          </p>
          <ExportSection language={language} />
        </div>
      </div>
    </div>
  )
}

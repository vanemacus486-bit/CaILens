import { useState, useEffect } from 'react'
import { Upload, FileJson, Download } from 'lucide-react'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useProfileStore } from '@/stores/profileStore'
import { ExportSection } from '@/components/stats/ExportSection'
import { ImportSection } from '@/components/stats/ImportSection'
import { ImportIcsDialog } from '@/features/import-ics/ImportIcsDialog'
import type { BodyMetrics } from '@/domain/profile'

const METRIC_FIELDS: {
  key: keyof BodyMetrics
  labelZh: string
  labelEn: string
  unit: string
  type: 'number' | 'text'
  min?: number
  max?: number
}[] = [
  { key: 'height', labelZh: '身高', labelEn: 'Height', unit: 'cm', type: 'number', min: 50, max: 250 },
  { key: 'weight', labelZh: '体重', labelEn: 'Weight', unit: 'kg', type: 'number', min: 10, max: 300 },
  { key: 'bodyFat', labelZh: '体脂率', labelEn: 'Body Fat', unit: '%', type: 'number', min: 1, max: 60 },
  { key: 'restingHR', labelZh: '静息心率', labelEn: 'Resting HR', unit: 'bpm', type: 'number', min: 30, max: 200 },
  { key: 'bloodPressureSystolic', labelZh: '收缩压', labelEn: 'Systolic BP', unit: 'mmHg', type: 'number', min: 50, max: 200 },
  { key: 'bloodPressureDiastolic', labelZh: '舒张压', labelEn: 'Diastolic BP', unit: 'mmHg', type: 'number', min: 30, max: 140 },
  { key: 'visionLeft', labelZh: '左眼视力', labelEn: 'Vision (L)', unit: '', type: 'number' },
  { key: 'visionRight', labelZh: '右眼视力', labelEn: 'Vision (R)', unit: '', type: 'number' },
  { key: 'visionLastCheck', labelZh: '最近验光', labelEn: 'Last Optometry', unit: '', type: 'text' },
]

export function SettingsData() {
  const settings = useAppSettingsStore((s) => s.settings)
  const language = settings.language
  const [importOpen, setImportOpen] = useState(false)

  // Profile section
  const profile = useProfileStore((s) => s.profile)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  const updateBodyMetrics = useProfileStore((s) => s.updateBodyMetrics)
  const [body, setBody] = useState<BodyMetrics>({ ...profile.body })

  useEffect(() => {
    fireAndForget(loadProfile(), 'load profile')
  }, [loadProfile])

  useEffect(() => {
    setBody({ ...profile.body })
  }, [profile.body])

  const handleBodyChange = (key: keyof BodyMetrics, value: string) => {
    setBody((prev) => ({
      ...prev,
      [key]: value === '' ? null : (key === 'visionLastCheck' ? value : Number(value)),
    }))
  }

  const handleSave = () => {
    fireAndForget(updateBodyMetrics(body), 'update body metrics')
  }

  const hasChanges = JSON.stringify(body) !== JSON.stringify(profile.body)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="font-serif text-xl font-medium text-text-primary tracking-tight">
          数据与档案
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          管理数据的导入导出与身体指标
        </p>
      </div>

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

      {/* ── Profile / Body Metrics ── */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xs font-sans font-medium text-text-secondary mb-1">
            身体数据
          </h2>
          <p className="text-xs text-text-tertiary mb-3">
            最后更新 {profile.updatedAt ?? '—'}
          </p>
          <div className="divide-y divide-border-subtle -mx-5 mb-3">
            {METRIC_FIELDS.map((field) => (
              <div key={field.key} className="flex items-center justify-between px-5 py-2.5">
                <span className="text-sm font-sans text-text-secondary">
                  {field.labelZh}
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type={field.type === 'number' ? 'number' : 'text'}
                    min={field.min}
                    max={field.max}
                    value={body[field.key] ?? ''}
                    onChange={(e) => handleBodyChange(field.key, e.target.value)}
                    className={
                      'w-24 px-2 py-1 text-sm font-mono text-text-primary bg-surface-sunken border border-border-subtle rounded-lg text-right focus:ring-2 focus:ring-accent/30 focus:outline-none transition-shadow duration-150'
                      + (field.type === 'text' ? ' font-sans' : '')
                    }
                  />
                  {field.unit && (
                    <span className="text-xs text-text-tertiary w-8 text-right flex-shrink-0">
                      {field.unit}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-text-tertiary font-sans">
              所有数值可为空，表示尚未记录
            </p>
            <button
              onClick={handleSave}
              disabled={!hasChanges}
              className={
                'px-4 py-1.5 rounded-lg text-sm font-sans font-medium transition-all duration-200 cursor-pointer border-none'
                + ' bg-accent/10 text-accent hover:bg-accent/20'
                + ' disabled:opacity-40 disabled:cursor-not-allowed'
              }
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

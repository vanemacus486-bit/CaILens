import { useEffect, useState } from 'react'
import { fireAndForget } from '@/lib/fireAndForget'
import { useProfileStore } from '@/stores/profileStore'
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

export function SettingsProfile() {
  const profile = useProfileStore((s) => s.profile)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  const updateBodyMetrics = useProfileStore((s) => s.updateBodyMetrics)

  const [body, setBody] = useState<BodyMetrics>({ ...profile.body })

  // 初始加载 + 同步 store 变化
  useEffect(() => {
    fireAndForget(loadProfile(), 'load profile')
  }, [loadProfile])

  useEffect(() => {
    setBody({ ...profile.body })
  }, [profile.body])

  const handleChange = (key: keyof BodyMetrics, value: string) => {
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
          档案
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          管理身体数据，最后更新 {profile.updatedAt ?? '—'}
        </p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="divide-y divide-border-subtle">
          {METRIC_FIELDS.map((field) => (
            <div key={field.key} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-sans text-text-secondary w-28 flex-shrink-0">
                {field.labelZh}
              </span>
              <div className="flex items-center gap-1.5 flex-1 justify-end">
                <input
                  type={field.type === 'number' ? 'number' : 'text'}
                  min={field.min}
                  max={field.max}
                  value={body[field.key] ?? ''}
                  onChange={(e) => handleChange(field.key, e.target.value)}
                  className={
                    'w-28 px-2 py-1 text-sm font-mono text-text-primary bg-surface-sunken border border-border-subtle rounded-lg text-right focus:outline-none transition-shadow duration-150'
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
      </div>

      {/* 提示文字 */}
      <p className="text-xs text-text-tertiary font-sans">
        所有数值可为空，表示尚未记录。不记录的数据不会影响统计。
      </p>

      {/* 保存按钮 */}
      <div className="flex justify-end">
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
  )
}

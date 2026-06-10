/**
 * # ProfilePage — 个人档案（只读快速查看）
 *
 * 编辑功能已迁移至设置页（/settings → 档案 tab）。
 * 此页面保留路由兼容性，降级为只读展示。
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fireAndForget } from '@/lib/fireAndForget'
import { useProfileStore } from '@/stores/profileStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

interface ProfileRow {
  labelZh: string
  labelEn: string
  value: string
  change?: string
}

export function ProfilePage() {
  const navigate = useNavigate()
  const profile = useProfileStore((s) => s.profile)
  const loadProfile = useProfileStore((s) => s.loadProfile)
  const language = useAppSettingsStore((s) => s.settings.language)

  // Load data
  useEffect(() => {
    fireAndForget(loadProfile(), 'load profile')
  }, [loadProfile])

  // Title
  useEffect(() => {
    document.title = language === 'zh' ? 'CaILens · 个人档案' : 'CaILens · Profile'
  }, [language])

  // Esc → 回复盘
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        navigate('/stats')
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [navigate])

  // 身体数据
  const body = profile.body

  const bodyRows: ProfileRow[] = [
    {
      labelZh: '身高', labelEn: 'Height',
      value: body.height !== null ? `${body.height} cm` : '—',
    },
    {
      labelZh: '体重', labelEn: 'Weight',
      value: body.weight !== null ? `${body.weight} kg` : '—',
    },
    {
      labelZh: '体脂率', labelEn: 'Body Fat',
      value: body.bodyFat !== null ? `${body.bodyFat} %` : '—',
    },
    {
      labelZh: '静息心率', labelEn: 'Resting HR',
      value: body.restingHR !== null ? `${body.restingHR} bpm` : '—',
    },
    {
      labelZh: '血压', labelEn: 'Blood Pressure',
      value: body.bloodPressureSystolic !== null && body.bloodPressureDiastolic !== null
        ? `${body.bloodPressureSystolic} / ${body.bloodPressureDiastolic} mmHg`
        : '—',
    },
    {
      labelZh: '近视', labelEn: 'Vision',
      value: body.visionLeft !== null && body.visionRight !== null
        ? `${body.visionLeft >= 0 ? '+' : ''}${body.visionLeft} / ${body.visionRight >= 0 ? '+' : ''}${body.visionRight}`
        : '—',
      change: body.visionLastCheck ? `最近: ${body.visionLastCheck}` : undefined,
    },
  ]

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ backgroundColor: '#F5EFE3' }}>
      <div className="mx-auto" style={{ maxWidth: 640, paddingTop: 64, paddingLeft: 24, paddingRight: 24, paddingBottom: 64 }}>
        {/* 标题区 */}
        <h1
          className="font-serif font-medium leading-tight"
          style={{ fontSize: 24, fontWeight: 500, color: '#3D2E1F' }}
        >
          {'我的档案'}
        </h1>
        <p className="font-sans mt-1 mb-6" style={{ fontSize: 12, color: '#A89580' }}>
          {'最后更新:'} {profile.updatedAt ?? '—'}
        </p>

        {/* 分隔线 */}
        <div className="mb-8" style={{ height: '0.5px', backgroundColor: '#E0D2B5', width: '100%' }} />

        {/* 身体段 */}
        <Section title={'身体'}>
          {bodyRows.map((row, i) => (
            <DataRow key={i} row={row} />
          ))}
        </Section>

        {/* 编辑入口 — 指向设置页 */}
        <div className="flex justify-center" style={{ marginTop: 48 }}>
          <button
            onClick={() => navigate('/settings')}
            className="font-sans cursor-pointer bg-transparent border-none transition-colors duration-150"
            style={{ fontSize: 12, color: '#8B6F47' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#5C4530'; e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#8B6F47'; e.currentTarget.style.textDecoration = 'none' }}
          >
            {'去设置页编辑档案'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 段落子组件 ──────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2
        className="font-sans font-medium mb-3"
        style={{ fontSize: 14, fontWeight: 500, color: '#3D2E1F' }}
      >
        {title}
      </h2>
      {children}
    </div>
  )
}

// ── 数据行子组件 ────────────────────────────────────

function DataRow({ row }: { row: ProfileRow }) {
  return (
    <div
      className="flex items-center transition-colors duration-100"
      style={{ height: 32 }}
    >
      {/* 左列：指标名 */}
      <span
        className="flex-shrink-0 font-sans"
        style={{ width: 120, fontSize: 13, color: '#8B6F47' }}
      >
        {row.labelZh}
      </span>

      {/* 中列：数值 */}
      <span
        className="flex-1 font-sans font-medium"
        style={{ fontSize: 14, fontWeight: 500, color: '#3D2E1F' }}
      >
        {row.value}
      </span>

      {/* 右列：变化或说明 */}
      {row.change && (
        <span
          className="flex-shrink-0 font-sans"
          style={{ fontSize: 11, color: '#A89580', textAlign: 'right' }}
        >
          {row.change}
        </span>
      )}
    </div>
  )
}

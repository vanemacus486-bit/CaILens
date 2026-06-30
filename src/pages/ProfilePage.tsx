/**
 * # ProfilePage — 个人档案（只读快速查看）
 *
 * 编辑功能已迁移至设置页（/settings → 档案 tab）。
 * 此页面保留路由兼容性，降级为只读展示。
 */

import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { fireAndForget } from '@/lib/fireAndForget'
import { translate } from '@/i18n/useT'
import { useProfileStore } from '@/stores/profileStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

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
    document.title = translate('profile.title', language)
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

  return (
    <div className="flex-1 h-full overflow-y-auto" style={{ backgroundColor: 'var(--paper)' }}>
      <div className="mx-auto" style={{ maxWidth: 640, paddingTop: 64, paddingLeft: 24, paddingRight: 24, paddingBottom: 64 }}>
        {/* 标题区 */}
        <h1
          className="font-serif font-medium leading-tight"
          style={{ fontSize: 24, fontWeight: 500, color: 'var(--ink)' }}
        >
          {'我的档案'}
        </h1>
        <p className="font-sans mt-1 mb-6" style={{ fontSize: 12, color: 'var(--ink-3)' }}>
          {'最后更新:'} {profile.updatedAt ?? '—'}
        </p>

        {/* 分隔线 */}
        <div className="mb-8" style={{ height: '0.5px', backgroundColor: 'var(--line)', width: '100%' }} />

        {/* 编辑入口 — 指向设置页 */}
        <div className="flex justify-center" style={{ marginTop: 48 }}>
          <button
            onClick={() => navigate('/settings')}
            className="font-sans cursor-pointer bg-transparent border-none transition-colors duration-150"
            style={{ fontSize: 12, color: 'var(--ink-2)' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--ink)'; e.currentTarget.style.textDecoration = 'underline' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--ink-2)'; e.currentTarget.style.textDecoration = 'none' }}
          >
            {'去设置页编辑档案'}
          </button>
        </div>
      </div>
    </div>
  )
}

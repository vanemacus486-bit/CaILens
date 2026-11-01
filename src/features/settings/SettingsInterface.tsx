import { SettingsAccount } from './SettingsAccount'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { Languages } from 'lucide-react'

/**
 * 「界面」页：账户（头像与名称）+ 语言/显示偏好入口。
 *
 * 语言切换的实现仍在「关于」页（那里是版本与语言的老家），这里只给入口，
 * 避免同一开关在两处各写一份状态逻辑。
 */
export function SettingsInterface() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const setActiveSettingsTab = useUIStore((s) => s.setActiveSettingsTab)
  const tl = (zh: string, en: string): string => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-serif text-xl font-semibold text-text-primary">
          {tl('界面', 'Interface')}
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">
          {tl('账户、语言与显示偏好', 'Account, language & display')}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-sm font-medium text-text-secondary">{tl('账户', 'Account')}</h3>
        <SettingsAccount />
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="font-sans text-sm font-medium text-text-secondary">{tl('语言', 'Language')}</h3>
        <button
          type="button"
          onClick={() => setActiveSettingsTab('about')}
          className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-surface-raised px-4 py-3 text-left transition-colors duration-200 hover:bg-surface-sunken"
        >
          <Languages size={16} strokeWidth={1.75} className="shrink-0 text-text-tertiary" />
          <span className="min-w-0 flex-1">
            <span className="block font-sans text-sm text-text-primary">
              {tl('切换界面语言', 'Change interface language')}
            </span>
            <span className="mt-0.5 block text-xs text-text-tertiary">
              {tl('当前：', 'Current: ') + (language === 'zh' ? '简体中文' : 'English')}
            </span>
          </span>
        </button>
      </section>
    </div>
  )
}

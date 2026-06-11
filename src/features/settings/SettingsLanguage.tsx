import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function SettingsLanguage() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const setLanguage = useAppSettingsStore((s) => s.setLanguage)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
          语言
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          自定义界面显示语言
        </p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            界面语言
          </h2>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {(['zh', 'en'] as const).map((lang) => (
              <button
                key={lang}
                onClick={() => fireAndForget(setLanguage(lang), 'set language')}
                className={cn(
                  'px-5 py-1.5 rounded-md text-sm font-sans font-medium transition-all duration-200 cursor-pointer border-none',
                  language === lang
                    ? 'bg-surface-raised text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {lang === 'zh' ? '中文' : 'English'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

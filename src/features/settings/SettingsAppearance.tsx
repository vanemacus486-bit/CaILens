import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { UiFont } from '@/domain/settings'
const FONT_OPTIONS: UiFont[] = ['default', 'wenkai']

export function SettingsAppearance() {
  const settings = useAppSettingsStore((s) => s.settings)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const setUiFont = useAppSettingsStore((s) => s.setUiFont)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
          外观
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          自定义界面视觉风格
        </p>
      </div>

      {/* Theme section */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            主题
          </h2>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => fireAndForget(setTheme(theme), 'set theme')}
                className={cn(
                  'px-5 py-1.5 rounded-md text-sm font-sans font-medium transition-all duration-200 cursor-pointer border-none',
                  settings.theme === theme
                    ? 'bg-surface-raised text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {theme === 'light' ? '浅色' : '深色'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Font section */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            字体
          </h2>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font}
                onClick={() => fireAndForget(setUiFont(font), 'set font')}
                className={cn(
                  'px-5 py-1.5 rounded-md text-sm font-sans font-medium transition-all duration-200 cursor-pointer border-none',
                  (settings.uiFont ?? 'default') === font
                    ? 'bg-surface-raised text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {font === 'default' ? '默认 (Inter)' : '霞鹜文楷'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

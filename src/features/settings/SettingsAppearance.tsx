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
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        外观
      </h1>

      <div className="flex flex-col gap-5">
        {/* Theme */}
        <fieldset className="flex flex-col gap-1.5 border-none p-0">
          <label className="text-xs text-text-tertiary font-sans">
            主题
          </label>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {(['light', 'dark'] as const).map((theme) => (
              <button
                key={theme}
                onClick={() => fireAndForget(setTheme(theme), 'set theme')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                  settings.theme === theme
                    ? 'bg-surface-base text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary bg-transparent',
                )}
              >
                {theme === 'light' ? '浅色' : '深色'}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Font */}
        <fieldset className="flex flex-col gap-1.5 border-none p-0">
          <label className="text-xs text-text-tertiary font-sans">
            字体
          </label>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {FONT_OPTIONS.map((font) => (
              <button
                key={font}
                onClick={() => fireAndForget(setUiFont(font), 'set font')}
                className={cn(
                  'px-4 py-1.5 rounded-md text-sm font-sans font-medium transition-colors duration-200 cursor-pointer border-none',
                  (settings.uiFont ?? 'default') === font
                    ? 'bg-surface-base text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary bg-transparent',
                )}
              >
                {font === 'default' ? '默认' : '霞鹜文楷'}
              </button>
            ))}
          </div>
        </fieldset>
      </div>
    </div>
  )
}

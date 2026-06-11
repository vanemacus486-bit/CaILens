import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'

export function SettingsRestrained() {
  const restrainedMode = useAppSettingsStore((s) => s.settings.restrainedMode)
  const setRestrained = useAppSettingsStore((s) => s.setRestrainedMode)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
          克制模式
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          减少视觉刺激，回归内容本身
        </p>
      </div>

      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-3.5">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            克制模式
          </h2>
          <div className="flex gap-0.5 bg-surface-sunken rounded-lg p-0.5 w-fit">
            {([false, true] as const).map((on) => (
              <button
                key={on ? 'on' : 'off'}
                onClick={() => fireAndForget(setRestrained(on), 'set restrained mode')}
                className={cn(
                  'px-5 py-1.5 rounded-md text-sm font-sans font-medium transition-all duration-200 cursor-pointer border-none',
                  restrainedMode === on
                    ? 'bg-surface-raised text-text-primary shadow-pill'
                    : 'text-text-secondary hover:text-text-primary',
                )}
              >
                {on ? '开启' : '关闭'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 说明 */}
      <div className="rounded-lg bg-surface-raised border border-border-subtle px-4 py-3">
        <p className="text-xs text-text-secondary leading-relaxed">
          开启后：<br />
          · 降低色彩饱和度<br />
          · 简化过渡动画<br />
          · 减少装饰性元素
        </p>
      </div>
    </div>
  )
}

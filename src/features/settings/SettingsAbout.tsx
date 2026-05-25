import { useAppSettingsStore } from '@/stores/settingsStore'

export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
    const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {'关于'}
      </h1>

      <div className="flex flex-col gap-4">
        <div className="bg-surface-raised border border-border-subtle rounded-xl px-5 py-4">
          <div className="flex items-baseline gap-3 mb-2">
            <span
              className="font-serif italic text-lg"
              style={{ color: 'var(--accent)' }}
            >
              CaILens
            </span>
            <span className="text-xs font-mono text-text-tertiary">v3.8</span>
          </div>
          <p className="text-[13px] text-text-secondary font-sans leading-relaxed">
            {t(
              '基于柳比歇夫时间统计法的本地时间管理工具。用记录代替规划，用观察代替管理。',
              'A local-first time management tool inspired by Lyubishchev\'s time accounting method. Observe instead of planning, understand instead of managing.',
            )}
          </p>
        </div>

        <div className="bg-surface-raised border border-border-subtle rounded-xl px-5 py-4">
          <h3 className="text-xs font-sans font-medium text-text-primary mb-1.5">
            {'技术栈'}
          </h3>
          <p className="text-xs text-text-tertiary font-mono leading-relaxed">
            React 19 · TypeScript · Vite · Tailwind CSS · Zustand · Dexie · Tauri · Capacitor
          </p>
        </div>

        <p className="text-xs text-text-tertiary font-sans text-center mt-4">
          {'你的数据永远留在本地，不会离开你的设备。'}
        </p>
      </div>
    </div>
  )
}

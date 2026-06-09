import { useAppSettingsStore } from '@/stores/settingsStore'
import { Heart } from 'lucide-react'

export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)
    const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
          关于
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          版本信息与技术栈
        </p>
      </div>

      {/* App identity */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle px-5 py-5">
        <div className="flex items-baseline gap-3 mb-3">
          <span
            className="font-serif italic text-xl"
            style={{ color: 'var(--accent)' }}
          >
            CalLens
          </span>
          <span className="text-xs font-mono text-text-tertiary">v3.8</span>
        </div>
        <p className="text-sm text-text-secondary font-sans leading-relaxed">
          {t(
            '基于柳比歇夫时间统计法的本地时间管理工具。用记录代替规划，用观察代替管理。',
            'A local-first time management tool inspired by Lyubishchev\'s time accounting method. Observe instead of planning, understand instead of managing.',
          )}
        </p>
      </div>

      {/* Philosophy */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle px-5 py-5">
        <h3 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-2">
          理念
        </h3>
        <p className="text-sm text-text-secondary font-sans leading-relaxed">
          {t(
            'CalLens 不催你早睡、不替你规划、不给你打分。它只做一件事：让你看清自己每天真正的输入，从而让"漂移"的源头浮出水面。工具有限，生活无限。',
            'CalLens does not urge you to sleep earlier, plan for you, or score you. It does one thing: let you see your true daily inputs, so the source of "drift" comes to light. Tools are limited, life is not.',
          )}
        </p>
      </div>

      {/* Tech stack */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h3 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-2">
            技术栈
          </h3>
          <p className="text-sm text-text-tertiary font-mono leading-relaxed">
            React 19 · TypeScript · Vite · Tailwind CSS · Zustand · Dexie · Tauri · Capacitor
          </p>
        </div>
      </div>

      {/* Privacy */}
      <div className="flex items-center gap-2 px-1">
        <Heart size={13} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
        <p className="text-xs text-text-tertiary font-sans">
          {'你的数据永远留在本地，不会离开你的设备。'}
        </p>
      </div>
    </div>
  )
}

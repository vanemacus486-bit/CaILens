import { useMemo } from 'react'
import { useAppSettingsStore } from '@/stores/settingsStore'

// Import CHANGELOG.md as raw text — Vite handles this at build time
import changelogRaw from '../../../CHANGELOG.md?raw'

interface ChangelogEntry {
  version: string
  date: string
  sections: { title: string; items: string[] }[]
}

function parseChangelog(raw: string): ChangelogEntry[] {
  const entries: ChangelogEntry[] = []
  const lines = raw.split('\n')
  let current: ChangelogEntry | null = null
  let currentSection: { title: string; items: string[] } | null = null

  for (const line of lines) {
    // Match version header: ## [X.Y.Z] — YYYY-MM-DD
    const versionMatch = line.match(/^##\s+\[([^\]]+)\]\s*[—–-]\s*(.+)$/)
    if (versionMatch) {
      if (current) entries.push(current)
      current = { version: versionMatch[1], date: versionMatch[2].trim(), sections: [] }
      currentSection = null
      continue
    }

    // Match section header: ### 标题
    const sectionMatch = line.match(/^###\s+(.+)$/)
    if (sectionMatch && current) {
      currentSection = { title: sectionMatch[1].trim(), items: [] }
      current.sections.push(currentSection)
      continue
    }

    // Match list item: - **text** — rest  or  - text
    const itemMatch = line.match(/^-\s+(.+)$/)
    if (itemMatch && currentSection) {
      // Strip bold markers for display
      const text = itemMatch[1].replace(/\*\*([^*]+)\*\*/g, '$1')
      currentSection.items.push(text)
    }
  }

  if (current) entries.push(current)
  return entries
}

export function SettingsAbout() {
  const language = useAppSettingsStore((s) => s.settings.language)

  const entries = useMemo(() => parseChangelog(changelogRaw), [])
  // Show last 5 entries
  const recentEntries = entries.slice(0, 5)

  const buildTime = (() => {
    try {
      const d = new Date(__BUILD_TIME__)
      return d.toLocaleString(language === 'zh' ? 'zh-CN' : 'en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return __BUILD_TIME__
    }
  })()

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
          {language === 'zh' ? '关于' : 'About'}
        </h1>
        <p className="text-sm text-text-tertiary mt-1 font-sans">
          {language === 'zh' ? '版本与变更记录' : 'Version & changelog'}
        </p>
      </div>

      {/* Version card */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-3">
            {language === 'zh' ? '当前版本' : 'Current Version'}
          </h2>
          <div className="flex items-baseline gap-3">
            <span className="font-mono text-2xl font-medium text-text-primary">
              v{__APP_VERSION__}
            </span>
          </div>
          <p className="text-xs text-text-tertiary mt-2 font-mono">
            {language === 'zh' ? '构建时间：' : 'Built: '}
            {buildTime}
          </p>
        </div>
      </div>

      {/* Changelog */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="px-5 py-4">
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider mb-4">
            {language === 'zh' ? '最近变更' : 'Recent Changes'}
          </h2>

          {recentEntries.length === 0 ? (
            <p className="text-sm text-text-tertiary font-sans">
              {language === 'zh' ? '暂无变更记录' : 'No changelog available'}
            </p>
          ) : (
            <div className="flex flex-col gap-5">
              {recentEntries.map((entry) => (
                <div key={entry.version}>
                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="font-mono text-sm font-medium text-text-primary">
                      v{entry.version}
                    </span>
                    <span className="text-xs text-text-tertiary font-sans">
                      {entry.date}
                    </span>
                  </div>
                  {entry.sections.map((section) => (
                    <div key={section.title} className="mb-2 last:mb-0">
                      <h4 className="text-xs font-sans font-medium text-text-secondary mb-1">
                        {section.title}
                      </h4>
                      <ul className="list-disc list-inside space-y-0.5">
                        {section.items.map((item, i) => (
                          <li
                            key={i}
                            className="text-xs text-text-tertiary font-sans leading-relaxed"
                          >
                            {item}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer note */}
      <p className="text-[11px] text-text-tertiary font-sans leading-relaxed">
        {language === 'zh'
          ? 'CaILens — 本地优先的时间记录工具。不依赖后端服务，所有数据存储在本地。'
          : 'CaILens — A local-first time tracking tool. No backend, all data stored locally.'}
      </p>
    </div>
  )
}

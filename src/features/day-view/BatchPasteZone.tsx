import { useState } from 'react'
import { useEventStore } from '@/stores/eventStore'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { classifyEvent } from '@/domain/icsImport'
import { parseBatchText, type ParsedDraft } from '@/domain/batchParse'

function fmtRange(startMin: number, endMin: number): string {
  const sh = Math.floor(startMin / 60)
  const sm = startMin % 60
  const eh = Math.floor(endMin / 60)
  const em = endMin % 60
  return `${String(sh).padStart(2, '0')}:${String(sm).padStart(2, '0')}–${String(eh).padStart(2, '0')}:${String(em).padStart(2, '0')}`
}

export function BatchPasteZone({ dayStartMs }: { dayStartMs: number }) {
  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [text, setText] = useState('')
  const [drafts, setDrafts] = useState<ParsedDraft[]>([])
  const [adding, setAdding] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value
    setText(next)
    setDrafts(next.trim() ? parseBatchText(next) : [])
  }

  const handleCancel = () => {
    setText('')
    setDrafts([])
  }

  const handleAddAll = async () => {
    if (drafts.length === 0) return
    setAdding(true)
    try {
      for (const d of drafts) {
        const color = classifyEvent(d.title, categories) ?? 'accent'
        await useEventStore.getState().createEvent({
          title: d.title,
          startTime: dayStartMs + d.startOffsetMinutes * 60_000,
          endTime: dayStartMs + d.endOffsetMinutes * 60_000,
          color,
          categoryId: color,
        })
      }
      setText('')
      setDrafts([])
    } finally {
      setAdding(false)
    }
  }

  return (
    <div className="px-4 md:px-12 pt-4 pb-0 max-w-[680px]">
      <textarea
        value={text}
        onChange={handleChange}
        rows={2}
        placeholder={t(
          '粘贴时间日志，如：9-11 写报告 / 11-12 开会',
          'Paste time log, e.g.: 9-11 Write report / 11-12 Meeting',
        )}
        className="w-full resize-none rounded-lg border border-border-subtle bg-surface-sunken p-3 font-mono text-sm text-text-primary placeholder:text-text-tertiary/40 transition-colors focus:border-accent/50 focus:outline-none"
      />

      {drafts.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {drafts.map((d, i) => {
            const color = classifyEvent(d.title, categories) ?? 'accent'
            return (
              <div key={i} className="flex items-center gap-2 text-body-sm">
                <span className="w-24 flex-shrink-0 font-mono text-text-secondary">
                  {fmtRange(d.startOffsetMinutes, d.endOffsetMinutes)}
                </span>
                <span
                  className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ backgroundColor: `var(--event-${color}-fill)` }}
                />
                <span className="truncate font-serif text-text-primary">{d.title}</span>
              </div>
            )
          })}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleCancel}
              className="cursor-pointer border-none bg-transparent px-3 py-1 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
            >
              {t('清除', 'Clear')}
            </button>
            <button
              onClick={handleAddAll}
              disabled={adding}
              className="ml-auto inline-flex cursor-pointer items-center justify-center rounded-lg border-none bg-accent px-4 py-1.5 text-xs font-medium text-white transition-colors duration-200 disabled:opacity-50"
            >
              {adding
                ? t('添加中…', 'Adding…')
                : t(`添加 ${drafts.length} 个事件`, `Add ${drafts.length} events`)}
            </button>
          </div>

          <div className="h-px bg-border-subtle" />
        </div>
      )}
    </div>
  )
}

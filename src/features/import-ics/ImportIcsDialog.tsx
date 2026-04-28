import { useState, useRef } from 'react'
import { Upload, Check, AlertCircle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseIcs } from '@/domain/icsImport'
import type { ImportResult } from '@/domain/icsImport'
import type { CategoryId } from '@/domain/category'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'

interface ImportIcsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Status = 'idle' | 'preview' | 'importing' | 'done'

export function ImportIcsDialog({ open, onOpenChange }: ImportIcsDialogProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [fileContent, setFileContent] = useState('')
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selectedCat, setSelectedCat] = useState<CategoryId>('accent')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const importEvents = useEventStore((s) => s.importEvents)

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const reset = () => {
    setStatus('idle')
    setFileName('')
    setFileContent('')
    setParseResult(null)
    setError(null)
    setSelectedCat('accent')
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setFileContent(text)
      try {
        setParseResult(parseIcs(text))
        setStatus('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Cannot parse file')
        setStatus('idle')
      }
    }
    reader.onerror = () => {
      setError('Cannot read file')
      setStatus('idle')
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.events.length === 0) return
    setStatus('importing')
    try {
      await importEvents(fileContent, selectedCat)
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('preview')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('导入日历', 'Import Calendar')}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-4">
          {/* File picker */}
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".ics"
              onChange={handleFile}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'w-full flex items-center gap-2 px-4 py-3 rounded-xl border border-dashed',
                'border-border-subtle text-sm font-sans text-text-secondary',
                'hover:text-text-primary hover:border-border-default',
                'transition-colors duration-150 cursor-pointer',
              )}
            >
              <Upload className="h-4 w-4 flex-shrink-0" />
              {fileName || t('选择 .ics 文件', 'Choose .ics file')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs font-sans text-rose-500">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Parse preview */}
          {parseResult && status !== 'importing' && status !== 'done' && (
            <div className="flex flex-col gap-2 text-sm font-sans bg-surface-sunken rounded-xl px-3 py-2.5">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">
                  {t('可导入', 'Importable')}
                </span>
                <span className="text-text-primary font-medium">
                  {parseResult.events.length} {t('个事件', 'events')}
                </span>
              </div>
              {parseResult.skippedAllDay > 0 && (
                <div className="flex items-center justify-between text-text-tertiary">
                  <span>{t('跳过（全天）', 'Skipped (all-day)')}</span>
                  <span>{parseResult.skippedAllDay}</span>
                </div>
              )}
              {parseResult.skippedRecurring > 0 && (
                <div className="flex items-center justify-between text-text-tertiary">
                  <span>{t('跳过（重复）', 'Skipped (recurring)')}</span>
                  <span>{parseResult.skippedRecurring}</span>
                </div>
              )}
            </div>
          )}

          {/* Category selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-sans text-text-tertiary">
              {t('目标分类', 'Target category')}
            </label>
            <div className="grid grid-cols-2 gap-1">
              {categories.map((cat) => {
                const sel = cat.id === selectedCat
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCat(cat.id)}
                    disabled={status === 'importing'}
                    className={cn(
                      'flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-left text-sm font-sans',
                      'transition-colors duration-150',
                      sel
                        ? 'bg-surface-raised text-text-primary'
                        : 'text-text-secondary hover:text-text-primary hover:bg-surface-raised',
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: `var(--event-${cat.id}-bg)`,
                        outline: sel ? `2px solid var(--event-${cat.id}-text)` : 'none',
                        outlineOffset: '1px',
                      }}
                    />
                    {cat.name[language]}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Success */}
          {status === 'done' && (
            <div className="flex items-center gap-2 text-sm font-sans text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 rounded-xl px-3 py-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              {t('已导入', 'Imported')} {parseResult?.events.length} {t('个事件', 'events')}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-1">
            {status === 'done' ? (
              <Button variant="default" size="sm" onClick={() => handleOpenChange(false)}>
                {t('完成', 'Done')}
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
                  {t('取消', 'Cancel')}
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  disabled={status !== 'preview' || !parseResult || parseResult.events.length === 0}
                  onClick={handleImport}
                >
                  {status === 'importing' ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('导入中…', 'Importing…')}</>
                  ) : (
                    t('导入', 'Import')
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

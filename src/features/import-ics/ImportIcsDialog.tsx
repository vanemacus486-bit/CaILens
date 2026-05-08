import { useState, useRef, useMemo, useEffect } from 'react'
import { format } from 'date-fns'
import { Upload, Check, AlertCircle, Loader2, Search, Sparkles, ChevronRight } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { parseIcs, aggregateByName, classifyEvent } from '@/domain/icsImport'
import type { ImportResult, EventNameGroup, ImportedEvent } from '@/domain/icsImport'
import type { CategoryId } from '@/domain/category'
import { useCategoryStore } from '@/stores/categoryStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'

interface ImportIcsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type Status = 'idle' | 'preview' | 'importing' | 'done'

const CATEGORY_ORDER: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

export function ImportIcsDialog({ open, onOpenChange }: ImportIcsDialogProps) {
  const [status, setStatus] = useState<Status>('idle')
  const [fileName, setFileName] = useState('')
  const [, setFileContent] = useState('')
  const [parseResult, setParseResult] = useState<ImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [groups, setGroups] = useState<EventNameGroup[]>([])
  const [groupAssignments, setGroupAssignments] = useState<Map<string, CategoryId>>(new Map())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedTitle, setExpandedTitle] = useState<string | null>(null)
  const [individualOverrides, setIndividualOverrides] = useState<Map<number, CategoryId>>(new Map())

  const fileInputRef = useRef<HTMLInputElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const categories = useCategoryStore((s) => s.categories)
  const language = useAppSettingsStore((s) => s.settings.language)
  const importParsedEvents = useEventStore((s) => s.importParsedEvents)

  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  // Build stable index lookup for individual event overrides
  const eventIndexMap = useMemo(() => {
    if (!parseResult) return new Map<ImportedEvent, number>()
    const m = new Map<ImportedEvent, number>()
    parseResult.events.forEach((ev, i) => m.set(ev, i))
    return m
  }, [parseResult])

  // Filter groups by search query
  const filteredGroups = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return groups
    const untitledLabel = language === 'zh' ? '(无标题)' : '(Untitled)'
    return groups.filter((g) => {
      const displayName = g.title || untitledLabel
      return displayName.toLowerCase().includes(q)
    })
  }, [groups, searchQuery, language])

  // Event coverage (explicitly assigned, not just suggested)
  const coveredCount = useMemo(() => {
    if (!parseResult) return 0
    let covered = 0
    for (let i = 0; i < parseResult.events.length; i++) {
      if (individualOverrides.has(i)) {
        covered++
      } else if (groupAssignments.has(parseResult.events[i].title || '')) {
        covered++
      }
    }
    return covered
  }, [parseResult, groupAssignments, individualOverrides])

  const totalCount = parseResult?.events.length ?? 0

  // Number of groups with pending (unaccepted) suggestions
  const pendingSuggestions = useMemo(
    () => groups.filter((g) => !groupAssignments.has(g.title) && g.suggestedCategory).length,
    [groups, groupAssignments],
  )

  const reset = () => {
    setStatus('idle')
    setFileName('')
    setFileContent('')
    setParseResult(null)
    setError(null)
    setIsDragOver(false)
    setGroups([])
    setGroupAssignments(new Map())
    setSearchQuery('')
    setExpandedTitle(null)
    setIndividualOverrides(new Map())
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const processFile = (file: File) => {
    if (!file.name.endsWith('.ics')) {
      setError(t('请选择 .ics 文件', 'Please select a .ics file'))
      return
    }
    setFileName(file.name)
    setError(null)

    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      setFileContent(text)
      try {
        const result = parseIcs(text)
        setParseResult(result)
        const catStubs = categories.map((c) => ({ id: c.id, folders: c.folders }))
        setGroups(aggregateByName(result.events, catStubs))
        setGroupAssignments(new Map())
        setSearchQuery('')
        setExpandedTitle(null)
        setIndividualOverrides(new Map())
        setStatus('preview')
      } catch (err) {
        setError(err instanceof Error ? err.message : t('无法解析文件', 'Cannot parse file'))
        setStatus('idle')
      }
    }
    reader.onerror = () => {
      setError(t('无法读取文件', 'Cannot read file'))
      setStatus('idle')
    }
    reader.readAsText(file)
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    processFile(file)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    processFile(file)
  }

  const assignGroup = (title: string, catId: CategoryId) => {
    setGroupAssignments((prev) => new Map(prev).set(title, catId))
  }

  const applyAllSuggestions = () => {
    setGroupAssignments((prev) => {
      const next = new Map(prev)
      for (const g of groups) {
        if (!next.has(g.title) && g.suggestedCategory) {
          next.set(g.title, g.suggestedCategory)
        }
      }
      return next
    })
  }

  // Keyboard shortcuts: 1-6 assigns first visible unclassified row
  useEffect(() => {
    if (status !== 'preview') return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      const num = parseInt(e.key)
      if (num < 1 || num > 6) return

      e.preventDefault()
      const catId = CATEGORY_ORDER[num - 1]

      setGroupAssignments((prev) => {
        for (const g of filteredGroups) {
          if (!prev.has(g.title)) {
            return new Map(prev).set(g.title, catId)
          }
        }
        return prev
      })
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [status, filteredGroups])

  const toggleExpand = (title: string) => {
    setExpandedTitle((prev) => (prev === title ? null : title))
  }

  const assignIndividual = (eventIndex: number, catId: CategoryId) => {
    setIndividualOverrides((prev) => new Map(prev).set(eventIndex, catId))
  }

  const removeIndividualOverride = (eventIndex: number) => {
    setIndividualOverrides((prev) => {
      const next = new Map(prev)
      next.delete(eventIndex)
      return next
    })
  }

  const handleImport = async () => {
    if (!parseResult || parseResult.events.length === 0) return
    setStatus('importing')
    try {
      const catStubs = categories.map((c) => ({ id: c.id, folders: c.folders }))
      await importParsedEvents(parseResult.events, (event, index) => {
        if (individualOverrides.has(index)) return individualOverrides.get(index)!
        return groupAssignments.get(event.title || '') ?? classifyEvent(event.title, catStubs) ?? 'accent'
      })
      setStatus('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import failed')
      setStatus('preview')
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent className="max-w-xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{t('导入日历', 'Import Calendar')}</AlertDialogTitle>
        </AlertDialogHeader>

        <div className="flex flex-col gap-3">
          {/* File picker / drop zone */}
          <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}>
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
                'text-sm font-sans transition-colors duration-200 cursor-pointer',
                isDragOver
                  ? 'border-event-accent-text bg-event-accent-bg/10 text-event-accent-text'
                  : 'border-border-subtle text-text-secondary hover:text-text-primary hover:border-border-default',
              )}
            >
              <Upload className="h-4 w-4 flex-shrink-0" />
              {isDragOver
                ? t('释放以导入', 'Drop to import')
                : fileName || t('拖拽或选择 .ics 文件', 'Drag & drop or choose .ics file')}
            </button>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 text-xs font-sans text-color-text-danger">
              <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
              {error}
            </div>
          )}

          {/* Parse summary + skip details */}
          {parseResult && status !== 'importing' && status !== 'done' && (
            <div className="flex flex-col gap-2 text-sm font-sans bg-surface-sunken rounded-xl px-3 py-2">
              <div className="flex items-center justify-between">
                <span className="text-text-secondary">{t('解析结果', 'Parse result')}</span>
                <span className="text-text-primary font-medium">
                  {totalCount} {t('个事件', 'events')} &middot; {groups.length} {t('种类型', 'types')}
                </span>
              </div>
              {(parseResult.skippedAllDay > 0 || parseResult.skippedRecurring > 0) && (
                <details className="text-text-tertiary">
                  <summary className="cursor-pointer text-xs">
                    {parseResult.skippedAllDay > 0 &&
                      t(`跳过 ${parseResult.skippedAllDay} 个全天事件`, `Skipped ${parseResult.skippedAllDay} all-day events`)}
                    {parseResult.skippedAllDay > 0 && parseResult.skippedRecurring > 0 && '，'}
                    {parseResult.skippedRecurring > 0 &&
                      t(`跳过 ${parseResult.skippedRecurring} 个重复事件`, `Skipped ${parseResult.skippedRecurring} recurring events`)}
                  </summary>
                  <ul className="mt-1 pl-3 text-body-xs list-disc list-inside max-h-20 overflow-y-auto">
                    {parseResult.skippedAllDayTitles.map((title, i) => (
                      <li key={`ad-${i}`} className="truncate">
                        {title || t('(无标题)', '(Untitled)')}
                      </li>
                    ))}
                    {parseResult.skippedRecurringTitles.map((title, i) => (
                      <li key={`rr-${i}`} className="truncate">
                        {title || t('(无标题)', '(Untitled)')}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}

          {/* Classification UI */}
          {status === 'preview' && groups.length > 0 && (
            <div className="flex flex-col gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('搜索事件名…', 'Search event names…')}
                  className={cn(
                    'w-full pl-8 pr-3 py-1.5 rounded-lg text-sm font-sans',
                    'bg-surface-sunken text-text-primary placeholder:text-text-tertiary',
                    'border border-border-subtle focus:outline-none focus:border-border-default',
                    'transition-colors duration-200',
                  )}
                />
              </div>

              {/* Progress + apply-all */}
              <div className="flex items-center gap-2">
                <div className="flex-1 h-1.5 bg-surface-sunken rounded-full overflow-hidden">
                  <div
                    className="h-full bg-event-accent-text rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${totalCount > 0 ? (coveredCount / totalCount) * 100 : 0}%` }}
                  />
                </div>
                <span className="text-xs font-mono text-text-secondary flex-shrink-0 tabular-nums">
                  {coveredCount} / {totalCount}
                </span>
                {pendingSuggestions > 0 && (
                  <button
                    type="button"
                    onClick={applyAllSuggestions}
                    className={cn(
                      'flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-sans flex-shrink-0',
                      'bg-surface-raised hover:bg-surface-sunken text-text-primary',
                      'transition-colors duration-200',
                    )}
                  >
                    <Sparkles className="h-3 w-3" />
                    {t(`应用 ${pendingSuggestions} 条`, `Apply ${pendingSuggestions}`)}
                  </button>
                )}
              </div>

              {/* Casting hint */}
              {groups.length > 0 && coveredCount === 0 && (
                <p className="text-xs text-text-tertiary font-sans">
                  {t('按 1-6 数字键快速分配，或点击下方按钮', 'Press 1-6 keys to assign, or click buttons below')}
                </p>
              )}

              {/* Group list */}
              <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                {filteredGroups.length === 0 ? (
                  <p className="text-xs text-text-tertiary text-center py-4 font-sans">
                    {t('没有匹配的事件名', 'No matching event names')}
                  </p>
                ) : (
                  filteredGroups.map((g) => {
                    const assigned = groupAssignments.has(g.title)
                    const hasSuggestion = g.suggestedCategory && !assigned
                    const isExpanded = expandedTitle === g.title

                    return (
                      <div key={g.title}>
                        <div
                          className={cn(
                            'flex flex-col gap-1.5 px-3 py-2 rounded-xl transition-colors duration-200',
                            assigned ? 'bg-surface-raised' : 'bg-surface-base hover:bg-surface-raised',
                          )}
                        >
                          {/* Top row: name + count + expand */}
                          <div className="flex items-center gap-2 min-w-0">
                            {hasSuggestion && (
                              <Sparkles className="h-3 w-3 text-event-accent-text flex-shrink-0" />
                            )}
                            <span className="flex-1 text-sm font-serif text-text-primary truncate">
                              {g.title || t('(无标题)', '(Untitled)')}
                            </span>
                            <span
                              className={cn(
                                'text-xs font-mono px-1.5 py-0.5 rounded-full flex-shrink-0',
                                assigned
                                  ? 'bg-event-accent-bg/15 text-event-accent-text'
                                  : 'bg-surface-sunken text-text-tertiary',
                              )}
                            >
                              {g.count}
                            </span>
                            <button
                              type="button"
                              onClick={() => toggleExpand(g.title)}
                              className={cn(
                                'p-0.5 rounded-sm hover:bg-surface-sunken transition-colors',
                                'text-text-tertiary hover:text-text-secondary',
                              )}
                            >
                              <ChevronRight
                                className={cn(
                                  'h-3.5 w-3.5 transition-transform duration-200',
                                  isExpanded && 'rotate-90',
                                )}
                              />
                            </button>
                          </div>

                          {/* Category buttons */}
                          <div className="flex items-center gap-1.5">
                            {CATEGORY_ORDER.map((catId, idx) => {
                              const isAssigned = groupAssignments.get(g.title) === catId
                              const isSuggested = !assigned && g.suggestedCategory === catId
                              return (
                                <button
                                  key={catId}
                                  type="button"
                                  onClick={() => assignGroup(g.title, catId)}
                                  className={cn(
                                    'w-6 h-6 rounded-full flex items-center justify-center',
                                    'text-xs font-mono transition-all duration-200',
                                    'hover:scale-110 active:scale-95',
                                    isAssigned && 'ring-2 ring-offset-1 scale-105',
                                  )}
                                  style={{
                                    backgroundColor: `var(--event-${catId}-bg)`,
                                    color: `var(--event-${catId}-text)`,
                                    ...(isSuggested
                                      ? {
                                          outline: `1.5px dashed var(--event-${catId}-text)`,
                                          outlineOffset: '1px',
                                        }
                                      : {}),
                                    ...(isAssigned
                                      ? {
                                          outline: `2px solid var(--event-${catId}-text)`,
                                          outlineOffset: '1px',
                                        }
                                      : {}),
                                  }}
                                  title={`${idx + 1}: ${categories.find((c) => c.id === catId)?.name[language]}`}
                                >
                                  {idx + 1}
                                </button>
                              )
                            })}
                          </div>

                          {/* Expanded: individual event overrides */}
                          {isExpanded && (
                            <div className="mt-1 pt-1 border-t border-border-subtle space-y-0.5 max-h-40 overflow-y-auto">
                              {g.events.map((ev) => {
                                const globalIdx = eventIndexMap.get(ev) ?? -1
                                const overrideCat = globalIdx >= 0 ? individualOverrides.get(globalIdx) : undefined
                                const groupCat = groupAssignments.get(g.title)
                                const effectiveCat = overrideCat ?? groupCat

                                return (
                                  <div
                                    key={globalIdx}
                                    className="flex items-center gap-1.5 py-0.5 text-xs"
                                  >
                                    <span className="text-text-tertiary font-mono w-20 flex-shrink-0">
                                      {format(new Date(ev.startTime), 'MM/dd HH:mm')}
                                    </span>
                                    <span
                                      className="w-2 h-2 rounded-full flex-shrink-0"
                                      style={{
                                        backgroundColor: effectiveCat
                                          ? `var(--event-${effectiveCat}-bg)`
                                          : undefined,
                                      }}
                                    />
                                    {overrideCat && (
                                      <button
                                        type="button"
                                        onClick={() => removeIndividualOverride(globalIdx)}
                                        className="text-text-tertiary hover:text-color-text-danger flex-shrink-0"
                                        title={t('清除覆盖', 'Clear override')}
                                      >
                                        &times;
                                      </button>
                                    )}
                                    <div className="flex gap-0.5 ml-auto">
                                      {CATEGORY_ORDER.map((catId) => (
                                        <button
                                          key={catId}
                                          type="button"
                                          onClick={() => {
                                            if (catId === groupCat) {
                                              removeIndividualOverride(globalIdx)
                                            } else {
                                              assignIndividual(globalIdx, catId)
                                            }
                                          }}
                                          className={cn(
                                            'w-3.5 h-3.5 rounded-full transition-all hover:scale-125',
                                            effectiveCat === catId && 'ring-1 ring-offset-0',
                                          )}
                                          style={{
                                            backgroundColor: `var(--event-${catId}-bg)`,
                                          }}
                                          title={categories.find((c) => c.id === catId)?.name[language]}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Success */}
          {status === 'done' && (
            <div className="flex items-center gap-2 text-sm font-sans text-color-text-success bg-color-bg-positive rounded-xl px-3 py-2">
              <Check className="h-4 w-4 flex-shrink-0" />
              {t('已导入', 'Imported')} {totalCount} {t('个事件', 'events')}
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
                {(status === 'preview' || status === 'importing') && (
                  <Button
                    variant="default"
                    size="sm"
                    disabled={status === 'importing' || !parseResult || parseResult.events.length === 0}
                    onClick={handleImport}
                  >
                    {status === 'importing' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> {t('导入中…', 'Importing…')}
                      </>
                    ) : (
                      t('导入', 'Import')
                    )}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}

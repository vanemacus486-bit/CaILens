import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { formatISODate, formatMonthDay, formatWeekday, getWeekStart } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import { getEventRepo } from '@/data/getRepositories'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { resolveBindings, bindingToDisplayString } from '@/domain/shortcuts'

function fmtHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-event-accent-bg text-event-accent-text rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  )
}

/** Extract a snippet of ±contextLen chars around the first match of query in text. */
function descriptionSnippet(text: string, query: string, contextLen = 20): string | null {
  if (!query.trim() || !text) return null
  const lower = text.toLowerCase()
  const qLower = query.toLowerCase()
  const idx = lower.indexOf(qLower)
  if (idx === -1) return null
  const start = Math.max(0, idx - contextLen)
  const end = Math.min(text.length, idx + query.length + contextLen)
  let snippet = ''
  if (start > 0) snippet += '…'
  snippet += text.slice(start, end)
  if (end < text.length) snippet += '…'
  return snippet
}

interface Command {
  id: string
  label: string
  shortcut: string
  invoke: () => void
}

export function CommandPalette() {
  const navigate = useNavigate()
  const setCommandPaletteOpen = useUIStore((s) => s.setCommandPaletteOpen)
  const setTheme = useAppSettingsStore((s) => s.setTheme)
  const settings = useAppSettingsStore((s) => s.settings)

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CalendarEvent[]>([])
  const [status, setStatus] = useState<'idle' | 'loading' | 'empty' | 'error'>('idle')
  const inputRef = useRef<HTMLInputElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Auto-focus on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const close = useCallback(() => setCommandPaletteOpen(false), [setCommandPaletteOpen])

  // Resolve shortcut display strings from registry
  const resolvedBindings = useMemo(() => resolveBindings(settings.shortcuts ?? {}), [settings.shortcuts])
  const shortcutDisplay = useMemo(() => {
    const m: Record<string, string> = {}
    for (const [action, binding] of Object.entries(resolvedBindings)) {
      m[action] = binding ? bindingToDisplayString(binding) : ''
    }
    return m
  }, [resolvedBindings])

  // Commands
  const allCommands = useMemo<Command[]>(() => [
    {
      id: 'today',
      label: '前往本周',
      shortcut: shortcutDisplay.goToThisWeek,
      invoke: () => { navigate('/'); close() },
    },
    {
      id: 'stats',
      label: '前往统计',
      shortcut: shortcutDisplay.goToStats,
      invoke: () => { navigate('/stats'); close() },
    },
    {
      id: 'settings',
      label: '打开设置',
      shortcut: shortcutDisplay.openSettings,
      invoke: () => { navigate('/settings'); close() },
    },
    {
      id: 'theme',
      label: settings.theme === 'dark' ? '切换浅色主题' : '切换深色主题',
      shortcut: shortcutDisplay.toggleTheme,
      invoke: () => {
        fireAndForget(setTheme(settings.theme === 'dark' ? 'light' : 'dark'), 'toggle theme')
        close()
      },
    },
  ], [navigate, close, setTheme, settings.theme, shortcutDisplay])

  // Filter commands based on query
  const matchedCommands = useMemo(() => {
    const trimmed = query.trim()
    if (!trimmed) return allCommands
    const lower = trimmed.toLowerCase()
    return allCommands.filter(
      (cmd) => cmd.id.toLowerCase().includes(lower)
        || cmd.label.toLowerCase().includes(lower),
    )
  }, [allCommands, query])

  // Debounced search
  const doSearch = useCallback(async (q: string) => {
    const trimmed = q.trim()
    if (!trimmed) {
      setResults([])
      setStatus('idle')
      return
    }
    setStatus('loading')
    try {
      const found = await getEventRepo().search(trimmed)
      setResults(found)
      setStatus(found.length === 0 ? 'empty' : 'idle')
    } catch {
      setStatus('error')
    }
  }, [])

  const handleInputChange = useCallback((value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(value), 300)
  }, [doSearch])

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') close()
  }, [close])

  // Click outside to close
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        close()
      }
    }
    const id = setTimeout(() => document.addEventListener('click', handleClick), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('click', handleClick)
    }
  }, [close])

  // Result click → navigate to week + open event detail
  const handleResultClick = useCallback((event: CalendarEvent) => {
    close()
    const weekStart = getWeekStart(new Date(event.startTime), 1)
    const weekStr = formatISODate(weekStart)
    navigate(`/?week=${weekStr}&openEvent=${event.id}`)
  }, [close, navigate])

  // Determine if we're showing commands or events or neither
  const showCommands = matchedCommands.length > 0 && results.length === 0 && status !== 'loading'

  return (
    <div className="fixed inset-0 z-50 flex justify-center bg-black/20 dark:bg-black/40" style={{ pointerEvents: 'none' }}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="搜索事件或输入命令"
        className={cn(
          'absolute top-[25%] w-[calc(100vw-2rem)] max-w-[420px]',
          'rounded-2xl border border-border-subtle bg-surface-raised shadow-lg',
          'flex flex-col',
        )}
        style={{ pointerEvents: 'auto' }}
      >
        {/* Search input */}
        <div className="flex items-center gap-2.5 px-3.5 py-3">
          <Search size={16} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="搜索事件或输入命令"
            placeholder="搜索事件... (输入 / 查看命令)"
            className={cn(
              'flex-1 bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm',
              'text-sm font-sans text-text-primary placeholder:text-text-tertiary',
            )}
          />
          {status === 'loading' && (
            <span className="text-xs text-text-tertiary flex-shrink-0">
              {'搜索中...'}
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-color-text-danger flex-shrink-0">
              {'搜索失败'}
            </span>
          )}
        </div>

        {/* Commands section */}
        {showCommands && (
          <>
            <div className="h-px bg-border-subtle flex-shrink-0" />
            <div role="listbox" aria-label="命令" className="max-h-80 overflow-y-auto">
              {matchedCommands.map((cmd) => (
                <button
                  key={cmd.id}
                  role="option"
                  onClick={cmd.invoke}
                  className={cn(
                    'w-full flex items-center justify-between px-3.5 py-2.5 text-left',
                    'hover:bg-surface-sunken transition-colors duration-150',
                  )}
                >
                  <span className="text-sm font-sans text-text-primary">
                    {cmd.label}
                  </span>
                  {cmd.shortcut && (
                    <span className="text-xs font-mono text-text-tertiary ml-4 flex-shrink-0">
                      {cmd.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Event search results */}
        {results.length > 0 && (
          <div role="listbox" aria-label="搜索结果" className="max-h-80 overflow-y-auto">
            {results.map((event) => (
              <button
                key={event.id}
                role="option"
                onClick={() => handleResultClick(event)}
                className={cn(
                  'w-full flex items-start gap-2.5 px-3.5 py-2.5 text-left',
                  'hover:bg-surface-sunken transition-colors duration-150',
                )}
              >
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: `var(--event-${event.color}-fill)` }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-sans text-text-primary truncate">
                    {highlightMatch(event.title || '(无标题)', query)}
                  </p>
                  {/* Description hit snippet */}
                  {event.description && (() => {
                    const snippet = descriptionSnippet(event.description, query)
                    if (!snippet) return null
                    const titleHit = event.title.toLowerCase().includes(query.toLowerCase())
                    return (
                      <p className="text-xs font-sans text-text-tertiary mt-0.5 line-clamp-1">
                        {titleHit ? (
                          <span className="italic">{snippet}</span>
                        ) : (
                          highlightMatch(snippet, query)
                        )}
                      </p>
                    )
                  })()}
                  <p className="text-xs font-mono text-text-secondary mt-0.5">
                    {formatMonthDay(new Date(event.startTime))}{' '}
                    {formatWeekday(new Date(event.startTime), 'short')}{' '}
                    {fmtHM(event.startTime)}–{fmtHM(event.endTime)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {status === 'empty' && !showCommands && (
          <div className="px-3.5 py-6 text-center">
            <p className="text-sm text-text-tertiary">
              {'没有匹配的事件'}
            </p>
          </div>
        )}

        {/* Idle hint */}
        {status === 'idle' && query.trim() === '' && (
          <div className="px-3.5 py-6 text-center">
            <p className="text-sm text-text-tertiary">
              {'输入关键词搜索历史事件'}
            </p>
            <p className="text-xs text-text-tertiary mt-2">
              {'输入 / 可查看全部命令'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

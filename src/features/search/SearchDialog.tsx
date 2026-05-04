import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatISODate, formatMonthDay, formatWeekday, getWeekStart } from '@/domain/time'
import type { CalendarEvent } from '@/domain/event'
import { eventRepository } from '@/data/eventRepository'
import { useUIStore } from '@/stores/uiStore'
import { useAppSettingsStore } from '@/stores/settingsStore'

function fmtHM(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export function SearchDialog() {
  const navigate = useNavigate()
  const setSearchOpen = useUIStore((s) => s.setSearchOpen)
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

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
      const found = await eventRepository.search(trimmed)
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

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current) }
  }, [])

  // Close handlers
  const close = useCallback(() => setSearchOpen(false), [setSearchOpen])

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
    // Delay adding listener so the click that opened the panel doesn't close it
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

  return (
    <div className="fixed inset-0 z-50 flex justify-center" style={{ pointerEvents: 'none' }}>
      <div
        ref={panelRef}
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
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('搜索事件...', 'Search events...')}
            className={cn(
              'flex-1 bg-transparent border-none outline-none',
              'text-sm font-sans text-text-primary placeholder:text-text-tertiary',
            )}
          />
          {status === 'loading' && (
            <span className="text-xs text-text-tertiary flex-shrink-0">
              {t('搜索中...', 'Searching...')}
            </span>
          )}
          {status === 'error' && (
            <span className="text-xs text-rose-500 flex-shrink-0">
              {t('搜索失败', 'Search failed')}
            </span>
          )}
        </div>

        {/* Divider */}
        {(results.length > 0 || status === 'empty') && (
          <div className="h-px bg-border-subtle flex-shrink-0" />
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="max-h-80 overflow-y-auto">
            {results.map((event) => (
              <button
                key={event.id}
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
                    {event.title || t('(无标题)', '(Untitled)')}
                  </p>
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
        {status === 'empty' && (
          <div className="px-3.5 py-6 text-center">
            <p className="text-sm text-text-tertiary">
              {t('没有匹配的事件', 'No matching events')}
            </p>
          </div>
        )}

        {/* Idle hint — shown when input is empty */}
        {status === 'idle' && query.trim() === '' && (
          <div className="px-3.5 py-6 text-center">
            <p className="text-sm text-text-tertiary">
              {t('输入关键词搜索历史事件', 'Type to search past events')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

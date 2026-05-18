import { useEffect, useRef } from 'react'

const SESSION_KEY = 'cailens_session'

interface SessionState {
  weekStart?: number
  dayStart?: number
  weekScrollTop?: number
  dayScrollTop?: number
  view: 'week' | 'day' | 'stats' | 'settings'
}

export function saveSession(state: Partial<SessionState>) {
  try {
    const current = loadSessionRaw()
    const merged = { ...current, ...state }
    localStorage.setItem(SESSION_KEY, JSON.stringify(merged))
  } catch { /* ignore */ }
}

function loadSessionRaw(): Partial<SessionState> {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

export function loadSession(): Partial<SessionState> {
  return loadSessionRaw()
}

/**
 * Saves the scroll position of a container element to session state
 * whenever it changes. Uses a debounced approach (trailing only).
 * Uses view-specific keys to prevent cross-contamination.
 */
export function useScrollSave(containerRef: React.RefObject<HTMLElement | null>, view: 'week' | 'day') {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const key = view === 'week' ? 'weekScrollTop' : 'dayScrollTop'

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleScroll = () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => {
        saveSession({ [key]: el.scrollTop })
      }, 500)
    }

    el.addEventListener('scroll', handleScroll, { passive: true })
    return () => {
      el.removeEventListener('scroll', handleScroll)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [containerRef, key])
}

/**
 * Restore saved scroll position on mount. Uses view-specific keys.
 */
export function useScrollRestore(containerRef: React.RefObject<HTMLElement | null>, view: 'week' | 'day') {
  useEffect(() => {
    const saved = view === 'week' ? loadSession().weekScrollTop : loadSession().dayScrollTop
    if (saved == null) return

    // Try a few times in case the DOM hasn't rendered yet
    let attempts = 0
    const tryScroll = () => {
      const el = containerRef.current
      if (el && el.scrollHeight > 0) {
        el.scrollTop = saved
      } else if (attempts < 5) {
        attempts++
        requestAnimationFrame(tryScroll)
      }
    }
    requestAnimationFrame(tryScroll)
  }, [containerRef, view])
}

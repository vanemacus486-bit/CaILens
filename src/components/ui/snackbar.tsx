import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getEventRepo } from '@/data/getRepositories'

type Listener = (eventId: string) => void
let listener: Listener | null = null

export function showUndoSnackbar(eventId: string): void {
  listener?.(eventId)
}

export function SnackbarHost() {
      const [eventId, setEventId] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    listener = (id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setEventId(id)
      timerRef.current = setTimeout(() => setEventId(null), 3000)
    }
    return () => {
      listener = null
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  const undo = useCallback(async () => {
    if (!eventId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    await getEventRepo().delete(eventId)
    setEventId(null)
  }, [eventId])

  if (!eventId) return null

  return createPortal(
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[200] flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-lg shadow-lg px-4 py-2.5 font-sans text-sm text-text-primary"
    >
      <span>{'已保存'}</span>
      <span className="text-text-tertiary">·</span>
      <button
        onClick={undo}
        className="font-medium text-accent hover:text-accent-hover transition-colors duration-200 cursor-pointer"
      >
        {'撤销'}
      </button>
    </div>,
    document.body,
  )
}

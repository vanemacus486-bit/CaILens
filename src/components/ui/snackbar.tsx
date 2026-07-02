import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { getEventRepo } from '@/data/getRepositories'

type Listener = (eventId: string) => void
let listener: Listener | null = null

type ErrorListener = (message: string) => void
let errorListener: ErrorListener | null = null

export function showUndoSnackbar(eventId: string): void {
  listener?.(eventId)
}

export function showErrorSnackbar(message: string): void {
  errorListener?.(message)
}

export function SnackbarHost() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    listener = (id: string) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setEventId(id)
      timerRef.current = setTimeout(() => setEventId(null), 3000)
    }
    errorListener = (msg: string) => {
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
      setErrorMsg(msg)
      errorTimerRef.current = setTimeout(() => setErrorMsg(null), 4000)
    }
    return () => {
      listener = null
      errorListener = null
      if (timerRef.current) clearTimeout(timerRef.current)
      if (errorTimerRef.current) clearTimeout(errorTimerRef.current)
    }
  }, [])

  const undo = useCallback(async () => {
    if (!eventId) return
    if (timerRef.current) clearTimeout(timerRef.current)
    await getEventRepo().delete(eventId)
    setEventId(null)
  }, [eventId])

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-3 bg-color-text-danger border border-border-subtle rounded-lg shadow-lg px-4 py-2.5 font-sans text-sm text-white"
        >
          <span>{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="font-medium text-white/80 hover:text-white transition-colors duration-200 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {eventId && (
        <div
          role="alert"
          className="flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-lg shadow-lg px-4 py-2.5 font-sans text-sm text-text-primary"
        >
          <span>{'已保存'}</span>
          <span className="text-text-tertiary">·</span>
          <button
            onClick={undo}
            className="font-medium text-accent hover:text-accent-hover transition-colors duration-200 cursor-pointer"
          >
            {'撤销'}
          </button>
        </div>
      )}
    </div>,
    document.body,
  )
}

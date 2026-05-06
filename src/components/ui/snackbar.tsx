import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { eventRepository } from '@/data/eventRepository'
import { useAppSettingsStore } from '@/stores/settingsStore'

type Listener = (eventId: string) => void
let listener: Listener | null = null

export function showUndoSnackbar(eventId: string): void {
  listener?.(eventId)
}

export function SnackbarHost() {
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

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
    await eventRepository.delete(eventId)
    setEventId(null)
  }, [eventId])

  if (!eventId) return null

  return createPortal(
    <div
      role="alert"
      className="fixed bottom-4 right-4 z-[200] flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-lg shadow-lg px-4 py-2.5 font-sans text-sm text-text-primary"
    >
      <span>{t('已保存', 'Event saved')}</span>
      <span className="text-text-tertiary">·</span>
      <button
        onClick={undo}
        className="font-medium text-accent hover:text-accent-hover transition-colors duration-200 cursor-pointer"
      >
        {t('撤销', 'Undo')}
      </button>
    </div>,
    document.body,
  )
}

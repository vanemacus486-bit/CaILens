import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useEventStore } from '@/stores/eventStore'

type UndoPayload = { eventId: string; title: string }
type Listener = (payload: UndoPayload) => void
let listener: Listener | null = null

type ErrorListener = (message: string) => void
let errorListener: ErrorListener | null = null

/** 显示「已删除 · 撤销」。eventId 必须是软删除的 id（restore 依赖它）。 */
export function showUndoSnackbar(eventId: string, title = '记录'): void {
  listener?.({ eventId, title })
}

export function showErrorSnackbar(message: string): void {
  errorListener?.(message)
}

export function SnackbarHost() {
  const [payload, setPayload] = useState<UndoPayload | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)
  const errorTimerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    listener = (p: UndoPayload) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setPayload(p)
      timerRef.current = setTimeout(() => setPayload(null), 6000)
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

  // 撤销 = 清除软删除标记（保留原 id），不是再删一次
  const undo = useCallback(async () => {
    if (!payload) return
    if (timerRef.current) clearTimeout(timerRef.current)
    const { eventId } = payload
    setPayload(null)
    try {
      await useEventStore.getState().restoreEvent(eventId)
    } catch (err) {
      showErrorSnackbar(err instanceof Error ? err.message : '撤销失败')
    }
  }, [payload])

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      {errorMsg && (
        <div
          role="alert"
          className="flex items-center gap-3 bg-color-text-danger border border-border-subtle rounded-sm shadow-lg px-4 py-2.5 font-sans text-sm text-white"
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
      {payload && (
        <div
          role="alert"
          className="flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-sm shadow-lg px-4 py-2.5 font-sans text-sm text-text-primary"
        >
          <span className="truncate max-w-[16rem]">{`已删除「${payload.title}」`}</span>
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

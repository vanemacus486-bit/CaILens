/**
 * # BedtimeBannerHost — 就寝提醒降级横幅
 *
 * 当系统通知权限被拒时，作为 fallback 在应用内弹单行提示。
 * 使用 singleton-listener + createPortal 模式（与 SnackbarHost 类似）。
 * 在 App.tsx 根挂载一次。
 */

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { setFallbackBanner } from '@/lib/notify'

export function BedtimeBannerHost() {
  const [message, setMessage] = useState<{ title: string; body: string } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout>>(null)

  useEffect(() => {
    setFallbackBanner((title, body) => {
      if (timerRef.current) clearTimeout(timerRef.current)
      setMessage({ title, body })
      timerRef.current = setTimeout(() => setMessage(null), 5000)
    })
    return () => {
      setFallbackBanner(() => {})
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  if (!message) return null

  return createPortal(
    <div
      role="alert"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 bg-surface-raised border border-border-subtle rounded-lg shadow-lg px-5 py-3 font-sans text-sm text-text-primary max-w-sm"
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-medium">{message.title}</span>
        <span className="text-text-tertiary text-xs">{message.body}</span>
      </div>
    </div>,
    document.body,
  )
}

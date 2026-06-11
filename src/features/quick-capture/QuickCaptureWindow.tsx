/**
 * # QuickCaptureWindow — 快速捕获浮窗
 *
 * 通过全局快捷键 (Alt+Space / Ctrl+Shift+A) 呼出的独立 Tauri 窗口。
 * 极简输入条：输入内容，回车保存，窗口隐藏。
 *
 * 行为规范：
 * - 自动聚焦输入框
 * - 回车 → 保存任务 + 清空 + 隐藏窗口
 * - Esc → 隐藏窗口
 * - 窗口失焦 → 隐藏窗口
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useTodoStore } from '@/stores/todoStore'
import { getCurrentWindow } from '@tauri-apps/api/window'

export function QuickCaptureWindow() {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const addInboxTask = useTodoStore((s) => s.addInboxTask)

  // Auto-focus on mount
  useEffect(() => {
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [])

  const hideWindow = useCallback(() => {
    getCurrentWindow().hide().catch(() => {})
  }, [])

  // Blur → hide window
  useEffect(() => {
    const el = inputRef.current
    if (!el) return

    const onBlur = () => {
      // Small delay to allow Enter key to fire first
      setTimeout(() => {
        hideWindow()
      }, 100)
    }

    el.addEventListener('blur', onBlur)
    return () => el.removeEventListener('blur', onBlur)
  }, [hideWindow])

  const handleSave = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    addInboxTask(trimmed)
    setTitle('')
    hideWindow()
  }, [title, addInboxTask, hideWindow])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      hideWindow()
    }
  }, [handleSave, hideWindow])

  return (
    <div
      className="h-screen w-screen flex items-center justify-center bg-transparent"
      style={{ '-webkit-app-region': 'drag' } as React.CSSProperties}
    >
      <div
        className="w-full max-w-[560px] flex items-center rounded-full border border-border-subtle bg-surface-raised px-4"
        style={{ '-webkit-app-region': 'no-drag' } as React.CSSProperties}
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="记点什么,回车保存"
          className="flex-1 bg-transparent border-none focus-visible:outline-none focus-visible:ring-0 text-sm font-sans text-text-primary placeholder:text-text-tertiary py-2.5"
          autoFocus
        />
      </div>
    </div>
  )
}

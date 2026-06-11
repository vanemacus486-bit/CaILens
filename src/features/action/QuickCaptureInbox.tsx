/**
 * # QuickCaptureInbox — 快速录入收件箱
 *
 * 全局快捷键呼出的极简输入框。用户输入待办标题，回车即保存。
 * 待办以 null category/null project 状态落在右侧"待办"区，
 * 之后再拖入矩阵格子或点击编辑来分配分类和优先级。
 *
 * 设计原则：零摩擦，不询问分类/优先级，不展示 autocomplete。
 */

import { useEffect, useRef, useCallback, useState } from 'react'
import { useUIStore } from '@/stores/uiStore'
import { useTodoStore } from '@/stores/todoStore'
import { fireAndForget } from '@/lib/fireAndForget'

// ── Props ──────────────────────────────────────────────────
// None — state-driven from uiStore

export function QuickCaptureInbox() {
  const open = useUIStore((s) => s.quickCaptureInboxOpen)
  const setOpen = useUIStore((s) => s.setQuickCaptureInboxOpen)
  const quickCapture = useTodoStore((s) => s.quickCapture)

  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const close = useCallback(() => {
    setOpen(false)
    setTitle('')
  }, [setOpen])

  // Auto-focus on mount
  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  // Click outside to close
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Node
      const container = document.getElementById('quick-capture-inbox')
      if (container && !container.contains(target)) {
        close()
      }
    }
    const id = setTimeout(() => document.addEventListener('mousedown', handleClick), 0)
    return () => {
      clearTimeout(id)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [open, close])

  // Esc to close
  useEffect(() => {
    if (!open) return
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, close])

  const handleCreate = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    fireAndForget(quickCapture(trimmed), 'quick capture todo')
    close()
  }, [title, quickCapture, close])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
    }
  }, [handleCreate])

  if (!open) return null

  return (
    <div
      id="quick-capture-inbox"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 dark:bg-black/40"
      style={{ pointerEvents: 'none' }}
    >
      <div
        className="w-[420px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border-subtle bg-surface-raised shadow-lg p-4"
        style={{ pointerEvents: 'auto' }}
      >
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="待办…"
          className="w-full bg-transparent border-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 rounded-sm text-lg font-sans text-text-primary placeholder:text-text-tertiary"
        />
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-border-subtle/50">
          <span className="text-[10px] font-sans text-text-quaternary">
            {'Enter 保存 · Esc 取消'}
          </span>
        </div>
      </div>
    </div>
  )
}

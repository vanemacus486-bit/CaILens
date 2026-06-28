/**
 * # AddTaskComposer — 新建任务编辑器（受控展开）
 *
 * 触发器 `AddTaskTrigger` 固定在列表顶部；点开后 `AddTaskComposer` 在列表底部展开。
 * 标题输入 / 详情 / 快捷日期 / 每日重复。回车保存（标题非空），Esc 取消。
 * 保存后保持打开以便连续录入（新建项追加到列表末尾）。
 */

import { useState, useCallback, useRef, useEffect, type KeyboardEvent } from 'react'
import { Circle, ChevronRight } from 'lucide-react'
import { DatePickerPopover } from '@/components/ui/DatePickerPopover'

/** 顶部「添加任务」触发器（折叠态）。点击后由父级把编辑器在列表底部展开。 */
export function AddTaskTrigger({ onClick }: { onClick: () => void }) {
  return (
    <div className="px-4 py-2.5">
      <button
        onClick={onClick}
        className="flex items-center gap-3 text-sm font-sans text-accent hover:text-accent/80 transition-colors w-full text-left"
      >
        <Circle size={18} className="text-accent/60" />
        <span>添加任务</span>
      </button>
    </div>
  )
}

export interface AddTaskComposerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (fields: { title: string; description?: string; dueDate?: number | null; repeatPattern?: 'daily' | null }) => void
  defaultRepeat?: 'daily' | null
  /** 每次顶部触发器被点击时自增；用于把（可能已滚出视口的）底部编辑器重新聚焦/滚回视野 */
  focusNonce?: number
}

export function AddTaskComposer({ open, onOpenChange, onSave, defaultRepeat, focusNonce }: AddTaskComposerProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [dueDate, setDueDate] = useState<number | null>(null)
  const [repeat, setRepeat] = useState<'daily' | null>(defaultRepeat ?? null)
  const inputRef = useRef<HTMLInputElement>(null)

  // 展开时（或顶部触发器被再次点击时）自动聚焦，并把底部编辑器滚入视口
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      inputRef.current?.focus()
      inputRef.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    })
  }, [open, focusNonce])

  const reset = useCallback(() => {
    setTitle('')
    setDescription('')
    setDueDate(null)
    setRepeat(defaultRepeat ?? null)
  }, [defaultRepeat])

  const handleSave = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    onSave({ title: trimmed, description: description || undefined, dueDate, repeatPattern: repeat })
    // 保存后重置但保持打开（Google Tasks 行为），便于连续录入
    setTitle('')
    setDescription('')
    setDueDate(null)
    setRepeat(defaultRepeat ?? null)
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [title, description, dueDate, repeat, onSave, defaultRepeat])

  const handleCancel = useCallback(() => {
    onOpenChange(false)
    reset()
  }, [onOpenChange, reset])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      e.stopPropagation() // 阻止冒泡到全局快捷键（Esc 默认会跳回周视图）
      handleCancel()
    }
  }, [handleSave, handleCancel])

  const todayStart = new Date().setHours(0, 0, 0, 0)
  const tomorrowStart = todayStart + 86400000

  if (!open) return null

  return (
    <div className="px-4 pb-3 pt-2">
      <div className="rounded-lg border border-border-subtle bg-surface-raised p-3 space-y-2">
        {/* 标题行：○ + 输入框 */}
        <div className="flex items-start gap-3">
          <Circle size={18} className="mt-1 shrink-0 text-text-tertiary/40" />
          <input
            ref={inputRef}
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="标题"
            className="flex-1 bg-transparent border-none focus-visible:outline-none text-sm font-sans text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* 详细信息 */}
        <div className="flex items-start gap-3 pl-7">
          <ChevronRight size={12} className="mt-1 shrink-0 text-text-quaternary" />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="详细信息"
            className="flex-1 bg-transparent border-none focus-visible:outline-none text-xs font-sans text-text-secondary placeholder:text-text-tertiary"
          />
        </div>

        {/* 快捷日期 + 重复 */}
        <div className="flex items-center gap-2 pl-7 flex-wrap">
          <button
            onClick={() => setDueDate(tomorrowStart)}
            className={`text-[11px] font-sans px-2 py-0.5 rounded-full transition-colors
              ${dueDate === tomorrowStart
                ? 'bg-accent/10 text-accent'
                : 'bg-surface-sunken text-text-tertiary hover:bg-accent/10 hover:text-accent'}`}
          >
            明天
          </button>
          <DatePickerPopover
            value={dueDate}
            onChange={(d) => setDueDate(d)}
            trigger={
              <button className={`text-[11px] font-sans px-2 py-0.5 rounded-full transition-colors
                ${dueDate && dueDate !== tomorrowStart
                  ? 'bg-accent/10 text-accent'
                  : 'bg-surface-sunken text-text-tertiary hover:bg-accent/10 hover:text-accent'}`}
              >
                🕐 {dueDate && dueDate !== tomorrowStart
                  ? new Date(dueDate).getMonth() + 1 + '/' + new Date(dueDate).getDate()
                  : '日期'}
              </button>
            }
          />
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={!!repeat}
              onChange={(e) => setRepeat(e.target.checked ? 'daily' : null)}
              className="accent-accent"
            />
            <span className="text-[11px] font-sans text-text-tertiary">每日重复</span>
          </label>
        </div>

        {/* 操作提示 + 按钮 */}
        <div className="flex items-center justify-between pl-7 pt-1">
          <span className="text-[10px] font-sans text-text-quaternary">
            Enter 保存 · Esc 取消
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCancel}
              className="text-[11px] font-sans px-2.5 py-1 rounded-md text-text-secondary hover:bg-surface-sunken transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="text-[11px] font-sans px-2.5 py-1 rounded-md bg-accent text-white hover:bg-accent/90 transition-colors"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/**
 * # TodoInput — 新建待办输入组件
 *
 * 使用 <form> onSubmit 替代手动的 onKeyDown，去除所有 useCallback。
 */

import { useState, useRef, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import type { TodoPriority } from '@/domain/todo'

interface TodoInputProps {
  onCreate: (params: { title: string; description: string; priority: TodoPriority; dueDate: number | null }) => void
}

const PRIORITY_OPTIONS: { value: TodoPriority; color: string }[] = [
  { value: 'high',   color: '#c47a5a' },
  { value: 'medium', color: '#a8986e' },
  { value: 'low',    color: '#8e8e8e' },
]

const PRIORITY_LABELS: Record<TodoPriority, { zh: string; en: string }> = {
  high:   { zh: '高', en: 'High' },
  medium: { zh: '中', en: 'Med' },
  low:    { zh: '低', en: 'Low' },
}

export function TodoInput({ onCreate }: TodoInputProps) {
  const language = useAppSettingsStore((s) => s.settings.language)
    const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const [title, setTitle] = useState('')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [dueDate, setDueDate] = useState('')
  const [description, setDescription] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate({
      title: trimmed,
      description: description.trim(),
      priority,
      dueDate: dueDate ? new Date(dueDate + 'T23:59:59').getTime() : null,
    })
    setTitle('')
    setDescription('')
    setDueDate('')
    setPriority('medium')
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-raised overflow-hidden transition-shadow duration-200 focus-within:shadow-sm">
      {/* ── 第一行：标题 + 优先级 + 截止日期 + 添加按钮 ── */}
      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
        <Plus size={16} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={'新增待办…'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
          autoFocus
        />

        {/* 优先级 */}
        <div className="flex gap-0.5">
          {PRIORITY_OPTIONS.map((opt) => {
            const isActive = priority === opt.value
            const label = PRIORITY_LABELS[opt.value]
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setPriority(opt.value)}
                className={`h-7 px-2 rounded-md text-[11px] font-medium font-sans transition-colors cursor-pointer border ${
                  isActive
                    ? 'border-border-default text-text-primary bg-surface-sunken'
                    : 'border-transparent text-text-tertiary hover:text-text-secondary'
                }`}
                title={t(label.zh, label.en)}
              >
                <span
                  className="inline-block w-2 h-2 rounded-full mr-1 align-middle"
                  style={{ backgroundColor: opt.color }}
                />
                <span className="hidden sm:inline">{t(label.zh, label.en)}</span>
              </button>
            )
          })}
        </div>

        {/* 截止日期 */}
        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="h-7 px-1.5 rounded-md border border-border-subtle bg-transparent font-sans text-[11px] text-text-primary outline-none focus:border-accent w-[120px]"
        />

        <button
          type="submit"
          disabled={!title.trim()}
          className="h-7 px-3 rounded-md text-xs font-medium font-sans bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer border-none"
        >
          {'添加'}
        </button>
      </div>

      {/* ── 第二行：描述（始终可见，紧凑） ── */}
      <div className="border-t border-border-subtle px-4 py-2">
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder={'备注（可选）…'}
          className="w-full bg-transparent border-none outline-none font-sans text-xs text-text-tertiary placeholder:text-text-quaternary"
        />
      </div>
    </form>
  )
}

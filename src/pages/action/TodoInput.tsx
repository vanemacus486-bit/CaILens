/**
 * # TodoInput — 新建待办输入组件
 *
 * 精简版：仅标题 + 添加按钮，无优先级/截止日期/备注，无 autoFocus。
 */

import { useState, useRef, type FormEvent } from 'react'
import { Plus } from 'lucide-react'

interface TodoInputProps {
  onCreate: (title: string) => void
}

export function TodoInput({ onCreate }: TodoInputProps) {
  const [title, setTitle] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate(trimmed)
    setTitle('')
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-raised overflow-hidden transition-shadow duration-200 focus-within:shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5">
        <Plus size={16} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={'新增待办…'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
        />
        <button
          type="submit"
          disabled={!title.trim()}
          className="h-7 px-3 rounded-md text-xs font-medium font-sans bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer border-none"
        >
          {'添加'}
        </button>
      </div>
    </form>
  )
}

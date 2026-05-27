/**
 * # TodoInput — 统一新建待办输入
 *
 * 单次待办和项目待办都在这里创建。
 * 包含：标题 + 分类 + 期限（默认一周）+ 归属项目（可选）
 */

import { useState, useRef, type FormEvent } from 'react'
import { Plus } from 'lucide-react'
import type { CategoryId } from '@/domain/category'

interface TodoInputProps {
  projects: { id: string; name: string; categoryId: CategoryId }[]
  onCreate: (input: {
    title: string
    categoryId: CategoryId | null
    dueDate: number | null
    projectId: string | null
  }) => void
}

// ── 期限快捷选项 ──────────────────────────────────────────

const QUICK_DEADLINES = [
  { label: '今天',   days: 0 },
  { label: '明天',   days: 1 },
  { label: '一周',   days: 7 },
  { label: '一月',   days: 30 },
  { label: '无期限', days: null },
]

const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'accent', name: '主要矛盾' },
  { id: 'sage',   name: '次要矛盾' },
  { id: 'sky',    name: '个人提升' },
  { id: 'sand',   name: '庶务时间' },
  { id: 'rose',   name: '娱乐休息' },
]

// ── 组件 ────────────────────────────────────────────────────

export function TodoInput({ projects, onCreate }: TodoInputProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId | ''>('sand')
  const [deadline, setDeadline] = useState<number | null>(7) // 默认一周
  const [projectId, setProjectId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    const now = Date.now()
    const dueDate = deadline !== null ? now + deadline * 86_400_000 : null

    onCreate({
      title: trimmed,
      categoryId: projectId ? null : (categoryId || null),   // 项目内不用传，继承项目分类
      dueDate,
      projectId: projectId || null,
    })

    setTitle('')
    setProjectId('')
    setDeadline(7)
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-raised overflow-hidden transition-shadow duration-200 focus-within:shadow-sm">
      <div className="flex items-center gap-2 px-4 py-2.5 flex-wrap">
        <Plus size={16} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />

        {/* 标题 */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={'新增待办…'}
          className="flex-1 min-w-[120px] bg-transparent border-none outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
        />

        {/* 分类 */}
        <select
          value={projectId ? '' : categoryId}
          onChange={(e) => setCategoryId(e.target.value as CategoryId)}
          disabled={!!projectId}
          className="h-7 rounded-md border border-border-subtle bg-surface-sunken text-[11px] font-sans text-text-secondary px-2 outline-none cursor-pointer disabled:opacity-40 min-w-[70px]"
          title={projectId ? '项目内待办继承项目分类' : '选择分类'}
        >
          {!projectId && <option value="" disabled>{'分类'}</option>}
          {!projectId && CATEGORIES.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        {/* 期限 */}
        <select
          value={deadline ?? 'null'}
          onChange={(e) => setDeadline(e.target.value === 'null' ? null : Number(e.target.value))}
          className="h-7 rounded-md border border-border-subtle bg-surface-sunken text-[11px] font-sans text-text-secondary px-2 outline-none cursor-pointer min-w-[65px]"
        >
          {QUICK_DEADLINES.map((d) => (
            <option key={d.label} value={d.days !== null ? d.days : 'null'}>
              {d.label}
            </option>
          ))}
        </select>

        {/* 归属项目 */}
        {projects.length > 0 && (
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="h-7 rounded-md border border-border-subtle bg-surface-sunken text-[11px] font-sans text-text-secondary px-2 outline-none cursor-pointer min-w-[70px]"
          >
            <option value="">{'无项目'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        )}

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

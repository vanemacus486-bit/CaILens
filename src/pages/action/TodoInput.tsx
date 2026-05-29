/**
 * # TodoInput — 统一新建待办输入
 *
 * 单次待办和项目待办都在这里创建。
 * 包含：标题 + 分类 + 期限（默认一周）+ 归属项目（可选）
 */

import { useState, useRef, type FormEvent } from 'react'
import { Plus, CalendarDays } from 'lucide-react'
import type { CategoryId } from '@/domain/category'
import { DatePickerPopover } from '@/components/ui/DatePickerPopover'

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
] as const

/** 判断某个绝对时间戳是否匹配预设 days-from-now */
function isPresetMatch(ts: number | null, daysFromNow: number): boolean {
  if (ts === null) return false
  const target = Date.now() + daysFromNow * 86_400_000
  return Math.abs(ts - target) < 43_200_000 // ±12h 容差
}

/** 将天数转为绝对时间戳 */
function daysToTs(days: number): number {
  const d = new Date(Date.now() + days * 86_400_000)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

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
  const [deadline, setDeadline] = useState<number | null>(daysToTs(7)) // 默认一周
  const [projectId, setProjectId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return

    onCreate({
      title: trimmed,
      categoryId: projectId ? null : (categoryId || null),   // 项目内不用传，继承项目分类
      dueDate: deadline,
      projectId: projectId || null,
    })

    setTitle('')
    setProjectId('')
    setDeadline(daysToTs(7))
    inputRef.current?.focus()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-border-default bg-surface-raised overflow-hidden transition-shadow duration-200 focus-within:shadow-sm">
      <div className="flex flex-col gap-2 px-4 py-2">
        {/* 第一行：标题 + 操作 */}
        <div className="flex items-center gap-2">
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

        {/* 第二行：分类 pills + 期限 chips */}
        <div className="flex items-center gap-3 pl-6">
          {/* 分类 pills */}
          <div className="flex items-center gap-1" title={projectId ? '项目内待办继承项目分类' : undefined}>
            {CATEGORIES.map((c) => {
              const isActive = !projectId && categoryId === c.id
              return (
                <button
                  key={c.id}
                  type="button"
                  disabled={!!projectId}
                  onClick={() => setCategoryId(c.id)}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium cursor-pointer border-none transition-all duration-150
                    ${isActive
                      ? 'text-white'
                      : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                    }
                    ${projectId ? 'opacity-30 cursor-not-allowed' : ''}
                  `}
                  style={{
                    backgroundColor: isActive ? `var(--event-${c.id}-fill)` : undefined,
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      backgroundColor: isActive ? '#fff' : `var(--event-${c.id}-fill)`,
                    }}
                  />
                  {c.name}
                </button>
              )
            })}
          </div>

          <span className="w-px h-4 bg-border-subtle flex-shrink-0" />

          {/* 期限 chips */}
          <div className="flex items-center gap-1">
            {QUICK_DEADLINES.map((d) => {
              const isActive = isPresetMatch(deadline, d.days)
              return (
                <button
                  key={d.label}
                  type="button"
                  onClick={() => setDeadline(daysToTs(d.days))}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-sans cursor-pointer border-none transition-all duration-150
                    ${isActive
                      ? 'bg-text-primary text-surface-raised font-medium'
                      : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                    }
                  `}
                >
                  {d.label}
                </button>
              )
            })}

            {/* 无期限 */}
            <button
              type="button"
              onClick={() => setDeadline(null)}
              className={`px-2 py-0.5 rounded-full text-[10px] font-sans cursor-pointer border-none transition-all duration-150
                ${deadline === null
                  ? 'bg-text-primary text-surface-raised font-medium'
                  : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                }
              `}
            >
              无期限
            </button>

            {/* 自定义日期 */}
            <DatePickerPopover
              value={deadline}
              onChange={setDeadline}
              allowClear
              trigger={
                <button
                  type="button"
                  className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-sans cursor-pointer border-none transition-all duration-150
                    ${deadline !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(deadline, d.days))
                      ? 'bg-accent text-white font-medium'
                      : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                    }
                  `}
                >
                  <CalendarDays size={11} strokeWidth={1.75} />
                  {deadline !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(deadline, d.days))
                    ? `${new Date(deadline).getMonth() + 1}/${new Date(deadline).getDate()}`
                    : '自定义'
                  }
                </button>
              }
            />
          </div>
        </div>
      </div>
    </form>
  )
}

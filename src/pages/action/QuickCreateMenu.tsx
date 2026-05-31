/**
 * # QuickCreateMenu — 右键迷你创建面板
 *
 * 右键触发，鼠标位置弹出。极简设计：
 * - 分类用 5 个色点表达（无文字）
 * - 优先级用分类色浓度表达（高/中/低三档色条）
 * - 仅标题输入框有文字
 */

import { useState, useRef, useEffect, useCallback } from 'react'
import { CalendarDays } from 'lucide-react'
import type { CategoryId } from '@/domain/category'
import type { TodoPriority } from '@/domain/todo'
import { DatePickerPopover } from '@/components/ui/DatePickerPopover'

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

const CATEGORY_NAMES: Record<CategoryId, string> = {
  accent: '主要矛盾',
  sage: '次要矛盾',
  sand: '庶务时间',
  sky: '个人提升',
  rose: '娱乐休息',
  stone: '睡眠时长',
}

const PRIORITY_LEVELS: { id: TodoPriority; opacity: number }[] = [
  { id: 'high', opacity: 1 },
  { id: 'medium', opacity: 0.6 },
  { id: 'low', opacity: 0.3 },
]

const QUICK_DEADLINES = [
  { label: '今天', days: 0 },
  { label: '明天', days: 1 },
  { label: '一周', days: 7 },
  { label: '一月', days: 30 },
] as const

function isPresetMatch(ts: number | null, daysFromNow: number): boolean {
  if (ts === null) return false
  const target = Date.now() + daysFromNow * 86_400_000
  return Math.abs(ts - target) < 43_200_000
}

function daysToTs(days: number): number {
  const d = new Date(Date.now() + days * 86_400_000)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

// ── Props ──────────────────────────────────────────────────

interface QuickCreateMenuProps {
  x: number
  y: number
  projects: { id: string; name: string; categoryId: CategoryId }[]
  onCreate: (input: {
    title: string
    categoryId: CategoryId | null
    dueDate: number | null
    projectId: string | null
    priority: TodoPriority
  }) => void
  onClose: () => void
}

// ── 组件 ──────────────────────────────────────────────────

export function QuickCreateMenu({ x, y, projects, onCreate, onClose }: QuickCreateMenuProps) {
  const [title, setTitle] = useState('')
  const [categoryId, setCategoryId] = useState<CategoryId>('sand')
  const [priority, setPriority] = useState<TodoPriority>('medium')
  const [deadline, setDeadline] = useState<number | null>(daysToTs(7))
  const [projectId, setProjectId] = useState<string>('')
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  // 弹框位置修正（防止溢出视口）
  const adjustedX = Math.min(x, window.innerWidth - 280)
  const adjustedY = Math.min(y, window.innerHeight - 320)

  // autoFocus
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [])

  // 点击外部关闭
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }
    // 延迟绑定，避免右键事件本身触发关闭
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClick)
    }, 0)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('mousedown', handleClick)
    }
  }, [onClose])

  // Esc 关闭
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [onClose])

  const handleCreate = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    onCreate({
      title: trimmed,
      categoryId: projectId ? null : categoryId,
      dueDate: deadline,
      projectId: projectId || null,
      priority,
    })
  }, [title, categoryId, deadline, projectId, priority, onCreate])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleCreate()
    }
  }, [handleCreate])

  const categoryFill = `var(--event-${categoryId}-fill)`

  return (
    <div
      className="fixed inset-0 z-50"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={menuRef}
        className="absolute rounded-xl border border-border-subtle bg-surface-raised p-4 w-72 shadow-dialog animate-scale-up"
        style={{ left: adjustedX, top: adjustedY }}
      >
        {/* ── 标题输入 ── */}
        <input
          ref={inputRef}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入待办标题…"
          className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2.5 outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary transition-shadow focus:shadow-sm mb-3"
        />

        {/* ── 分类色点 + 优先级色条（同一行） ── */}
        <div className="flex items-center justify-between mb-3">
          {/* 分类色点 */}
          <div className="flex items-center gap-1.5">
            {CATEGORY_IDS.map((cid) => {
              const isActive = categoryId === cid
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setCategoryId(cid)}
                  className="w-5 h-5 rounded-full cursor-pointer border-none transition-all duration-150 flex items-center justify-center"
                  style={{
                    backgroundColor: `var(--event-${cid}-fill)`,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: isActive ? `0 0 0 2px var(--surface-raised), 0 0 0 3.5px var(--event-${cid}-fill)` : 'none',
                  }}
                  title={CATEGORY_NAMES[cid]}
                />
              )
            })}
          </div>

          {/* 优先级色条：3 档，分类色×浓度 */}
          <div className="flex items-center gap-0.5">
            {PRIORITY_LEVELS.map((level) => {
              const isActive = priority === level.id
              return (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setPriority(level.id)}
                  className="h-3 rounded-full cursor-pointer border-none transition-all duration-150"
                  style={{
                    backgroundColor: categoryFill,
                    opacity: level.opacity,
                    width: isActive ? 20 : 10,
                  }}
                  title={level.id === 'high' ? '高优先' : level.id === 'medium' ? '中优先' : '低优先'}
                />
              )
            })}
          </div>
        </div>

        {/* ── 期限快捷选项 + 归属项目 ── */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_DEADLINES.map((d) => {
            const isActive = isPresetMatch(deadline, d.days)
            return (
              <button
                key={d.label}
                type="button"
                onClick={() => setDeadline(daysToTs(d.days))}
                className={`px-2 py-1 rounded-md text-[10px] font-sans cursor-pointer border-none transition-all duration-150 ${
                  isActive
                    ? 'bg-text-primary text-surface-raised font-medium'
                    : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                }`}
              >
                {d.label}
              </button>
            )
          })}

          <button
            type="button"
            onClick={() => setDeadline(null)}
            className={`px-2 py-1 rounded-md text-[10px] font-sans cursor-pointer border-none transition-all duration-150 ${
              deadline === null
                ? 'bg-text-primary text-surface-raised font-medium'
                : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
            }`}
          >
            无
          </button>

          <DatePickerPopover
            value={deadline}
            onChange={setDeadline}
            allowClear
            trigger={
              <button
                type="button"
                className={`flex items-center gap-0.5 px-2 py-1 rounded-md text-[10px] font-sans cursor-pointer border-none transition-all duration-150 ${
                  deadline !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(deadline, d.days))
                    ? 'bg-accent text-white font-medium'
                    : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                }`}
              >
                <CalendarDays size={10} strokeWidth={1.75} />
                {deadline !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(deadline, d.days))
                  ? `${new Date(deadline).getMonth() + 1}/${new Date(deadline).getDate()}`
                  : '日'}
              </button>
            }
          />

          {/* 归属项目 */}
          {projects.length > 0 && (
            <span className="ml-auto">
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="h-6 rounded-md border border-border-subtle bg-surface-sunken text-[10px] font-sans text-text-secondary px-1.5 outline-none cursor-pointer"
              >
                <option value="">无项目</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

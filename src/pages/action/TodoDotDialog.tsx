/**
 * # TodoDotDialog — 待办圆点编辑弹框
 *
 * 点击 QuadrantChart 中的圆点后弹出。
 * 可编辑标题/分类/期限/归属项目，标记完成或删除。
 */

import { useState, useEffect } from 'react'
import { Circle, CheckCircle2, Trash2, Save, X } from 'lucide-react'
import type { CategoryId } from '@/domain/category'
import type { TodoDotPosition } from '@/domain/quadrant'
import { catIdToName } from '@/domain/quadrant'

interface TodoDotDialogProps {
  position: TodoDotPosition
  projects: { id: string; name: string; categoryId: CategoryId }[]
  onSave: (updates: {
    title?: string
    categoryId?: string | null
    dueDate?: number | null
    projectId?: string | null
  }) => void
  onToggleDone: (id: string) => void
  onDelete: (id: string) => void
  onClose: () => void
}

const CATEGORIES: { id: CategoryId; name: string }[] = [
  { id: 'accent', name: '主要矛盾' },
  { id: 'sage',   name: '次要矛盾' },
  { id: 'sky',    name: '个人提升' },
  { id: 'sand',   name: '庶务时间' },
  { id: 'rose',   name: '娱乐休息' },
]

const QUICK_DEADLINES = [
  { label: '今天',   days: 0 },
  { label: '明天',   days: 1 },
  { label: '一周',   days: 7 },
  { label: '一月',   days: 30 },
  { label: '无期限', days: null },
]

export function TodoDotDialog({
  position,
  projects,
  onSave,
  onToggleDone,
  onDelete,
  onClose,
}: TodoDotDialogProps) {
  const [title, setTitle] = useState(position.title)
  const [categoryId, setCategoryId] = useState(position.categoryId)
  const [projectId, setProjectId] = useState(position.projectId ?? '')
  const [currentDueDate, setCurrentDueDate] = useState<number | null>(position.dueDate ?? null)

  // 切换 position 时同步所有字段
  useEffect(() => {
    setTitle(position.title)
    setCategoryId(position.categoryId)
    setProjectId(position.projectId ?? '')
    setCurrentDueDate(position.dueDate ?? null)
  }, [position])

  const isDone = position.status === 'done'

  /** 将截止日期时间戳映射到最近的下拉预设值。不匹配时返回 null（自定义）。 */
  function dueDateToPresetValue(dueDate: number | null): string {
    if (dueDate === null) return 'null'
    const diffDays = Math.round((dueDate - Date.now()) / 86_400_000)
    if (diffDays === 0) return '0'
    if (diffDays === 1) return '1'
    if (Math.abs(diffDays - 7) <= 1) return '7'
    if (Math.abs(diffDays - 30) <= 3) return '30'
    return 'custom'
  }

  /** 根据截止日期返回显示文本 */
  function dueDateLabel(dueDate: number | null): string {
    if (dueDate === null) return '无期限'
    const diffDays = Math.round((dueDate - Date.now()) / 86_400_000)
    if (diffDays === 0) return '今天'
    if (diffDays === 1) return '明天'
    if (Math.abs(diffDays - 7) <= 1) return '一周'
    if (Math.abs(diffDays - 30) <= 3) return '一月'
    // 自定义日期 — 显示具体日期
    const d = new Date(dueDate)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }

  function handleDeadlineChange(value: string) {
    if (value === 'null') {
      setCurrentDueDate(null)
    } else if (value === 'custom') {
      return // 不变
    } else {
      const days = Number(value)
      const now = Date.now()
      setCurrentDueDate(now + days * 86_400_000)
    }
  }

  function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return

    onSave({
      title: trimmed,
      categoryId: projectId ? null : (categoryId || undefined),
      dueDate: currentDueDate,
      projectId: projectId || null,
    })
    onClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20" onClick={onClose}>
      <div
        className="rounded-xl border border-border-subtle bg-surface-raised p-5 w-80 shadow-xl space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-medium text-text-primary">编辑待办</h3>
          <button
            onClick={onClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* 标题 */}
        <div>
          <label className="font-sans text-[11px] text-text-tertiary mb-1 block">标题</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
            className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2 outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
          />
        </div>

        {/* 分类 */}
        <div>
          <label className="font-sans text-[11px] text-text-tertiary mb-1 block">分类</label>
          <select
            value={projectId ? '' : categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            disabled={!!projectId}
            className="w-full h-8 rounded-lg border border-border-subtle bg-surface-sunken text-xs font-sans text-text-secondary px-3 outline-none cursor-pointer disabled:opacity-40"
            title={projectId ? '项目内待办继承项目分类' : ''}
          >
            {!projectId && CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
          {projectId && (
            <p className="font-sans text-[10px] text-text-quaternary mt-1">
              归属 {catIdToName(categoryId)}（继承自项目）
            </p>
          )}
        </div>

        {/* 期限 */}
        <div>
          <label className="font-sans text-[11px] text-text-tertiary mb-1 block">期限</label>
          <select
            value={dueDateToPresetValue(currentDueDate)}
            onChange={(e) => handleDeadlineChange(e.target.value)}
            className="w-full h-8 rounded-lg border border-border-subtle bg-surface-sunken text-xs font-sans text-text-secondary px-3 outline-none cursor-pointer"
          >
            {QUICK_DEADLINES.map((d) => (
              <option key={d.label} value={d.days !== null ? d.days : 'null'}>
                {d.label}
              </option>
            ))}
            {dueDateToPresetValue(currentDueDate) === 'custom' && (
              <option value="custom">{dueDateLabel(currentDueDate)}</option>
            )}
          </select>
        </div>

        {/* 归属项目 */}
        <div>
          <label className="font-sans text-[11px] text-text-tertiary mb-1 block">归属项目</label>
          <select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full h-8 rounded-lg border border-border-subtle bg-surface-sunken text-xs font-sans text-text-secondary px-3 outline-none cursor-pointer"
          >
            <option value="">{'无项目（独立待办）'}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => { onToggleDone(position.todoId); onClose() }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-sans font-medium bg-surface-sunken text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer border border-border-subtle"
          >
            {isDone ? (
              <Circle size={13} strokeWidth={1.75} />
            ) : (
              <CheckCircle2 size={13} strokeWidth={1.75} className="text-accent" />
            )}
            {isDone ? '标记未完成' : '标记完成'}
          </button>

          <button
            onClick={() => { onDelete(position.todoId); onClose() }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-sans font-medium text-[#B53535] hover:bg-[#B53535]/10 transition-colors cursor-pointer border border-[#B53535]/20 bg-transparent"
          >
            <Trash2 size={13} strokeWidth={1.75} />
            删除
          </button>

          <div className="flex-1" />

          <button
            onClick={onClose}
            className="h-8 px-3 rounded-lg text-xs font-sans text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            取消
          </button>

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 h-8 px-4 rounded-lg text-xs font-sans font-medium bg-accent text-white hover:opacity-90 transition-opacity cursor-pointer border-none"
          >
            <Save size={13} strokeWidth={1.75} />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * # TodoDotDialog — 待办圆点编辑弹框
 *
 * 点击 QuadrantChart 中的圆点后弹出。
 * 可编辑标题/分类/期限/归属项目，标记完成或删除。
 */

import { useState, useEffect, useCallback } from 'react'
import { Circle, CheckCircle2, Trash2, Save, X, CalendarDays } from 'lucide-react'
import type { CategoryId } from '@/domain/category'
import type { TodoDotPosition } from '@/domain/quadrant'
import { catIdToName } from '@/domain/quadrant'
import { DatePickerPopover } from '@/components/ui/DatePickerPopover'

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
] as const

/** 判断某个绝对时间戳是否匹配预设 days-from-now（±12h 容差） */
function isPresetMatch(ts: number | null, daysFromNow: number): boolean {
  if (ts === null) return false
  const target = Date.now() + daysFromNow * 86_400_000
  return Math.abs(ts - target) < 43_200_000
}

/** 将天数转为绝对时间戳（当天 0 点） */
function daysToTs(days: number): number {
  const d = new Date(Date.now() + days * 86_400_000)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

export function TodoDotDialog({
  position,
  projects,
  onSave,
  onToggleDone,
  onDelete,
  onClose,
}: TodoDotDialogProps) {
  const [title, setTitle] = useState(position.title)
  // 项目子待办继承分类时用 __inherit__ 标记
  const [categoryId, setCategoryId] = useState(
    position.isCategoryInherited ? '__inherit__' : position.categoryId,
  )
  const [projectId, setProjectId] = useState(position.projectId ?? '')
  const [currentDueDate, setCurrentDueDate] = useState<number | null>(position.dueDate ?? null)
  const [closing, setClosing] = useState(false)

  /** 带退出动画的关闭 */
  const animateClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose(), 160)
  }, [onClose])

  // 切换 position 时同步所有字段
  useEffect(() => {
    setTitle(position.title)
    setCategoryId(position.isCategoryInherited ? '__inherit__' : position.categoryId)
    setProjectId(position.projectId ?? '')
    setCurrentDueDate(position.dueDate ?? null)
  }, [position])

  const isDone = position.status === 'done'



  function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return

    onSave({
      title: trimmed,
      categoryId: categoryId === '__inherit__' ? null : (categoryId || null),
      dueDate: currentDueDate,
      projectId: projectId || null,
    })
    animateClose()
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    }
    if (e.key === 'Escape') animateClose()
  }

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/20 ${closing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
      onClick={animateClose}
    >
      <div
        className="rounded-xl border border-border-subtle bg-surface-raised p-6 w-88 shadow-dialog space-y-5"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: closing ? 'fadeOut 160ms ease-out' : 'dialog-enter 200ms ease-out' }}
      >
        <style>{`
          @keyframes dialog-enter {
            from { opacity: 0; transform: scale(0.95) translateY(4px); }
            to   { opacity: 1; transform: scale(1) translateY(0); }
          }
          @keyframes fadeOut {
            from { opacity: 1; }
            to   { opacity: 0; }
          }
          .animate-fadeOut {
            animation: fadeOut 160ms ease-out;
          }
        `}</style>

        {/* 头部 */}
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-medium text-text-primary">编辑待办</h3>
          <button
            onClick={animateClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* 表单区域 grid 两列 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 标题 — 占满两列 */}
          <div className="col-span-2">
            <label className="font-sans text-[11px] text-text-tertiary mb-1.5 block tracking-wide">标题</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2.5 outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary transition-shadow focus:shadow-sm"
            />
          </div>

          {/* 分类 */}
          <div>
            <label className="font-sans text-[11px] text-text-tertiary mb-1.5 block tracking-wide">分类</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full h-9 rounded-lg border border-border-subtle bg-surface-sunken text-xs font-sans text-text-secondary px-3 outline-none cursor-pointer"
            >
              {projectId && (
                <option value="__inherit__">
                  {'继承自项目（'}{catIdToName(position.categoryId)}{'）'}
                </option>
              )}
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* 期限 */}
          <div>
            <label className="font-sans text-[11px] text-text-tertiary mb-1.5 block tracking-wide">期限</label>
            <div className="flex flex-wrap items-center gap-1">
              {QUICK_DEADLINES.map((d) => {
                const isActive = isPresetMatch(currentDueDate, d.days)
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => setCurrentDueDate(daysToTs(d.days))}
                    className={`px-2 py-1 rounded-md text-[10px] font-sans cursor-pointer border-none transition-all duration-150
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
                onClick={() => setCurrentDueDate(null)}
                className={`px-2 py-1 rounded-md text-[10px] font-sans cursor-pointer border-none transition-all duration-150
                  ${currentDueDate === null
                    ? 'bg-text-primary text-surface-raised font-medium'
                    : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                  }
                `}
              >
                无期限
              </button>

              {/* 自定义日期 */}
              <DatePickerPopover
                value={currentDueDate}
                onChange={setCurrentDueDate}
                allowClear
                trigger={
                  <button
                    type="button"
                    className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-sans cursor-pointer border-none transition-all duration-150
                      ${currentDueDate !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(currentDueDate, d.days))
                        ? 'bg-accent text-white font-medium'
                        : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                      }
                    `}
                  >
                    <CalendarDays size={11} strokeWidth={1.75} />
                    {currentDueDate !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(currentDueDate, d.days))
                      ? `${new Date(currentDueDate).getMonth() + 1}/${new Date(currentDueDate).getDate()}`
                      : '自定义'
                    }
                  </button>
                }
              />
            </div>
          </div>

          {/* 归属项目 — 占满两列 */}
          <div className="col-span-2">
            <label className="font-sans text-[11px] text-text-tertiary mb-1.5 block tracking-wide">归属项目</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full h-9 rounded-lg border border-border-subtle bg-surface-sunken text-xs font-sans text-text-secondary px-3 outline-none cursor-pointer"
            >
              <option value="">{'无项目（独立待办）'}</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center gap-2 pt-1 flex-wrap">
          <button
            onClick={animateClose}
            className="h-8 px-2 rounded-lg text-xs font-sans text-text-quaternary hover:text-text-secondary transition-colors cursor-pointer border-none bg-transparent order-first"
          >
            取消
          </button>

          <button
            onClick={() => { onToggleDone(position.todoId); animateClose() }}
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
            onClick={() => { onDelete(position.todoId); animateClose() }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-sans font-medium text-[#B53535] hover:bg-[#B53535]/10 transition-colors cursor-pointer border border-[#B53535]/20 bg-transparent"
          >
            <Trash2 size={13} strokeWidth={1.75} />
            删除
          </button>

          <div className="flex-1" />

          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 h-9 px-5 rounded-full text-xs font-sans font-semibold bg-accent text-white hover:opacity-90 transition-all duration-200 cursor-pointer border-none shadow-sm"
          >
            <Save size={13} strokeWidth={1.75} />
            保存
          </button>
        </div>
      </div>
    </div>
  )
}

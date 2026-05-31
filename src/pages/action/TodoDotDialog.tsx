/**
 * # TodoDotDialog — 待办编辑弹框
 *
 * 点击优先级矩阵中的卡片后弹出。
 * 可编辑标题/分类/优先级/归属项目，标记完成或删除。
 *
 * 不再包含期限相关字段。
 */

import { useState, useEffect, useCallback } from 'react'
import { CheckCircle2, Trash2, Save, X } from 'lucide-react'
import type { CategoryId } from '@/domain/category'
import type { TodoPriority } from '@/domain/todo'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'

// ── 常量 ──────────────────────────────────────────────────

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

const CATEGORY_NAMES: Record<CategoryId, string> = {
  accent: '主要矛盾',
  sage: '次要矛盾',
  sky: '个人提升',
  sand: '庶务时间',
  rose: '娱乐休息',
  stone: '睡眠时长',
}

const PRIORITY_LEVELS: { id: TodoPriority; opacity: number }[] = [
  { id: 'high', opacity: 1 },
  { id: 'medium', opacity: 0.6 },
  { id: 'low', opacity: 0.3 },
]

// ── Props ──────────────────────────────────────────────────

interface TodoDotDialogProps {
  todoId: string
  projects: { id: string; name: string; categoryId: CategoryId }[]
  onClose: () => void
}

// ── 组件 ──────────────────────────────────────────────────

export function TodoDotDialog({
  todoId,
  projects,
  onClose,
}: TodoDotDialogProps) {
  const { todos, updateTodo, toggleComplete, deleteTodo } = useTodoStore()
  const { projects: allProjects } = useProjectStore()

  const todo = todos.find((t) => t.id === todoId)

  const [title, setTitle] = useState(todo?.title ?? '')
  const [categoryId, setCategoryId] = useState<string>(todo?.categoryId ?? '')
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? 'medium')
  const [projectId, setProjectId] = useState(todo?.projectId ?? '')
  const [closing, setClosing] = useState(false)

  const animateClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => onClose(), 160)
  }, [onClose])

  useEffect(() => {
    if (!todo) return
    setTitle(todo.title)
    setCategoryId(todo.categoryId ?? '')
    setPriority(todo.priority)
    setProjectId(todo.projectId ?? '')
  }, [todo])

  useEffect(() => {
    if (!todos.find((t) => t.id === todoId)) {
      animateClose()
    }
  }, [todos, todoId, animateClose])

  if (!todo) return null

  const currentTodoId = todo.id
  const isDone = todo.status === 'done'

  const effectiveCatId = (categoryId as CategoryId) || (() => {
    if (projectId) {
      const proj = allProjects.find((p) => p.id === projectId)
      return proj?.categoryId ?? ''
    }
    return ''
  })()
  const catColor = effectiveCatId ? `var(--event-${effectiveCatId}-fill)` : 'var(--text-quaternary)'

  function handleSave() {
    const trimmed = title.trim()
    if (!trimmed) return
    updateTodo({
      id: currentTodoId,
      title: trimmed,
      categoryId: categoryId || null,
      priority,
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
        className="rounded-xl border border-border-subtle bg-surface-raised p-5 w-88 shadow-dialog space-y-4"
        onClick={(e) => e.stopPropagation()}
        style={{
          animation: closing
            ? 'fadeOut 160ms ease-out'
            : 'dialog-enter 200ms ease-out',
        }}
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

        {/* ── 头部 ── */}
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-sm font-medium text-text-primary">
            编辑待办
          </h3>
          <button
            onClick={animateClose}
            className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors cursor-pointer border-none bg-transparent"
          >
            <X size={14} strokeWidth={1.75} />
          </button>
        </div>

        {/* ── 标题 ── */}
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
          placeholder="待办标题"
          className="w-full bg-surface-sunken border border-border-subtle rounded-lg px-3 py-2.5 outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary transition-shadow focus:shadow-sm focus:border-accent/50"
        />

        {/* ── 分类（色点）+ 优先级（色条）同一行 ── */}
        <div className="flex items-center justify-between">
          {/* 分类色点 */}
          <div className="flex items-center gap-1.5">
            {CATEGORY_IDS.map((cid) => {
              const isActive = effectiveCatId === cid
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setCategoryId(cid)}
                  className="w-5 h-5 rounded-full cursor-pointer border-none transition-all duration-150 flex items-center justify-center"
                  style={{
                    backgroundColor: `var(--event-${cid}-fill)`,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: isActive
                      ? `0 0 0 2px var(--surface-raised), 0 0 0 3.5px var(--event-${cid}-fill)`
                      : 'none',
                  }}
                  title={CATEGORY_NAMES[cid]}
                />
              )
            })}
          </div>

          {/* 优先级色条 */}
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
                    backgroundColor: catColor,
                    opacity: level.opacity,
                    width: isActive ? 20 : 10,
                  }}
                  title={level.id === 'high' ? '高优先' : level.id === 'medium' ? '中优先' : '低优先'}
                />
              )
            })}
          </div>
        </div>

        {/* ── 归属项目 ── */}
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

        {/* ── 操作按钮 ── */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => { toggleComplete(currentTodoId); animateClose() }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-xs font-sans font-medium bg-surface-sunken text-text-secondary hover:text-text-primary hover:bg-surface-raised transition-colors cursor-pointer border border-border-subtle"
          >
            <CheckCircle2 size={13} strokeWidth={1.75} className={isDone ? '' : 'text-accent'} />
            {isDone ? '标记未完成' : '标记完成'}
          </button>

          <button
            onClick={() => { deleteTodo(currentTodoId); animateClose() }}
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

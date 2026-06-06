/**
 * # TodoDetailCard — 待办详情浮卡
 *
 * 点击优先级矩阵中的卡片后，弹出锚定在卡片旁的 Popover 浮卡。
 * 仿照 EventDetailCard 风格：分类色边 + 标题 + 元信息 + 操作按钮。
 * 支持编辑标题/分类/优先级/归属项目，标记完成或删除。
 */

import { useRef, useState, useEffect, useCallback } from 'react'
import { Pencil, Trash2, CheckCircle2 } from 'lucide-react'
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import type { CategoryId } from '@/domain/category'
import type { TodoPriority } from '@/domain/todo'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'

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

const PRIORITY_LABELS: Record<TodoPriority, string> = {
  high: '高优先',
  medium: '中优先',
  low: '低优先',
}

// ── Props ──────────────────────────────────────────────────

interface TodoDetailCardProps {
  todoId: string
  anchorEl: HTMLElement
  onClose: () => void
}

// ── 组件 ──────────────────────────────────────────────────

export function TodoDetailCard({ todoId, anchorEl, onClose }: TodoDetailCardProps) {
  const { todos, updateTodo, toggleComplete, deleteTodo } = useTodoStore()
  const { projects: allProjects } = useProjectStore()

  const todo = todos.find((t) => t.id === todoId)

  // 本地编辑状态
  const [title, setTitle] = useState(todo?.title ?? '')
  const [categoryId, setCategoryId] = useState(todo?.categoryId ?? '')
  const [priority, setPriority] = useState<TodoPriority>(todo?.priority ?? 'medium')
  const [projectId, setProjectId] = useState(todo?.projectId ?? '')
  const [showConfirm, setShowConfirm] = useState(false)

  // 同步 todo 变化
  useEffect(() => {
    if (!todo) return
    setTitle(todo.title)
    setCategoryId(todo.categoryId ?? '')
    setPriority(todo.priority)
    setProjectId(todo.projectId ?? '')
  }, [todo])

  // todo 被删除时自动关闭
  useEffect(() => {
    if (!todos.find((t) => t.id === todoId)) {
      onClose()
    }
  }, [todos, todoId, onClose])

  if (!todo) return null

  const effectiveCatId = (categoryId as CategoryId) || (() => {
    if (projectId) {
      const proj = allProjects.find((p) => p.id === projectId)
      return proj?.categoryId ?? ''
    }
    return ''
  })()
  const catColor = effectiveCatId ? `var(--event-${effectiveCatId}-fill)` : 'var(--text-quaternary)'
  const catBg = effectiveCatId ? `var(--event-${effectiveCatId}-bg)` : 'var(--surface-sunken)'

  const virtualRef = useRef<HTMLElement>(null!)
  virtualRef.current = anchorEl

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSave = useCallback(() => {
    const trimmed = title.trim()
    if (!trimmed) return
    updateTodo({
      id: todo.id,
      title: trimmed,
      categoryId: (categoryId as CategoryId) || null,
      priority,
      projectId: projectId || null,
    })
    onClose()
  }, [title, categoryId, priority, projectId, todo.id, updateTodo, onClose])

  const handleToggleComplete = useCallback(() => {
    toggleComplete(todo.id)
    onClose()
  }, [todo.id, toggleComplete, onClose])

  const handleDelete = useCallback(() => {
    deleteTodo(todo.id)
    onClose()
  }, [todo.id, deleteTodo, onClose])

  const isDone = todo.status === 'done'

  return (
    <>
      <Popover open onOpenChange={(open: boolean) => { if (!open) handleClose() }}>
        <PopoverAnchor virtualRef={virtualRef} />

        <PopoverContent
          side="right"
          className="w-72 p-0 max-md:!w-[calc(100vw-1rem)] max-md:max-w-72 overflow-hidden"
          onPointerDownOutside={handleClose}
          onEscapeKeyDown={handleClose}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex">
            {/* 分类色边 */}
            <div
              className="w-1 flex-shrink-0"
              style={{ backgroundColor: catColor }}
            />

            <div className="flex-1 p-4 flex flex-col gap-3">
              {/* 标题编辑 */}
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSave() }
                  if (e.key === 'Escape') handleClose()
                }}
                autoFocus
                placeholder="待办标题"
                className="w-full bg-transparent border border-border-subtle rounded-lg px-3 py-2 text-sm font-sans text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent/50 focus:shadow-sm transition-shadow"
              />

              {/* 分类 + 优先级 */}
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
                        className="w-4 h-4 rounded-full cursor-pointer border-none transition-all duration-150 flex items-center justify-center"
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

                {/* 优先级 */}
                <span
                  className="font-sans text-[10px] font-medium px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: catBg,
                    color: catColor,
                  }}
                >
                  {PRIORITY_LABELS[priority]}
                </span>
              </div>

              {/* 归属项目 */}
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full h-8 rounded-lg border border-border-subtle bg-surface-sunken text-xs font-sans text-text-secondary px-2 outline-none cursor-pointer"
              >
                <option value="">无项目（独立待办）</option>
                {allProjects.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </select>

              {/* 操作按钮 */}
              <div className="flex items-center justify-between pt-1">
                <Button
                  variant="ghost" size="sm"
                  onClick={handleToggleComplete}
                  className={`gap-1.5 px-2 h-8 text-xs ${isDone ? 'text-text-secondary' : 'text-accent'}`}
                >
                  <CheckCircle2 size={13} strokeWidth={1.75} />
                  {isDone ? '标记未完成' : '标记完成'}
                </Button>

                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowConfirm(true)}
                  className="text-color-text-danger hover:bg-surface-sunken gap-1.5 px-2 h-8"
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                  删除
                </Button>

                <Button variant="default" size="sm" onClick={handleSave} className="h-8 gap-1.5">
                  <Pencil size={13} strokeWidth={1.75} />
                  保存
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* 删除确认 */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>删除待办？</AlertDialogTitle>
            <AlertDialogDescription>
              "{title}" 将被永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>取消</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-color-text-danger text-white">
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

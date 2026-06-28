/**
 * # PlanningPage — 多清单待办管理器
 *
 * Google Tasks 风格布局，CaILens 暖色皮肤。
 * 所有视图（filter=all）：多列看板，每清单一列，横向滚动。
 * 已加星标（filter=starred）：跨清单单列汇总。
 */

import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTodoStore } from '@/stores/todoStore'
import { useTodoListStore } from '@/stores/todoListStore'
import type { Todo } from '@/domain/todo'
import { ListHeader, type SortMode } from './ListHeader'
import { AddTaskComposer, AddTaskTrigger } from './AddTaskComposer'
import { TaskRow } from './TaskRow'
import { CompletedSection } from './CompletedSection'
import { EmptyState } from './EmptyState'
import { TodoListColumn } from './TodoListColumn'
import { ArchivePanel } from './ArchivePanel'

function sortTodos(todos: Todo[], sortMode: SortMode, now: number): { active: Todo[]; done: Todo[] } {
  const active: Todo[] = []
  const done: Todo[] = []
  for (const t of todos) {
    if (t.status === 'done') done.push(t)
    else active.push(t)
  }
  if (sortMode === 'dueDate') {
    active.sort((a, b) => {
      const aOverdue = a.dueDate !== null && a.dueDate < now ? 1 : 0
      const bOverdue = b.dueDate !== null && b.dueDate < now ? 1 : 0
      if (aOverdue !== bOverdue) return bOverdue - aOverdue
      if (a.dueDate !== null && b.dueDate !== null) return a.dueDate - b.dueDate
      if (a.dueDate !== null) return -1
      if (b.dueDate !== null) return 1
      return a.sortOrder - b.sortOrder
    })
  } else {
    active.sort((a, b) => a.sortOrder - b.sortOrder)
  }
  done.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
  return { active, done }
}

export function PlanningPage() {
  const todos = useTodoStore((s) => s.todos)
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const reorderTodo = useTodoStore((s) => s.reorderTodo)

  const lists = useTodoListStore((s) => s.lists)
  const visibleListIds = useTodoListStore((s) => s.visibleListIds)
  const renameList = useTodoListStore((s) => s.renameList)

  const [searchParams] = useSearchParams()
  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerFocusNonce, setComposerFocusNonce] = useState(0)
  const filterMode = (searchParams.get('filter') as 'all' | 'starred' | 'archive' | null) ?? 'all'
  const now = useMemo(() => Date.now(), [])

  // Unconditional hook: visible lists for kanban (used below conditional returns)
  const visibleLists = useMemo(
    () => lists.filter((l) => visibleListIds.includes(l.id)).sort((a, b) => a.sortOrder - b.sortOrder),
    [lists, visibleListIds],
  )

  // ── 归档视图（所有 hook 之后方可 early return）──
  if (filterMode === 'archive') {
    return <ArchivePanel />
  }

  // ── 已加星标视图（跨清单单列） ──
  if (filterMode === 'starred') {
    const starredTodos = todos.filter((t) => t.isStarred)
    const { active, done } = sortTodos(starredTodos, sortMode, now)
    const showEmpty = active.length === 0 && done.length === 0

    return (
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[680px] w-full px-4 py-6">
            <div className="bg-surface-raised rounded-2xl border border-border-subtle shadow-lg overflow-hidden">
              <ListHeader
                activeList={lists[0]}
                allLists={lists}
                sortMode={sortMode}
                filterMode="starred"
                onSortModeChange={setSortMode}
                onSelectList={() => {}}
                onCreateList={() => {}}
                onRenameList={renameList}
                onDeleteList={() => {}}
                onClearCompleted={() => {}}
              />
              <AddTaskTrigger onClick={() => { setComposerOpen(true); setComposerFocusNonce((n) => n + 1) }} />
              {showEmpty && !composerOpen && <EmptyState variant="starred" />}
              {active.length > 0 && (
                <div className="py-1">
                  {active.map((todo) => (
                    <TaskRow
                      key={todo.id}
                      todo={todo}
                      now={now}
                      sortMode={sortMode}
                      onReorder={(draggedId, targetId, pos) => reorderTodo(draggedId, targetId, pos)}
                      onToggle={toggleComplete}
                      onUpdate={(id, patch) => updateTodo({ id, ...patch })}
                      onDelete={deleteTodo}
                    />
                  ))}
                </div>
              )}
              <AddTaskComposer open={composerOpen} onOpenChange={setComposerOpen} onSave={async (fields) => {
                await createTodo({
                  title: fields.title,
                  description: fields.description ?? '',
                  listId: 'default',
                  dueDate: fields.dueDate ?? null,
                  repeatPattern: fields.repeatPattern ?? null,
                  priority: 'medium',
                })
              }} focusNonce={composerFocusNonce} />
              <CompletedSection todos={done} onToggle={toggleComplete} />
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 多列看板（所有任务） ──
  if (visibleLists.length === 0) {
    return (
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[400px] w-full px-4 py-6">
            <EmptyState variant="all" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 h-full overflow-hidden flex flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="flex gap-4 p-4 md:p-6 justify-center items-start">
          {visibleLists.map((list) => (
            <TodoListColumn
              key={list.id}
              listId={list.id}
              now={now}
            />
          ))}
        </div>

      </div>
    </div>
  )
}

/**
 * # TodoListColumn — 看板单列
 *
 * 一列 = ListHeader(simplified) + AddTaskTrigger + TaskRow 列表 + AddTaskComposer + CompletedSection。
 * 所有数据按 listId 作用域。
 */

import { useState, useMemo, useCallback } from 'react'
import { useTodoStore } from '@/stores/todoStore'
import { useTodoListStore } from '@/stores/todoListStore'
import type { Todo } from '@/domain/todo'
import { ListHeader, type SortMode } from './ListHeader'
import { AddTaskComposer, AddTaskTrigger } from './AddTaskComposer'
import { TaskRow } from './TaskRow'
import { CompletedSection } from './CompletedSection'

interface TodoListColumnProps {
  listId: string
  now: number
}

export function TodoListColumn({ listId, now }: TodoListColumnProps) {
  const todos = useTodoStore((s) => s.todos)
  const createTodo = useTodoStore((s) => s.createTodo)
  const updateTodo = useTodoStore((s) => s.updateTodo)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)
  const toggleComplete = useTodoStore((s) => s.toggleComplete)
  const reorderTodo = useTodoStore((s) => s.reorderTodo)

  const lists = useTodoListStore((s) => s.lists)
  const renameList = useTodoListStore((s) => s.renameList)
  const deleteListStore = useTodoListStore((s) => s.deleteList)
  const clearCompleted = useTodoListStore((s) => s.clearCompleted)

  const [sortMode, setSortMode] = useState<SortMode>('manual')
  const [composerOpen, setComposerOpen] = useState(false)
  const [composerFocusNonce, setComposerFocusNonce] = useState(0)
  const openComposer = useCallback(() => {
    setComposerOpen(true)
    setComposerFocusNonce((n) => n + 1)
  }, [])

  const list = useMemo(() => lists.find((l) => l.id === listId), [lists, listId])

  // Filter todos by this list
  const listTodos = useMemo(
    () => todos.filter((t) => t.listId === listId),
    [todos, listId],
  )

  // Sort and split active/done
  const { activeTodos, doneTodos } = useMemo(() => {
    const active: Todo[] = []
    const done: Todo[] = []
    for (const t of listTodos) {
      if (t.status === 'done') {
        done.push(t)
      } else {
        active.push(t)
      }
    }

    if (sortMode === 'dueDate') {
      active.sort((a, b) => {
        // Overdue first
        const aOverdue = a.dueDate !== null && a.dueDate < now ? 1 : 0
        const bOverdue = b.dueDate !== null && b.dueDate < now ? 1 : 0
        if (aOverdue !== bOverdue) return bOverdue - aOverdue
        // Then by dueDate ascending (null last)
        if (a.dueDate !== null && b.dueDate !== null) return a.dueDate - b.dueDate
        if (a.dueDate !== null) return -1
        if (b.dueDate !== null) return 1
        // Then by sortOrder
        return a.sortOrder - b.sortOrder
      })
    } else {
      // Manual sort
      active.sort((a, b) => a.sortOrder - b.sortOrder)
    }

    done.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    return { activeTodos: active, doneTodos: done }
  }, [listTodos, sortMode, now])

  const handleAddTask = useCallback(async (fields: { title: string; description?: string; dueDate?: number | null; repeatPattern?: 'daily' | null }) => {
    await createTodo({
      title: fields.title,
      description: fields.description ?? '',
      listId,
      dueDate: fields.dueDate ?? null,
      repeatPattern: fields.repeatPattern ?? null,
      priority: 'medium',
    })
  }, [createTodo, listId])

  const handleUpdate = useCallback(async (id: string, patch: Partial<Pick<Todo, 'title' | 'description' | 'dueDate' | 'repeatPattern' | 'isStarred'>>) => {
    await updateTodo({ id, ...patch })
  }, [updateTodo])

  const handleDeleteList = useCallback(async (id: string) => {
    if (id === 'default') return
    const listTodosToDelete = todos.filter((t) => t.listId === id)
    await Promise.all(listTodosToDelete.map((t) => deleteTodo(t.id)))
    await deleteListStore(id)
  }, [todos, deleteTodo, deleteListStore])

  const handleClearCompleted = useCallback(async (id: string) => {
    await clearCompleted(id)
  }, [clearCompleted])

  const hasActiveTasks = activeTodos.length > 0

  return (
    <div className="flex-1 min-w-[280px] max-w-[840px] bg-surface-raised rounded-2xl border border-border-subtle shadow-lg overflow-hidden flex flex-col self-start">
      <ListHeader
        activeList={list}
        allLists={lists}
        sortMode={sortMode}
        simplified
        onSortModeChange={setSortMode}
        onSelectList={() => {}}
        onCreateList={() => {}}
        onRenameList={renameList}
        onDeleteList={handleDeleteList}
        onClearCompleted={handleClearCompleted}
      />
      <div>
        <AddTaskTrigger onClick={openComposer} />
        {hasActiveTasks && (
          <div className="py-1">
            {activeTodos.map((todo) => (
              <TaskRow
                key={todo.id}
                todo={todo}
                now={now}
                sortMode={sortMode}
                onReorder={(draggedId, targetId, pos) => reorderTodo(draggedId, targetId, pos, listId)}
                onToggle={toggleComplete}
                onUpdate={handleUpdate}
                onDelete={deleteTodo}
              />
            ))}
          </div>
        )}
        <AddTaskComposer open={composerOpen} onOpenChange={setComposerOpen} onSave={handleAddTask} focusNonce={composerFocusNonce} />
        <CompletedSection todos={doneTodos} onToggle={toggleComplete} />
      </div>
    </div>
  )
}

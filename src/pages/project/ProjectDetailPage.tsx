import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, Plus, RotateCcw } from 'lucide-react'
import { useT } from '@/i18n/useT'
import { useProjectStore } from '@/stores/projectStore'
import { useTodoStore } from '@/stores/todoStore'
import { sortTodos, calcProjectProgress } from '@/domain/todo'
import { TodoItem } from '@/pages/action/TodoItem'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const t = useT()

  const { projects, isLoaded, loadProjects, archiveProject, toggleDailyRepeat } = useProjectStore()
  const { todos, isLoaded: todosLoaded, loadTodos, toggleComplete, deleteTodo, updateTodo, createTodo } = useTodoStore()

  const [newTodoTitle, setNewTodoTitle] = useState('')

  useEffect(() => {
    if (!isLoaded) loadProjects()
    if (!todosLoaded) loadTodos()
  }, [isLoaded, loadProjects, todosLoaded, loadTodos])

  const project = projects.find((p) => p.id === projectId)

  const projectTodos = useMemo(
    () => sortTodos(todos.filter((t) => t.projectId === projectId)),
    [todos, projectId],
  )

  const progress = useMemo(() => calcProjectProgress(projectTodos), [projectTodos])

  const handleCreateTodo = useCallback(() => {
    const title = newTodoTitle.trim()
    if (!title || !projectId) return
    createTodo({ title, projectId })
    setNewTodoTitle('')
  }, [newTodoTitle, projectId, createTodo])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleCreateTodo()
      }
    },
    [handleCreateTodo],
  )

  if (!project) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <p className="font-sans text-sm text-text-tertiary">
          {'项目未找到'}
        </p>
      </div>
    )
  }

  const categoryColors: Record<string, string> = {
    accent: 'var(--event-accent-text)',
    sage: 'var(--event-sage-text)',
    sand: 'var(--event-sand-text)',
    sky: 'var(--event-sky-text)',
    rose: 'var(--event-rose-text)',
    stone: 'var(--event-stone-text)',
  }

  const categoryNames: Record<string, string> = {
    accent: '主要矛盾',
    sage: '次要矛盾',
    sand: '庶务时间',
    sky: '个人提升',
    rose: '休息娱乐',
    stone: '睡眠时长',
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8">
      {/* 返回 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-sans text-text-secondary hover:text-text-primary cursor-pointer bg-transparent border-none transition-colors mb-6"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        {'返回'}
      </button>

      {/* 头部 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="font-serif text-[28px] font-semibold text-text-primary">
            {project.name}
          </h1>
          <div className="flex items-center gap-3 mt-2 text-sm font-sans text-text-tertiary">
            <span
              className="inline-flex items-center gap-1.5 h-6 px-2 rounded text-xs text-white"
              style={{
                backgroundColor:
                  categoryColors[project.categoryId] ?? 'var(--text-tertiary)',
              }}
            >
              {categoryNames[project.categoryId] ?? project.categoryId}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>
              {progress.done}/{progress.total}
              {'待办'}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {project.status === 'active' && (
            <button
              onClick={() => archiveProject(project.id)}
              className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-sans text-text-secondary border border-border-subtle hover:bg-surface-sunken cursor-pointer bg-transparent transition-colors"
            >
              <Archive size={14} strokeWidth={1.75} />
              {'归档'}
            </button>
          )}
          <button
            onClick={() => toggleDailyRepeat(project.id)}
            className={`flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-sans border transition-colors cursor-pointer bg-transparent ${
              project.dailyRepeat
                ? 'border-accent text-accent'
                : 'border-border-subtle text-text-secondary hover:bg-surface-sunken'
            }`}
          >
            <RotateCcw size={14} strokeWidth={1.75} />
            {project.dailyRepeat
              ? t('dailyRepeat.label')
              : t('dailyRepeat.label')}
          </button>
        </div>
      </div>

      {/* 待办列表 */}
      <div>
        {/* 快速添加 */}
        <div className="flex items-center gap-2 mb-6">
          <input
            type="text"
            value={newTodoTitle}
            onChange={(e) => setNewTodoTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('project.todoPlaceholder')}
            className="flex-1 h-10 px-4 rounded-xl bg-surface-raised border border-border-subtle text-sm font-sans text-text-primary placeholder:text-text-quaternary outline-none focus:border-accent transition-colors"
          />
          <button
            onClick={handleCreateTodo}
            disabled={!newTodoTitle.trim()}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-accent text-white hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer border-none"
          >
            <Plus size={18} strokeWidth={1.75} />
          </button>
        </div>

        {projectTodos.length === 0 ? (
          <p className="font-sans text-sm text-text-tertiary italic py-8 text-center">
            {t('project.noTodos')}
          </p>
        ) : (
          <div className="space-y-1">
            {/* 已完成进度 */}
            {progress.total > 0 && (
              <div className="flex items-center gap-3 px-4 py-2 mb-2">
                <div className="flex-1 h-1.5 rounded-full bg-surface-raised overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent transition-all duration-500"
                    style={{ width: `${progress.percent}%` }}
                  />
                </div>
                <span className="font-mono text-[11px] text-text-tertiary tabular-nums flex-shrink-0">
                  {progress.done}/{progress.total}
                </span>
              </div>
            )}

            {projectTodos.map((todo) => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onToggle={toggleComplete}
                onUpdate={(id, updates) => updateTodo({ id, ...updates })}
                onDelete={deleteTodo}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

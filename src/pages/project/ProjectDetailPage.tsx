import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, Lightbulb, Plus } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useProjectStore } from '@/stores/projectStore'
import { useEventStore } from '@/stores/eventStore'
import { useTodoStore } from '@/stores/todoStore'
import { getInspirationRepo } from '@/data/getRepositories'
import type { InspirationLog } from '@/domain/inspiration'
import { fireAndForget } from '@/lib/fireAndForget'
import { sortTodos, calcProjectProgress } from '@/domain/todo'
import { TodoItem } from '@/pages/action/TodoItem'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const language = useAppSettingsStore((s) => s.settings.language)
    const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const { projects, isLoaded, loadProjects, archiveProject } = useProjectStore()
  const { events, loadAllEvents } = useEventStore()
  const { todos, isLoaded: todosLoaded, loadTodos, toggleComplete, deleteTodo, updateTodo, createTodo } = useTodoStore()

  const [activeTab, setActiveTab] = useState<'events' | 'inspirations' | 'todos'>('events')
  const [inspirations, setInspirations] = useState<InspirationLog[]>([])
  const [newTodoTitle, setNewTodoTitle] = useState('')

  useEffect(() => {
    if (!isLoaded) loadProjects()
    loadAllEvents()
    if (!todosLoaded) loadTodos()
    if (projectId) {
      fireAndForget(
        getInspirationRepo().getByProject(projectId).then(setInspirations),
        'load inspirations',
      )
    }
  }, [isLoaded, loadProjects, loadAllEvents, todosLoaded, loadTodos, projectId])

  const project = projects.find((p) => p.id === projectId)

  const projectEvents = useMemo(
    () =>
      events
        .filter((e) => e.projectId === projectId)
        .sort((a, b) => b.startTime - a.startTime),
    [events, projectId],
  )

  const totalMinutes = useMemo(
    () =>
      projectEvents.reduce(
        (sum, e) => sum + (e.endTime - e.startTime) / 60_000,
        0,
      ),
    [projectEvents],
  )

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
              {'累计'} {Math.round(totalMinutes)}
              {'分钟'}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>
              {projectEvents.length}
              {'个事件'}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>
              {inspirations.length}
              {'条灵感'}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>
              {progress.done}/{progress.total}
              {'待办'}
            </span>
          </div>
        </div>
        {project.status === 'active' && (
          <button
            onClick={() => archiveProject(project.id)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-sans text-text-secondary border border-border-subtle hover:bg-surface-sunken cursor-pointer bg-transparent transition-colors"
          >
            <Archive size={14} strokeWidth={1.75} />
            {'归档'}
          </button>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 border-b border-border-subtle mb-6">
        {[
          { id: 'events' as const, label: '事件' },
          { id: 'inspirations' as const, label: '灵感' },
          { id: 'todos' as const, label: '待办' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-xs font-sans font-medium border-b-2 transition-colors cursor-pointer bg-transparent ${
              activeTab === tab.id
                ? 'border-accent text-accent'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      {activeTab === 'events' && (
        <div className="space-y-1">
          {projectEvents.length === 0 && (
            <p className="font-sans text-sm text-text-tertiary italic py-8 text-center">
              {t(
                '暂无关联事件',
                'No events linked to this project yet.',
              )}
            </p>
          )}
          {projectEvents.slice(0, 100).map((e) => (
            <a
              key={e.id}
              href={`#/week?openEvent=${e.id}`}
              className="flex items-center gap-3 px-3 py-2 rounded-md hover:bg-surface-sunken transition-colors no-underline"
            >
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{
                  backgroundColor: `var(--event-${e.categoryId}-fill)`,
                }}
              />
              <span className="flex-1 font-sans text-sm text-text-primary truncate">
                {e.title}
              </span>
              <span className="font-mono text-xs text-text-tertiary tabular-nums flex-shrink-0">
                {new Date(e.startTime).toLocaleDateString(
                  language === 'zh' ? 'zh-CN' : 'en-US',
                  { month: 'short', day: 'numeric' },
                )}
              </span>
              <span className="font-mono text-xs text-text-tertiary tabular-nums flex-shrink-0">
                {Math.round((e.endTime - e.startTime) / 60_000)}
                {'分'}
              </span>
            </a>
          ))}
        </div>
      )}

      {activeTab === 'inspirations' && (
        <div>
          {inspirations.length === 0 ? (
            <p className="font-sans text-sm text-text-tertiary italic py-8 text-center">
              {t(
                '暂无灵感记录。每次完成事件后可以添加一条反思。',
                'No inspirations yet. Add a reflection after completing an event.',
              )}
            </p>
          ) : (
            <div className="space-y-2">
              {inspirations.map((ins) => {
                const event = events.find((e) => e.id === ins.eventId)
                return (
                  <div
                    key={ins.id}
                    className="flex items-start gap-3 px-3 py-3 rounded-md bg-surface-raised border border-border-subtle"
                  >
                    <Lightbulb
                      size={14}
                      strokeWidth={1.75}
                      className="text-accent mt-0.5 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm text-text-primary">
                        {ins.content}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-sans text-[10px] text-text-tertiary">
                          {new Date(ins.createdAt).toLocaleDateString(
                            language === 'zh' ? 'zh-CN' : 'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            },
                          )}
                        </span>
                        {event && (
                          <>
                            <span className="w-0.5 h-0.5 rounded-full bg-text-tertiary/40" />
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                backgroundColor: `var(--event-${event.categoryId}-fill)`,
                              }}
                            />
                            <span className="font-sans text-[10px] text-text-tertiary truncate">
                              {event.title}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'todos' && (
        <div>
          {/* 快速添加 */}
          <div className="flex items-center gap-2 mb-6">
            <input
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('输入待办标题，按回车添加', 'Add a to-do, press Enter')}
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
              {t('暂无待办', 'No to-dos yet.')}
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
      )}
    </div>
  )
}

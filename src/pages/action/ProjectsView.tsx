/**
 * # ProjectsView — 项目分组待办视图（嵌入 ActionPage 使用）
 *
 * 展示项目列表（带完成进度条），展开后可查看/新增/排序/删除子待办。
 * 使用统一的 Project 实体（替代旧的 TaskGroup）。
 */

import { useEffect, useState, useCallback, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FolderKanban,
  ChevronRight,
  ChevronDown,
  Plus,
  Circle,
  CheckCircle2,
  ChevronUp,
  ChevronDown as ChevronDownIcon,
  Trash2,
  Clock,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import { useCategoryColors } from '@/constants/categoryColors'
import { DEFAULT_CATEGORIES } from '@/domain/category'
import type { Project } from '@/domain/project'
import type { Todo } from '@/domain/todo'

// ── 主组件 ─────────────────────────────────────────────

export function ProjectsView() {
  const {
    projects,
    isLoading,
    isLoaded,
    error,
    loadAll,
    createProject,
    deleteProject,
    reorderProject,
    createTodoInProject,
    deleteTodoInProject,
    toggleTodoDone,
    reorderTodo,
    getTodosByProject,
  } = useProjectStore()

  const navigate = useNavigate()
  const colorMap = useCategoryColors()
  const activeProjects = projects.filter((p) => p.status === 'active')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  // ── 新建项目 ──

  const [newProjectName, setNewProjectName] = useState('')

  const handleCreateProject = useCallback(
    (e: FormEvent) => {
      e.preventDefault()
      const trimmed = newProjectName.trim()
      if (!trimmed) return
      createProject({ name: trimmed, categoryId: 'accent' })
      setNewProjectName('')
    },
    [newProjectName, createProject],
  )

  // ── 在展开的项目内新增子待办 ──

  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})

  const handleCreateItem = useCallback(
    (projectId: string) => {
      const title = (newItemTitles[projectId] ?? '').trim()
      if (!title) return
      createTodoInProject(projectId, title)
      setNewItemTitles((prev) => ({ ...prev, [projectId]: '' }))
    },
    [newItemTitles, createTodoInProject],
  )

  const handleItemKeyDown = useCallback(
    (e: React.KeyboardEvent, projectId: string) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        handleCreateItem(projectId)
      }
    },
    [handleCreateItem],
  )

  return (
    <>
      {/* 时间追踪项目 (活跃项目引导) */}
      {activeProjects.length > 0 && (
        <div className="mb-6">
          <h3 className="flex items-center gap-1.5 font-sans text-xs font-medium text-text-tertiary mb-3">
            <Clock size={13} strokeWidth={1.75} />
            {'时间追踪项目'}
          </h3>
          <div className="flex flex-wrap gap-2">
            {activeProjects.map((p) => {
              const cat = DEFAULT_CATEGORIES.find((c) => c.id === p.categoryId)
              const catName = cat
                ? cat.name
                : ''
              const fill = colorMap[p.categoryId]?.fill ?? '#888'
              return (
                <button
                  key={p.id}
                  onClick={() => navigate(`/projects/${p.id}`)}
                  className="group inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium font-sans border border-border-default bg-surface-raised hover:bg-surface-hover hover:border-accent/30 transition-all duration-150 cursor-pointer"
                >
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fill }}
                  />
                  <span className="text-text-primary group-hover:text-accent transition-colors">
                    {p.name}
                  </span>
                  {p.eventCount > 0 && (
                    <span className="text-text-quaternary text-[11px] font-normal">
                      {p.eventCount}
                    </span>
                  )}
                  {catName && (
                    <span className="text-text-quaternary text-[10px] font-normal hidden sm:inline">
                      · {catName}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* 新建项目输入 */}
      <div className="mb-5">
        <form
          onSubmit={handleCreateProject}
          className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-raised px-4 py-2.5 transition-shadow duration-200 focus-within:shadow-sm"
        >
          <Plus size={16} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder={'新建项目…'}
            className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
          />
          <button
            type="submit"
            disabled={!newProjectName.trim()}
            className="h-7 px-3 rounded-md text-xs font-medium font-sans bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer border-none"
          >
            {'添加'}
          </button>
        </form>
      </div>

      {error && (
        <div className="mb-4 px-4 py-2 rounded-lg bg-[#B53535]/10 border border-[#B53535]/20 text-xs font-sans text-[#B53535]">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <p className="font-sans text-sm text-text-tertiary">
            {'加载中…'}
          </p>
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <FolderKanban size={40} strokeWidth={1.25} className="text-text-tertiary/40 mb-4" />
          <p className="font-sans text-sm text-text-tertiary mb-1">
            {'还没有项目，在上方输入框添加'}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              todos={getTodosByProject(project.id)}
              isExpanded={expandedId === project.id}
              onToggleExpand={() =>
                setExpandedId(expandedId === project.id ? null : project.id)
              }
              onDeleteProject={() => deleteProject(project.id)}
              onReorderProject={(dir) => reorderProject(project.id, dir)}
              newItemTitle={(newItemTitles[project.id] ?? '')}
              onNewItemTitleChange={(val) =>
                setNewItemTitles((prev) => ({ ...prev, [project.id]: val }))
              }
              onCreateItem={() => handleCreateItem(project.id)}
              onItemKeyDown={(e) => handleItemKeyDown(e, project.id)}
              onToggleItem={toggleTodoDone}
              onDeleteItem={deleteTodoInProject}
              onReorderItem={(itemId, dir) => reorderTodo(itemId, dir)}
            />
          ))}
        </div>
      )}
    </>
  )
}

// ── ProjectCard ─────────────────────────────────────

interface ProjectCardProps {
  project: Project
  todos: Todo[]
  isExpanded: boolean
  onToggleExpand: () => void
  onDeleteProject: () => void
  onReorderProject: (dir: 'up' | 'down') => void
  newItemTitle: string
  onNewItemTitleChange: (val: string) => void
  onCreateItem: () => void
  onItemKeyDown: (e: React.KeyboardEvent) => void
  onToggleItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onReorderItem: (id: string, dir: 'up' | 'down') => void
}

function ProjectCard({
  project,
  todos,
  isExpanded,
  onToggleExpand,
  onDeleteProject,
  onReorderProject,
  newItemTitle,
  onNewItemTitleChange,
  onCreateItem,
  onItemKeyDown,
  onToggleItem,
  onDeleteItem,
  onReorderItem,
}: ProjectCardProps) {

  const total = todos.length
  const done = todos.filter((t) => t.status === 'done').length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised overflow-hidden transition-shadow duration-200 hover:shadow-sm">
      {/* ── 项目头：名称 + 进度条 + 操作 ── */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* 展开按钮 */}
        <button
          onClick={onToggleExpand}
          className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-tertiary hover:text-text-primary transition-colors"
          aria-label={isExpanded ? '折叠' : '展开'}
        >
          {isExpanded ? (
            <ChevronDown size={16} strokeWidth={1.75} />
          ) : (
            <ChevronRight size={16} strokeWidth={1.75} />
          )}
        </button>

        {/* 项目名 */}
        <span className="flex-1 font-serif text-sm font-medium text-text-primary truncate min-w-0">
          {project.name}
        </span>

        {/* 进度数字 */}
        <span className="font-mono text-[11px] text-text-tertiary tabular-nums flex-shrink-0">
          {done}/{total}
        </span>

        {/* 进度条 */}
        <div className="w-20 h-1.5 rounded-full bg-surface-sunken flex-shrink-0 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${percent}%`,
              backgroundColor:
                percent === 100
                  ? 'var(--accent)'
                  : percent > 0
                    ? 'var(--accent)'
                    : 'transparent',
            }}
          />
        </div>

        {/* 百分比 */}
        <span className="font-mono text-[11px] text-text-tertiary tabular-nums w-8 text-right flex-shrink-0">
          {percent}%
        </span>

        {/* 排序按钮 */}
        <button
          onClick={() => onReorderProject('up')}
          className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-text-secondary transition-colors"
          aria-label={'上移'}
        >
          <ChevronUp size={14} strokeWidth={1.75} />
        </button>
        <button
          onClick={() => onReorderProject('down')}
          className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-text-secondary transition-colors"
          aria-label={'下移'}
        >
          <ChevronDownIcon size={14} strokeWidth={1.75} />
        </button>

        {/* 删除项目 */}
        <button
          onClick={onDeleteProject}
          className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-[#B53535] transition-colors"
          aria-label={'删除项目'}
        >
          <Trash2 size={14} strokeWidth={1.75} />
        </button>
      </div>

      {/* ── 展开的子待办列表 ── */}
      {isExpanded && (
        <div className="border-t border-border-subtle">
          {/* 子待办列表 */}
          {todos.length === 0 && (
            <p className="px-4 py-6 text-center font-sans text-xs text-text-tertiary italic">
              {'暂无子待办，在下方添加'}
            </p>
          )}
          {todos.map((todo) => {
            const isDone = todo.status === 'done'
            return (
              <div
                key={todo.id}
                className="group flex items-center gap-3 px-4 py-2.5 hover:bg-surface-sunken transition-colors border-b border-border-subtle/50 last:border-b-0"
              >
                {/* Checkbox */}
                <button
                  onClick={() => onToggleItem(todo.id)}
                  className="flex-shrink-0 cursor-pointer bg-transparent border-none transition-colors"
                  aria-label={
                    isDone
                      ? '标记未完成'
                      : '标记完成'
                  }
                >
                  {isDone ? (
                    <CheckCircle2
                      size={16}
                      strokeWidth={1.75}
                      className="text-accent"
                    />
                  ) : (
                    <Circle
                      size={16}
                      strokeWidth={1.75}
                      className="text-text-tertiary group-hover:text-text-secondary"
                    />
                  )}
                </button>

                {/* 标题 */}
                <span
                  className={`flex-1 font-sans text-sm min-w-0 truncate ${
                    isDone
                      ? 'line-through text-text-tertiary'
                      : 'text-text-primary'
                  }`}
                >
                  {todo.title}
                </span>

                {/* 排序 */}
                <button
                  onClick={() => onReorderItem(todo.id, 'up')}
                  className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={'上移'}
                >
                  <ChevronUp size={13} strokeWidth={1.75} />
                </button>
                <button
                  onClick={() => onReorderItem(todo.id, 'down')}
                  className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-text-secondary transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={'下移'}
                >
                  <ChevronDownIcon size={13} strokeWidth={1.75} />
                </button>

                {/* 删除 */}
                <button
                  onClick={() => onDeleteItem(todo.id)}
                  className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-[#B53535] transition-colors opacity-0 group-hover:opacity-100"
                  aria-label={'删除'}
                >
                  <Trash2 size={13} strokeWidth={1.75} />
                </button>
              </div>
            )
          })}

          {/* 添加子待办输入 */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border-subtle/50 bg-surface-sunken/30">
            <Plus size={14} strokeWidth={1.75} className="text-text-quaternary flex-shrink-0" />
            <input
              type="text"
              value={newItemTitle}
              onChange={(e) => onNewItemTitleChange(e.target.value)}
              onKeyDown={onItemKeyDown}
              placeholder={'添加子待办…'}
              className="flex-1 bg-transparent border-none outline-none font-sans text-sm text-text-primary placeholder:text-text-quaternary"
            />
            <button
              onClick={onCreateItem}
              disabled={!newItemTitle.trim()}
              className="h-6 px-2.5 rounded-md text-[11px] font-medium font-sans bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer border-none"
            >
              {'添加'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

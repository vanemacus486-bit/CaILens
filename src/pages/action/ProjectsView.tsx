/**
 * # ProjectsView — 项目分组待办视图（嵌入 ActionPage 使用）
 *
 * 展示项目列表（带完成进度条），展开后可查看/新增/排序/删除子待办。
 * 精简版：已去掉标签云和独立新建项目表单。
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import {
  ChevronRight,
  ChevronDown,
  Plus,
  Circle,
  CheckCircle2,
  Trash2,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { Project } from '@/domain/project'
import type { Todo } from '@/domain/todo'

// ── 主组件 ─────────────────────────────────────────────

export function ProjectsView() {
  const {
    projects,
    isLoading,
    isLoaded,
    loadAll,
    createTodoInProject,
    deleteTodoInProject,
    deleteProject,
    toggleTodoDone,
    getTodosByProject,
  } = useProjectStore()

  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

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

  if (!isLoaded && isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-sans text-sm text-text-tertiary">{'加载中…'}</p>
      </div>
    )
  }

  return (
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
          newItemTitle={(newItemTitles[project.id] ?? '')}
          onNewItemTitleChange={(val) =>
            setNewItemTitles((prev) => ({ ...prev, [project.id]: val }))
          }
          onCreateItem={() => handleCreateItem(project.id)}
          onItemKeyDown={(e) => handleItemKeyDown(e, project.id)}
          onToggleItem={toggleTodoDone}
          onDeleteItem={deleteTodoInProject}
          onDeleteProject={() => {
            if (window.confirm(`删除项目「${project.name}」及其所有子待办？`)) {
              deleteProject(project.id)
            }
          }}
        />
      ))}
    </div>
  )
}

// ── ProjectCard ─────────────────────────────────────

interface ProjectCardProps {
  project: Project
  todos: Todo[]
  isExpanded: boolean
  onToggleExpand: () => void
  newItemTitle: string
  onNewItemTitleChange: (val: string) => void
  onCreateItem: () => void
  onItemKeyDown: (e: React.KeyboardEvent) => void
  onToggleItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onDeleteProject: () => void
}

function ProjectCard({
  project,
  todos,
  isExpanded,
  onToggleExpand,
  newItemTitle,
  onNewItemTitleChange,
  onCreateItem,
  onItemKeyDown,
  onToggleItem,
  onDeleteItem,
  onDeleteProject,
}: ProjectCardProps) {

  const total = todos.length
  const done = todos.filter((t) => t.status === 'done').length
  const percent = total === 0 ? 0 : Math.round((done / total) * 100)

  // ── Context menu state ──
  const menuRef = useRef<HTMLDivElement>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  // Close menu on click outside
  useEffect(() => {
    if (!contextMenu) return
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  return (
    <div className="rounded-xl border border-border-subtle bg-surface-raised overflow-hidden transition-shadow duration-200 hover:shadow-sm">
      {/* ── 项目头：名称 + 进度条 + 操作 ── */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        onContextMenu={handleContextMenu}
      >
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
      </div>

      {/* ── 右键菜单 ── */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[140px] rounded-lg border border-border-subtle bg-surface-raised py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => {
              setContextMenu(null)
              onDeleteProject()
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-[#B53535] hover:bg-surface-sunken cursor-pointer border-none bg-transparent text-left transition-colors"
          >
            <Trash2 size={14} strokeWidth={1.75} />
            删除项目
          </button>
        </div>
      )}

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

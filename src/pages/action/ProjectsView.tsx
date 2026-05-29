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
  CalendarDays,
} from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { CategoryId } from '@/domain/category'
import type { Project } from '@/domain/project'
import type { Todo } from '@/domain/todo'
import { DatePickerPopover } from '@/components/ui/DatePickerPopover'

// ── 期限快捷选项 ──────────────────────────────────────────

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
    updateProject,
    toggleTodoDone,
    getTodosByProject,
  } = useProjectStore()

  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  // ── 在展开的项目内新增子待办 ──

  const [newItemTitles, setNewItemTitles] = useState<Record<string, string>>({})
  const [newItemDeadlines, setNewItemDeadlines] = useState<Record<string, number | null>>({})

  const handleCreateItem = useCallback(
    (projectId: string) => {
      const title = (newItemTitles[projectId] ?? '').trim()
      if (!title) return
      const dueDate = newItemDeadlines[projectId] ?? daysToTs(7)
      createTodoInProject(projectId, title, dueDate)
      setNewItemTitles((prev) => ({ ...prev, [projectId]: '' }))
      setNewItemDeadlines((prev) => ({ ...prev, [projectId]: daysToTs(7) }))
    },
    [newItemTitles, newItemDeadlines, createTodoInProject],
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
          newItemDeadline={newItemDeadlines[project.id] ?? daysToTs(7)}
          onNewItemDeadlineChange={(val) =>
            setNewItemDeadlines((prev) => ({ ...prev, [project.id]: val }))
          }
          onCreateItem={() => handleCreateItem(project.id)}
          onItemKeyDown={(e) => handleItemKeyDown(e, project.id)}
          onToggleItem={toggleTodoDone}
          onDeleteItem={deleteTodoInProject}
          onUpdateCategory={(catId) => updateProject({ id: project.id, categoryId: catId })}
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
  newItemDeadline: number | null
  onNewItemDeadlineChange: (val: number | null) => void
  onToggleItem: (id: string) => void
  onDeleteItem: (id: string) => void
  onUpdateCategory: (categoryId: CategoryId) => void
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
  newItemDeadline,
  onNewItemDeadlineChange,
  onToggleItem,
  onDeleteItem,
  onUpdateCategory,
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
    <div
      className={`rounded-xl border bg-surface-raised overflow-hidden transition-all duration-200 hover:shadow-sm ${
        percent === 100
          ? 'border-accent/30'
          : 'border-border-subtle'
      }`}
    >
      {/* ── 进度色条（2px 分类色） ── */}
      <div
        className="h-0.5 w-full transition-all duration-300"
        style={{
          backgroundColor: `var(--event-${project.categoryId}-fill)`,
          opacity: percent > 0 ? 0.7 : 0,
        }}
      />

      {/* ── 项目头：名称 + 操作 ── */}
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

        {/* 百分比 */}
        <span className="font-mono text-[11px] text-text-tertiary tabular-nums w-8 text-right flex-shrink-0">
          {percent}%
        </span>

        {/* ⋮ 菜单按钮 */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setContextMenu({ x: e.currentTarget.getBoundingClientRect().right - 160, y: e.currentTarget.getBoundingClientRect().bottom + 4 })
          }}
          className="flex-shrink-0 cursor-pointer bg-transparent border-none text-text-quaternary hover:text-text-secondary transition-colors rounded-md p-0.5 hover:bg-surface-sunken"
          aria-label="项目操作"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
            <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
          </svg>
        </button>
      </div>

      {/* ── 右键菜单 ── */}
      {contextMenu && (
        <div
          ref={menuRef}
          className="fixed z-50 min-w-[160px] rounded-lg border border-border-subtle bg-surface-raised py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <div className="px-3 py-1 font-sans text-[10px] text-text-quaternary tracking-widest uppercase">
            {'修改分类'}
          </div>
          {(['accent', 'sage', 'sky', 'sand', 'rose'] as CategoryId[]).map((catId) => {
            const CATEGORY_NAME: Record<CategoryId, string> = {
              accent: '主要矛盾', sage: '次要矛盾', sky: '个人提升',
              sand: '庶务时间', rose: '娱乐休息', stone: '睡眠时长',
            }
            const isActive = project.categoryId === catId
            return (
              <button
                key={catId}
                onClick={() => {
                  setContextMenu(null)
                  onUpdateCategory(catId)
                }}
                className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans hover:bg-surface-sunken cursor-pointer border-none bg-transparent text-left transition-colors ${
                  isActive ? 'text-text-primary font-medium' : 'text-text-secondary'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: `var(--event-${catId}-fill)` }}
                />
                {CATEGORY_NAME[catId]}
                {isActive && <span className="ml-auto text-accent text-[10px]">{'✓'}</span>}
              </button>
            )
          })}
          <div className="border-t border-border-subtle/50 my-1" />
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
        <div className="border-t border-border-subtle animate-slide-down">
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
            <div className="flex items-center gap-0.5">
              {QUICK_DEADLINES.map((d) => {
                const isActive = isPresetMatch(newItemDeadline, d.days)
                return (
                  <button
                    key={d.label}
                    type="button"
                    onClick={() => onNewItemDeadlineChange(daysToTs(d.days))}
                    className={`px-1.5 py-0.5 rounded text-[9px] font-sans cursor-pointer border-none transition-all duration-150
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
                onClick={() => onNewItemDeadlineChange(null)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-sans cursor-pointer border-none transition-all duration-150
                  ${newItemDeadline === null
                    ? 'bg-text-primary text-surface-raised font-medium'
                    : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                  }
                `}
              >
                无
              </button>

              {/* 自定义日期 */}
              <DatePickerPopover
                value={newItemDeadline}
                onChange={onNewItemDeadlineChange}
                allowClear
                trigger={
                  <button
                    type="button"
                    className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-sans cursor-pointer border-none transition-all duration-150
                      ${newItemDeadline !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(newItemDeadline, d.days))
                        ? 'bg-accent text-white font-medium'
                        : 'text-text-tertiary bg-surface-sunken hover:text-text-secondary'
                      }
                    `}
                  >
                    <CalendarDays size={9} strokeWidth={1.75} />
                    {newItemDeadline !== null && !QUICK_DEADLINES.some((d) => isPresetMatch(newItemDeadline, d.days))
                      ? `${new Date(newItemDeadline).getMonth() + 1}/${new Date(newItemDeadline).getDate()}`
                      : '日'
                    }
                  </button>
                }
              />
            </div>
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

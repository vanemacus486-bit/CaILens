/**
 * # ProjectChipList — 项目色标卡片组
 *
 * 紧凑的项目列表，用分类色标识，极简文字。
 * - 每个项目: 3px 分类色左边条 + 项目名 + 微型进度环（5 实心/空心圆点）
 * - hover: 微浮起 + 阴影
 * - 右键: 改分类色点 / 删除
 * - 底部: 内联新建项目入口
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Trash2 } from 'lucide-react'
import { useProjectStore } from '@/stores/projectStore'
import type { CategoryId } from '@/domain/category'

const CATEGORY_IDS: CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose']

const CATEGORY_NAMES: Record<CategoryId, string> = {
  accent: '主要矛盾',
  sage: '次要矛盾',
  sand: '庶务时间',
  sky: '个人提升',
  rose: '娱乐休息',
  stone: '睡眠时长',
}

// ── 微型进度环（5 点） ──────────────────────────────────────

function ProgressDots({ percent }: { percent: number }) {
  const filled = Math.round(percent / 20) // 0-5

  return (
    <div className="flex items-center gap-0.5 flex-shrink-0">
      {[0, 1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className="w-1.5 h-1.5 rounded-full transition-colors duration-200"
          style={{
            backgroundColor: i < filled ? 'currentColor' : 'transparent',
            border: i < filled ? 'none' : '1px solid currentColor',
            opacity: i < filled ? 1 : 0.25,
          }}
        />
      ))}
    </div>
  )
}

// ── 组件 ──────────────────────────────────────────────────

export function ProjectChipList() {
  const navigate = useNavigate()
  const {
    projects,
    isLoaded,
    loadAll,
    createProject,
    updateProject,
    deleteProject,
    getProjectProgress,
  } = useProjectStore()

  const [isAdding, setIsAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<CategoryId>('accent')
  const [contextMenu, setContextMenu] = useState<{ projectId: string; x: number; y: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isLoaded) loadAll()
  }, [isLoaded, loadAll])

  // 右键菜单点击外部关闭
  useEffect(() => {
    if (!contextMenu) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  const handleCreate = useCallback(() => {
    const trimmed = newName.trim()
    if (!trimmed) return
    createProject({ name: trimmed, categoryId: newCategory })
    setNewName('')
    setNewCategory('accent')
    setIsAdding(false)
  }, [newName, newCategory, createProject])

  const activeProjects = projects.filter((p) => p.status === 'active')

  return (
    <section>
      <h2 className="font-serif text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
        <span
          className="w-2 h-2 rounded-full flex-shrink-0"
          style={{ backgroundColor: 'var(--event-accent-fill)' }}
        />
        {'项目'}
        <span className="font-mono text-[10px] text-text-quaternary font-normal ml-0.5">
          {activeProjects.length}
        </span>
      </h2>

      {/* 项目色标列表 */}
      <div className="space-y-1.5">
        {activeProjects.map((project) => {
          const progress = getProjectProgress(project.id)
          const catFill = `var(--event-${project.categoryId}-fill)`
          const isDone = progress.percent === 100

          return (
            <div key={project.id} className="relative">
              <button
                onClick={() => navigate(`/projects/${project.id}`)}
                onContextMenu={(e) => {
                  e.preventDefault()
                  setContextMenu({ projectId: project.id, x: e.clientX, y: e.clientY })
                }}
                className={`w-full flex items-center gap-3 pl-2 pr-3 py-2.5 rounded-lg border text-left cursor-pointer border-none transition-all duration-150 hover:translate-y-[-1px] hover:shadow-card-float ${
                  isDone
                    ? 'bg-surface-sunken/60'
                    : 'bg-surface-raised hover:bg-surface-raised'
                }`}
                style={{ borderLeft: `3px solid ${catFill}` }}
              >
                <span className="flex-1 font-serif text-sm text-text-primary truncate min-w-0">
                  {project.name}
                </span>

                {/* 进度环 */}
                <span style={{ color: catFill }}>
                  <ProgressDots percent={progress.percent} />
                </span>
              </button>

              {/* 右键菜单 */}
              {contextMenu?.projectId === project.id && (
                <div
                  ref={menuRef}
                  className="fixed z-50 min-w-[150px] rounded-lg border border-border-subtle bg-surface-raised py-1 shadow-dialog animate-scale-up"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                  <div className="px-3 py-1 font-sans text-[10px] text-text-quaternary tracking-widest uppercase">
                    改分类
                  </div>
                  {CATEGORY_IDS.map((cid) => (
                    <button
                      key={cid}
                      onClick={() => {
                        setContextMenu(null)
                        updateProject({ id: project.id, categoryId: cid })
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans hover:bg-surface-sunken cursor-pointer border-none bg-transparent text-left transition-colors ${
                        project.categoryId === cid ? 'text-text-primary font-medium' : 'text-text-secondary'
                      }`}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: `var(--event-${cid}-fill)` }}
                      />
                      {CATEGORY_NAMES[cid]}
                      {project.categoryId === cid && (
                        <span className="ml-auto text-accent text-[10px]">✓</span>
                      )}
                    </button>
                  ))}
                  <div className="border-t border-border-subtle/50 my-1" />
                  <button
                    onClick={() => {
                      setContextMenu(null)
                      if (window.confirm(`删除项目「${project.name}」？`)) {
                        deleteProject(project.id)
                      }
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-[#B53535] hover:bg-surface-sunken cursor-pointer border-none bg-transparent text-left transition-colors"
                  >
                    <Trash2 size={14} strokeWidth={1.75} />
                    删除
                  </button>
                </div>
              )}
            </div>
          )
        })}

        {/* 空态 */}
        {activeProjects.length === 0 && !isAdding && (
          <div className="py-3 text-center">
            <p className="font-sans text-xs text-text-quaternary">暂无项目</p>
          </div>
        )}
      </div>

      {/* 内联新建项目 */}
      {isAdding ? (
        <div className="mt-2 flex items-center gap-1.5 animate-slide-down">
          <div className="flex items-center gap-0.5">
            {CATEGORY_IDS.map((cid) => {
              const isActive = newCategory === cid
              return (
                <button
                  key={cid}
                  type="button"
                  onClick={() => setNewCategory(cid)}
                  className="w-4 h-4 rounded-full cursor-pointer border-none transition-all duration-150"
                  style={{
                    backgroundColor: `var(--event-${cid}-fill)`,
                    transform: isActive ? 'scale(1.2)' : 'scale(1)',
                    boxShadow: isActive ? `0 0 0 2px var(--surface-raised), 0 0 0 3px var(--event-${cid}-fill)` : 'none',
                  }}
                  title={CATEGORY_NAMES[cid]}
                />
              )
            })}
          </div>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate()
              if (e.key === 'Escape') setIsAdding(false)
            }}
            placeholder="项目名…"
            autoFocus
            className="flex-1 bg-surface-sunken border border-border-subtle rounded-md px-2.5 py-1.5 outline-none font-sans text-xs text-text-primary placeholder:text-text-quaternary"
          />
          <button
            onClick={handleCreate}
            disabled={!newName.trim()}
            className="h-7 px-3 rounded-md text-[11px] font-medium font-sans bg-accent text-white hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-opacity cursor-pointer border-none"
          >
            添加
          </button>
        </div>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-dashed border-border-subtle text-text-quaternary hover:text-text-secondary hover:border-border-default transition-all duration-150 cursor-pointer bg-transparent"
        >
          <Plus size={14} strokeWidth={1.75} />
          <span className="font-sans text-[11px]">新建项目</span>
        </button>
      )}
    </section>
  )
}

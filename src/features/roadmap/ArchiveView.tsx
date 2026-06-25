/**
 * # ArchiveView — 已完成项目归档
 *
 * 列出所有 status==='done' 的主目标，每条可展开查看：
 * - 项目标题、完成日期
 * - 复盘文档（GoalDoc 只读）
 * - 按完成日分组的任务清单
 *
 * 提供「恢复为进行中」操作。
 */

import { useState, useMemo, useCallback } from 'react'
import { Archive, RotateCcw, ChevronDown, ChevronRight } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import { getDoneProjects } from '@/domain/goal'
import type { Todo } from '@/domain/todo'
import { isGoalDocEmpty, normalizeGoalDoc } from '@/domain/goalDoc'
import { DoneArchiveTab } from './DoneArchiveTab'

interface ArchiveViewProps {
  goals: Goal[]
  allTodos: Todo[]
  goalColorMap?: Record<string, string>
  onRestore: (goalId: string) => void
  onToggleTodo: (todoId: string) => void
  onDeleteTodo: (todoId: string) => void
}

function displayTitle(title: string): string {
  const i1 = title.indexOf('：')
  const i2 = title.indexOf(':')
  const idx = Math.min(i1 === -1 ? Infinity : i1, i2 === -1 ? Infinity : i2)
  return idx === Infinity ? title : title.slice(0, idx).trim()
}

export function ArchiveView({
  goals,
  allTodos,
  goalColorMap,
  onRestore,
  onToggleTodo,
  onDeleteTodo,
}: ArchiveViewProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const doneProjects = useMemo(() => getDoneProjects(goals), [goals])

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }, [])

  if (doneProjects.length === 0) {
    return (
      <div className="roadmap-empty">
        <div className="roadmap-empty-icon">
          <Archive size={24} strokeWidth={1.5} />
        </div>
        <p className="roadmap-empty-title">还没有已完成的项目</p>
        <p className="roadmap-empty-desc">标记主目标为「已完成」后，会在这里归档</p>
      </div>
    )
  }

  return (
    <div className="rm-archive-projects">
      <div className="rm-archive-projects-head">
        <Archive size={16} strokeWidth={1.5} />
        <span>已完成项目（{doneProjects.length}）</span>
      </div>

      {doneProjects.map((project) => {
        const isExpanded = expandedId === project.id
        const color = project.categoryId
          ? `var(--event-${project.categoryId}-fill)`
          : 'var(--accent)'
        const completedDate = project.completedAt
          ? new Date(project.completedAt).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })
          : '—'
        const hasDoc = project.doc && !isGoalDocEmpty(project.doc)

        // collect done todos from the whole subtree
        const collectDescendantIds = (parentId: string): string[] => {
          const children = goals.filter((g) => g.parentId === parentId)
          return [parentId, ...children.flatMap((c) => collectDescendantIds(c.id))]
        }
        const goalIds = new Set(collectDescendantIds(project.id))
        const doneTodos = allTodos.filter(
          (t) => t.goalId && goalIds.has(t.goalId) && t.status === 'done',
        )

        return (
          <div
            key={project.id}
            className="rm-archive-project-card"
            style={{ borderLeftColor: color }}
          >
            {/* 头部 — 可点击展开 */}
            <button
              className="rm-archive-project-header"
              onClick={() => toggleExpand(project.id)}
            >
              <div className="rm-archive-project-title-row">
                {isExpanded ? (
                  <ChevronDown size={14} strokeWidth={2} />
                ) : (
                  <ChevronRight size={14} strokeWidth={2} />
                )}
                <span
                  className="rm-archive-project-title"
                  style={{ color }}
                >
                  {displayTitle(project.title)}
                </span>
              </div>
              <div className="rm-archive-project-meta">
                <span className="rm-archive-project-date">
                  {completedDate}
                </span>
                <span className="rm-archive-project-count">
                  {doneTodos.length} 件
                </span>
              </div>
            </button>

            {/* 展开详情 */}
            {isExpanded && (
              <div className="rm-archive-project-body">
                {/* 复盘文档 */}
                {hasDoc && (
                  <div className="rm-archive-project-doc">
                    {normalizeGoalDoc(project.doc).notes
                      .filter((n) => n.title.trim() || n.body.trim())
                      .map((n) => (
                        <div key={n.id} className="rm-archive-doc-section">
                          {n.title.trim() && <div className="rm-archive-doc-label">{n.title}</div>}
                          {n.body.trim() && <p className="rm-archive-doc-text">{n.body}</p>}
                        </div>
                      ))}
                  </div>
                )}

                {/* 已完成任务清单 */}
                {doneTodos.length > 0 && (
                  <div className="rm-archive-project-todos">
                    <DoneArchiveTab
                      todos={doneTodos}
                      goalColorMap={goalColorMap}
                      focusGoalId={project.id}
                      onToggle={onToggleTodo}
                      onDelete={onDeleteTodo}
                    />
                  </div>
                )}

                {/* 恢复按钮 */}
                <button
                  className="rm-archive-restore-btn"
                  onClick={() => onRestore(project.id)}
                >
                  <RotateCcw size={13} strokeWidth={1.75} />
                  恢复为进行中
                </button>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

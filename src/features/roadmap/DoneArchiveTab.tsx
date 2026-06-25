/**
 * # DoneArchiveTab — 已完成归档
 *
 * 聚焦目标子树内已完成的待办，按完成日（completedAt 本地日）分组、倒序展示。
 * 只读归档 + 取消完成（移回任务）+ 删除；无编辑/拖拽。
 * 无 completedAt 的历史已完成项归到末尾「更早」组。
 */

import { useMemo } from 'react'
import { Check, Trash2 } from 'lucide-react'
import type { Todo } from '@/domain/todo'

interface DoneArchiveTabProps {
  todos: Todo[]
  goalColorMap?: Record<string, string>
  focusGoalId: string
  onToggle: (todoId: string) => void
  onDelete: (todoId: string) => void
}

const NO_DATE = -1

function dayLabel(day: number, now: number): string {
  if (day === NO_DATE) return '更早 · 无完成日期'
  const today = new Date(now)
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const diff = Math.round((todayStart - day) / 86_400_000)
  if (diff === 0) return '今天'
  if (diff === 1) return '昨天'
  const d = new Date(day)
  return d.toLocaleDateString('zh-CN', {
    year: d.getFullYear() === today.getFullYear() ? undefined : 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

// 截到首个中文/英文冒号前，与 TaskCard 显示规则一致
function displayTitle(title: string): string {
  const i1 = title.indexOf('：')
  const i2 = title.indexOf(':')
  const idx = Math.min(i1 === -1 ? Infinity : i1, i2 === -1 ? Infinity : i2)
  return idx === Infinity ? title : title.slice(0, idx).trim()
}

export function DoneArchiveTab({ todos, goalColorMap, focusGoalId, onToggle, onDelete }: DoneArchiveTabProps) {
  const now = Date.now()

  const groups = useMemo(() => {
    const byDay = new Map<number, Todo[]>()
    for (const t of todos) {
      let key = NO_DATE
      if (t.completedAt != null) {
        const d = new Date(t.completedAt)
        key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
      }
      const arr = byDay.get(key)
      if (arr) arr.push(t)
      else byDay.set(key, [t])
    }
    return Array.from(byDay.entries())
      .sort((a, b) => {
        if (a[0] === NO_DATE) return 1
        if (b[0] === NO_DATE) return -1
        return b[0] - a[0]
      })
      .map(([day, items]) => ({
        day,
        items: items.sort((x, y) => (y.completedAt ?? 0) - (x.completedAt ?? 0)),
      }))
  }, [todos])

  if (todos.length === 0) {
    return (
      <div className="rm-archive-empty">
        还没有已完成的任务。在「任务」里勾掉的待办会归档到这里，按完成日排列。
      </div>
    )
  }

  return (
    <div className="rm-archive">
      <div className="rm-archive-head">共完成 {todos.length} 件</div>
      {groups.map((g) => (
        <div className="rm-archive-group" key={g.day}>
          <div className="rm-archive-day">
            <span className="rm-archive-day-label">{dayLabel(g.day, now)}</span>
            <span className="rm-archive-day-count">{g.items.length}</span>
          </div>
          <div className="rm-archive-items">
            {g.items.map((t) => {
              const subColor =
                t.goalId && t.goalId !== focusGoalId && goalColorMap
                  ? (goalColorMap[t.goalId] ?? null)
                  : null
              return (
                <div className="rm-archive-item" key={t.id}>
                  <button
                    className="rm-archive-check"
                    title="取消完成，移回任务"
                    onClick={() => onToggle(t.id)}
                  >
                    <Check size={11} strokeWidth={3} color="#fff" />
                  </button>
                  {subColor && (
                    <span className="rm-archive-goal-dot" style={{ background: subColor }} />
                  )}
                  <span
                    className="rm-archive-title"
                    title={t.title !== displayTitle(t.title) ? t.title : undefined}
                  >
                    {displayTitle(t.title)}
                  </span>
                  <button className="rm-archive-del" title="删除" onClick={() => onDelete(t.id)}>
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

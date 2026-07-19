import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { formatISODate, getWeekStart } from '@/domain/time'
import { useEventStore } from '@/stores/eventStore'
import { useTodoStore } from '@/stores/todoStore'
import { useProjectStore } from '@/stores/projectStore'

export function MobileSearchPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const events = useEventStore((s) => s.allEvents)
  const todos = useTodoStore((s) => s.todos)
  const projects = useProjectStore((s) => s.projects)
  const loadAllEvents = useEventStore((s) => s.loadAllEvents)

  useEffect(() => { void loadAllEvents() }, [loadAllEvents])

  const q = query.trim().toLowerCase()
  const eventResults = useMemo(
    () => q ? events.filter((e) => `${e.title} ${e.description ?? ''} ${e.location ?? ''}`.toLowerCase().includes(q)).slice(0, 20) : [],
    [events, q],
  )
  const todoResults = useMemo(
    () => q ? todos.filter((t) => `${t.title} ${t.description}`.toLowerCase().includes(q)).slice(0, 12) : [],
    [todos, q],
  )
  const projectResults = useMemo(
    () => q ? projects.filter((p) => `${p.name} ${p.description}`.toLowerCase().includes(q)).slice(0, 8) : [],
    [projects, q],
  )

  return (
    <div className="h-full overflow-y-auto px-4 pt-4 pb-28">
      <label className="flex items-center gap-2 rounded-2xl bg-surface-raised px-4 py-3 border border-border-subtle">
        <Search size={18} className="text-text-tertiary" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
          placeholder="搜索记录、任务、项目"
          className="min-w-0 flex-1 bg-transparent text-base text-text-primary outline-none placeholder:text-text-tertiary"
        />
      </label>

      <div className="mt-5 space-y-6">
        {projectResults.length > 0 && (
          <section>
            <h2 className="px-1 text-xs font-medium text-text-tertiary">项目</h2>
            <div className="mt-2 overflow-hidden rounded-2xl bg-surface-raised border border-border-subtle">
              {projectResults.map((p) => (
                <button key={p.id} onClick={() => navigate(`/projects/${p.id}`)} className="block w-full px-4 py-3 text-left text-sm text-text-primary border-b border-border-subtle last:border-b-0">
                  {p.name}
                </button>
              ))}
            </div>
          </section>
        )}

        {eventResults.length > 0 && (
          <section>
            <h2 className="px-1 text-xs font-medium text-text-tertiary">事件</h2>
            <div className="mt-2 overflow-hidden rounded-2xl bg-surface-raised border border-border-subtle">
              {eventResults.map((e) => {
                const day = new Date(e.startTime)
                const week = formatISODate(getWeekStart(day, 1))
                return (
                  <button key={e.id} onClick={() => navigate(`/day?date=${formatISODate(day)}&openEvent=${e.id}&week=${week}`)} className="block w-full px-4 py-3 text-left border-b border-border-subtle last:border-b-0">
                    <div className="text-sm text-text-primary truncate">{e.title}</div>
                    <div className="mt-0.5 font-mono text-[11px] text-text-tertiary">{day.toLocaleString()}</div>
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {todoResults.length > 0 && (
          <section>
            <h2 className="px-1 text-xs font-medium text-text-tertiary">任务</h2>
            <div className="mt-2 overflow-hidden rounded-2xl bg-surface-raised border border-border-subtle">
              {todoResults.map((t) => (
                <button key={t.id} onClick={() => navigate('/action')} className="block w-full px-4 py-3 text-left text-sm text-text-primary border-b border-border-subtle last:border-b-0">
                  {t.title}
                </button>
              ))}
            </div>
          </section>
        )}

        {q && eventResults.length + todoResults.length + projectResults.length === 0 && (
          <p className="pt-16 text-center text-sm text-text-tertiary">没有找到匹配内容</p>
        )}
      </div>
    </div>
  )
}

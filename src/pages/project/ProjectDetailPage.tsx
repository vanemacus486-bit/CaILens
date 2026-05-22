import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Archive, Lightbulb } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useProjectStore } from '@/stores/projectStore'
import { useEventStore } from '@/stores/eventStore'
import { useSopStore } from '@/stores/sopStore'
import { getInspirationRepo } from '@/data/getRepositories'
import { SopEditor } from '@/features/sop/SopEditor'
import type { InspirationLog } from '@/domain/inspiration'
import { fireAndForget } from '@/lib/fireAndForget'

export function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const language = useAppSettingsStore((s) => s.settings.language)
  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const { projects, isLoaded, loadProjects, archiveProject } = useProjectStore()
  const { events, loadAllEvents } = useEventStore()
  const { loadSops } = useSopStore()

  const [activeTab, setActiveTab] = useState<'events' | 'sop' | 'inspirations'>('events')
  const [inspirations, setInspirations] = useState<InspirationLog[]>([])

  useEffect(() => {
    if (!isLoaded) loadProjects()
    loadAllEvents()
    loadSops()
    if (projectId) {
      fireAndForget(
        getInspirationRepo().getByProject(projectId).then(setInspirations),
        'load inspirations',
      )
    }
  }, [isLoaded, loadProjects, loadAllEvents, loadSops, projectId])

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

  if (!project) {
    return (
      <div className="flex-1 h-full flex items-center justify-center">
        <p className="font-sans text-sm text-text-tertiary">
          {t('项目未找到', 'Project not found')}
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
    accent: t('主要矛盾', 'Core'),
    sage: t('次要矛盾', 'Tasks'),
    sand: t('庶务时间', 'Chores'),
    sky: t('个人提升', 'Growth'),
    rose: t('休息娱乐', 'Leisure'),
    stone: t('睡眠时长', 'Sleep'),
  }

  return (
    <div className="flex-1 h-full overflow-y-auto p-6 md:p-8">
      {/* 返回 */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm font-sans text-text-secondary hover:text-text-primary cursor-pointer bg-transparent border-none transition-colors mb-6"
      >
        <ArrowLeft size={16} strokeWidth={1.75} />
        {t('返回', 'Back')}
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
              {t('累计', 'Total')} {Math.round(totalMinutes)}
              {t('分钟', 'min')}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>
              {projectEvents.length}
              {t('个事件', ' events')}
            </span>
            <span className="w-1 h-1 rounded-full bg-text-tertiary/40" />
            <span>
              {inspirations.length}
              {t('条灵感', ' inspirations')}
            </span>
          </div>
        </div>
        {project.status === 'active' && (
          <button
            onClick={() => archiveProject(project.id)}
            className="flex items-center gap-1.5 h-8 px-3 rounded-md text-xs font-sans text-text-secondary border border-border-subtle hover:bg-surface-sunken cursor-pointer bg-transparent transition-colors"
          >
            <Archive size={14} strokeWidth={1.75} />
            {t('归档', 'Archive')}
          </button>
        )}
      </div>

      {/* Tab 导航 */}
      <div className="flex gap-1 border-b border-border-subtle mb-6">
        {[
          { id: 'events' as const, label: t('事件', 'Events') },
          { id: 'sop' as const, label: t('SOP', 'SOP') },
          { id: 'inspirations' as const, label: t('灵感', 'Insights') },
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
                {t('分', 'min')}
              </span>
            </a>
          ))}
        </div>
      )}

      {activeTab === 'sop' && projectId && <SopEditor projectId={projectId} />}

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
    </div>
  )
}

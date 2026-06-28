/**
 * # SimpleSidebar — 规划/复盘页精简侧栏
 *
 * 显示域名导航（日历/规划/复盘）、规划任务过滤（仅 /action）、复盘子视图切换（仅 /stats）和设置按钮。
 * 由 Layout 按路由选择渲染，替代 /action、/stats 上的 WeekSidebar。
 * /action 时额外展示规划过滤竖向按钮列表，/stats 时额外展示图表子视图竖向切换列表。
 */

import { useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useTodoListStore } from '@/stores/todoListStore'
import { useT } from '@/i18n/useT'
import { useDomainNav } from './domainNav'
import { SlideSegmented } from './SlideSegmented'
import type { RoutineViewMode } from '@/components/stats/EasternStatsShell'
import type { LucideIcon } from 'lucide-react'
import {
  CheckCircle, Star, TrendingUp, LayoutGrid, Moon, Utensils, Droplets, Shirt, Smile,
  Plus, Trash2, Edit3,
} from 'lucide-react'
import { ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem } from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { AccountMenu } from './AccountMenu'

const STATS_VIEWS: { id: RoutineViewMode; labelKey: string; icon: LucideIcon }[] = [
  { id: 'trend',   labelKey: 'stats.trend',   icon: TrendingUp },
  { id: 'heatmap', labelKey: 'stats.heatmap', icon: LayoutGrid },
  { id: 'sleep',   labelKey: 'stats.sleep',   icon: Moon },
  { id: 'diet',    labelKey: 'stats.diet',    icon: Utensils },
  { id: 'hygiene', labelKey: 'stats.hygiene', icon: Droplets },
  { id: 'outfit',  labelKey: 'stats.outfit',  icon: Shirt },
  { id: 'mood',    labelKey: 'stats.mood',    icon: Smile },
]

export function SimpleSidebar() {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const { activeMode, navItems, handleModeChange } = useDomainNav()
  const t = useT()

  const isStats = location.pathname === '/stats'
  const isAction = location.pathname === '/action'
  const routineView = (searchParams.get('view') as RoutineViewMode | null) ?? 'trend'
  const todoFilter = (searchParams.get('filter') as 'all' | 'starred' | null) ?? 'all'

  // ── 任务列表区状态 ──
  const lists = useTodoListStore((s) => s.lists)
  const visibleListIds = useTodoListStore((s) => s.visibleListIds)
  const toggleVisibility = useTodoListStore((s) => s.toggleListVisibility)
  const renameListStore = useTodoListStore((s) => s.renameList)
  const deleteListStore = useTodoListStore((s) => s.deleteList)
  const createList = useTodoListStore((s) => s.createList)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const setRoutineView = (v: RoutineViewMode) => {
    const next = new URLSearchParams(searchParams)
    if (v === 'trend') next.delete('view')
    else next.set('view', v)
    setSearchParams(next, { replace: true })
  }

  const setTodoFilter = (v: 'all' | 'starred') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'all') next.delete('filter')
    else next.set('filter', v)
    setSearchParams(next, { replace: true })
  }

  return (
    <>
      <aside className="w-56 flex-shrink-0 flex flex-col bg-surface-raised border border-border-subtle rounded-2xl shadow-lg overflow-hidden m-3 max-md:hidden">
      {/* ── 滚动内容区 ── */}
      <div className="flex-1 flex flex-col px-4 pt-4 pb-3 overflow-y-auto">
        {/* ── 域导航：日历 / 规划 / 复盘 ── */}
        <SlideSegmented
          items={navItems}
          value={activeMode}
          onChange={handleModeChange}
          shareKey="domain"
          stretch
          shortcuts={{ calendar: 'Alt+1', plan: 'Alt+2', review: 'Alt+3' }}
        />

        {/* ── 功能区与任务列表区分隔线 ── */}
        <div className="h-px bg-border-subtle my-5" role="separator" />

        {/* ── 规划过滤（仅 /action）── */}
        {isAction && (
          <div className="flex flex-col gap-0.5">
            {([
              { id: 'all' as const, labelKey: 'sidebar.allTasks', icon: CheckCircle },
              { id: 'starred' as const, labelKey: 'sidebar.starred', icon: Star },
            ]).map((v) => {
              const Icon = v.icon
              const selected = v.id === todoFilter
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setTodoFilter(v.id)}
                  className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer border-none
                      transition-all duration-200 ease-out font-sans leading-none
                      ${selected
                        ? 'bg-accent text-white font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8'
                      }
                    `}
                >
                  <Icon size={16} strokeWidth={1.75} className={selected ? 'text-white' : 'text-text-tertiary'} />
                  <span>{t(v.labelKey)}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* ── 任务列表（仅 /action）── */}
        {isAction && (
          <div className="flex flex-col gap-0.5 mt-6">
            <div className="px-3 py-1 text-[11px] font-sans font-medium text-text-tertiary uppercase tracking-wider">
              {t('sidebar.lists')}
            </div>
            {lists.map((list) => {
              const checked = visibleListIds.includes(list.id)
              const isDefault = list.id === 'default'
              return (
                <ContextMenu key={list.id}>
                  <ContextMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={() => toggleVisibility(list.id)}
                      className={`
                        w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] cursor-pointer border-none
                        transition-all duration-200 ease-out font-sans leading-none
                        ${checked
                          ? 'text-text-primary font-medium'
                          : 'text-text-tertiary'
                        }
                        hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8
                      `}
                    >
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors
                        ${checked
                          ? 'bg-accent border-accent text-white'
                          : 'border-text-tertiary/40'
                        }`}
                      >
                        {checked && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                            <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>
                        )}
                      </div>
                      {renamingId === list.id ? (
                        <input
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => {
                            const trimmed = renameDraft.trim()
                            if (trimmed && trimmed !== list.name) renameListStore(list.id, trimmed)
                            setRenamingId(null)
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              const trimmed = renameDraft.trim()
                              if (trimmed && trimmed !== list.name) renameListStore(list.id, trimmed)
                              setRenamingId(null)
                              ;(e.target as HTMLInputElement).blur()
                            }
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          className="flex-1 bg-surface-sunken border border-border-subtle rounded px-1 py-0.5 text-[13px] font-sans text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-accent"
                          autoFocus
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : (
                        <span className="truncate">{list.name}</span>
                      )}
                    </button>
                  </ContextMenuTrigger>
                  {!isDefault && (
                    <ContextMenuContent className="w-40">
                      <ContextMenuItem
                        onSelect={() => {
                          setRenamingId(list.id)
                          setRenameDraft(list.name)
                        }}
                      >
                        <Edit3 size={14} />
                        <span>{t('sidebar.rename')}</span>
                      </ContextMenuItem>
                      <ContextMenuItem
                        onSelect={() => setDeleteConfirmId(list.id)}
                        className="text-danger focus:text-danger"
                      >
                        <Trash2 size={14} />
                        <span>{t('sidebar.deleteList')}</span>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  )}
                </ContextMenu>
              )
            })}

            {/* 新建清单 */}
            {creating ? (
              <div className="px-3 py-1">
                <input
                  value={createDraft}
                  onChange={(e) => setCreateDraft(e.target.value)}
                  onBlur={() => {
                    const trimmed = createDraft.trim()
                    if (trimmed) createList(trimmed)
                    setCreating(false)
                    setCreateDraft('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const trimmed = createDraft.trim()
                      if (trimmed) createList(trimmed)
                      setCreating(false)
                      setCreateDraft('')
                    }
                    if (e.key === 'Escape') { setCreating(false); setCreateDraft('') }
                  }}
                  placeholder={t('sidebar.newList')}
                  className="w-full bg-surface-sunken border border-border-subtle rounded px-2 py-1 text-[13px] font-sans text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  autoFocus
                />
              </div>
            ) : (
              <button
                  type="button"
                  onClick={() => setCreating(true)}
                  className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-[13px] font-sans text-text-tertiary hover:text-accent hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer border-none"
                >
                  <Plus size={14} />
                  <span>{t('sidebar.newList')}</span>
                </button>
            )}
          </div>
        )}

        {/* ── 复盘子视图切换（仅 /stats）── */}
        {isStats && (
          <div className="flex flex-col gap-0.5">
            {STATS_VIEWS.map((v) => {
              const Icon = v.icon
              const selected = v.id === routineView
              return (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => setRoutineView(v.id)}
                  className={`
                      w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] cursor-pointer border-none
                      transition-all duration-200 ease-out font-sans leading-none
                      ${selected
                        ? 'bg-accent text-white font-medium'
                        : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8'
                      }
                    `}
                >
                  <Icon size={16} strokeWidth={1.75} className={selected ? 'text-white' : 'text-text-tertiary'} />
                  <span>{t(v.labelKey)}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* ── 账户（底部固定）── */}
      <div className="px-4 pb-4 pt-2 border-t border-border-subtle flex-shrink-0">
        <AccountMenu variant="sidebar" />
      </div>
    </aside>

    {/* 删除确认弹窗 */}
    <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
      <AlertDialogContent>
        <AlertDialogTitle>
          {t('sidebar.deleteList')}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {t('sidebar.deleteListDesc')}
        </AlertDialogDescription>
        <div className="flex justify-end gap-2 mt-4">
          <AlertDialogCancel className="px-3 py-1.5 text-sm font-sans rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-sunken transition-colors">
            {t('common.cancel')}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async () => {
              if (deleteConfirmId) {
                // 删除该清单下的所有待办
                const { getTodoRepo } = await import('@/data/getRepositories')
                const todos = await getTodoRepo().getByListId(deleteConfirmId)
                await Promise.all(todos.map((t) => getTodoRepo().delete(t.id)))
                // 再删清单
                deleteListStore(deleteConfirmId)
                setDeleteConfirmId(null)
              }
            }}
            className="px-3 py-1.5 text-sm font-sans rounded-lg bg-danger text-white hover:bg-danger/80 transition-colors"
          >
            {t('common.delete')}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
    </>
  )
}

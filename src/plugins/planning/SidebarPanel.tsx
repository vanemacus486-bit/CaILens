/**
 * # PlanningSidebarPanel — 规划域的侧栏内容
 *
 * 从 UnifiedSidebar 的 `/action` 分支抽出。侧栏只负责三件事：
 * 任务筛选（全部 / 星标）、清单列表（勾选可见性 + 拖拽排序 + 右键菜单）、新建清单。
 *
 * 只依赖 `stores/todo*` 与 `domain/`，不 import 主体 UI，符合插件契约。
 */

import { useCallback, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CheckCircle, Edit3, Palette, Plus, Star, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CategoryId } from '@/domain/category'
import { EVENT_COLOR_LABELS } from '@/domain/event'
import { useTodoListStore } from '@/stores/todoListStore'
import { useTodoStore } from '@/stores/todoStore'
import { DragSortableList } from '@/components/ui/DragSortableList'
import { useT } from '@/i18n/useT'
import type { TranslationKey } from '@/i18n/translations'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from '@/components/ui/context-menu'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

const CATEGORY_IDS: readonly CategoryId[] = ['accent', 'sage', 'sand', 'sky', 'rose', 'stone']

const FILTERS: { id: 'all' | 'starred'; labelKey: TranslationKey; icon: LucideIcon }[] = [
  { id: 'all', labelKey: 'sidebar.allTasks', icon: CheckCircle },
  { id: 'starred', labelKey: 'sidebar.starred', icon: Star },
]

export function PlanningSidebarPanel() {
  const t = useT()
  const [searchParams, setSearchParams] = useSearchParams()

  const lists = useTodoListStore((s) => s.lists)
  const visibleListIds = useTodoListStore((s) => s.visibleListIds)
  const toggleVisibility = useTodoListStore((s) => s.toggleListVisibility)
  const renameList = useTodoListStore((s) => s.renameList)
  const changeListCategory = useTodoListStore((s) => s.changeListCategory)
  const deleteList = useTodoListStore((s) => s.deleteList)
  const createList = useTodoListStore((s) => s.createList)
  const reorderLists = useTodoListStore((s) => s.reorderLists)
  const deleteTodo = useTodoStore((s) => s.deleteTodo)

  const todoFilter = (searchParams.get('filter') as 'all' | 'starred' | null) ?? 'all'
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameDraft, setRenameDraft] = useState('')
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState('')
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)

  const setTodoFilter = useCallback((v: 'all' | 'starred') => {
    const next = new URLSearchParams(searchParams)
    if (v === 'all') next.delete('filter')
    else next.set('filter', v)
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])

  const commitRename = useCallback((id: string) => {
    const next = renameDraft.trim()
    if (next) void renameList(id, next)
    setRenamingId(null)
  }, [renameDraft, renameList])

  const commitCreate = useCallback(() => {
    const next = createDraft.trim()
    if (next) void createList(next)
    setCreating(false)
    setCreateDraft('')
  }, [createDraft, createList])

  /** 删清单连带软删除其下待办：走 todoStore 才能同步内存，避免界面残留 */
  const confirmDelete = useCallback(async () => {
    if (!deleteConfirmId) return
    const ids = useTodoStore.getState().todos.filter((todo) => todo.listId === deleteConfirmId).map((todo) => todo.id)
    await Promise.all(ids.map((id) => deleteTodo(id)))
    await deleteList(deleteConfirmId)
    setDeleteConfirmId(null)
  }, [deleteConfirmId, deleteTodo, deleteList])

  return (
    <>
      {/* 任务筛选 */}
      <div className="flex flex-col gap-0.5">
        {FILTERS.map(({ id, labelKey, icon: Icon }) => {
          const selected = id === todoFilter
          return (
            <button key={id} type="button" onClick={() => setTodoFilter(id)}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm cursor-pointer border-none transition-all duration-200 ease-out font-sans leading-none ${
                selected
                  ? 'bg-accent text-white font-medium'
                  : 'text-text-secondary hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8'
              }`}>
              <Icon size={16} strokeWidth={1.75} className={selected ? 'text-white' : 'text-text-tertiary'} />
              <span>{t(labelKey)}</span>
            </button>
          )
        })}
      </div>

      {/* 清单列表 */}
      <div className="flex flex-col gap-0.5 mt-6">
        <div className="px-3 py-1 text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider">
          {t('sidebar.lists')}
        </div>
        <DragSortableList items={lists} keyExtractor={(list) => list.id} onReorder={reorderLists}>
          {(list, _index, { isDragging, dropPosition, dragEventHandlers }) => {
            const checked = visibleListIds.includes(list.id)
            const isDefault = list.id === 'default'
            return (
              <div key={list.id} className="relative">
                {dropPosition === 'before' && (
                  <div className="absolute top-0 left-2 right-2 h-0.5 bg-accent rounded-full -translate-y-1/2 z-10 pointer-events-none" />)}
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <button type="button" {...dragEventHandlers} onClick={() => toggleVisibility(list.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm cursor-pointer border-none transition-all duration-200 ease-out font-sans leading-none select-none ${
                        isDragging ? 'opacity-40' : ''} ${
                        checked ? 'text-text-primary font-medium' : 'text-text-tertiary'}
                        hover:text-text-primary hover:bg-black/5 dark:hover:bg-white/8`}>
                      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        checked ? 'bg-accent border-accent text-white' : 'border-text-tertiary/40'}`}>
                        {checked && (
                          <svg viewBox="0 0 12 12" className="w-2.5 h-2.5 fill-current">
                            <path d="M3 6l2 2 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" />
                          </svg>)}
                      </div>
                      {list.categoryId && (
                        <span className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: `var(--event-${list.categoryId}-fill)` }} />)}
                      {renamingId === list.id ? (
                        <input value={renameDraft} onChange={(e) => setRenameDraft(e.target.value)}
                          onBlur={() => commitRename(list.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { commitRename(list.id); (e.target as HTMLInputElement).blur() }
                            if (e.key === 'Escape') setRenamingId(null)
                          }}
                          className="flex-1 bg-surface-sunken border border-border-subtle rounded px-1 py-0.5 text-sm font-sans text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-accent" autoFocus
                          onClick={(e) => e.stopPropagation()} />
                      ) : (
                        <span className="truncate">{list.name}</span>)}
                    </button>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-44">
                    <ContextMenuSub>
                      <ContextMenuSubTrigger><Palette size={14} /><span>{t('sidebar.changeCategory')}</span></ContextMenuSubTrigger>
                      <ContextMenuSubContent className="w-auto p-2">
                        <div className="flex items-center gap-1.5">
                          {CATEGORY_IDS.map((cid) => {
                            const active = list.categoryId === cid
                            return (
                              <ContextMenuItem key={cid} aria-label={EVENT_COLOR_LABELS[cid]}
                                onSelect={() => void changeListCategory(list.id, active ? null : cid)}
                                className={`w-5 h-5 p-0 justify-center rounded-full border-2 transition-transform focus:scale-110 ${active ? 'border-text-primary scale-110' : 'border-transparent'}`}
                                style={{ backgroundColor: `var(--event-${cid}-fill)` }} />)
                          })}
                        </div>
                      </ContextMenuSubContent>
                    </ContextMenuSub>
                    {!isDefault && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem onSelect={() => { setRenamingId(list.id); setRenameDraft(list.name) }}>
                          <Edit3 size={14} /><span>{t('sidebar.rename')}</span></ContextMenuItem>
                        <ContextMenuItem onSelect={() => setDeleteConfirmId(list.id)} className="text-danger focus:text-danger">
                          <Trash2 size={14} /><span>{t('sidebar.deleteList')}</span></ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
                {dropPosition === 'after' && (
                  <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent rounded-full translate-y-1/2 z-10 pointer-events-none" />)}
              </div>
            )
          }}
        </DragSortableList>

        {creating ? (
          <div className="px-3 py-1">
            <input value={createDraft} onChange={(e) => setCreateDraft(e.target.value)}
              onBlur={commitCreate}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitCreate()
                if (e.key === 'Escape') { setCreating(false); setCreateDraft('') }
              }}
              placeholder={t('sidebar.newList')}
              className="w-full bg-surface-sunken border border-border-subtle rounded px-2 py-1 text-sm font-sans text-text-primary placeholder:text-text-tertiary outline-none focus-visible:ring-1 focus-visible:ring-accent" autoFocus />
          </div>
        ) : (
          <button type="button" onClick={() => setCreating(true)}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm font-sans text-text-tertiary hover:text-accent hover:bg-black/5 dark:hover:bg-white/8 transition-colors cursor-pointer border-none">
            <Plus size={14} /><span>{t('sidebar.newList')}</span></button>
        )}
      </div>

      <AlertDialog open={!!deleteConfirmId} onOpenChange={(open) => { if (!open) setDeleteConfirmId(null) }}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('sidebar.deleteList')}</AlertDialogTitle>
          <AlertDialogDescription>{t('sidebar.deleteListDesc')}</AlertDialogDescription>
          <div className="flex justify-end gap-2 mt-4">
            <AlertDialogCancel className="px-3 py-1.5 text-sm font-sans rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-sunken transition-colors">
              {t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()}
              className="px-3 py-1.5 text-sm font-sans rounded-lg bg-danger text-white hover:bg-danger/80 transition-colors">
              {t('common.delete')}</AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

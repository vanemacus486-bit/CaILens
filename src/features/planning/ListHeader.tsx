/**
 * # ListHeader — 清单头部
 *
 * 左：当前清单名（点击→切换菜单）+ 右：⋮ 溢出菜单（重命名/删除/清除已完成/排序）
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { MoreHorizontal, Plus, Trash2, Edit3, List, SortAsc, Eraser, Star } from 'lucide-react'
import type { TodoList } from '@/domain/todo'
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'

export type SortMode = 'manual' | 'dueDate'

interface ListHeaderProps {
  activeList: TodoList | undefined
  allLists: TodoList[]
  sortMode: SortMode
  filterMode?: 'all' | 'starred'
  simplified?: boolean
  onSortModeChange: (mode: SortMode) => void
  onSelectList: (id: string) => void
  onCreateList: (name: string) => void
  onRenameList: (id: string, name: string) => void
  onDeleteList: (id: string) => void
  onClearCompleted: (id: string) => void
}

export function ListHeader({
  activeList, allLists, sortMode, filterMode = 'all', simplified = false, onSortModeChange,
  onSelectList, onCreateList, onRenameList, onDeleteList, onClearCompleted,
}: ListHeaderProps) {
  const [listSwitcherOpen, setListSwitcherOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [renaming, setRenaming] = useState(false)
  const [renameDraft, setRenameDraft] = useState(activeList?.name ?? '')
  const [creating, setCreating] = useState(false)
  const [createDraft, setCreateDraft] = useState('')
  const renameRef = useRef<HTMLInputElement>(null)
  const createRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (renaming) requestAnimationFrame(() => renameRef.current?.focus())
  }, [renaming])

  useEffect(() => {
    if (creating) requestAnimationFrame(() => createRef.current?.focus())
  }, [creating])

  const handleRename = useCallback(() => {
    const trimmed = renameDraft.trim()
    if (trimmed && activeList && trimmed !== activeList.name) {
      onRenameList(activeList.id, trimmed)
    }
    setRenaming(false)
  }, [renameDraft, activeList, onRenameList])

  const handleCreate = useCallback(() => {
    const trimmed = createDraft.trim()
    if (trimmed) {
      onCreateList(trimmed)
      setCreateDraft('')
    }
    setCreating(false)
  }, [createDraft, onCreateList])

  const listName = activeList?.name ?? '默认'
  const isStarred = filterMode === 'starred'

  if (isStarred) {
    return (
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
        {/* 静态 "已加星标" 标题 */}
        <div className="flex items-center gap-2 text-base font-sans font-medium text-text-primary">
          <Star size={16} className="text-accent" fill="currentColor" />
          <span>已加星标</span>
        </div>

        {/* ⋮ 菜单 — 仅保留排序 */}
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
              <MoreHorizontal size={18} />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1">
            <button
              onClick={() => { onSortModeChange(sortMode === 'manual' ? 'dueDate' : 'manual'); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-text-primary hover:bg-surface-sunken rounded transition-colors"
            >
              <SortAsc size={14} />
              <span>{sortMode === 'manual' ? '按日期排序' : '手动排序'}</span>
            </button>
          </PopoverContent>
        </Popover>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
      {/* 清单名 + 切换（simplified 时仅显示名称） */}
      {simplified ? (
        <div className="flex items-center gap-2 text-base font-sans font-medium text-text-primary">
          <List size={16} className="text-accent" />
          <span>{listName}</span>
        </div>
      ) : (
        <Popover open={listSwitcherOpen} onOpenChange={setListSwitcherOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 text-base font-sans font-medium text-text-primary hover:text-accent transition-colors">
              <List size={16} className="text-accent" />
              {renaming ? (
                <input
                  ref={renameRef}
                  value={renameDraft}
                  onChange={(e) => setRenameDraft(e.target.value)}
                  onBlur={handleRename}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRename()
                    if (e.key === 'Escape') setRenaming(false)
                  }}
                  className="bg-surface-sunken border border-border-subtle rounded px-1 py-0.5 text-sm font-sans text-text-primary outline-none focus-visible:ring-1 focus-visible:ring-accent"
                  onClick={(e) => e.stopPropagation()}
                  autoFocus
                />
              ) : (
                <span>{listName}</span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-56 p-1">
            <div className="py-1 max-h-60 overflow-y-auto">
              {allLists.map((list) => (
                <button
                  key={list.id}
                  onClick={() => { onSelectList(list.id); setListSwitcherOpen(false) }}
                  className={`w-full text-left px-3 py-1.5 text-sm font-sans rounded transition-colors
                    ${list.id === activeList?.id
                      ? 'bg-accent/10 text-accent font-medium'
                      : 'text-text-primary hover:bg-surface-sunken'}`}
                >
                  {list.name}
                </button>
              ))}
            </div>
            {creating ? (
              <div className="border-t border-border-subtle pt-1 px-1">
                <input
                  ref={createRef}
                  value={createDraft}
                  onChange={(e) => setCreateDraft(e.target.value)}
                  onBlur={handleCreate}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setCreating(false); setCreateDraft('') }
                  }}
                  placeholder="清单名称"
                  className="w-full bg-surface-sunken border border-border-subtle rounded px-2 py-1 text-sm font-sans text-text-primary placeholder:text-text-tertiary outline-none"
                  autoFocus
                />
              </div>
            ) : (
              <button
                onClick={() => { setCreating(true); setListSwitcherOpen(true) }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-text-secondary hover:text-accent transition-colors border-t border-border-subtle mt-1 pt-1"
              >
                <Plus size={14} />
                <span>新建清单</span>
              </button>
            )}
          </PopoverContent>
        </Popover>
      )}

      {/* ⋮ 菜单 */}
      <Popover open={menuOpen} onOpenChange={setMenuOpen}>
        <PopoverTrigger asChild>
          <button className="p-1 rounded text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors">
            <MoreHorizontal size={18} />
          </button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-48 p-1">
          {activeList?.id !== 'default' && (
            <button
              onClick={() => { setRenaming(true); setMenuOpen(false) }}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-text-primary hover:bg-surface-sunken rounded transition-colors"
            >
              <Edit3 size={14} />
              <span>重命名清单</span>
            </button>
          )}
          <button
            onClick={() => { onClearCompleted(activeList?.id ?? 'default'); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-text-primary hover:bg-surface-sunken rounded transition-colors"
          >
            <Eraser size={14} />
            <span>清除已完成</span>
          </button>
          <div className="border-t border-border-subtle my-1" />
          <button
            onClick={() => { onSortModeChange(sortMode === 'manual' ? 'dueDate' : 'manual'); setMenuOpen(false) }}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-text-primary hover:bg-surface-sunken rounded transition-colors"
          >
            <SortAsc size={14} />
            <span>{sortMode === 'manual' ? '按日期排序' : '手动排序'}</span>
          </button>
          {activeList?.id !== 'default' && (
            <>
              <div className="border-t border-border-subtle my-1" />
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    onClick={() => setMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-3 py-1.5 text-sm font-sans text-danger hover:bg-danger/10 rounded transition-colors"
                  >
                    <Trash2 size={14} />
                    <span>删除清单</span>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogTitle>删除清单「{listName}」</AlertDialogTitle>
                  <AlertDialogDescription>
                    将同时删除该清单下的所有任务，此操作不可撤销。
                  </AlertDialogDescription>
                  <div className="flex justify-end gap-2 mt-4">
                    <AlertDialogCancel className="px-3 py-1.5 text-sm font-sans rounded-lg border border-border-subtle text-text-secondary hover:bg-surface-sunken transition-colors">
                      取消
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => onDeleteList(activeList?.id ?? 'default')}
                      className="px-3 py-1.5 text-sm font-sans rounded-lg bg-danger text-white hover:bg-danger/80 transition-colors"
                    >
                      删除
                    </AlertDialogAction>
                  </div>
                </AlertDialogContent>
              </AlertDialog>
            </>
          )}
        </PopoverContent>
      </Popover>
    </div>
  )
}

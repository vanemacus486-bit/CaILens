/**
 * # todoListStore — 待办清单状态管理
 *
 * Zustand 切片，包裹 TodoListRepository。
 * 组件只通过此 store 访问清单数据。
 */

import { create } from 'zustand'
import type { TodoList } from '@/domain/todo'
import { getTodoListRepo } from '@/data/getRepositories'

const LS_KEY = 'cailens_active_list_id'
const VISIBLE_LS_KEY = 'cailens_visible_list_ids'

interface TodoListState {
  lists: TodoList[]
  activeListId: string
  /** 看板中可见的清单 id 列表（勾选控制） */
  visibleListIds: string[]
  isLoading: boolean
  isLoaded: boolean

  loadLists: () => Promise<void>
  createList: (name: string) => Promise<TodoList>
  renameList: (id: string, name: string) => Promise<void>
  deleteList: (id: string) => Promise<void>
  setActiveList: (id: string) => void
  clearCompleted: (listId: string) => Promise<void>
  toggleListVisibility: (id: string) => void
  /** 拖拽排序：传入新的 ID 有序数组，更新 sortOrder 并持久化 */
  reorderLists: (orderedIds: string[]) => Promise<void>
}

export const useTodoListStore = create<TodoListState>()((set) => ({
  lists: [],
  activeListId: 'default',
  visibleListIds: [],
  isLoading: false,
  isLoaded: false,

  loadLists: async () => {
    set({ isLoading: true })
    try {
      await getTodoListRepo().ensureDefault()
      const lists = await getTodoListRepo().getAll()
      // Sort by sortOrder
      lists.sort((a, b) => a.sortOrder - b.sortOrder)

      // Restore active list from localStorage, fallback to first or default
      let activeId = localStorage.getItem(LS_KEY)
      if (activeId && !lists.find((l) => l.id === activeId)) {
        activeId = null
      }
      if (!activeId) {
        const defaultList = lists.find((l) => l.id === 'default')
        activeId = defaultList?.id ?? lists[0]?.id ?? 'default'
      }

      // Restore visible list ids from localStorage
      let visibleIds: string[] = []
      try {
        const raw = localStorage.getItem(VISIBLE_LS_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as string[]
          // Only keep ids that still exist
          visibleIds = parsed.filter((id) => lists.find((l) => l.id === id))
        }
      } catch {
        // corrupt localStorage, fall through
      }
      if (visibleIds.length === 0) {
        visibleIds = ['default']
      }

      set({ lists, activeListId: activeId, visibleListIds: visibleIds, isLoading: false, isLoaded: true })
    } catch (e) {
      // 即使持久层失败也确保 UI 可用：至少有一个默认清单列
      const now = Date.now()
      set({
        lists: [{ id: 'default', name: '默认', sortOrder: -1, createdAt: now, updatedAt: now }],
        visibleListIds: ['default'],
        isLoading: false,
        isLoaded: true,
      })
      console.error('Failed to load todo lists:', e)
    }
  },

  createList: async (name) => {
    const list = await getTodoListRepo().create(name)
    set((state) => ({
      lists: [...state.lists, list].sort((a, b) => a.sortOrder - b.sortOrder),
    }))
    return list
  },

  renameList: async (id, name) => {
    if (id === 'default') return
    const updated = await getTodoListRepo().update(id, { name })
    set((state) => ({
      lists: state.lists.map((l) => (l.id === id ? updated : l)),
    }))
  },

  deleteList: async (id) => {
    if (id === 'default') return
    await getTodoListRepo().delete(id)
    set((state) => {
      const remaining = state.lists.filter((l) => l.id !== id)
      let newActiveId = state.activeListId
      if (state.activeListId === id) {
        newActiveId = remaining[0]?.id ?? 'default'
        localStorage.setItem(LS_KEY, newActiveId)
      }
      const newVisible = state.visibleListIds.filter((vid) => vid !== id)
      localStorage.setItem(VISIBLE_LS_KEY, JSON.stringify(newVisible))
      return { lists: remaining, activeListId: newActiveId, visibleListIds: newVisible }
    })
  },

  setActiveList: (id) => {
    localStorage.setItem(LS_KEY, id)
    set({ activeListId: id })
  },

  clearCompleted: async (_listId) => {
    // 已完成待办保留在数据库中（归档面板可读取），无需额外操作
  },

  toggleListVisibility: (id) => {
    set((state) => {
      const next = state.visibleListIds.includes(id)
        ? state.visibleListIds.filter((vid) => vid !== id)
        : [...state.visibleListIds, id]
      localStorage.setItem(VISIBLE_LS_KEY, JSON.stringify(next))
      return { visibleListIds: next }
    })
  },

  reorderLists: async (orderedIds) => {
    const repo = getTodoListRepo()
    // 批量更新 sortOrder
    await Promise.all(
      orderedIds.map((id, index) => repo.update(id, { sortOrder: index })),
    )
    // 更新本地状态
    set((state) => {
      const idToOrder = new Map(orderedIds.map((id, i) => [id, i]))
      const reordered = [...state.lists].sort(
        (a, b) => (idToOrder.get(a.id) ?? Infinity) - (idToOrder.get(b.id) ?? Infinity),
      )
      return { lists: reordered }
    })
  },
}))

/**
 * # watchdog — 文件系统变更监听 → Store 自动刷新
 *
 * 当用户直接在文件夹中修改 todos.json / events.json 等数据文件时，
 * FileSystemAdapter 能监听到变更并更新内存索引，但 Zustand stores
 * 不会自动感知。此模块连接两端。
 */

import type { FileSystemAdapter } from '@/data/adapters/FileSystemAdapter'
import { clearEventCache } from './eventStore'
import { useEventStore } from './eventStore'
import { useTodoStore } from './todoStore'
import { useProjectStore } from './projectStore'

/**
 * 挂起文件系统监听，数据变更时自动刷新所有相关 store。
 *
 * 在 App 启动时（main.tsx bootstrap）调用一次即可。
 */
export async function startFsWatcher(adapter: FileSystemAdapter): Promise<void> {
  await adapter.startWatching(async () => {
    // 清空事件缓存，确保下次读取从磁盘重新加载
    clearEventCache()

    // 并行刷新三个 store（各自从已更新的 MemoryIndex 读取）
    await Promise.all([
      useTodoStore.getState().loadTodos().catch(() => {}),
      useProjectStore.getState().loadAll().catch(() => {}),
      useEventStore.getState().loadAllEvents().catch(() => {}),
    ])
  })
}

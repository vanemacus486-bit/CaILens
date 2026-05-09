import type { StorageAdapter } from './adapters/StorageAdapter'
import { indexedDBAdapter } from './adapters/IndexedDBAdapter'
import { isTauri } from './tauriFs'

let _adapter: StorageAdapter | null = null

export async function getAdapter(): Promise<StorageAdapter> {
  if (_adapter) return _adapter

  if (isTauri()) {
    const { FileSystemAdapter } = await import('./adapters/FileSystemAdapter')
    _adapter = new FileSystemAdapter()
    await _adapter.initialize()

    // First run: no storage path configured — show native folder picker
    if (!_adapter.storagePath) {
      try {
        const { open } = await import('@tauri-apps/plugin-dialog')
        const selected = await open({
          directory: true,
          multiple: false,
          title: 'Select Storage Folder',
        })
        if (selected) {
          const path = Array.isArray(selected) ? selected[0] : selected
          if (path) {
            const fs = _adapter as any
            fs.setRootPath(path)
            await fs.fullScan()
            await fs.persistConfig()
          }
        }
      } catch {
        // Dialog unavailable — user can set folder later from Settings
      }
    }
  } else {
    _adapter = indexedDBAdapter
    await _adapter.initialize()
  }

  return _adapter
}

export function getAdapterSync(): StorageAdapter {
  if (!_adapter) throw new Error('Adapter not initialized. Call getAdapter() first.')
  return _adapter
}

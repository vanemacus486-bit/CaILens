import type { StorageAdapter } from './adapters/StorageAdapter'
import { indexedDBAdapter } from './adapters/IndexedDBAdapter'
import { isTauri } from './tauriFs'

let _adapter: StorageAdapter | null = null

export async function getAdapter(): Promise<StorageAdapter> {
  if (_adapter) return _adapter

  if (isTauri()) {
    const { FileSystemAdapter } = await import('./adapters/FileSystemAdapter')
    const fsAdapter = new FileSystemAdapter()
    await fsAdapter.initialize()

    if (fsAdapter.storagePath) {
      _adapter = fsAdapter
    } else {
      // No file-system storage configured — fall back to IndexedDB
      _adapter = indexedDBAdapter
      await _adapter.initialize()
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

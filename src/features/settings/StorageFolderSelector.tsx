import { useState } from 'react'
import { FolderOpen, RefreshCw, Folder } from 'lucide-react'
import { getAdapterSync } from '@/data/adapterFactory'
import { isTauri } from '@/data/tauriFs'
import type { StorageAdapter } from '@/data/adapters/StorageAdapter'

export function StorageFolderSelector() {
  const [adapter] = useState<StorageAdapter>(() => getAdapterSync())
  const [path, setPath] = useState<string | null>(adapter.storagePath)
  const [scanning, setScanning] = useState(false)

  const handleSelect = async () => {
    if (!isTauri()) return
    try {
      const { open } = await import('@tauri-apps/plugin-dialog')
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择数据文件夹',
      })
      if (selected) {
        const resolved = Array.isArray(selected) ? selected[0] : selected
        if (resolved) {
          // We need the FileSystemAdapter's setRootPath + fullScan + persistConfig
          const fs = adapter as unknown as {
            setRootPath(p: string): void
            fullScan(): Promise<void>
            persistConfig(): Promise<void>
          }
          fs.setRootPath(resolved)
          await fs.fullScan()
          await fs.persistConfig()
          setPath(resolved)
        }
      }
    } catch (err) {
      console.error('[StorageFolderSelector] dialog error:', err)
    }
  }

  const handleRescan = async () => {
    setScanning(true)
    try {
      const fs = adapter as unknown as {
        fullScan(): Promise<void>
      }
      await fs.fullScan()
    } finally {
      setScanning(false)
    }
  }

  if (!isTauri()) return null

  return (
    <div className="bg-surface-raised border border-border-subtle rounded-xl px-5 py-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Folder size={14} className="text-text-tertiary flex-shrink-0" strokeWidth={1.75} />
          <span className="text-xs text-text-tertiary truncate">
            {path ?? '未设置存储文件夹'}
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {path && (
            <button
              onClick={handleRescan}
              disabled={scanning}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-body-xs text-text-secondary hover:text-text-primary bg-surface-base hover:bg-surface-sunken rounded-lg transition-colors duration-150 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw size={12} strokeWidth={1.75} className={scanning ? 'animate-spin' : ''} />
              {'重新扫描'}
            </button>
          )}
          <button
            onClick={handleSelect}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-body-xs text-text-secondary hover:text-text-primary bg-surface-base hover:bg-surface-sunken rounded-lg transition-colors duration-150 cursor-pointer"
          >
            <FolderOpen size={12} strokeWidth={1.75} />
            {path ? '更换文件夹' : '选择文件夹'}
          </button>
        </div>
      </div>
    </div>
  )
}

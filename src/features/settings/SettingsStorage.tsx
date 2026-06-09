import { FolderOpen, RefreshCw, Folder } from 'lucide-react'
import { getAdapterSync } from '@/data/adapterFactory'
import { isTauri } from '@/data/tauriFs'
import type { StorageAdapter } from '@/data/adapters/StorageAdapter'
import { useState } from 'react'

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
    <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Folder size={14} strokeWidth={1.75} className="text-text-tertiary flex-shrink-0" />
          <h2 className="text-xs font-sans font-medium text-text-tertiary uppercase tracking-wider">
            存储文件夹
          </h2>
        </div>
        <p className="text-xs text-text-tertiary mb-3 ml-6">
          选择 Tauri 应用的文件存储根目录
        </p>

        <div className="flex items-center justify-between bg-surface-sunken rounded-lg px-3.5 py-2.5">
          <div className="flex items-center gap-2 min-w-0 mr-3">
            {path ? (
              <span className="text-xs font-mono text-text-secondary truncate">
                {path}
              </span>
            ) : (
              <span className="text-xs font-sans text-text-tertiary italic">
                未设置
              </span>
            )}
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {path && (
              <button
                onClick={handleRescan}
                disabled={scanning}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans text-text-secondary hover:text-text-primary bg-surface-raised hover:bg-surface-base rounded-md transition-colors duration-150 cursor-pointer disabled:opacity-50 border border-border-subtle"
              >
                <RefreshCw size={12} strokeWidth={1.75} className={scanning ? 'animate-spin' : ''} />
                重新扫描
              </button>
            )}
            <button
              onClick={handleSelect}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-sans font-medium text-text-secondary hover:text-text-primary bg-surface-raised hover:bg-surface-base rounded-md transition-colors duration-150 cursor-pointer border border-border-subtle"
            >
              <FolderOpen size={12} strokeWidth={1.75} />
              {path ? '更换文件夹' : '选择文件夹'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

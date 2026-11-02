import { useState } from 'react'
import { FolderOpen, RefreshCw } from 'lucide-react'
import { getAdapterSync } from '@/data/adapterFactory'
import { isTauri } from '@/data/tauriFs'
import type { StorageAdapter } from '@/data/adapters/StorageAdapter'
import { SettingsButton, SettingsRow } from './ui'

/**
 * 存储位置行。
 *
 * 以前这里自带一张卡片与标题，嵌进设置页就会「卡片套卡片」。现在只输出一条
 * `SettingsRow`：左侧标题 + 路径，右侧「重新扫描 / 更换文件夹」。
 * 非桌面端没有文件系统访问，整行不渲染。
 */
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
    <SettingsRow
      anchor="file-storage"
      title="存储位置"
      description={
        <span className="break-all font-mono text-xs">
          {path ?? '未设置存储文件夹'}
        </span>
      }
    >
      {path && (
        <SettingsButton onClick={handleRescan} disabled={scanning}>
          <RefreshCw
            size={12}
            strokeWidth={1.75}
            className={scanning ? 'animate-spin' : undefined}
          />
          重新扫描
        </SettingsButton>
      )}
      <SettingsButton onClick={handleSelect}>
        <FolderOpen size={12} strokeWidth={1.75} />
        {path ? '更换文件夹' : '选择文件夹'}
      </SettingsButton>
    </SettingsRow>
  )
}

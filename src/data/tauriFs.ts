/**
 * Typed TypeScript wrappers around Tauri custom Rust commands for file system operations.
 * Only available when running inside a Tauri WebView.
 */

export interface FileEntry {
  path: string
  modified: number
}

export interface FileEntryWithContent {
  path: string
  modified: number
  content: string
}

export interface FsChangeEvent {
  kind: 'create' | 'modify' | 'remove'
  path: string
}

let _tauriInvoke: typeof import('@tauri-apps/api/core').invoke | null = null
let _tauriListen: typeof import('@tauri-apps/api/event').listen | null = null

// ── 自写抑制 ──────────────────────────────────────────────────
// 应用自己写盘(todos.json / events 等)会被 OS 文件监听器当成变更,
// 触发 fullScan + store 重载 → 回声风暴(卡顿)甚至已删条目复活。
// 这里记录"最近一次自写",让 FileSystemAdapter 的监听器能跳过自身写入。
const SELF_WRITE_SUPPRESS_MS = 1500
let _lastSelfWriteAt = 0
let _selfWriteSeq = 0

/** 标记应用刚刚写盘(由 write/delete/createDir 包装器调用)。 */
export function markSelfWrite(): void {
  _lastSelfWriteAt = Date.now()
  _selfWriteSeq++
}

/** `now` 是否落在最近一次自写后的抑制窗口内(用于廉价地跳过自写回声)。 */
export function isWithinSelfWriteWindow(now: number = Date.now()): boolean {
  return now - _lastSelfWriteAt < SELF_WRITE_SUPPRESS_MS
}

/** 单调递增的自写序号 — 让一次扫描能检测"读盘期间是否发生了自写"。 */
export function getSelfWriteSeq(): number {
  return _selfWriteSeq
}

async function ensureTauri() {
  if (_tauriInvoke) return
  const core = await import('@tauri-apps/api/core')
  _tauriInvoke = core.invoke
}

async function ensureTauriListen() {
  if (_tauriListen) return
  const evt = await import('@tauri-apps/api/event')
  _tauriListen = evt.listen
}

export async function readDirRecursive(path: string): Promise<FileEntry[]> {
  await ensureTauri()
  return _tauriInvoke!('read_dir_recursive', { path })
}

export async function readDirWithContent(path: string): Promise<FileEntryWithContent[]> {
  await ensureTauri()
  return _tauriInvoke!('read_dir_with_content', { path })
}

export async function readTextFile(path: string): Promise<string> {
  await ensureTauri()
  return _tauriInvoke!('read_text_file', { path })
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureTauri()
  markSelfWrite()
  return _tauriInvoke!('write_text_file', { path, content })
}

export async function deleteFile(path: string): Promise<void> {
  await ensureTauri()
  markSelfWrite()
  return _tauriInvoke!('delete_file', { path })
}

export async function createDirAll(path: string): Promise<void> {
  await ensureTauri()
  markSelfWrite()
  return _tauriInvoke!('create_dir_all', { path })
}

export async function getNextSequence(dir: string, prefix: string): Promise<number> {
  await ensureTauri()
  return _tauriInvoke!('get_next_sequence', { dir, prefix })
}

export async function watchDir(path: string): Promise<void> {
  await ensureTauri()
  return _tauriInvoke!('watch_dir', { path })
}

export async function stopWatching(): Promise<void> {
  await ensureTauri()
  return _tauriInvoke!('stop_watching')
}

export type FsChangeListener = (event: FsChangeEvent) => void

export async function onFsChange(callback: FsChangeListener): Promise<() => void> {
  await ensureTauriListen()
  const unlisten = await _tauriListen!<FsChangeEvent>('fs-change', (event) => {
    callback(event.payload)
  })
  return unlisten
}

/** Detect if running inside Tauri WebView */
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Typed TypeScript wrappers around Tauri custom Rust commands for file system operations.
 * Only available when running inside a Tauri WebView.
 */

export interface FileEntry {
  path: string
  modified: number
}

export interface FsChangeEvent {
  kind: 'create' | 'modify' | 'remove'
  path: string
}

let _tauriInvoke: typeof import('@tauri-apps/api/core').invoke | null = null
let _tauriListen: typeof import('@tauri-apps/api/event').listen | null = null

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

export async function readTextFile(path: string): Promise<string> {
  await ensureTauri()
  return _tauriInvoke!('read_text_file', { path })
}

export async function writeTextFile(path: string, content: string): Promise<void> {
  await ensureTauri()
  return _tauriInvoke!('write_text_file', { path, content })
}

export async function deleteFile(path: string): Promise<void> {
  await ensureTauri()
  return _tauriInvoke!('delete_file', { path })
}

export async function createDirAll(path: string): Promise<void> {
  await ensureTauri()
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

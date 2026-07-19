import { Capacitor } from '@capacitor/core'
import { Directory, Encoding, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'
import { isTauri } from '@/data/tauriFs'

function browserDownload(content: string, filename: string, mime: string): void {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function safeFilename(filename: string): string {
  return filename.replace(/[\\/:*?"<>|]/g, '-')
}

function extFromMime(mime: string): string {
  if (mime.startsWith('application/json')) return 'json'
  if (mime.startsWith('text/csv')) return 'csv'
  if (mime.startsWith('text/calendar')) return 'ics'
  return mime.split('/').pop() ?? 'txt'
}

export async function saveTextFile(content: string, filename: string, mime: string): Promise<void> {
  // Tauri desktop: native save dialog → Rust write_text_file
  if (isTauri()) {
    const [{ save }, { invoke }] = await Promise.all([
      import('@tauri-apps/plugin-dialog'),
      import('@tauri-apps/api/core'),
    ])
    const ext = extFromMime(mime)
    const selected = await save({
      defaultPath: filename,
      filters: [{ name: ext.toUpperCase(), extensions: [ext] }],
    })
    if (!selected) return // user cancelled
    await invoke('write_text_file', { path: selected, content })
    return
  }

  // Capacitor mobile
  if (Capacitor.isNativePlatform()) {
    const path = `exports/${safeFilename(filename)}`
    const result = await Filesystem.writeFile({
      path,
      data: content,
      directory: Directory.Cache,
      encoding: Encoding.UTF8,
      recursive: true,
    })

    await Share.share({
      title: filename,
      text: filename,
      files: [result.uri],
      dialogTitle: filename,
    })
    return
  }

  // Browser
  browserDownload(content, filename, mime)
}

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


  // Browser
  browserDownload(content, filename, mime)
}

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getAdapter } from '@/data/adapterFactory'
import { initRepositories } from '@/data/getRepositories'
import type { FileSystemAdapter } from '@/data/adapters/FileSystemAdapter'
import './index.css'
import './styles/tokens.css'
import App from './App.tsx'

function updateSplash(percent: number, label: string) {
  const bar = document.getElementById('splash-bar-fill')
  const labelEl = document.getElementById('splash-label')
  if (bar) {
    bar.classList.remove('indeterminate')
    bar.style.width = `${percent}%`
  }
  if (labelEl) labelEl.textContent = label
}

async function bootstrap() {
  updateSplash(5, 'Detecting environment...')

  const adapter = await getAdapter()

  updateSplash(55, 'Initializing database...')
  initRepositories(adapter)

  // 文件系统变更监听：外部修改 todos.json / events.json 后自动刷新 stores
  if (adapter.storagePath) {
    const { startFsWatcher } = await import('./stores/watchdog')
    startFsWatcher(adapter as FileSystemAdapter)
  }

  updateSplash(85, 'Loading application...')

  updateSplash(100, 'Ready')
  await new Promise(r => setTimeout(r, 200))

  const splash = document.getElementById('splash-screen')
  if (splash) {
    splash.classList.add('splash-fade-out')
    await new Promise(r => setTimeout(r, 400))
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()

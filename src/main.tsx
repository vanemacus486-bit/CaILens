import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getAdapter } from '@/data/adapterFactory'
import { initRepositories } from '@/data/getRepositories'
import { useEventStore } from '@/stores/eventStore'
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

/** 启动失败时:把错误显示在启动画面上,避免无限转圈 / 静默白屏。 */
function showSplashError(message: string) {
  const bar = document.getElementById('splash-bar-fill')
  const labelEl = document.getElementById('splash-label')
  if (bar) {
    bar.classList.remove('indeterminate')
    bar.style.width = '100%'
  }
  if (labelEl) labelEl.textContent = message
}

/** React 首屏就绪后淡出并移除启动画面(splash 独立于 #root,不会被 React 清空)。 */
function fadeOutSplash() {
  const splash = document.getElementById('splash-screen')
  if (!splash) return
  splash.classList.add('splash-fade-out')
  setTimeout(() => splash.remove(), 450)
}

/**
 * 全局错误兜底。ErrorBoundary 只接得住 React 渲染期错误;异步 Promise、事件
 * 回调、文件监听回调里的抛错会绕过它,在 Tauri WebView 里表现为白屏"崩溃"。
 * 这里统一记录,既保证可观测,也阻止未处理 rejection 冒泡成默认崩溃行为。
 */
function installGlobalErrorHandlers() {
  window.addEventListener('error', (e) => {
    console.error('[GlobalError]', e.error ?? e.message)
  })
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[UnhandledRejection]', e.reason)
    e.preventDefault()
  })
}

async function bootstrap() {
  installGlobalErrorHandlers()
  updateSplash(5, 'Detecting environment...')

  const adapter = await getAdapter()

  updateSplash(55, 'Initializing database...')
  initRepositories(adapter)

  // 开发服务器：事件表为空时播种 28 天模板数据（生产构建里被 DEV 守卫消除）
  if (import.meta.env.DEV) {
    const { seedDemoData } = await import('@/data/seedDemoData')
    await seedDemoData()
  }

  updateSplash(100, 'Ready')

  // 先渲染 React，再淡出启动画面——首屏在淡出动画期间已就绪，体感更快，
  // 且去掉了此前 200ms+400ms 的纯空等。
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )

  fadeOutSplash()

  // 桌面文件存储：首屏已加载最近事件，这里在后台补全全部历史事件，
  // 完成后静默刷新当前视图；同时挂载文件变更监听。两者都不阻塞首屏。
  if (adapter.storagePath) {
    const fsAdapter = adapter as FileSystemAdapter
    fsAdapter
      .loadRemainingEvents(() => { void useEventStore.getState().reloadVisible() })
      .catch((err) => console.error('[LoadEvents]', err))
    import('./stores/watchdog')
      .then(({ startFsWatcher }) => startFsWatcher(fsAdapter))
      .catch((err) => console.error('[FsWatcher]', err))
  }
}

bootstrap().catch((err) => {
  console.error('[Bootstrap]', err)
  showSplashError(err instanceof Error ? `启动失败：${err.message}` : '启动失败，请重启应用')
})

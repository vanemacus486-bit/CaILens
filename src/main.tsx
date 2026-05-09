import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getAdapter } from '@/data/adapterFactory'
import { initRepositories } from '@/data/getRepositories'
import './index.css'
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

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { getAdapter } from '@/data/adapterFactory'
import { initRepositories } from '@/data/getRepositories'
import './index.css'
import App from './App.tsx'

async function bootstrap() {
  const adapter = await getAdapter()
  initRepositories(adapter)

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}

bootstrap()

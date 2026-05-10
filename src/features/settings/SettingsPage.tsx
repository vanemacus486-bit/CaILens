import { useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useUIStore } from '@/stores/uiStore'
import { useIsMobile } from '@/hooks/useMediaQuery'
import { MobileSettingsPage } from './MobileSettingsPage'

export function SettingsPage() {
  const isMobile = useIsMobile()

  useEffect(() => {
    if (!isMobile) {
      useUIStore.getState().setSettingsDrawerOpen(true)
    }
  }, [isMobile])

  if (isMobile) return <MobileSettingsPage />
  return <Navigate to="/" replace />
}

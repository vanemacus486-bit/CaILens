import { useEffect } from 'react'
import { App } from '@capacitor/app'
import { useLocation, useNavigate } from 'react-router-dom'
import { isNativeMobile } from '@/lib/platform'

interface AndroidBackOptions {
  closeTopOverlay?: () => boolean
}

export function useAndroidBackButton({ closeTopOverlay }: AndroidBackOptions = {}) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isNativeMobile()) return

    let remove: (() => void) | undefined
    void App.addListener('backButton', () => {
      if (closeTopOverlay?.()) return
      if (location.pathname === '/day' || location.pathname === '/') {
        void App.exitApp()
        return
      }
      navigate(-1)
    }).then((handle) => {
      remove = () => { void handle.remove() }
    })

    return () => remove?.()
  }, [closeTopOverlay, location.pathname, navigate])
}

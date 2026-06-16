import { useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, BarChart3 } from 'lucide-react'

export type DomainMode = 'calendar' | 'review'

export function useDomainNav(language: 'zh' | 'en') {
  const navigate = useNavigate()
  const location = useLocation()

  const t = (zh: string, en: string) => (language === 'zh' ? zh : en)

  const activeMode: DomainMode =
    location.pathname.startsWith('/stats') || location.pathname.startsWith('/action')
      ? 'review'
      : 'calendar'

  const navItems = [
    { id: 'calendar' as const, label: t('日历', 'Calendar'), icon: CalendarDays },
    { id: 'review'   as const, label: t('复盘', 'Review'),   icon: BarChart3   },
  ]

  const handleModeChange = (id: DomainMode) => {
    navigate(id === 'calendar' ? '/week' : '/action')
  }

  return { activeMode, navItems, handleModeChange }
}

import { useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, ListChecks, BarChart3 } from 'lucide-react'
import { useT } from '@/i18n/useT'

export type DomainMode = 'calendar' | 'plan' | 'review'

export function useDomainNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const t = useT()

  const activeMode: DomainMode =
    location.pathname.startsWith('/action')
      ? 'plan'
      : location.pathname.startsWith('/stats')
        ? 'review'
        : 'calendar'

  const navItems = [
    { id: 'calendar' as const, label: t('nav.calendar'), icon: CalendarDays },
    { id: 'plan'     as const, label: t('nav.plan'),     icon: ListChecks   },
    { id: 'review'   as const, label: t('nav.review'),   icon: BarChart3   },
  ]

  const handleModeChange = (id: DomainMode) => {
    if (id === 'plan') navigate('/action')
    else if (id === 'review') navigate('/stats')
    else navigate('/week')
  }

  return { activeMode, navItems, handleModeChange }
}

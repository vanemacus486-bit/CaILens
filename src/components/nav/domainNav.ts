import { useNavigate, useLocation } from 'react-router-dom'
import { CalendarDays, ListChecks, BarChart3 } from 'lucide-react'
import { translate } from '@/i18n/useT'
import { useAppSettingsStore } from '@/stores/settingsStore'

export type DomainMode = 'calendar' | 'plan' | 'review'

export function useDomainNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const language = useAppSettingsStore((s) => s.settings.language)

  const activeMode: DomainMode =
    location.pathname.startsWith('/action')
      ? 'plan'
      : location.pathname.startsWith('/stats')
        ? 'review'
        : 'calendar'

  // 该切换器要在窄侧边栏里三项等分挤下完整文字，只精确适配中/英；
  // 其余语言词长差异太大（如 Calendario/Planificar），一律回退英文避免溢出截断
  const navLabelLang = language === 'zh' ? 'zh' : 'en'
  const navItems = [
    { id: 'calendar' as const, label: translate('nav.calendar', navLabelLang), icon: CalendarDays },
    { id: 'plan'     as const, label: translate('nav.plan', navLabelLang),     icon: ListChecks   },
    { id: 'review'   as const, label: translate('nav.review', navLabelLang),   icon: BarChart3   },
  ]

  const handleModeChange = (id: DomainMode) => {
    if (id === 'plan') navigate('/action')
    else if (id === 'review') navigate('/stats')
    else navigate('/week')
  }

  return { activeMode, navItems, handleModeChange }
}

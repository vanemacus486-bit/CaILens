import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { formatISODate, getWeekStart, parseISODate } from '@/domain/time'

interface UseWeekFromURLResult {
  weekStart: Date
  setWeekStart: (newWeekStart: Date) => void
}

function parseWeekParam(param: string | null): Date {
  if (!param) return getWeekStart(new Date(), 1)
  try {
    const parsed = parseISODate(param)
    if (isNaN(parsed.getTime())) return getWeekStart(new Date(), 1)
    return getWeekStart(parsed, 1)
  } catch {
    return getWeekStart(new Date(), 1)
  }
}

export function useWeekFromURL(): UseWeekFromURLResult {
  const [searchParams, setSearchParams] = useSearchParams()

  const weekParam = searchParams.get('week')

  // Stable Date reference: only recomputes when the URL string value changes,
  // not on every render of the consuming component.
  const weekStart = useMemo(() => parseWeekParam(weekParam), [weekParam])

  // Stable function reference across renders.
  const setWeekStart = useCallback(
    (newWeekStart: Date) => {
      setSearchParams({ week: formatISODate(newWeekStart) })
    },
    [setSearchParams],
  )

  return { weekStart, setWeekStart }
}

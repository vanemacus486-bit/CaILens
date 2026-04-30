import { useMemo, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { startOfDay, addDays } from 'date-fns'
import { formatISODate, parseISODate } from '@/domain/time'

export function useDayFromURL() {
  const [searchParams, setSearchParams] = useSearchParams()

  const dateStr = searchParams.get('date') ?? formatISODate(new Date())

  const dayStart = useMemo(() => {
    const parsed = parseISODate(dateStr)
    return isNaN(parsed.getTime()) ? startOfDay(new Date()) : parsed
  }, [dateStr])

  const setDayStart = useCallback((date: Date) => {
    setSearchParams({ date: formatISODate(date) })
  }, [setSearchParams])

  return { dayStart, setDayStart }
}

export function getPrevDay(date: Date): Date { return addDays(date, -1) }
export function getNextDay(date: Date): Date { return addDays(date, 1) }

import { useEffect, useState } from 'react'

/**
 * Returns the current UTC timestamp (ms), updated once per minute.
 * The first update is aligned to the next whole minute boundary so
 * subsequent ticks land exactly on :00 seconds.
 */
export function useCurrentTime(): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const msUntilNextMinute = 60_000 - (Date.now() % 60_000)

    const timeout = setTimeout(() => {
      setNow(Date.now())
      const interval = setInterval(() => setNow(Date.now()), 60_000)
      return () => clearInterval(interval)
    }, msUntilNextMinute)

    return () => clearTimeout(timeout)
  }, [])

  return now
}

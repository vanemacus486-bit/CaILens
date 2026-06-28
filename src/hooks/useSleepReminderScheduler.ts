/**
 * # useSleepReminderScheduler — 就寝提醒调度 hook
 *
 * 在 App.tsx 根部挂一次。分平台逻辑：
 * - 手机：OS 原生定时通知（通过 Capacitor LocalNotifications schedule）
 * - 桌面/网页：setTimeout + visibilitychange/focus 重算
 */

import { useEffect, useRef } from 'react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { isNativeMobile } from '@/lib/platform'
import {
  nextTriggerAt,
  bedtimeToDaily,
  hasMainSleepLoggedTonight,
  type SleepReminderSettings,
  DEFAULT_SLEEP_REMINDER,
} from '@/domain/sleepReminder'
import {
  fireNotificationNow,
  scheduleDailyBedtime,
  cancelScheduledBedtime,
} from '@/lib/notify'

const LAST_FIRED_KEY = 'cailens.sleepReminder.lastFired'

function getLastFiredDate(): string | null {
  try {
    return localStorage.getItem(LAST_FIRED_KEY)
  } catch {
    return null
  }
}

function setLastFiredDate(date: string): void {
  try {
    localStorage.setItem(LAST_FIRED_KEY, date)
  } catch {
    // 静默
  }
}

function todayDateStr(nowMs: number): string {
  const d = new Date(nowMs)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function useSleepReminderScheduler(): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const settings = useAppSettingsStore((s) => s.settings)
  const events = useEventStore((s) => s.events)

  const sleepReminder: SleepReminderSettings = settings.sleepReminder ?? DEFAULT_SLEEP_REMINDER

  // ── 手机端：用 OS 原生定时 ──────────────────────────────
  useEffect(() => {
    if (!isNativeMobile()) return

    if (sleepReminder.enabled) {
      const { hour, minute } = bedtimeToDaily(sleepReminder.bedtime, sleepReminder.leadMinutes)
      scheduleDailyBedtime(hour, minute)
    } else {
      cancelScheduledBedtime()
    }

    return () => {
      cancelScheduledBedtime()
    }
  }, [sleepReminder.enabled, sleepReminder.bedtime, sleepReminder.leadMinutes])

  // ── 桌面/网页：setTimeout 调度 ───────────────────────────
  useEffect(() => {
    if (isNativeMobile()) return

    const scheduleNext = () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }

      if (!sleepReminder.enabled) return

      const now = Date.now()
      const triggerMs = nextTriggerAt(now, sleepReminder.bedtime, sleepReminder.leadMinutes)
      const delay = Math.max(0, triggerMs - now)

      timerRef.current = setTimeout(() => {
        const nowAtFire = Date.now()

        // 去重：同一日已弹过则跳过
        const today = todayDateStr(nowAtFire)
        if (getLastFiredDate() === today) {
          // 仍重排下一次
          scheduleNext()
          return
        }

        // 检查抑制条件
        const shouldSkip = sleepReminder.skipIfLogged && hasMainSleepLoggedTonight(events, nowAtFire)
        if (!shouldSkip) {
          fireNotificationNow(
            '该睡了',
            `今晚目标就寝 ${sleepReminder.bedtime}，准备休息吧`,
          )
        }

        setLastFiredDate(today)
        // 重排下一次
        scheduleNext()
      }, delay)
    }

    scheduleNext()

    // 监听 visibilitychange 和 focus 重算（防止系统休眠导致定时漂移）
    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible' || document.hasFocus()) {
        scheduleNext()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityOrFocus)
    window.addEventListener('focus', onVisibilityOrFocus)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
      document.removeEventListener('visibilitychange', onVisibilityOrFocus)
      window.removeEventListener('focus', onVisibilityOrFocus)
    }
  }, [
    sleepReminder.enabled,
    sleepReminder.bedtime,
    sleepReminder.leadMinutes,
    sleepReminder.skipIfLogged,
    events,
  ])
}

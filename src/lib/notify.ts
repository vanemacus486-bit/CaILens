/**
 * # notify — 通知抽象层
 *
 * 唯一碰触原生通知 API 的地方。按平台分流：
 * - 手机（Capacitor）：LocalNotifications.schedule / requestPermissions
 * - 桌面（Tauri）：@tauri-apps/plugin-notification
 * - 网页：Notification API
 *
 * 所有调用包 try/catch，失败不抛（降级到应用内横幅）。
 */

import { isNativeMobile, isTauriDesktop } from './platform'

// ── 权限 ────────────────────────────────────────────────────

/**
 * 请求通知权限。
 * @returns true 表示授权已授予（或降级标记为已尝试）
 */
export async function requestNotifyPermission(): Promise<boolean> {
  try {
    if (isNativeMobile()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      const result = await LocalNotifications.requestPermissions()
      return result.display === 'granted'
    }

    if (isTauriDesktop()) {
      const { isPermissionGranted, requestPermission } = await import('@tauri-apps/plugin-notification')
      const granted = await isPermissionGranted()
      if (granted) return true
      const permission = await requestPermission()
      return permission === 'granted'
    }

    // 网页
    if ('Notification' in window && Notification.permission === 'default') {
      const result = await Notification.requestPermission()
      return result === 'granted'
    }
    return 'Notification' in window && Notification.permission === 'granted'
  } catch {
    return false
  }
}

// ── 立即弹通知 ──────────────────────────────────────────────

/** 应用内降级回调：可被 hook 注册，当通知因权限不足无法弹出时调用 */
let _fallbackBanner: ((title: string, body: string) => void) | null = null

/** 注册降级横幅回调（由 BedtimeBannerHost 调用） */
export function setFallbackBanner(fn: (title: string, body: string) => void): void {
  _fallbackBanner = fn
}

/**
 * 立即弹系统通知。
 * 失败时若 _fallbackBanner 已注册则调它降级。
 */
export async function fireNotificationNow(title: string, body: string): Promise<void> {
  try {
    if (isNativeMobile()) {
      const { LocalNotifications } = await import('@capacitor/local-notifications')
      await LocalNotifications.schedule({
        notifications: [
          {
            id: Date.now(),
            title,
            body,
            schedule: { at: new Date() },
          },
        ],
      })
      return
    }

    if (isTauriDesktop()) {
      const { sendNotification, isPermissionGranted } = await import('@tauri-apps/plugin-notification')
      const granted = await isPermissionGranted()
      if (granted) {
        sendNotification({ title, body })
        return
      }
    } else if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(title, { body })
      return
    }

    // 降级
    _fallbackBanner?.(title, body)
  } catch {
    _fallbackBanner?.(title, body)
  }
}

// ── 手机定时通知（scheduleDailyBedtime / cancelScheduledBedtime）─────

/** 手机端每日就寝提醒用的固定 notification ID */
const BEDTIME_NOTIFICATION_ID = 999001

/**
 * 安排每日定时就寝通知（仅手机有效，桌面/网页为 no-op）。
 */
export async function scheduleDailyBedtime(hour: number, minute: number): Promise<void> {
  if (!isNativeMobile()) return // 桌面/网页 no-op

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    // 先取消旧的
    await LocalNotifications.cancel({ notifications: [{ id: BEDTIME_NOTIFICATION_ID }] })
    // 安排新定时
    await LocalNotifications.schedule({
      notifications: [
        {
          id: BEDTIME_NOTIFICATION_ID,
          title: '该睡了',
          body: '到了设定的就寝时间，准备休息吧',
          schedule: {
            on: { hour, minute },
            repeats: true,
          },
        },
      ],
    })
  } catch {
    // 静默降级
  }
}

/**
 * 取消每日定时就寝通知（仅手机有效）。
 */
export async function cancelScheduledBedtime(): Promise<void> {
  if (!isNativeMobile()) return

  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications')
    await LocalNotifications.cancel({ notifications: [{ id: BEDTIME_NOTIFICATION_ID }] })
  } catch {
    // 静默
  }
}

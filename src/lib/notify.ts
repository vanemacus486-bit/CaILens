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

/**
 * 立即弹系统通知。
 * 失败时静默降级。
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
  } catch {
    // 静默降级
  }
}

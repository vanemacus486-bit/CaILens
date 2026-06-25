import { Capacitor } from '@capacitor/core'

/** True when running inside a native Capacitor shell (Android / iOS). */
export function isNativeMobile(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * 在系统浏览器打开外部链接，返回是否「可能成功」打开。
 * - 网页 / Capacitor 移动端：window.open 直接打开系统浏览器
 * - Tauri 桌面：window.open 默认被拦截，返回 false，调用方应回退到「复制链接 / 扫码」
 */
export function openExternal(url: string): boolean {
  try {
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    return w != null
  } catch {
    return false
  }
}

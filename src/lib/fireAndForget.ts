import { showErrorSnackbar } from '@/components/ui/snackbar'

// 反风暴：同 label 3 秒内不重复弹
const _lastError = { label: '', time: 0 }

export function fireAndForget(promise: Promise<unknown>, label: string): void {
  promise.catch((err) => {
    console.error(`[fire-and-forget] ${label}:`, err)
    const now = Date.now()
    if (label === _lastError.label && now - _lastError.time < 3000) return
    _lastError.label = label
    _lastError.time = now
    showErrorSnackbar(`操作未保存：${label}，请重试`)
  })
}

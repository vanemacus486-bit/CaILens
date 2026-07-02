/**
 * # crossWindowSync — BroadcastChannel 跨窗口同步
 *
 * Tauri 桌面模式下，QuickCaptureWindow 和主窗口是独立的 WebView，
 * Zustand store / 模块缓存不共享。本模块通过 BroadcastChannel 通信：
 *
 * - 发送方（任何写操作完成时）：postMessage({ table: 'events' })
 * - 接收方（主窗口）：收到后清缓存 + 刷新当前视图
 *
 * 浏览器（单标签页）下 BroadcastChannel 也工作但无实际效果。
 */

const CHANNEL_NAME = 'cailens-write'

/** 支持 BroadcastChannel 的环境 */
const _canBroadcast = typeof BroadcastChannel !== 'undefined'

/** 模块级 channel 实例（懒初始化） */
let _channel: BroadcastChannel | null = null

type Tables = 'events' | 'todos' | 'dailyContext'

interface SyncMessage {
  table: Tables
}

// ── 发送 ──────────────────────────────────────────────────

/** 在写操作成功后调用，广播变更表名 */
export function broadcastWrite(table: Tables): void {
  if (!_canBroadcast) return
  if (!_channel) {
    try {
      _channel = new BroadcastChannel(CHANNEL_NAME)
    } catch {
      return
    }
  }
  _channel.postMessage({ table } satisfies SyncMessage)
}

// ── 接收 ──────────────────────────────────────────────────

type OnWrite = (table: Tables) => void

let _onWrite: OnWrite | null = null

/** 主窗口启动时调用，注册写变更回调。返回清理函数。 */
export function subscribeCrossWindowWrites(callback: OnWrite): () => void {
  _onWrite = callback
  if (!_canBroadcast) return () => { _onWrite = null }

  let channel: BroadcastChannel
  try {
    channel = new BroadcastChannel(CHANNEL_NAME)
  } catch {
    return () => { _onWrite = null }
  }

  channel.onmessage = (event: MessageEvent<SyncMessage>) => {
    _onWrite?.(event.data.table)
  }

  return () => {
    _onWrite = null
    channel.close()
  }
}

/**
 * # crossWindowSync — BroadcastChannel 跨窗口同步
 *
 * Tauri 桌面模式下，QuickCaptureWindow 和主窗口是独立的 WebView，
 * Zustand store / 模块缓存不共享。本模块通过 BroadcastChannel 通信：
 *
 * - 发送方（任何写操作完成时）：postMessage({ table, senderId })
 * - 接收方（主窗口）：收到「其他窗口」的消息后清缓存 + 刷新当前视图
 *
 * ⚠️ 自回声防护（两重，缺一不可）：
 * 1. 收发共用同一个 channel 实例 —— 规范保证 postMessage 不投递给发送它的
 *    那个实例本身。若收发各建实例，同窗口会收到自己的广播：每次写操作都
 *    触发一次 reloadVisible() 全库重读，交互明显卡顿（曾发生过的真实回归）。
 * 2. senderId 兜底 —— 防止未来有代码在同一窗口再建第二个实例时回归。
 */

const CHANNEL_NAME = 'cailens-write'

/** 支持 BroadcastChannel 的环境 */
const _canBroadcast = typeof BroadcastChannel !== 'undefined'

/** 本窗口（JS 上下文）唯一标识，用于过滤自己发出的消息 */
const _senderId: string =
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`

type Tables = 'events' | 'todos' | 'dailyContext'

interface SyncMessage {
  table: Tables
  senderId: string
}

type OnWrite = (table: Tables) => void

/** 模块级单例：收发共用（自回声防护 1） */
let _channel: BroadcastChannel | null = null
let _onWrite: OnWrite | null = null

function getChannel(): BroadcastChannel | null {
  if (!_canBroadcast) return null
  if (!_channel) {
    try {
      _channel = new BroadcastChannel(CHANNEL_NAME)
    } catch {
      return null
    }
    _channel.onmessage = (event: MessageEvent<SyncMessage>) => {
      if (!event.data || event.data.senderId === _senderId) return // 自回声防护 2
      _onWrite?.(event.data.table)
    }
  }
  return _channel
}

// ── 发送 ──────────────────────────────────────────────────

/** 在写操作成功后调用，广播变更表名 */
export function broadcastWrite(table: Tables): void {
  getChannel()?.postMessage({ table, senderId: _senderId } satisfies SyncMessage)
}

// ── 接收 ──────────────────────────────────────────────────

/**
 * 主窗口启动时调用，注册写变更回调。
 * 返回清理函数：只解绑回调，不关闭共享 channel（broadcastWrite 还要用它）。
 */
export function subscribeCrossWindowWrites(callback: OnWrite): () => void {
  _onWrite = callback
  getChannel()
  return () => {
    if (_onWrite === callback) _onWrite = null
  }
}

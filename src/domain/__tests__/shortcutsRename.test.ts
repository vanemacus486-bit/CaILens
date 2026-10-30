import { describe, it, expect } from 'vitest'
import { resolveBindings, SHORTCUT_REGISTRY } from '../shortcuts'
import type { ShortcutOverrides } from '../shortcuts'

// ── Seam: shortcuts.ts 的纯函数 resolveBindings + 注册表 ──────
// 只验证外部可观察的契约：注册表里有哪个动作、用户存的旧键名还能不能生效。
// 不碰 useShortcutManager 的事件派发（那是另一条 seam）。

// 旧版本写在 settings 里的键名，类型系统已不认识，模拟「磁盘上存着旧数据」
const legacyOverrides = (o: Record<string, string>) => o as unknown as ShortcutOverrides

describe('quick capture 快捷键改名', () => {
  it('注册表暴露 quickCaptureEvent，默认键位仍是 Ctrl+Alt+N', () => {
    const def = SHORTCUT_REGISTRY.quickCaptureEvent
    expect(def).toBeDefined()
    expect(def.defaultBinding).toEqual({ key: 'n', ctrl: true, alt: true, shift: false })
  })

  it('旧的 quickCaptureTodo 覆盖值会自动迁到 quickCaptureEvent', () => {
    const resolved = resolveBindings(legacyOverrides({ quickCaptureTodo: 'ctrl+alt+e' }))
    expect(resolved.quickCaptureEvent).toEqual({ key: 'e', ctrl: true, alt: true, shift: false })
  })

  it('新旧键名同时存在时，以新键名为准', () => {
    const resolved = resolveBindings(
      legacyOverrides({ quickCaptureTodo: 'ctrl+alt+e', quickCaptureEvent: 'ctrl+alt+j' }),
    )
    expect(resolved.quickCaptureEvent).toEqual({ key: 'j', ctrl: true, alt: true, shift: false })
  })

  it('没有任何覆盖时回落到默认键位', () => {
    const resolved = resolveBindings({})
    expect(resolved.quickCaptureEvent).toEqual({ key: 'n', ctrl: true, alt: true, shift: false })
  })
})

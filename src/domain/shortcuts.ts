// ── Types ──────────────────────────────────────────────

export type ShortcutAction =
  | 'openCommandPalette'
  | 'copyFocusedEvent'
  | 'pasteEvent'
  | 'goToThisWeek'
  | 'goToDayView'
  | 'goToStats'
  | 'openSettings'
  | 'toggleTheme'
  | 'goToPreviousWeek'
  | 'goToNextWeek'
  | 'goToPreviousDay'
  | 'goToNextDay'
  | 'deleteFocusedEvent'
  | 'duplicateFocusedEvent'
  | 'quickCaptureTodo'

export interface KeyBinding {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
}

export type ShortcutString = string // "ctrl+k", "alt+1", "n", "" = disabled

export interface ShortcutDefinition {
  action: ShortcutAction
  label: string
  defaultBinding: KeyBinding | null
}

export type ShortcutOverrides = Partial<Record<ShortcutAction, ShortcutString>>

// ── Registry ───────────────────────────────────────────

export const SHORTCUT_REGISTRY: Record<ShortcutAction, ShortcutDefinition> = {
  openCommandPalette: { action: 'openCommandPalette', label: '打开命令面板', defaultBinding: { key: 'k', ctrl: true, alt: false, shift: false } },
  copyFocusedEvent:   { action: 'copyFocusedEvent',   label: '复制事件',     defaultBinding: { key: 'c', ctrl: true, alt: false, shift: false } },
  pasteEvent:         { action: 'pasteEvent',          label: '粘贴事件',    defaultBinding: { key: 'v', ctrl: true, alt: false, shift: false } },
  goToThisWeek:       { action: 'goToThisWeek',        label: '前往本周',    defaultBinding: null },
  goToDayView:        { action: 'goToDayView',         label: '前往日视图',  defaultBinding: null },
  goToStats:          { action: 'goToStats',           label: '前往统计',    defaultBinding: null },
  openSettings:       { action: 'openSettings',        label: '打开设置',    defaultBinding: null },
  toggleTheme:        { action: 'toggleTheme',         label: '切换主题',    defaultBinding: null },
  goToPreviousWeek:   { action: 'goToPreviousWeek',    label: '上一周',      defaultBinding: { key: 'ArrowLeft', ctrl: true, alt: false, shift: false } },
  goToNextWeek:       { action: 'goToNextWeek',        label: '下一周',      defaultBinding: { key: 'ArrowRight', ctrl: true, alt: false, shift: false } },
  goToPreviousDay:    { action: 'goToPreviousDay',     label: '上一天',      defaultBinding: { key: 'ArrowLeft', ctrl: true, alt: false, shift: true } },
  goToNextDay:        { action: 'goToNextDay',         label: '下一天',      defaultBinding: { key: 'ArrowRight', ctrl: true, alt: false, shift: true } },
  deleteFocusedEvent: { action: 'deleteFocusedEvent',  label: '删除事件',    defaultBinding: null },
  duplicateFocusedEvent: { action: 'duplicateFocusedEvent', label: '复制并创建事件', defaultBinding: null },
  quickCaptureTodo:     { action: 'quickCaptureTodo',      label: '快速录入待办', defaultBinding: { key: 'n', ctrl: true, alt: true, shift: false } },
}

// ── Pure functions ─────────────────────────────────────

const KEY_RE = /^((ctrl|alt|shift)\+)*([^+]+)$/

export function parseShortcutString(str: ShortcutString): KeyBinding | null {
  if (!str) return null
  const m = KEY_RE.exec(str)
  if (!m) return null
  const parts = str.split('+')
  const key = parts[parts.length - 1]
  return {
    key,
    ctrl: parts.includes('ctrl'),
    alt: parts.includes('alt'),
    shift: parts.includes('shift'),
  }
}

export function formatShortcutString(binding: KeyBinding): ShortcutString {
  const parts: string[] = []
  if (binding.ctrl) parts.push('ctrl')
  if (binding.alt) parts.push('alt')
  if (binding.shift) parts.push('shift')
  parts.push(binding.key)
  return parts.join('+')
}

export function bindingToDisplayString(binding: KeyBinding | null): string {
  if (!binding) return ''
  const parts: string[] = []
  if (binding.ctrl) parts.push('Ctrl')
  if (binding.alt) parts.push('Alt')
  if (binding.shift) parts.push('Shift')
  parts.push(formatDisplayKey(binding.key))
  return parts.join('+')
}

function formatDisplayKey(key: string): string {
  const LABELS: Record<string, string> = {
    ArrowLeft: '←',
    ArrowRight: '→',
    ArrowUp: '↑',
    ArrowDown: '↓',
    Enter: 'Enter',
    Escape: 'Esc',
    ' ': 'Space',
  }
  return LABELS[key] ?? key.toUpperCase()
}

export function bindingsMatch(a: KeyBinding, b: KeyBinding): boolean {
  return a.key === b.key && a.ctrl === b.ctrl && a.alt === b.alt && a.shift === b.shift
}

export function resolveBindings(
  overrides: ShortcutOverrides,
): Record<ShortcutAction, KeyBinding | null> {
  const result = {} as Record<ShortcutAction, KeyBinding | null>
  for (const [action, def] of Object.entries(SHORTCUT_REGISTRY)) {
    const override = overrides[action as ShortcutAction]
    if (override !== undefined) {
      result[action as ShortcutAction] = parseShortcutString(override)
    } else {
      result[action as ShortcutAction] = def.defaultBinding
    }
  }
  return result
}

export function findConflicts(
  resolved: Record<ShortcutAction, KeyBinding | null>,
): Array<{ actionA: ShortcutAction; actionB: ShortcutAction }> {
  const conflicts: Array<{ actionA: ShortcutAction; actionB: ShortcutAction }> = []
  const entries = Object.entries(resolved) as [ShortcutAction, KeyBinding | null][]

  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i][1]
      const b = entries[j][1]
      if (a && b && bindingsMatch(a, b)) {
        conflicts.push({ actionA: entries[i][0], actionB: entries[j][0] })
      }
    }
  }

  return conflicts
}

export function eventMatchesBinding(e: KeyboardEvent, binding: KeyBinding): boolean {
  return (
    e.key === binding.key &&
    (e.ctrlKey || e.metaKey) === binding.ctrl &&
    e.altKey === binding.alt &&
    e.shiftKey === binding.shift
  )
}

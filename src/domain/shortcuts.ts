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
  | 'toggleLanguage'
  | 'goToPreviousWeek'
  | 'goToNextWeek'
  | 'goToPreviousDay'
  | 'goToNextDay'
  | 'deleteFocusedEvent'
  | 'duplicateFocusedEvent'

export interface KeyBinding {
  key: string
  ctrl: boolean
  alt: boolean
  shift: boolean
}

export type ShortcutString = string // "ctrl+k", "alt+1", "n", "" = disabled

export interface ShortcutDefinition {
  action: ShortcutAction
  label: { zh: string; en: string }
  defaultBinding: KeyBinding | null
}

export type ShortcutOverrides = Partial<Record<ShortcutAction, ShortcutString>>

// ── Registry ───────────────────────────────────────────

export const SHORTCUT_REGISTRY: Record<ShortcutAction, ShortcutDefinition> = {
  openCommandPalette: { action: 'openCommandPalette', label: { zh: '打开命令面板', en: 'Open command palette' }, defaultBinding: { key: 'k', ctrl: true, alt: false, shift: false } },
  copyFocusedEvent:   { action: 'copyFocusedEvent',   label: { zh: '复制事件',     en: 'Copy event'           }, defaultBinding: { key: 'c', ctrl: true, alt: false, shift: false } },
  pasteEvent:         { action: 'pasteEvent',          label: { zh: '粘贴事件',    en: 'Paste event'          }, defaultBinding: { key: 'v', ctrl: true, alt: false, shift: false } },
  goToThisWeek:       { action: 'goToThisWeek',        label: { zh: '前往本周',    en: 'Go to this week'      }, defaultBinding: null },
  goToDayView:        { action: 'goToDayView',         label: { zh: '前往日视图',  en: 'Go to day view'       }, defaultBinding: null },
  goToStats:          { action: 'goToStats',           label: { zh: '前往统计',    en: 'Go to stats'          }, defaultBinding: null },
  openSettings:       { action: 'openSettings',        label: { zh: '打开设置',    en: 'Open settings'        }, defaultBinding: null },
  toggleTheme:        { action: 'toggleTheme',         label: { zh: '切换主题',    en: 'Toggle theme'         }, defaultBinding: null },
  toggleLanguage:     { action: 'toggleLanguage',      label: { zh: '切换语言',    en: 'Toggle language'      }, defaultBinding: null },
  goToPreviousWeek:   { action: 'goToPreviousWeek',    label: { zh: '上一周',      en: 'Previous week'        }, defaultBinding: { key: 'ArrowLeft', ctrl: true, alt: false, shift: false } },
  goToNextWeek:       { action: 'goToNextWeek',        label: { zh: '下一周',      en: 'Next week'            }, defaultBinding: { key: 'ArrowRight', ctrl: true, alt: false, shift: false } },
  goToPreviousDay:    { action: 'goToPreviousDay',     label: { zh: '上一天',      en: 'Previous day'         }, defaultBinding: { key: 'ArrowLeft', ctrl: true, alt: false, shift: true } },
  goToNextDay:        { action: 'goToNextDay',         label: { zh: '下一天',      en: 'Next day'             }, defaultBinding: { key: 'ArrowRight', ctrl: true, alt: false, shift: true } },
  deleteFocusedEvent: { action: 'deleteFocusedEvent',  label: { zh: '删除事件',    en: 'Delete event'         }, defaultBinding: null },
  duplicateFocusedEvent: { action: 'duplicateFocusedEvent', label: { zh: '复制并创建事件', en: 'Duplicate event' }, defaultBinding: null },
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

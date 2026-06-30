// ── Types ──────────────────────────────────────────────

export type ShortcutAction =
  | 'openCommandPalette'
  | 'copyFocusedEvent'
  | 'pasteEvent'
  | 'goToThisWeek'
  | 'goToDayView'
  | 'goToStats'
  | 'goToCalendar'
  | 'goToPlan'
  | 'goToReview'
  | 'openSettings'
  | 'toggleTheme'
  | 'goToPreviousWeek'
  | 'goToNextWeek'
  | 'goToPreviousDay'
  | 'goToNextDay'
  | 'deleteFocusedEvent'
  | 'duplicateFocusedEvent'
  | 'quickCaptureTodo'
  | 'toggleSidebar'
  // ── Stats page ──
  | 'statsTab1'
  | 'statsTab2'
  | 'statsTab3'
  | 'statsTab4'
  | 'statsTab5'
  | 'statsTab6'
  | 'statsTab7'
  | 'statsTab8'
  | 'statsColor1'
  | 'statsColor2'
  | 'statsColor3'
  | 'statsColor4'
  | 'statsColor5'
  | 'statsColor6'
  | 'statsPrevSeg'
  | 'statsNextSeg'
  | 'toggleWeekMonthView'

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
  goToThisWeek:       { action: 'goToThisWeek',        label: '回到周视图',  defaultBinding: { key: 'Escape', ctrl: false, alt: false, shift: false } },
  goToDayView:        { action: 'goToDayView',         label: '前往日视图',  defaultBinding: { key: 't', ctrl: false, alt: false, shift: false } },
  goToStats:          { action: 'goToStats',           label: '前往统计',    defaultBinding: null },
  goToCalendar:       { action: 'goToCalendar',        label: '切换日历',    defaultBinding: { key: '1', ctrl: false, alt: true, shift: false } },
  goToPlan:           { action: 'goToPlan',            label: '切换规划',    defaultBinding: { key: '2', ctrl: false, alt: true, shift: false } },
  goToReview:         { action: 'goToReview',          label: '切换复盘',    defaultBinding: { key: '3', ctrl: false, alt: true, shift: false } },
  openSettings:       { action: 'openSettings',        label: '打开设置',     defaultBinding: { key: ',', ctrl: true, alt: false, shift: false } },
  toggleTheme:        { action: 'toggleTheme',         label: '切换主题',     defaultBinding: { key: 'T', ctrl: true, alt: false, shift: true } },
  goToPreviousWeek:   { action: 'goToPreviousWeek',    label: '上一周',      defaultBinding: { key: 'ArrowLeft', ctrl: true, alt: false, shift: false } },
  goToNextWeek:       { action: 'goToNextWeek',        label: '下一周',      defaultBinding: { key: 'ArrowRight', ctrl: true, alt: false, shift: false } },
  goToPreviousDay:    { action: 'goToPreviousDay',     label: '上一天',      defaultBinding: { key: 'ArrowLeft', ctrl: true, alt: false, shift: true } },
  goToNextDay:        { action: 'goToNextDay',         label: '下一天',      defaultBinding: { key: 'ArrowRight', ctrl: true, alt: false, shift: true } },
  deleteFocusedEvent: { action: 'deleteFocusedEvent',  label: '删除事件',    defaultBinding: { key: 'Delete', ctrl: false, alt: false, shift: false } },
  duplicateFocusedEvent: { action: 'duplicateFocusedEvent', label: '复制并创建事件', defaultBinding: { key: 'd', ctrl: true, alt: false, shift: false } },
  quickCaptureTodo:     { action: 'quickCaptureTodo',      label: '快速录入待办', defaultBinding: { key: 'n', ctrl: true, alt: true, shift: false } },
  toggleSidebar:       { action: 'toggleSidebar',        label: '切换侧栏',     defaultBinding: { key: 'b', ctrl: true, alt: false, shift: false } },

  // ── Stats page ──
  statsTab1:     { action: 'statsTab1',     label: '复盘·趋势',    defaultBinding: { key: '1', ctrl: false, alt: false, shift: false } },
  statsTab2:     { action: 'statsTab2',     label: '复盘·热力',    defaultBinding: { key: '2', ctrl: false, alt: false, shift: false } },
  statsTab3:     { action: 'statsTab3',     label: '复盘·睡眠',    defaultBinding: { key: '3', ctrl: false, alt: false, shift: false } },
  statsTab4:     { action: 'statsTab4',     label: '复盘·饮食',    defaultBinding: { key: '4', ctrl: false, alt: false, shift: false } },
  statsTab5:     { action: 'statsTab5',     label: '复盘·卫生',    defaultBinding: { key: '5', ctrl: false, alt: false, shift: false } },
  statsTab6:     { action: 'statsTab6',     label: '复盘·穿搭',    defaultBinding: { key: '6', ctrl: false, alt: false, shift: false } },
  statsTab7:     { action: 'statsTab7',     label: '复盘·情绪',    defaultBinding: { key: '7', ctrl: false, alt: false, shift: false } },
  statsTab8:     { action: 'statsTab8',     label: '复盘·编年',    defaultBinding: { key: '8', ctrl: false, alt: false, shift: false } },
  statsColor1:   { action: 'statsColor1',   label: '复盘·分类色1', defaultBinding: { key: 'a', ctrl: false, alt: false, shift: false } },
  statsColor2:   { action: 'statsColor2',   label: '复盘·分类色2', defaultBinding: { key: 's', ctrl: false, alt: false, shift: false } },
  statsColor3:   { action: 'statsColor3',   label: '复盘·分类色3', defaultBinding: { key: 'd', ctrl: false, alt: false, shift: false } },
  statsColor4:   { action: 'statsColor4',   label: '复盘·分类色4', defaultBinding: { key: 'f', ctrl: false, alt: false, shift: false } },
  statsColor5:   { action: 'statsColor5',   label: '复盘·分类色5', defaultBinding: { key: 'g', ctrl: false, alt: false, shift: false } },
  statsColor6:   { action: 'statsColor6',   label: '复盘·分类色6', defaultBinding: { key: 'h', ctrl: false, alt: false, shift: false } },
  statsPrevSeg:  { action: 'statsPrevSeg',  label: '复盘·上一段',  defaultBinding: { key: '[', ctrl: false, alt: false, shift: false } },
  statsNextSeg:  { action: 'statsNextSeg',  label: '复盘·下一段',  defaultBinding: { key: ']', ctrl: false, alt: false, shift: false } },
  toggleWeekMonthView: { action: 'toggleWeekMonthView', label: '切换周/月视图', defaultBinding: { key: 'm', ctrl: false, alt: false, shift: false } },
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

import { describe, it, expect } from 'vitest'
import {
  parseShortcutString,
  formatShortcutString,
  bindingToDisplayString,
  bindingsMatch,
  resolveBindings,
  findConflicts,
  eventMatchesBinding,
  SHORTCUT_REGISTRY,
} from '../shortcuts'
import type { KeyBinding } from '../shortcuts'

function kb(key: string, ctrl = false, alt = false, shift = false): KeyBinding {
  return { key, ctrl, alt, shift }
}

// ── parseShortcutString ────────────────────────────────

describe('parseShortcutString', () => {
  it('parses simple key', () => {
    expect(parseShortcutString('n')).toEqual(kb('n'))
  })

  it('parses ctrl+key', () => {
    expect(parseShortcutString('ctrl+k')).toEqual(kb('k', true))
  })

  it('parses alt+key', () => {
    expect(parseShortcutString('alt+1')).toEqual(kb('1', false, true))
  })

  it('parses ctrl+shift+key', () => {
    expect(parseShortcutString('ctrl+shift+ArrowLeft')).toEqual(kb('ArrowLeft', true, false, true))
  })

  it('parses all three modifiers', () => {
    expect(parseShortcutString('ctrl+alt+shift+x')).toEqual(kb('x', true, true, true))
  })

  it('returns null for empty string', () => {
    expect(parseShortcutString('')).toBeNull()
  })

  it('returns null for gibberish', () => {
    expect(parseShortcutString('+++')).toBeNull()
  })
})

// ── formatShortcutString ───────────────────────────────

describe('formatShortcutString', () => {
  it('formats simple key', () => {
    expect(formatShortcutString(kb('n'))).toBe('n')
  })

  it('formats ctrl+key', () => {
    expect(formatShortcutString(kb('k', true))).toBe('ctrl+k')
  })

  it('formats all modifiers', () => {
    expect(formatShortcutString(kb('x', true, true, true))).toBe('ctrl+alt+shift+x')
  })
})

// ── parse/format round-trip ────────────────────────────

describe('parse/format round-trip', () => {
  it('round-trips all modifier combinations', () => {
    const cases = ['n', 'ctrl+k', 'alt+1', 'shift+f1', 'ctrl+shift+ArrowLeft', 'ctrl+alt+shift+x']
    for (const s of cases) {
      const parsed = parseShortcutString(s)
      expect(parsed).not.toBeNull()
      expect(formatShortcutString(parsed!)).toBe(s)
    }
  })
})

// ── bindingToDisplayString ─────────────────────────────

describe('bindingToDisplayString', () => {
  it('shows Ctrl+K', () => {
    expect(bindingToDisplayString(kb('k', true))).toBe('Ctrl+K')
  })

  it('shows Alt+1', () => {
    expect(bindingToDisplayString(kb('1', false, true))).toBe('Alt+1')
  })

  it('shows Ctrl+Shift+←', () => {
    expect(bindingToDisplayString(kb('ArrowLeft', true, false, true))).toBe('Ctrl+Shift+←')
  })

  it('shows Ctrl+→', () => {
    expect(bindingToDisplayString(kb('ArrowRight', true))).toBe('Ctrl+→')
  })

  it('shows single key N', () => {
    expect(bindingToDisplayString(kb('n'))).toBe('N')
  })

  it('returns empty string for null', () => {
    expect(bindingToDisplayString(null)).toBe('')
  })

  it('shows Enter', () => {
    expect(bindingToDisplayString(kb('Enter'))).toBe('Enter')
  })

  it('shows Esc', () => {
    expect(bindingToDisplayString(kb('Escape'))).toBe('Esc')
  })

  it('shows Space', () => {
    expect(bindingToDisplayString(kb(' '))).toBe('Space')
  })
})

// ── bindingsMatch ──────────────────────────────────────

describe('bindingsMatch', () => {
  it('matches identical bindings', () => {
    expect(bindingsMatch(kb('k', true), kb('k', true))).toBe(true)
  })

  it('rejects different key', () => {
    expect(bindingsMatch(kb('k', true), kb('j', true))).toBe(false)
  })

  it('rejects different modifier', () => {
    expect(bindingsMatch(kb('k', true), kb('k', false, true))).toBe(false)
  })

  it('rejects different shift state', () => {
    expect(bindingsMatch(kb('k', true), kb('k', true, false, true))).toBe(false)
  })
})

// ── resolveBindings ────────────────────────────────────

describe('resolveBindings', () => {
  it('returns defaults when no overrides', () => {
    const r = resolveBindings({})
    expect(r.openCommandPalette).toEqual(kb('k', true))
    expect(r.openQuickLog).toEqual(kb('n'))
    expect(r.copyFocusedEvent).toEqual(kb('c', true))
    // actions with no default
    expect(r.goToThisWeek).toBeNull()
    expect(r.deleteFocusedEvent).toBeNull()
  })

  it('applies partial overrides', () => {
    const r = resolveBindings({ openCommandPalette: 'alt+k' })
    expect(r.openCommandPalette).toEqual(kb('k', false, true))
    expect(r.openQuickLog).toEqual(kb('n')) // unchanged
  })

  it('disables action with empty string override', () => {
    const r = resolveBindings({ openQuickLog: '' })
    expect(r.openQuickLog).toBeNull()
  })
})

// ── findConflicts ──────────────────────────────────────

describe('findConflicts', () => {
  it('returns empty when no conflicts', () => {
    const r = resolveBindings({})
    expect(findConflicts(r)).toHaveLength(0)
  })

  it('detects two actions with same binding', () => {
    const r = resolveBindings({ openCommandPalette: 'n', openQuickLog: 'n' })
    const conflicts = findConflicts(r)
    expect(conflicts).toHaveLength(1)
    const pair = conflicts[0]
    expect(pair.actionA === 'openCommandPalette' || pair.actionA === 'openQuickLog').toBe(true)
    expect(pair.actionB === 'openCommandPalette' || pair.actionB === 'openQuickLog').toBe(true)
  })
})

// ── eventMatchesBinding ────────────────────────────────

describe('eventMatchesBinding', () => {
  function fakeEvent(overrides: Partial<KeyboardEvent>): KeyboardEvent {
    return { key: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, preventDefault() {}, ...overrides } as KeyboardEvent
  }

  it('matches simple key', () => {
    expect(eventMatchesBinding(fakeEvent({ key: 'n' }), kb('n'))).toBe(true)
  })

  it('matches ctrl+key', () => {
    expect(eventMatchesBinding(fakeEvent({ key: 'k', ctrlKey: true }), kb('k', true))).toBe(true)
  })

  it('does not match different key', () => {
    expect(eventMatchesBinding(fakeEvent({ key: 'j' }), kb('n'))).toBe(false)
  })

  it('does not match missing ctrl', () => {
    expect(eventMatchesBinding(fakeEvent({ key: 'k' }), kb('k', true))).toBe(false)
  })

  it('does not match extra modifier', () => {
    expect(eventMatchesBinding(fakeEvent({ key: 'n', altKey: true }), kb('n'))).toBe(false)
  })

  it('matches meta key as ctrl', () => {
    expect(eventMatchesBinding(fakeEvent({ key: 'k', metaKey: true }), kb('k', true))).toBe(true)
  })
})

// ── Registry completeness ──────────────────────────────

describe('SHORTCUT_REGISTRY', () => {
  it('has exactly 16 actions', () => {
    expect(Object.keys(SHORTCUT_REGISTRY)).toHaveLength(16)
  })

  it('all entries have bilingual labels', () => {
    for (const def of Object.values(SHORTCUT_REGISTRY)) {
      expect(typeof def.label.zh).toBe('string')
      expect(def.label.zh.length).toBeGreaterThan(0)
      expect(typeof def.label.en).toBe('string')
      expect(def.label.en.length).toBeGreaterThan(0)
    }
  })
})

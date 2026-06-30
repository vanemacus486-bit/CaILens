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
    expect(r.copyFocusedEvent).toEqual(kb('c', true))
    // actions now have defaults assigned
    expect(r.goToThisWeek).toEqual(kb('Escape'))
    expect(r.deleteFocusedEvent).toEqual(kb('Delete'))
  })

  it('applies partial overrides', () => {
    const r = resolveBindings({ openCommandPalette: 'alt+k' })
    expect(r.openCommandPalette).toEqual(kb('k', false, true))
  })

})

// ── findConflicts ──────────────────────────────────────

describe('findConflicts', () => {
  it('returns empty when no conflicts', () => {
    const r = resolveBindings({})
    expect(findConflicts(r)).toHaveLength(0)
  })

  it('returns empty for expanded registry with new stats actions', () => {
    const r = resolveBindings({})
    expect(findConflicts(r)).toHaveLength(0)
  })
})

// ── New stats actions ─────────────────────────────────

describe('stats shortcut actions', () => {
  it('statsTab1-7 default to keys 1-7', () => {
    const r = resolveBindings({})
    expect(r.statsTab1).toEqual(kb('1'))
    expect(r.statsTab2).toEqual(kb('2'))
    expect(r.statsTab3).toEqual(kb('3'))
    expect(r.statsTab4).toEqual(kb('4'))
    expect(r.statsTab5).toEqual(kb('5'))
    expect(r.statsTab6).toEqual(kb('6'))
    expect(r.statsTab7).toEqual(kb('7'))
  })

  it('statsColor1-6 default to a/s/d/f/g/h', () => {
    const r = resolveBindings({})
    expect(r.statsColor1).toEqual(kb('a'))
    expect(r.statsColor2).toEqual(kb('s'))
    expect(r.statsColor3).toEqual(kb('d'))
    expect(r.statsColor4).toEqual(kb('f'))
    expect(r.statsColor5).toEqual(kb('g'))
    expect(r.statsColor6).toEqual(kb('h'))
  })

  it('statsPrevSeg/statsNextSeg default to [/]', () => {
    const r = resolveBindings({})
    expect(r.statsPrevSeg).toEqual(kb('['))
    expect(r.statsNextSeg).toEqual(kb(']'))
  })

  it('all 14 new actions have no conflicts with existing', () => {
    const r = resolveBindings({})
    expect(findConflicts(r)).toHaveLength(0)
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
  it('has exactly 36 actions', () => {
    expect(Object.keys(SHORTCUT_REGISTRY)).toHaveLength(36)
  })

  it('all entries have a label string', () => {
    for (const def of Object.values(SHORTCUT_REGISTRY)) {
      expect(typeof def.label).toBe('string')
      expect(def.label.length).toBeGreaterThan(0)
      expect(typeof def.label).toBe('string')
      
    }
  })
})

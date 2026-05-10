import { useEffect, useRef } from 'react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { resolveBindings, eventMatchesBinding } from '@/domain/shortcuts'
import type { ShortcutAction } from '@/domain/shortcuts'

export function useShortcutManager(handlers: Partial<Record<ShortcutAction, () => void>>): void {
  const shortcuts = useAppSettingsStore((s) => s.settings.shortcuts)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    const resolved = resolveBindings(shortcuts ?? {})

    const onKeyDown = (e: KeyboardEvent) => {
      const t = e.target
      if (t instanceof HTMLInputElement) return
      if (t instanceof HTMLTextAreaElement) return
      if (t instanceof HTMLElement && t.isContentEditable) return

      for (const [action, binding] of Object.entries(resolved)) {
        if (!binding) continue
        if (!eventMatchesBinding(e, binding)) continue
        const handler = handlersRef.current[action as ShortcutAction]
        if (handler) {
          e.preventDefault()
          handler()
          return
        }
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [shortcuts])
}

import { useEffect } from 'react'

interface Options {
  enabled?: boolean
}

/** Register a single-key global shortcut, ignored when typing in form fields. */
export function useGlobalShortcut(
  key: string,
  handler: () => void,
  options: Options = {},
): void {
  useEffect(() => {
    if (options.enabled === false) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target
      if (t instanceof HTMLInputElement) return
      if (t instanceof HTMLTextAreaElement) return
      if (t instanceof HTMLElement && t.isContentEditable) return
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, handler, options.enabled])
}

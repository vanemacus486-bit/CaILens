import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import { fireAndForget } from '@/lib/fireAndForget'
import { useAppSettingsStore } from '@/stores/settingsStore'
import {
  SHORTCUT_REGISTRY,
  resolveBindings,
  bindingToDisplayString,
  formatShortcutString,
  findConflicts,
} from '@/domain/shortcuts'
import type { ShortcutAction } from '@/domain/shortcuts'

export function SettingsShortcuts() {
    const shortcuts = useAppSettingsStore((s) => s.settings.shortcuts)
  const setShortcut = useAppSettingsStore((s) => s.setShortcut)
  const resetAllShortcuts = useAppSettingsStore((s) => s.resetAllShortcuts)

  const [recording, setRecording] = useState<ShortcutAction | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const recordingRef = useRef<ShortcutAction | null>(null)

  const resolved = useMemo(() => resolveBindings(shortcuts ?? {}), [shortcuts])
  const conflicts = useMemo(() => findConflicts(resolved), [resolved])

  // Recording keydown listener
  useEffect(() => {
    if (!recording) return
    recordingRef.current = recording

    const onKeyDown = (e: KeyboardEvent) => {
      // Ignore standalone modifier keys
      if (e.key === 'Control' || e.key === 'Shift' || e.key === 'Alt' || e.key === 'Meta') return

      e.preventDefault()
      e.stopPropagation()

      const action = recordingRef.current
      if (!action) return

      const binding = formatShortcutString({
        key: e.key,
        ctrl: e.ctrlKey || e.metaKey,
        alt: e.altKey,
        shift: e.shiftKey,
      })
      setRecording(null)
      fireAndForget(setShortcut(action, binding), 'set shortcut')
    }

    const cancelOnEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setRecording(null)
      }
    }

    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('keydown', cancelOnEscape)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('keydown', cancelOnEscape)
    }
  }, [recording, setShortcut])

  const handleReset = useCallback((action: ShortcutAction) => {
    fireAndForget(setShortcut(action, null), 'reset shortcut')
  }, [setShortcut])

  const handleResetAll = useCallback(() => {
    setConfirmReset(false)
    fireAndForget(resetAllShortcuts(), 'reset all shortcuts')
  }, [resetAllShortcuts])

  const isActionInConflict = useCallback((action: ShortcutAction): boolean => {
    return conflicts.some((c) => c.actionA === action || c.actionB === action)
  }, [conflicts])

  return (
    <div className="flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="font-serif text-[22px] font-medium text-text-primary">
          {'快捷键'}
        </h1>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-sans">
              {'确认重置所有快捷键？'}
            </span>
            <button
              onClick={handleResetAll}
              className="px-2 py-1 rounded-md text-xs font-sans font-medium bg-event-rose-bg text-color-text-danger transition-colors duration-200 cursor-pointer border-none"
            >
              {'确认'}
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2 py-1 rounded-md text-xs font-sans font-medium text-text-secondary hover:text-text-primary transition-colors duration-200 cursor-pointer border-none"
            >
              {'取消'}
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="px-3 py-1.5 rounded-md text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-200 cursor-pointer border-none"
          >
            {'重置全部'}
          </button>
        )}
      </div>

      {/* Conflict warning */}
      {conflicts.length > 0 && (
        <div className="bg-event-rose-bg border border-event-rose-fill rounded-lg px-3 py-2">
          <p className="text-xs font-sans font-medium text-color-text-danger">
            {'快捷键冲突'}
          </p>
          <ul className="mt-1 text-xs text-text-secondary font-sans">
            {conflicts.map((c) => {
              const a = SHORTCUT_REGISTRY[c.actionA]
              const b = SHORTCUT_REGISTRY[c.actionB]
              const binding = resolved[c.actionA]
              return (
                <li key={`${c.actionA}-${c.actionB}`}>
                  {`${a.label} 和 ${b.label} 都使用了 ${binding ? bindingToDisplayString(binding) : ''}`}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Shortcut list */}
      <div className="flex flex-col">
        {Object.values(SHORTCUT_REGISTRY).map((def) => {
          const currentBinding = resolved[def.action]
          const isRecording = recording === def.action
          const hasOverride = shortcuts?.[def.action] !== undefined
          const inConflict = isActionInConflict(def.action)

          return (
            <div
              key={def.action}
              className={cn(
                'flex items-center justify-between py-2.5 px-1 border-b border-border-subtle last:border-b-0',
                inConflict && 'bg-event-rose-bg/30',
              )}
            >
              <span className="text-sm font-sans text-text-primary">
                {def.label}
              </span>

              <div className="flex items-center gap-1.5">
                {/* Binding pill */}
                <button
                  onClick={() => setRecording(isRecording ? null : def.action)}
                  className={cn(
                    'px-2.5 py-1 rounded-md text-xs font-mono transition-colors duration-150 cursor-pointer border-none min-w-[80px] text-center',
                    isRecording
                      ? 'bg-accent text-white animate-pulse'
                      : currentBinding
                        ? 'bg-surface-sunken text-text-secondary hover:bg-border-subtle'
                        : 'bg-surface-sunken text-text-tertiary italic hover:bg-border-subtle',
                  )}
                >
                  {isRecording
                    ? '按下按键...'
                    : currentBinding
                      ? bindingToDisplayString(currentBinding)
                      : '无'}
                </button>

                {/* Reset icon — visible only when overridden */}
                {hasOverride && (
                  <button
                    onClick={() => handleReset(def.action)}
                    title={'重置为默认'}
                    className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none text-xs"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

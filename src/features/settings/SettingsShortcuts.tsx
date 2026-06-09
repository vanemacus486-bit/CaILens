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
import { Keyboard, AlertTriangle, RotateCcw } from 'lucide-react'

export function SettingsShortcuts() {
    const shortcuts = useAppSettingsStore((s) => s.settings.shortcuts)
  const setShortcut = useAppSettingsStore((s) => s.setShortcut)
  const resetAllShortcuts = useAppSettingsStore((s) => s.resetAllShortcuts)

  const [recording, setRecording] = useState<ShortcutAction | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)
  const recordingRef = useRef<ShortcutAction | null>(null)

  const resolved = useMemo(() => resolveBindings(shortcuts ?? {}), [shortcuts])
  const conflicts = useMemo(() => findConflicts(resolved), [resolved])

  useEffect(() => {
    if (!recording) return
    recordingRef.current = recording

    const onKeyDown = (e: KeyboardEvent) => {
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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Keyboard size={16} strokeWidth={1.75} className="text-text-tertiary" />
            <h1 className="font-serif text-[22px] font-medium text-text-primary tracking-tight">
              快捷键
            </h1>
          </div>
          <p className="text-sm text-text-tertiary font-sans">
            自定义键盘操作，提升效率
          </p>
        </div>
        {confirmReset ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary font-sans">
              确认重置所有？
            </span>
            <button
              onClick={handleResetAll}
              className="px-2.5 py-1 rounded-md text-xs font-sans font-medium bg-event-rose-bg text-color-text-danger hover:bg-event-rose-text transition-colors duration-150 cursor-pointer border-none"
            >
              确认
            </button>
            <button
              onClick={() => setConfirmReset(false)}
              className="px-2.5 py-1 rounded-md text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none"
            >
              取消
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmReset(true)}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-sans font-medium text-text-secondary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none"
          >
            <RotateCcw size={12} strokeWidth={1.75} />
            重置全部
          </button>
        )}
      </div>

      {/* Conflict warning */}
      {conflicts.length > 0 && (
        <div className="rounded-lg bg-event-rose-bg/40 border border-event-rose-fill/30 px-4 py-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <AlertTriangle size={13} strokeWidth={1.75} className="text-color-text-danger" />
            <p className="text-xs font-sans font-medium text-color-text-danger">
              快捷键冲突
            </p>
          </div>
          <ul className="flex flex-col gap-0.5">
            {conflicts.map((c) => {
              const a = SHORTCUT_REGISTRY[c.actionA]
              const b = SHORTCUT_REGISTRY[c.actionB]
              const binding = resolved[c.actionA]
              return (
                <li key={`${c.actionA}-${c.actionB}`} className="text-xs text-text-secondary font-sans">
                  {`${a.label} 和 ${b.label} 都使用了 ${binding ? bindingToDisplayString(binding) : ''}`}
                </li>
              )
            })}
          </ul>
        </div>
      )}

      {/* Recording indicator */}
      {recording && (
        <div className="rounded-lg bg-accent/10 border border-accent/20 px-4 py-2.5 text-center">
          <p className="text-xs font-sans font-medium text-accent animate-pulse">
            按下组合键以绑定…
          </p>
          <p className="text-[10px] font-sans text-text-tertiary mt-0.5">
            按 ESC 取消
          </p>
        </div>
      )}

      {/* Shortcut list */}
      <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
        <div className="divide-y divide-border-subtle">
          {Object.values(SHORTCUT_REGISTRY).map((def) => {
            const currentBinding = resolved[def.action]
            const isRecording = recording === def.action
            const hasOverride = shortcuts?.[def.action] !== undefined
            const inConflict = isActionInConflict(def.action)

            return (
              <div
                key={def.action}
                className={cn(
                  'flex items-center justify-between py-3 px-4 transition-colors duration-150',
                  inConflict && 'bg-event-rose-bg/20',
                  !inConflict && 'hover:bg-surface-sunken/50',
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
                      'px-3 py-1 rounded-md text-xs font-mono transition-all duration-150 cursor-pointer border-none min-w-[80px] text-center',
                      isRecording
                        ? 'bg-accent text-white shadow-pill ring-2 ring-accent/30'
                        : currentBinding
                          ? 'bg-surface-sunken text-text-secondary hover:bg-surface-base hover:text-text-primary'
                          : 'bg-surface-sunken text-text-tertiary italic hover:bg-surface-base',
                    )}
                  >
                    {isRecording
                      ? '监听中…'
                      : currentBinding
                        ? bindingToDisplayString(currentBinding)
                        : '无'}
                  </button>

                  {/* Reset icon */}
                  {hasOverride && (
                    <button
                      onClick={() => handleReset(def.action)}
                      title="重置为默认"
                      className="w-6 h-6 flex items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-sunken transition-colors duration-150 cursor-pointer border-none"
                    >
                      <RotateCcw size={12} strokeWidth={1.75} />
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

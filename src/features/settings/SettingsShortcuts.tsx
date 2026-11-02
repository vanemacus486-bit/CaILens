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
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { useT } from '@/i18n/useT'
import {
  SettingsButton,
  SettingsHeader,
  SettingsNotice,
  SettingsRow,
  SettingsSection,
} from './ui'

/**
 * 「快捷键」页。
 *
 * 重置全部放在分组标题右侧（Obsidian 的 section action 位置），
 * 录制提示与冲突提示统一用 `SettingsNotice`；每个动作一行，
 * 右侧是键位 pill，改过的动作额外给一个重置图标。
 */
export function SettingsShortcuts() {
  const shortcuts = useAppSettingsStore((s) => s.settings.shortcuts)
  const setShortcut = useAppSettingsStore((s) => s.setShortcut)
  const resetAllShortcuts = useAppSettingsStore((s) => s.resetAllShortcuts)
  const t = useT()

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

  const handleReset = useCallback(
    (action: ShortcutAction) => {
      fireAndForget(setShortcut(action, null), 'reset shortcut')
    },
    [setShortcut],
  )

  const handleResetAll = useCallback(() => {
    setConfirmReset(false)
    fireAndForget(resetAllShortcuts(), 'reset all shortcuts')
  }, [resetAllShortcuts])

  const isActionInConflict = useCallback(
    (action: ShortcutAction): boolean => {
      return conflicts.some((c) => c.actionA === action || c.actionB === action)
    },
    [conflicts],
  )

  return (
    <div className="flex flex-col gap-7">
      <SettingsHeader
        title={t('settings.tab.shortcuts')}
        description={t('settings.tab.shortcuts.desc')}
      />

      {conflicts.length > 0 && (
        <SettingsNotice tone="warning" title="快捷键冲突">
          <ul className="flex flex-col gap-0.5">
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
        </SettingsNotice>
      )}

      {recording && (
        <SettingsNotice tone="accent">
          <p className="animate-pulse font-medium text-accent">按下组合键以绑定…</p>
          <p className="mt-0.5 text-2xs text-text-tertiary">按 ESC 取消</p>
        </SettingsNotice>
      )}

      <SettingsSection
        title={t('settings.tab.shortcuts')}
        action={
          <span
            data-settings-item="shortcuts-reset"
            className="flex scroll-mt-4 items-center gap-1.5"
          >
            {confirmReset ? (
              <>
                <span className="font-sans text-xs text-text-secondary">确认重置所有？</span>
                <SettingsButton variant="danger" onClick={handleResetAll}>
                  确认
                </SettingsButton>
                <SettingsButton variant="ghost" onClick={() => setConfirmReset(false)}>
                  取消
                </SettingsButton>
              </>
            ) : (
              <SettingsButton variant="ghost" onClick={() => setConfirmReset(true)}>
                <RotateCcw size={12} strokeWidth={1.75} />
                重置全部
              </SettingsButton>
            )}
          </span>
        }
      >
        {Object.values(SHORTCUT_REGISTRY).map((def) => {
          const currentBinding = resolved[def.action]
          const isRecording = recording === def.action
          const hasOverride = shortcuts?.[def.action] !== undefined
          const inConflict = isActionInConflict(def.action)

          return (
            <SettingsRow
              key={def.action}
              anchor={`shortcut-${def.action}`}
              title={def.label}
              description={
                inConflict ? (
                  <span className="inline-flex items-center gap-1 text-color-text-danger">
                    <AlertTriangle size={11} strokeWidth={1.75} />
                    与其它动作冲突
                  </span>
                ) : undefined
              }
              className={cn(inConflict && 'bg-event-rose-bg/20')}
            >
              <button
                type="button"
                onClick={() => setRecording(isRecording ? null : def.action)}
                aria-label={`${def.label} 快捷键`}
                className={cn(
                  'h-7 min-w-[84px] cursor-pointer rounded-md border-none px-3 text-center font-mono text-xs transition-all duration-150',
                  isRecording
                    ? 'bg-accent text-white shadow-pill ring-2 ring-accent/30'
                    : currentBinding
                      ? 'bg-surface-sunken text-text-secondary hover:bg-surface-base hover:text-text-primary'
                      : 'bg-surface-sunken italic text-text-tertiary hover:bg-surface-base',
                )}
              >
                {isRecording
                  ? '监听中…'
                  : currentBinding
                    ? bindingToDisplayString(currentBinding)
                    : '无'}
              </button>

              {hasOverride && (
                <SettingsButton
                  variant="ghost"
                  onClick={() => handleReset(def.action)}
                  title="重置为默认"
                  aria-label={`${def.label} 重置为默认`}
                >
                  <RotateCcw size={12} strokeWidth={1.75} />
                </SettingsButton>
              )}
            </SettingsRow>
          )
        })}
      </SettingsSection>
    </div>
  )
}

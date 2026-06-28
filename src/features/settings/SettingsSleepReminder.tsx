import { useT } from '@/i18n/useT'
import { useState, useEffect, useCallback } from 'react'
import { fireAndForget } from '@/lib/fireAndForget'
import { cn } from '@/lib/utils'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { requestNotifyPermission } from '@/lib/notify'
import {
  type SleepReminderSettings,
  DEFAULT_SLEEP_REMINDER,
  averageMainSleepBedtimeHm,
  parseHm,
} from '@/domain/sleepReminder'

function SettingsRow({
  label,
  children,
  last,
}: {
  label: string
  children: React.ReactNode
  last?: boolean
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-5 py-4 gap-3',
        !last && 'border-b border-border-subtle',
      )}
    >
      <span className="text-sm font-sans font-medium text-text-primary flex-shrink-0">
        {label}
      </span>
      <div className="overflow-x-auto flex-shrink min-w-0">
        {children}
      </div>
    </div>
  )
}

export function SettingsSleepReminder() {
  const settings = useAppSettingsStore((s) => s.settings)
  const setSleepReminder = useAppSettingsStore((s) => s.setSleepReminder)
  const events = useEventStore((s) => s.events)

  const sleepReminder: SleepReminderSettings = settings.sleepReminder ?? DEFAULT_SLEEP_REMINDER
  const t = useT()

  const [pendingEnabled, setPendingEnabled] = useState(sleepReminder.enabled)

  // 同步外部变更
  useEffect(() => {
    setPendingEnabled(sleepReminder.enabled)
  }, [sleepReminder.enabled])

  // 数据感知：近 14 天平均入睡时刻
  const avgBedtime = averageMainSleepBedtimeHm(events, 14, Date.now())

  // 切换 enabled：先要权限
  const handleToggle = useCallback(async () => {
    const next = !pendingEnabled
    if (next) {
      const granted = await requestNotifyPermission()
      if (!granted) {
        const ok = window.confirm(t('sleepReminder.notificationDenied'))
        if (!ok) return
      }
    }
    setPendingEnabled(next)
    fireAndForget(setSleepReminder({ enabled: next }), 'set sleep reminder enabled')
  }, [pendingEnabled, setSleepReminder, t])

  const handleBedtimeChange = useCallback(
    (value: string) => {
      // 只允许合法格式写入
      if (value === '' || parseHm(value) || /^\d{0,2}:?\d{0,2}$/.test(value)) {
        fireAndForget(setSleepReminder({ bedtime: value }), 'set bedtime')
      }
    },
    [setSleepReminder],
  )

  const handleLeadChange = useCallback(
    (value: number) => {
      fireAndForget(setSleepReminder({ leadMinutes: value }), 'set lead minutes')
    },
    [setSleepReminder],
  )

  const handleSkipChange = useCallback(
    () => {
      fireAndForget(setSleepReminder({ skipIfLogged: !sleepReminder.skipIfLogged }), 'set skipIfLogged')
    },
    [setSleepReminder, sleepReminder.skipIfLogged],
  )

  return (
    <div className="rounded-xl bg-surface-raised border border-border-subtle overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-1">
        <h2 className="text-xs font-sans font-medium text-text-secondary">
          {t('sleepReminder.title')}
        </h2>
      </div>

      {/* 开关 */}
      <SettingsRow label={t('sleepReminder.enable')}>
        <button
          onClick={handleToggle}
          role="switch"
          aria-checked={pendingEnabled}
          className={cn(
            'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
            pendingEnabled ? 'bg-accent' : 'bg-surface-sunken',
          )}
        >
          <span
            className={cn(
              'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
              pendingEnabled ? 'translate-x-4' : 'translate-x-0',
            )}
          />
        </button>
      </SettingsRow>

      {pendingEnabled && (
        <>
          {/* 就寝时间 */}
          <SettingsRow label={t('sleepReminder.bedtime')}>
            <input
              type="time"
              value={sleepReminder.bedtime}
              onChange={(e) => handleBedtimeChange(e.target.value)}
              className="px-2.5 py-1 text-sm font-mono text-text-primary bg-surface-sunken border border-border-subtle rounded-lg focus:ring-2 focus:ring-accent/30 focus:outline-none transition-shadow duration-150 w-28"
            />
          </SettingsRow>

          {/* 提前量 */}
          <SettingsRow label={t('sleepReminder.remindBefore')}>
            <div className="flex gap-1.5">
              {[0, 15, 30].map((min) => (
                <button
                  key={min}
                  onClick={() => handleLeadChange(min)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-sans rounded-lg border border-border-subtle transition-all duration-150 cursor-pointer',
                    sleepReminder.leadMinutes === min
                      ? 'bg-accent/10 text-accent border-accent/30'
                      : 'text-text-secondary hover:text-text-primary hover:bg-surface-sunken',
                  )}
                >
                  {min === 0 ? t('sleepReminder.onTime') : `${t('sleepReminder.remindBefore')} ${min}${t('sleepReminder.minutes')}`}
                </button>
              ))}
            </div>
          </SettingsRow>

          {/* 已记主睡眠则跳过 */}
          <SettingsRow label={t('sleepReminder.skipWhenSleepLogged')}>
            <button
              onClick={handleSkipChange}
              role="switch"
              aria-checked={sleepReminder.skipIfLogged}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                sleepReminder.skipIfLogged ? 'bg-accent' : 'bg-surface-sunken',
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out',
                  sleepReminder.skipIfLogged ? 'translate-x-4' : 'translate-x-0',
                )}
              />
            </button>
          </SettingsRow>

          {/* 数据感知行 */}
          {avgBedtime && (
            <div className="px-5 pb-4 pt-1">
              <p className="text-[11px] text-text-tertiary font-sans">
                {t('sleepReminder.avgBedtime', avgBedtime)}
              </p>
            </div>
          )}
        </>
      )}

      {!pendingEnabled && (
        <div className="px-5 pb-4 pt-1">
          <p className="text-[11px] text-text-tertiary font-sans">
            {t('sleepReminder.desc')}
          </p>
        </div>
      )}
    </div>
  )
}

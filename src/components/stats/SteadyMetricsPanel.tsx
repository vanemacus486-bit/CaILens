import { useMemo } from 'react'
import type { CalendarEvent } from '@/domain/event'
import { computeSteadyMetrics } from '@/domain/steadyMetrics'
import { AlertCircle, TrendingDown, TrendingUp, Minus, Moon, Sun, Clock, Activity } from 'lucide-react'

interface SteadyMetricsPanelProps {
  rangeEvents: CalendarEvent[]
  language: 'zh' | 'en'
}

export function SteadyMetricsPanel({ rangeEvents, language }: SteadyMetricsPanelProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en

  const metrics = useMemo(() => {
    // Use last 56 days of events
    const now = Date.now()
    const cutoff = now - 56 * 86_400_000
    const recentEvents = rangeEvents.filter((e) => e.startTime >= cutoff)
    return computeSteadyMetrics(recentEvents, 56)
  }, [rangeEvents])

  // ── 漂移方向图标 ────────────────────────────────────

  const DriftIcon = metrics.drift.direction === 'delaying'
    ? TrendingUp
    : metrics.drift.direction === 'advancing'
      ? TrendingDown
      : Minus

  const driftColor = metrics.drift.direction === 'delaying'
    ? 'var(--color-text-danger, #B53535)'
    : metrics.drift.direction === 'advancing'
      ? 'var(--color-text-success, #2D7D46)'
      : 'var(--text-tertiary)'

  // ── 格式 ────────────────────────────────────────────

  function fmtHour(h: number | null): string {
    if (h === null) return '—'
    const hours = Math.floor(h)
    const mins = Math.round((h - hours) * 60)
    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`
  }

  function fmtMins(m: number | null): string {
    if (m === null) return '—'
    return `${Math.round(m)} ${t('分钟', 'min')}`
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-serif text-[22px] font-medium text-text-primary">
        {t('稳态指标', 'Steady Metrics')}
      </h1>

      {/* 数据不足 */}
      {metrics.weekCount < 2 && (
        <div className="flex items-center gap-3 py-6 text-text-tertiary">
          <AlertCircle size={18} strokeWidth={1.75} />
          <p className="font-sans text-sm">
            {t('数据不足 2 周，请继续记录。', 'Less than 2 weeks of data. Keep recording.')}
          </p>
        </div>
      )}

      {metrics.weekCount >= 2 && (
        <>
          {/* ── 睡眠指标卡片 ── */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard
              icon={<Moon size={18} strokeWidth={1.75} />}
              label={t('就寝中位数', 'Median Bedtime')}
              value={fmtHour(metrics.sleep.medianBedtime)}
              sub={`σ ${fmtMins(metrics.sleep.bedtimeStddev)}`}
            />
            <MetricCard
              icon={<Sun size={18} strokeWidth={1.75} />}
              label={t('起床中位数', 'Median Wake')}
              value={fmtHour(metrics.sleep.medianWakeTime)}
              sub={`σ ${fmtMins(metrics.sleep.wakeTimeStddev)}`}
            />
            <MetricCard
              icon={<Clock size={18} strokeWidth={1.75} />}
              label={t('睡眠时长中位数', 'Median Sleep')}
              value={metrics.sleep.medianSleepDuration !== null
                ? `${metrics.sleep.medianSleepDuration.toFixed(1)}h`
                : '—'}
              sub={t(`${metrics.weekCount} 周`, `${metrics.weekCount}w`) + ` · ${Math.round(metrics.coverage * 100)}% ${t('覆盖', 'cover')}`}
            />
          </div>

          {/* ── 漂移指标 ── */}
          <div className="rounded-lg border border-border-default p-5">
            <div className="flex items-center gap-2 mb-4">
              <DriftIcon size={20} strokeWidth={1.75} style={{ color: driftColor }} />
              <h2 className="font-serif text-lg font-medium text-text-primary">
                {t('作息漂移', 'Routine Drift')}
              </h2>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="font-sans text-xs text-text-tertiary mb-1">
                  {t('就寝时间变化', 'Bedtime Drift')}
                </p>
                <p className="font-sans text-lg font-medium text-text-primary">
                  {metrics.drift.bedtimeDrift !== null
                    ? `${metrics.drift.bedtimeDrift > 0 ? '+' : ''}${metrics.drift.bedtimeDrift.toFixed(1)} ${t('分钟/周', 'min/wk')}`
                    : '—'}
                </p>
                {metrics.drift.projectedBedtime !== null && (
                  <p className="font-sans text-xs text-text-tertiary mt-1">
                    {t('4周后: ', 'In 4w: ')}{fmtHour(metrics.drift.projectedBedtime)}
                  </p>
                )}
              </div>

              <div>
                <p className="font-sans text-xs text-text-tertiary mb-1">
                  {t('起床时间变化', 'Wake Drift')}
                </p>
                <p className="font-sans text-lg font-medium text-text-primary">
                  {metrics.drift.wakeTimeDrift !== null
                    ? `${metrics.drift.wakeTimeDrift > 0 ? '+' : ''}${metrics.drift.wakeTimeDrift.toFixed(1)} ${t('分钟/周', 'min/wk')}`
                    : '—'}
                </p>
                {metrics.drift.projectedWakeTime !== null && (
                  <p className="font-sans text-xs text-text-tertiary mt-1">
                    {t('4周后: ', 'In 4w: ')}{fmtHour(metrics.drift.projectedWakeTime)}
                  </p>
                )}
              </div>
            </div>

            {/* 方向标签 */}
            <div className="mt-4 pt-3 border-t border-border-subtle">
              <span className="inline-flex items-center gap-1.5 font-sans text-xs text-text-tertiary">
                <Activity size={14} strokeWidth={1.75} />
                {metrics.drift.direction === 'delaying'
                  ? t('作息在向"推迟"方向漂移', 'Routine is drifting later')
                  : metrics.drift.direction === 'advancing'
                    ? t('作息在向"提前"方向漂移', 'Routine is drifting earlier')
                    : t('作息相对稳定', 'Routine is stable')}
              </span>
            </div>
          </div>

          <p className="font-sans text-xs text-text-tertiary italic">
            {t('基于最近 8 周的数据分析。漂移速度通过线性回归计算。', 'Based on the last 8 weeks. Drift computed via linear regression.')}
          </p>
        </>
      )}
    </div>
  )
}

// ── 指标卡片 ─────────────────────────────────────────────────

function MetricCard({
  icon, label, value, sub,
}: {
  icon: React.ReactNode
  label: string
  value: string
  sub: string
}) {
  return (
    <div className="rounded-lg border border-border-default p-4">
      <div className="flex items-center gap-2 mb-2 text-text-tertiary">
        {icon}
        <span className="font-sans text-xs">{label}</span>
      </div>
      <p className="font-mono text-xl font-medium text-text-primary tabular-nums">
        {value}
      </p>
      <p className="font-sans text-[11px] text-text-tertiary mt-1">
        {sub}
      </p>
    </div>
  )
}

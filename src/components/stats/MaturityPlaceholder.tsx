interface MaturityPlaceholderProps {
  daysRecorded: number
  target?: number
  language: 'zh' | 'en'
}

/**
 * Shown in place of modules that require more data than the user has recorded.
 * A progress ring toward the maturity threshold with a nudge to keep recording.
 */
export function MaturityPlaceholder({
  daysRecorded,
  target = 14,
  language,
}: MaturityPlaceholderProps) {
  const t = (zh: string, en: string) => language === 'zh' ? zh : en
  const remaining = Math.max(target - daysRecorded, 0)
  const pct = Math.min((daysRecorded / target) * 100, 100)

  const SIZE = 52
  const STROKE = 4
  const radius = (SIZE - STROKE) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (pct / 100) * circumference

  return (
    <div className="bg-surface-raised border border-border-subtle px-6 py-8 flex flex-col items-center text-center">
      {/* Progress ring */}
      <svg width={SIZE} height={SIZE} className="mb-3 opacity-50">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={radius}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
          style={{ transition: 'stroke-dashoffset 0.6s ease-out' }}
        />
        <text
          x={SIZE / 2}
          y={SIZE / 2 + 1}
          textAnchor="middle"
          dominantBaseline="middle"
          className="font-mono text-[11px]"
          fill="var(--text-tertiary)"
        >
          {daysRecorded}/{target}
        </text>
      </svg>

      <p className="text-[13px] text-text-tertiary leading-relaxed max-w-[260px]">
        {remaining > 0
          ? t(
              `继续记录 ${remaining} 天，解锁趋势分析`,
              `Record for ${remaining} more day${remaining > 1 ? 's' : ''} to unlock trend analysis`,
            )
          : t('趋势分析已解锁', 'Trend analysis unlocked')}
      </p>
    </div>
  )
}

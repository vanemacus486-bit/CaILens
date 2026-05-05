interface RechartsTooltipProps {
  active?: boolean
  payload?: Array<{
    name: string
    value: number
    color?: string
    fill?: string
  }>
  label?: string | number
  labelFormatter?: (label: string | number) => string
  decimals?: number
}

export function RechartsTooltip({
  active,
  payload,
  label,
  labelFormatter,
  decimals = 1,
}: RechartsTooltipProps) {
  if (!active || !payload?.length) return null

  return (
    <div className="bg-surface-sunken border border-border-default px-3.5 py-2.5 shadow-tooltip">
      {label !== undefined && (
        <div className="text-body-xs text-text-tertiary italic mb-1.5">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2 mb-0.5">
          <span
            className="w-2 h-2 rounded-full flex-shrink-0"
            style={{ background: p.color || p.fill }}
          />
          <span className="text-xs text-text-secondary font-sans">{p.name}</span>
          <span className="text-body-sm text-text-primary font-mono font-semibold ml-auto pl-4">
            {typeof p.value === 'number' ? p.value.toFixed(decimals) : p.value}h
          </span>
        </div>
      ))}
    </div>
  )
}

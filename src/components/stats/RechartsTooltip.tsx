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
    <div
      style={{
        background: 'var(--surface-raised)',
        border: '1px solid var(--line)',
        borderRadius: 'var(--radius-s)',
        padding: '8px 12px',
        boxShadow: 'var(--shadow-tooltip)',
      }}
    >
      {label !== undefined && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--ink-3)',
            fontFamily: 'var(--font-mono)',
            marginBottom: 6,
          }}
        >
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: i < payload.length - 1 ? 2 : 0 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              flexShrink: 0,
              background: p.color || p.fill,
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)' }}>{p.name}</span>
          <span style={{
            fontSize: 13,
            color: 'var(--ink)',
            fontFamily: 'var(--font-mono)',
            fontWeight: 500,
            marginLeft: 'auto',
            paddingLeft: 16,
          }}>
            {typeof p.value === 'number' ? p.value.toFixed(decimals) : p.value}h
          </span>
        </div>
      ))}
    </div>
  )
}

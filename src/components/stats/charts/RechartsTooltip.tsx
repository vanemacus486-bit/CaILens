interface TooltipDatum {
  name: string
  value: number
  color?: string
  fill?: string
  /** Series key — used to de-duplicate when a fill Area + Line share a dataKey. */
  dataKey?: string | number
  /** recharts copies `tooltipType` here; 'none' means "hide from tooltip". */
  type?: string
  /** The full data row for this bucket; carries the `__d_<id>` delta fields. */
  payload?: Record<string, number | string | boolean | null | undefined>
}

interface RechartsTooltipProps {
  active?: boolean
  payload?: TooltipDatum[]
  label?: string | number
  labelFormatter?: (label: string | number) => string
  decimals?: number
  sortByValue?: boolean
  showTotal?: boolean
  /** Append each series' share of the bucket total, e.g. "· 48%". */
  showShare?: boolean
  /** Append the change vs the previous bucket, e.g. "▲2.0" (reads `__d_<id>`). */
  showDelta?: boolean
  /** dataKey of the hovered series — its row is emphasised, the rest dimmed. */
  activeDataKey?: string | number | null
}

/** Direction marker vs previous period — neutral (no good/bad colour). */
function formatDelta(d: number, decimals: number): string | null {
  if (d > 0.05) return `▲${d.toFixed(decimals)}`
  if (d < -0.05) return `▼${Math.abs(d).toFixed(decimals)}`
  return '▬'
}

export function RechartsTooltip({
  active,
  payload,
  label,
  labelFormatter,
  decimals = 1,
  sortByValue = false,
  showTotal = false,
  showShare = false,
  showDelta = false,
  activeDataKey = null,
}: RechartsTooltipProps) {
  if (!active || !payload?.length) return null

  // recharts hands a *custom* tooltip the full payload — including decorative
  // series flagged tooltipType="none" (e.g. the fill Area under a single line)
  // and any accidental duplicates. Its built-in DefaultTooltipContent drops
  // `type === 'none'`; we replicate that and also collapse repeated series so
  // the same category can never appear twice.
  const seen = new Set<string | number>()
  let items = payload.filter((p) => {
    if (p.type === 'none') return false
    const key = p.dataKey ?? p.name
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
  if (items.length === 0) return null
  if (sortByValue) {
    items = items.sort((a, b) => (b.value ?? 0) - (a.value ?? 0))
  }

  const multi = items.length > 1
  const total = items.reduce((s, p) => s + (p.value ?? 0), 0)
  // The 合计 row only carries information with 2+ series; with one it just
  // echoes the single value, so suppress it.
  const showSum = showTotal && multi
  // Share % is meaningless at 100% (single series), so gate it on multi too.
  const showPct = showShare && multi && total > 0
  // Dim siblings only when the hovered series is actually in this tooltip.
  const hasActive = activeDataKey != null && items.some((p) => p.dataKey === activeDataKey)

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
      {items.map((p, i) => {
        const isActive = hasActive && p.dataKey === activeDataKey
        const dimmed = hasActive && !isActive
        const pct = showPct ? Math.round(((p.value ?? 0) / total) * 100) : null
        const rawDelta = showDelta && p.payload ? p.payload[`__d_${p.dataKey}`] : undefined
        const delta = typeof rawDelta === 'number' ? formatDelta(rawDelta, decimals) : null
        return (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              marginBottom: i < items.length - 1 ? 2 : (showSum ? 6 : 0),
              opacity: dimmed ? 0.4 : 1,
              transition: 'opacity 0.15s ease',
            }}
          >
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                flexShrink: 0,
                background: p.color || p.fill,
              }}
            />
            <span
              style={{
                fontSize: 12,
                color: isActive ? 'var(--ink)' : 'var(--ink-2)',
                fontFamily: 'var(--font-ui)',
                fontWeight: isActive ? 700 : 400,
              }}
            >
              {p.name}
            </span>
            <span
              style={{
                marginLeft: 'auto',
                paddingLeft: 16,
                display: 'flex',
                alignItems: 'baseline',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 13, color: 'var(--ink)', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
                {typeof p.value === 'number' ? p.value.toFixed(decimals) : p.value}h
              </span>
              {pct !== null && (
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)' }}>
                  {pct}%
                </span>
              )}
              {delta !== null && (
                <span style={{ fontSize: 11, color: 'var(--ink-3)', fontFamily: 'var(--font-mono)', minWidth: 28, textAlign: 'right' }}>
                  {delta}
                </span>
              )}
            </span>
          </div>
        )
      })}
      {showSum && (
        <>
          <div style={{ height: 1, background: 'var(--line)', marginBottom: 6 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 12, color: 'var(--ink-2)', fontFamily: 'var(--font-ui)', fontWeight: 600 }}>{'合计'}</span>
            <span style={{
              fontSize: 13,
              color: 'var(--ink-2)',
              fontFamily: 'var(--font-mono)',
              fontWeight: 500,
              marginLeft: 'auto',
              paddingLeft: 16,
            }}>
              Σ{total.toFixed(decimals)}h
            </span>
          </div>
        </>
      )}
    </div>
  )
}

import { Fragment, cloneElement, useMemo, type ReactNode } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { AnchorMatch } from '@/domain/aiChat'

/* ── Inline patterns ─────────────────────────────────── */

/** Combined pattern: percentages or time durations */
const BADGE_RE = /(\d+\.?\d*)%|(\d+\.?\d*)h(?:\s*(\d+\.?\d*)m)?/gi

/** Comparison line: "Label: 12.5h vs 10h (+25%)" */
const COMPARISON_RE = /^(.+?):\s*(\d+\.?\d*)h?\s*vs\s*(\d+\.?\d*)h?.*?([+-]?\d+\.?\d*)%/

/* ── Mini inline components ──────────────────────────── */

function MiniStatBadge({ value }: { value: number }) {
  const pct = Math.min(value, 100)
  return (
    <span className="inline-flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-surface-raised border border-border-subtle text-xs font-mono align-middle mx-0.5">
      <span className="text-text-secondary">{value}%</span>
      <span className="inline-block w-8 h-1.5 rounded-full bg-surface-sunken overflow-hidden">
        <span className="block h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
      </span>
      <span className="text-text-tertiary">(of 24h)</span>
    </span>
  )
}

function MiniTimeBadge({ hours, minutes }: { hours: number; minutes?: number }) {
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-accent/10 border border-accent/20 text-xs font-mono text-accent align-middle mx-0.5">
      <span className="w-1.5 h-1.5 rounded-full bg-accent" />
      {hours}h{minutes ? `${minutes}m` : ''}
    </span>
  )
}

function MiniComparisonCard({
  label,
  current,
  previous,
  delta,
}: {
  label: string
  current: number
  previous: number
  delta: number
}) {
  const isPos = delta >= 0
  return (
    <span className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-surface-raised border border-border-subtle text-xs align-middle my-1">
      <span className="font-sans font-medium text-text-primary">{label}</span>
      <span className="font-mono text-text-primary">{current}h</span>
      <span className="text-text-tertiary">vs</span>
      <span className="font-mono text-text-secondary">{previous}h</span>
      <span
        className={`font-mono ${isPos ? 'text-color-text-positive' : 'text-color-text-negative'}`}
      >
        {isPos ? '+' : ''}
        {delta}%
      </span>
    </span>
  )
}

/* ── Mini bar chart for tables ───────────────────────── */

const BAR_FILLS = [
  'var(--event-accent-fill)',
  'var(--event-sage-fill)',
  'var(--event-sand-fill)',
  'var(--event-sky-fill)',
  'var(--event-rose-fill)',
  'var(--event-stone-fill)',
]

interface TableCell {
  text: string
  numeric: boolean
}

function parseTable(node: ReactNode): { headers: TableCell[]; rows: TableCell[][] } | null {
  const headers: TableCell[] = []
  const rows: TableCell[][] = []
  let currentHeaderRow: TableCell[] = []
  let currentRow: TableCell[] = []
  let inHead = false

  function propsOf(n: ReactNode): { children?: ReactNode } | null {
    if (n == null || typeof n !== 'object') return null
    if (!('props' in n)) return null
    return (n as React.ReactElement).props as { children?: ReactNode }
  }

  function walk(n: ReactNode) {
    if (typeof n === 'string' || typeof n === 'number') {
      const text = String(n)
      if (currentRow.length > 0) {
        currentRow[currentRow.length - 1].text += text
      } else if (currentHeaderRow.length > 0) {
        currentHeaderRow[currentHeaderRow.length - 1].text += text
      }
      return
    }
    const p = propsOf(n)
    if (!p) return
    const type = (n as React.ReactElement).type as string

    if (type === 'th') {
      currentHeaderRow.push({ text: '', numeric: false })
      inHead = true
      if (p.children) walk(p.children)
      currentHeaderRow[currentHeaderRow.length - 1].text =
        currentHeaderRow[currentHeaderRow.length - 1].text.trim()
      return
    }

    if (type === 'td') {
      currentRow.push({ text: '', numeric: false })
      if (p.children) walk(p.children)
      currentRow[currentRow.length - 1].text =
        currentRow[currentRow.length - 1].text.trim()
      return
    }

    if (type === 'tr') {
      if (inHead) {
        currentHeaderRow = []
        if (p.children) walk(p.children)
        if (currentHeaderRow.length > 0) headers.push(...currentHeaderRow)
        currentHeaderRow = []
      } else {
        currentRow = []
        if (p.children) walk(p.children)
        if (currentRow.length > 0) {
          rows.push([...currentRow])
        }
        currentRow = []
      }
      return
    }

    if (type === 'thead') {
      inHead = true
      if (p.children) walk(p.children)
      inHead = false
      return
    }

    if (type === 'tbody') {
      inHead = false
      if (p.children) walk(p.children)
      return
    }

    if (p.children) walk(p.children)
  }

  walk(node)

  if (headers.length === 0 && rows.length === 0) return null

  // Detect numeric columns
  for (let ci = 0; ci < headers.length; ci++) {
    const allNum = rows.every((r) => {
      const v = r[ci]?.text.replace(/[^0-9.\-]/g, '')
      return v !== '' && !isNaN(parseFloat(v))
    })
    if (headers[ci]) headers[ci].numeric = allNum
    for (const r of rows) {
      if (r[ci]) r[ci].numeric = allNum
    }
  }

  return { headers, rows }
}

function MiniBarChart({
  data,
}: {
  data: { name: string; value: number; fill: string }[]
}) {
  if (data.length === 0) return null
  const maxV = Math.max(...data.map((d) => d.value), 1)

  return (
    <div className="my-2 p-3 rounded-xl bg-surface-raised border border-border-subtle">
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-20 text-right font-sans text-text-secondary truncate flex-shrink-0">
              {d.name}
            </span>
            <span className="flex-1 h-4 rounded-full bg-surface-sunken overflow-hidden">
              <span
                className="block h-full rounded-full"
                style={{ width: `${(d.value / maxV) * 100}%`, backgroundColor: d.fill }}
              />
            </span>
            <span className="w-10 text-left font-mono text-text-primary flex-shrink-0">
              {d.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ── Text processing helpers ─────────────────────────── */

function extractTextContent(node: ReactNode): string {
  if (typeof node === 'string') return node
  if (typeof node === 'number') return String(node)
  if (Array.isArray(node)) return node.map(extractTextContent).join('')
  if (node && typeof node === 'object' && 'props' in node) {
    const el = node as React.ReactElement<{ children?: ReactNode }>
    return extractTextContent(el.props.children)
  }
  return ''
}

interface BadgeSeg {
  kind: 'text' | 'percent' | 'time'
  text: string
  value?: number
  extra?: number
}

function segmentInlineText(text: string): BadgeSeg[] {
  const segs: BadgeSeg[] = []
  let last = 0
  const re = new RegExp(BADGE_RE.source, 'gi')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) segs.push({ kind: 'text', text: text.slice(last, m.index) })
    if (m[1] !== undefined) {
      segs.push({ kind: 'percent', text: m[0], value: parseFloat(m[1]) })
    } else {
      segs.push({
        kind: 'time',
        text: m[0],
        value: parseFloat(m[2]),
        extra: m[3] !== undefined ? parseFloat(m[3]) : undefined,
      })
    }
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ kind: 'text', text: text.slice(last) })
  return segs
}

function processNodeChildren(
  node: ReactNode,
  anchorTerms?: AnchorTermDef[],
  onAnchorHover?: (match: AnchorMatch | null) => void,
): ReactNode {
  if (typeof node === 'string') {
    // Check for anchor term matches first
    if (anchorTerms && onAnchorHover) {
      const anchorNodes = segmentAnchorTerms(node, anchorTerms, onAnchorHover)
      if (anchorNodes.length > 0) return <>{anchorNodes}</>
    }

    // Fall through to badge processing
    const segs = segmentInlineText(node)
    if (segs.length === 1 && segs[0].kind === 'text') return node
    return segs.map((s, i) => {
      switch (s.kind) {
        case 'percent':
          return <MiniStatBadge key={i} value={s.value!} />
        case 'time':
          return <MiniTimeBadge key={i} hours={s.value!} minutes={s.extra} />
        default:
          return <Fragment key={i}>{s.text}</Fragment>
      }
    })
  }
  if (Array.isArray(node)) {
    return node.map((child, i) => (
      <Fragment key={i}>{processNodeChildren(child, anchorTerms, onAnchorHover)}</Fragment>
    ))
  }
  if (node != null && typeof node === 'object' && 'type' in node) {
    const el = node as React.ReactElement<{ children?: ReactNode }>
    if (el.props.children) {
      return cloneElement(
        el,
        el.props,
        processNodeChildren(el.props.children, anchorTerms, onAnchorHover),
      )
    }
  }
  return node
}

function segmentAnchorTerms(
  text: string,
  anchorTerms: AnchorTermDef[],
  onAnchorHover: (match: AnchorMatch | null) => void,
): ReactNode[] {
  const lowerText = text.toLowerCase()

  type Hit = { start: number; end: number; match: AnchorMatch }
  const hits: Hit[] = []

  for (const term of anchorTerms) {
    let idx = lowerText.indexOf(term.lower)
    while (idx !== -1) {
      hits.push({ start: idx, end: idx + term.lower.length, match: term.match })
      idx = lowerText.indexOf(term.lower, idx + 1)
    }
  }

  if (hits.length === 0) return []

  hits.sort((a, b) => a.start - b.start || (b.end - b.start) - (a.end - a.start))
  const selected: Hit[] = [hits[0]]
  for (let i = 1; i < hits.length; i++) {
    if (hits[i].start >= selected[selected.length - 1].end) {
      selected.push(hits[i])
    }
  }

  const nodes: ReactNode[] = []
  let cursor = 0
  for (const hit of selected) {
    if (hit.start > cursor) {
      nodes.push(<Fragment key={`t-${cursor}`}>{text.slice(cursor, hit.start)}</Fragment>)
    }
    nodes.push(
      <span
        key={`a-${hit.start}`}
        className="underline decoration-accent/30 decoration-1 underline-offset-2 cursor-pointer rounded-sm transition-all duration-200 hover:decoration-accent hover:bg-accent/5"
        onMouseEnter={() => onAnchorHover(hit.match)}
        onMouseLeave={() => onAnchorHover(null)}
      >
        {text.slice(hit.start, hit.end)}
      </span>,
    )
    cursor = hit.end
  }
  if (cursor < text.length) {
    nodes.push(<Fragment key={`t-${cursor}`}>{text.slice(cursor)}</Fragment>)
  }

  return nodes
}

/* ── Custom markdown components ──────────────────────── */

const customComponents: Components = {
  h1: ({ children }) => (
    <h1 className="font-sans text-base font-semibold text-text-primary mt-4 mb-2 pb-1 border-b border-border-subtle">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="font-sans text-sm font-semibold text-text-primary mt-3 mb-1.5">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="font-sans text-xs font-semibold text-text-secondary mt-2 mb-1">
      {children}
    </h3>
  ),
  p: ({ children }) => {
    const textContent = extractTextContent(children).trim()
    const comp = COMPARISON_RE.exec(textContent)
    if (comp) {
      return (
        <p className="font-serif text-sm leading-relaxed my-1.5">
          <MiniComparisonCard
            label={comp[1].trim()}
            current={parseFloat(comp[2])}
            previous={parseFloat(comp[3])}
            delta={parseFloat(comp[4])}
          />
        </p>
      )
    }
    return (
      <p className="font-serif text-sm leading-relaxed my-1.5 text-text-primary">
        {processNodeChildren(children)}
      </p>
    )
  },
  ul: ({ children }) => (
    <ul className="list-disc list-inside font-serif text-sm leading-relaxed text-text-primary space-y-0.5 my-1.5 ml-1">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="list-decimal list-inside font-serif text-sm leading-relaxed text-text-primary space-y-0.5 my-1.5 ml-1">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-text-primary [&>p]:my-0 [&>p]:inline">{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-accent pl-3 my-2 py-0.5 font-serif text-sm italic text-text-secondary">
      {children}
    </blockquote>
  ),
  code: ({ children }) => (
    <code className="font-mono text-xs bg-surface-sunken text-accent px-1 py-0.5 rounded">
      {children}
    </code>
  ),
  pre: ({ children }) => (
    <pre className="font-mono text-xs bg-surface-sunken text-text-primary p-3 rounded-lg overflow-x-auto my-2 border border-border-subtle">
      {children}
    </pre>
  ),
  a: ({ href, children }) => {
    if (href?.startsWith('event:')) {
      return (
        <span className="text-accent text-xs font-mono" data-event-id={href.slice(6)}>
          [{children}]
        </span>
      )
    }
    return (
      <a
        href={href}
        className="text-accent underline decoration-accent/30 hover:decoration-accent/60 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  },
  strong: ({ children }) => (
    <strong className="font-semibold text-text-primary">{children}</strong>
  ),
  em: ({ children }) => (
    <em className="italic text-text-secondary">{children}</em>
  ),
  table: ({ children }) => {
    const tableData = parseTable(children)
    if (tableData && tableData.headers.length > 0 && tableData.rows.length > 0) {
      // Check if last column has numeric values -> render as bar chart
      const numericCol = tableData.headers.length - 1
      if (tableData.headers[numericCol]?.numeric) {
        const chartData = tableData.rows.map((r, i) => ({
          name: r[0]?.text ?? `Item ${i}`,
          value: parseFloat(r[numericCol]?.text.replace(/[^0-9.\-]/g, '')) || 0,
          fill: BAR_FILLS[i % BAR_FILLS.length],
        }))
        return <MiniBarChart data={chartData} />
      }
    }
    // Fallback to styled table
    return (
      <div className="overflow-x-auto my-2">
        <table className="w-full text-xs font-mono border-collapse">{children}</table>
      </div>
    )
  },
  thead: ({ children }) => <thead className="bg-surface-sunken">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => (
    <tr className="border-b border-border-subtle last:border-0">{children}</tr>
  ),
  th: ({ children }) => (
    <th className="text-left px-2 py-1.5 font-sans font-medium text-text-secondary text-[11px]">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="px-2 py-1 font-serif text-text-primary">{children}</td>
  ),
  hr: () => <hr className="my-3 border-border-subtle" />,
}

/* ── Main component ──────────────────────────────────── */

interface MarkdownRendererProps {
  content: string
  anchorTerms?: AnchorTermDef[]
  onAnchorHover?: (match: AnchorMatch | null) => void
}

export type AnchorTermDef = {
  lower: string
  match: AnchorMatch
}

export function MarkdownRenderer({ content, anchorTerms, onAnchorHover }: MarkdownRendererProps) {
  const components: Components = useMemo(() => {
    if (!anchorTerms || !onAnchorHover) return customComponents

    const pWithAnchors: Components['p'] = ({ children }) => {
      const textContent = extractTextContent(children).trim()
      const comp = COMPARISON_RE.exec(textContent)
      if (comp) {
        return (
          <p className="font-serif text-sm leading-relaxed my-1.5">
            <MiniComparisonCard
              label={comp[1].trim()}
              current={parseFloat(comp[2])}
              previous={parseFloat(comp[3])}
              delta={parseFloat(comp[4])}
            />
          </p>
        )
      }
      return (
        <p className="font-serif text-sm leading-relaxed my-1.5 text-text-primary">
          {processNodeChildren(children, anchorTerms, onAnchorHover)}
        </p>
      )
    }

    return { ...customComponents, p: pWithAnchors }
  }, [anchorTerms, onAnchorHover])

  return (
    <ReactMarkdown components={components} remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  )
}

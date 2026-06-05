/**
 * # HygieneScoreChart — 卫生分数折线图
 *
 * 基于日历事件中的洗澡事件计算连续卫生分数：
 * - 分数是一条跨天的状态线，每天自然衰减 5
 * - 每天每洗一次澡 +20 分（单日上限 100）
 * - 固定基准线 50，用户的线在基准以上为健康状态
 * - 使用 recharts LineChart 展示走势
 *
 * 数据源为 rangeEvents（主日历事件），与 HygieneCalendarCard 一致。
 */

import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import type { CalendarEvent } from '@/domain/event'
import { formatISODate } from '@/domain/time'

// ── 常量 ────────────────────────────────────────────────────

/** 基准线（折线图参考线用） */
const HYGIENE_BASELINE = 50
/** 单日最高卫生分数 */
const HYGIENE_MAX_DAILY_SCORE = 100
/** 每日衰减率 */
const HYGIENE_DAILY_DECAY = 5
/** 每次洗澡加分 */
const SHOWER_SCORE = 20

interface Props {
  rangeEvents: CalendarEvent[]
}

// ── 辅助 ────────────────────────────────────────────────────

function isShowerEvent(e: CalendarEvent): boolean {
  if (!e.title) return false
  const t = e.title.trim().toLowerCase()
  return t === '洗澡' || t === 'shower' || t.includes('洗澡') || t.includes('shower')
}

function dateStr(ts: number): string {
  return formatISODate(new Date(ts))
}

/**
 * 计算跨天连续卫生分数（用于折线图时序展示）。
 * 策略：从 0 开始，每天衰减 HYGIENE_DAILY_DECAY，
 * 加上当日洗澡加分（洗澡次数 × SHOWER_SCORE，上限 HYGIENE_MAX_DAILY_SCORE），不低于 0。
 */
function computeRunningHygieneScore(
  events: readonly CalendarEvent[],
): Array<{ date: string; score: number }> {
  // 按天分组洗澡事件
  const showersByDay = new Map<string, number>()
  for (const e of events) {
    if (isShowerEvent(e)) {
      const dk = dateStr(e.startTime)
      showersByDay.set(dk, (showersByDay.get(dk) ?? 0) + 1)
    }
  }

  if (showersByDay.size === 0) return []

  // 按日期排序
  const sortedDays = [...showersByDay.entries()].sort((a, b) => a[0].localeCompare(b[0]))

  let running = 0
  const timeline: Array<{ date: string; score: number }> = []

  for (const [date, count] of sortedDays) {
    // 每日衰减
    running = Math.max(0, running - HYGIENE_DAILY_DECAY)
    // 加上当日洗澡得分
    const dayScore = Math.min(count * SHOWER_SCORE, HYGIENE_MAX_DAILY_SCORE)
    running += dayScore
    // 不超出上限
    running = Math.min(running, HYGIENE_MAX_DAILY_SCORE)

    timeline.push({ date, score: Math.round(running) })
  }

  return timeline
}

// ── 组件 ────────────────────────────────────────────────────

export function HygieneScoreChart({ rangeEvents }: Props) {
  // ── 连续分数计算 ──────────────────────────
  const timeline = useMemo(() => computeRunningHygieneScore(rangeEvents), [rangeEvents])

  // 最新分数
  const currentScore = timeline.length > 0 ? timeline[timeline.length - 1].score : null

  // ── 等级判定 ──────────────────────────────
  const aboveBaseline = currentScore !== null && currentScore >= HYGIENE_BASELINE
  const levelLabel = currentScore !== null
    ? currentScore >= 80 ? '优秀'
      : currentScore >= 60 ? '良好'
      : currentScore >= 40 ? '一般'
      : '待关注'
    : '暂无记录'

  const levelColor = currentScore !== null
    ? currentScore >= 80 ? 'var(--color-text-success)'
      : currentScore >= 60 ? 'var(--color-text-info)'
      : currentScore >= 40 ? 'var(--color-text-warning)'
      : 'var(--color-text-danger)'
    : 'var(--heatmap-ink-3)'

  return (
    <div className="hsc-root">
      <style>{HSC_CSS}</style>

      {/* ── 当前分数概览 ──────────────────────── */}
      <div className="hsc-overview">
        <div className="hsc-health-card">
          <div className="hsc-info-label">{'当前分数'}</div>
          <div className="hsc-info-value" style={{ color: levelColor }}>
            {currentScore !== null ? currentScore : '—'}
          </div>
          <div className="hsc-info-sub" style={{ color: levelColor }}>
            {levelLabel}
          </div>
        </div>
        <div className="hsc-health-card">
          <div className="hsc-info-label">{'基准线'}</div>
          <div className="hsc-info-value" style={{ color: 'var(--heatmap-ink-3)' }}>
            {HYGIENE_BASELINE}
          </div>
          <div className="hsc-info-sub" style={{ color: 'var(--heatmap-ink-3)' }}>
            {'固定值'}
          </div>
        </div>
        <div className="hsc-health-card">
          <div className="hsc-info-label">{'差值'}</div>
          <div
            className="hsc-info-value"
            style={{
              color: aboveBaseline ? 'var(--color-text-success)' : 'var(--color-text-danger)',
            }}
          >
            {currentScore !== null
              ? `${aboveBaseline ? '+' : ''}${currentScore - HYGIENE_BASELINE}`
              : '—'}
          </div>
          <div
            className="hsc-info-sub"
            style={{
              color: aboveBaseline ? 'var(--color-text-success)' : 'var(--color-text-danger)',
            }}
          >
            {currentScore !== null
              ? aboveBaseline ? '高于基准' : '低于基准'
              : ''}
          </div>
        </div>
      </div>

      {/* ── 折线图 ────────────────────────────── */}
      <div className="hsc-chart">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={timeline} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
            <CartesianGrid stroke="var(--heatmap-rule)" strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(d: string) => {
                const p = d.split('-')
                return `${p[1]}/${p[2]}`
              }}
              tick={{ fontSize: 10, fill: 'var(--heatmap-ink-3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--heatmap-rule)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[0, 100]}
              tick={{ fontSize: 10, fill: 'var(--heatmap-ink-3)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--heatmap-rule)' }}
              width={30}
            />
            <Tooltip
              contentStyle={{
                background: 'var(--heatmap-bg-card)',
                border: '1px solid var(--heatmap-rule)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--heatmap-ink-1)',
              }}
              labelFormatter={(d: unknown) => {
                const str = String(d)
                const p = str.split('-')
                return `${p[0]}/${p[1]}/${p[2]}`
              }}
              formatter={(value: unknown) => [Number(value), '卫生分数'] as [number, string]}
            />
            <ReferenceLine
              y={HYGIENE_BASELINE}
              stroke="var(--heatmap-ink-3)"
              strokeDasharray="6 4"
              strokeWidth={1.5}
              label={{
                value: '基准线',
                position: 'insideTopRight',
                fill: 'var(--heatmap-ink-3)',
                fontSize: 10,
              }}
            />
            <Line
              type="monotone"
              dataKey="score"
              stroke="var(--accent)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: 'var(--accent)', stroke: 'var(--heatmap-bg-card)', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────

const HSC_CSS = `
.hsc-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

/* ── Overview ──────────────────────────── */
.hsc-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}
@media (max-width: 719px) {
  .hsc-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}
.hsc-health-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.hsc-info-label {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.3em;
  margin-bottom: 6px;
}
.hsc-info-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.1;
  margin-bottom: 4px;
}
.hsc-info-sub {
  font-size: 11px;
}

/* ── Chart ──────────────────────────────── */
.hsc-chart {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--heatmap-rule);
}
`

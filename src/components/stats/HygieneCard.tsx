/**
 * # HygieneCard — 个人卫生卡片
 *
 * 连续卫生分数模型：
 * - 分数是一条跨天的状态线，每天自然衰减 20
 * - 完成卫生活动可提升分数（洗澡+25，刷牙+15等）
 * - 固定基准线 50，用户的线在基准以上为健康状态
 * - 使用 recharts LineChart 展示走势
 */

import { useMemo, useState, useCallback } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts'
import { format, subDays } from 'date-fns'
import type { DailyHygiene, HygieneActivity } from '@/domain/dailyContext'
import {
  HYGIENE_BASELINE,
  HYGIENE_ACTIVITY_LABELS,
  computeRunningHygieneScore,
} from '@/domain/dailyContext'
import { useDailyContextStore } from '@/stores/dailyContextStore'

interface Props {
  records: DailyHygiene[]
}

const HYGIENE_ACTIVITIES: HygieneActivity[] = [
  'shower', 'brush_teeth', 'skincare', 'shave', 'hair_wash', 'nail_care', 'floss',
]

// ── 组件 ──────────────────────────────────────────────────

export function HygieneCard({ records }: Props) {
  const [isRecording, setIsRecording] = useState(false)
  const [selected, setSelected] = useState<HygieneActivity[]>([])
  const saveHygiene = useDailyContextStore((s) => s.saveHygiene)
  const loadHygiene = useDailyContextStore((s) => s.loadHygiene)

  // ── 连续分数计算 ──────────────────────────
  const timeline = useMemo(() => computeRunningHygieneScore(records), [records])

  // 最新分数
  const currentScore = timeline.length > 0 ? timeline[timeline.length - 1].score : null

  // 今日是否已记录
  const today = format(new Date(), 'yyyy-MM-dd')
  const alreadyRecorded = useMemo(
    () => records.some((r) => r.date === today && r.activities.length > 0),
    [records, today],
  )

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

  // ── 保存与取消 ────────────────────────────
  const handleSave = useCallback(async () => {
    if (selected.length === 0) return
    await saveHygiene(today, selected)
    const end = format(new Date(), 'yyyy-MM-dd')
    const start = format(subDays(new Date(), 60), 'yyyy-MM-dd')
    await loadHygiene(start, end)
    setIsRecording(false)
    setSelected([])
  }, [selected, today, saveHygiene, loadHygiene])

  const handleCancel = useCallback(() => {
    setIsRecording(false)
    setSelected([])
  }, [])

  const toggleActivity = useCallback((activity: HygieneActivity) => {
    setSelected((prev) =>
      prev.includes(activity)
        ? prev.filter((a) => a !== activity)
        : [...prev, activity],
    )
  }, [])

  // ── Render ──────────────────────────────────────────────

  return (
    <div className="hygiene-root">
      <style>{HYGIENE_CSS}</style>

      {/* ── 标题 ──────────────────────────────── */}
      <div className="hygiene-header">
        <span className="hygiene-header-icon">🧹</span>
        <span className="hygiene-header-title">{'个人卫生'}</span>
        {alreadyRecorded ? (
          <span className="hygiene-done-badge">{'今日已记录 ✓'}</span>
        ) : isRecording ? null : (
          <button
            className="hygiene-record-btn"
            onClick={() => { setSelected([]); setIsRecording(true) }}
          >
            {'记录今日'}
          </button>
        )}
      </div>

      {/* ── 当前分数概览 ──────────────────────── */}
      <div className="hygiene-overview">
        <div className="hygiene-health-card">
          <div className="hygiene-info-label">{'当前分数'}</div>
          <div className="hygiene-info-value" style={{ color: levelColor }}>
            {currentScore !== null ? currentScore : '—'}
          </div>
          <div className="hygiene-info-sub" style={{ color: levelColor }}>
            {levelLabel}
          </div>
        </div>
        <div className="hygiene-health-card">
          <div className="hygiene-info-label">{'基准线'}</div>
          <div className="hygiene-info-value" style={{ color: 'var(--heatmap-ink-3)' }}>
            {HYGIENE_BASELINE}
          </div>
          <div className="hygiene-info-sub" style={{ color: 'var(--heatmap-ink-3)' }}>
            {'固定值'}
          </div>
        </div>
        <div className="hygiene-health-card">
          <div className="hygiene-info-label">{'差值'}</div>
          <div
            className="hygiene-info-value"
            style={{
              color: aboveBaseline ? 'var(--color-text-success)' : 'var(--color-text-danger)',
            }}
          >
            {currentScore !== null
              ? `${aboveBaseline ? '+' : ''}${currentScore - HYGIENE_BASELINE}`
              : '—'}
          </div>
          <div
            className="hygiene-info-sub"
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
      <div className="hygiene-chart">
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

      {/* ── 记录面板 ──────────────────────────── */}
      {isRecording && (
        <div className="hygiene-recording">
          <div className="hygiene-recording-title">
            {'记录今日卫生'}
          </div>
          <div className="hygiene-checkbox-grid">
            {HYGIENE_ACTIVITIES.map((activity) => {
              const label = HYGIENE_ACTIVITY_LABELS[activity]
              return (
                <label key={activity} className="hygiene-checkbox-item">
                  <input
                    type="checkbox"
                    checked={selected.includes(activity)}
                    onChange={() => toggleActivity(activity)}
                    className="hygiene-checkbox-input"
                  />
                  <span className="hygiene-checkbox-label">
                    {label.zh}
                  </span>
                </label>
              )
            })}
          </div>
          <div className="hygiene-recording-actions">
            <button
              className="hygiene-save-btn"
              onClick={handleSave}
              disabled={selected.length === 0}
            >
              {'保存'}
            </button>
            <button className="hygiene-cancel-btn" onClick={handleCancel}>
              {'取消'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ────────────────────────────────────────────

const HYGIENE_CSS = `
.hygiene-root {
  width: 100%;
  font-family: 'Noto Sans SC', sans-serif;
  color: var(--heatmap-ink-1);
}

.hygiene-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.hygiene-header-icon { font-size: 18px; }
.hygiene-header-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 16px;
  font-weight: 500;
  color: var(--heatmap-ink-1);
  flex: 1;
}
.hygiene-done-badge {
  font-size: 11px;
  color: var(--color-text-success);
  background: rgba(45, 125, 70, 0.08);
  padding: 4px 10px;
  border-radius: 20px;
}
.hygiene-record-btn {
  font-size: 11px;
  padding: 6px 14px;
  border-radius: 6px;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: all 0.15s ease;
}
.hygiene-record-btn:hover {
  background: var(--accent);
  color: white;
}

/* ── Overview ──────────────────────────── */
.hygiene-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}
@media (max-width: 719px) {
  .hygiene-overview {
    grid-template-columns: repeat(3, 1fr);
  }
}
.hygiene-health-card {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  text-align: center;
}
.hygiene-info-label {
  font-size: 10px;
  color: var(--heatmap-ink-3);
  letter-spacing: 0.3em;
  margin-bottom: 6px;
}
.hygiene-info-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 28px;
  font-weight: 400;
  line-height: 1.1;
  margin-bottom: 4px;
}
.hygiene-info-sub {
  font-size: 11px;
}

/* ── Chart ──────────────────────────────── */
.hygiene-chart {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid var(--heatmap-rule);
  margin-bottom: 16px;
}

/* ── Recording ──────────────────────────── */
.hygiene-recording {
  background: var(--heatmap-bg-card);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid var(--accent);
}
.hygiene-recording-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 12px;
  color: var(--heatmap-ink-1);
}
.hygiene-checkbox-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 8px;
  margin-bottom: 14px;
}
.hygiene-checkbox-item {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  transition: all 0.15s ease;
}
.hygiene-checkbox-item:hover {
  border-color: var(--accent);
  background: rgba(201, 100, 66, 0.04);
}
.hygiene-checkbox-input {
  accent-color: var(--accent);
  width: 14px;
  height: 14px;
}
.hygiene-checkbox-label {
  font-size: 12px;
  color: var(--heatmap-ink-1);
  user-select: none;
}
.hygiene-recording-actions {
  display: flex;
  gap: 8px;
}
.hygiene-save-btn {
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 6px;
  border: none;
  background: var(--accent);
  color: white;
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: opacity 0.15s ease;
}
.hygiene-save-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.hygiene-save-btn:not(:disabled):hover {
  opacity: 0.85;
}
.hygiene-cancel-btn {
  font-size: 12px;
  padding: 8px 20px;
  border-radius: 6px;
  border: 1px solid var(--heatmap-rule);
  background: transparent;
  color: var(--heatmap-ink-2);
  cursor: pointer;
  font-family: 'Noto Sans SC', sans-serif;
  transition: all 0.15s ease;
}
.hygiene-cancel-btn:hover {
  border-color: var(--heatmap-ink-3);
  color: var(--heatmap-ink-1);
}
`

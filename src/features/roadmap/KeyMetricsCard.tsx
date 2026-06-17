/**
 * # KeyMetricsCard — 关键指标计数器卡
 *
 * 头部：标题 + 整体百分比环。网格：每个指标一张计数卡（− 当前→目标 单位 +）。
 * 手动 −/+ 为主；可选「绑定事件」自动累加（复用 roadmap-event-* 选择器样式）。
 */

import { useState, useMemo, useCallback, useRef, useEffect } from 'react'
import { Plus, Minus, X, Link2 } from 'lucide-react'
import type { Goal } from '@/domain/goal'
import type { CalendarEvent } from '@/domain/event'
import type { KeyMetric, CreateMetricInput } from '@/domain/keyMetric'
import {
  computeMetricAutoCount,
  metricCurrent,
  metricPercent,
  aggregateMetricsPercent,
} from '@/domain/keyMetric'

interface KeyMetricsCardProps {
  goal: Goal
  events: readonly CalendarEvent[]
  onAddMetric: (goalId: string, input: CreateMetricInput) => Promise<void>
  onIncrement: (goalId: string, metricId: string, delta: number) => Promise<void>
  onUpdateMetric: (goalId: string, metricId: string, patch: Partial<Omit<KeyMetric, 'id'>>) => Promise<void>
  onRemoveMetric: (goalId: string, metricId: string) => Promise<void>
  onToggleMetricEvent: (goalId: string, metricId: string, eventId: string) => Promise<void>
}

// ── 整体百分比环 ─────────────────────────────────────────────
function AggregateRing({ percent }: { percent: number }) {
  const size = 22
  const stroke = 3
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const offset = c * (1 - percent / 100)
  return (
    <div className="rm-metrics-agg">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 400ms ease-out' }}
        />
      </svg>
      <span className="rm-metrics-agg-text">{percent}%</span>
    </div>
  )
}

// ── 单个指标计数卡 ───────────────────────────────────────────
interface MetricCardProps {
  goalId: string
  metric: KeyMetric
  autoCount: number
  events: readonly CalendarEvent[]
  onIncrement: KeyMetricsCardProps['onIncrement']
  onUpdateMetric: KeyMetricsCardProps['onUpdateMetric']
  onRemoveMetric: KeyMetricsCardProps['onRemoveMetric']
  onToggleMetricEvent: KeyMetricsCardProps['onToggleMetricEvent']
}

function MetricCard({
  goalId,
  metric,
  autoCount,
  events,
  onIncrement,
  onUpdateMetric,
  onRemoveMetric,
  onToggleMetricEvent,
}: MetricCardProps) {
  const [editingLabel, setEditingLabel] = useState(false)
  const [labelDraft, setLabelDraft] = useState('')
  const [editingTarget, setEditingTarget] = useState(false)
  const [targetDraft, setTargetDraft] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [search, setSearch] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const color = metric.categoryId ? `var(--event-${metric.categoryId}-fill)` : 'var(--accent)'
  const current = metricCurrent(metric, autoCount)
  const percent = metricPercent(metric, autoCount)

  useEffect(() => {
    if (!pickerOpen) return
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) setPickerOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [pickerOpen])

  // 去重事件标题供搜索绑定
  const eventTitles = useMemo(() => {
    const m = new Map<string, CalendarEvent>()
    for (const e of events) if (!m.has(e.title)) m.set(e.title, e)
    return Array.from(m.values())
  }, [events])

  const filteredEvents = useMemo(() => {
    if (!search.trim()) return eventTitles.slice(0, 20)
    const q = search.toLowerCase()
    return eventTitles.filter((e) => e.title.toLowerCase().includes(q)).slice(0, 20)
  }, [eventTitles, search])

  const saveLabel = () => {
    const v = labelDraft.trim()
    if (v && v !== metric.label) onUpdateMetric(goalId, metric.id, { label: v })
    setEditingLabel(false)
  }
  const saveTarget = () => {
    const v = parseInt(targetDraft, 10)
    if (!Number.isNaN(v) && v > 0 && v !== metric.target) onUpdateMetric(goalId, metric.id, { target: v })
    setEditingTarget(false)
  }

  return (
    <div className="rm-metric" style={{ ['--metric-color' as string]: color }}>
      <span className="rm-metric-bar" style={{ background: color }} />

      <div className="rm-metric-top">
        <span className="rm-metric-dot" style={{ background: color }} />
        {editingLabel ? (
          <input
            className="rm-metric-label-input"
            value={labelDraft}
            autoFocus
            onChange={(e) => setLabelDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveLabel()
              else if (e.key === 'Escape') setEditingLabel(false)
            }}
            onBlur={saveLabel}
          />
        ) : (
          <span
            className="rm-metric-label"
            onClick={() => {
              setLabelDraft(metric.label)
              setEditingLabel(true)
            }}
          >
            {metric.label}
          </span>
        )}

        <div className="rm-metric-tools" ref={pickerRef}>
          <button
            className={`rm-metric-tool ${metric.linkedEventIds.length > 0 ? 'rm-metric-tool-active' : ''}`}
            title={metric.linkedEventIds.length > 0 ? `已绑定 ${metric.linkedEventIds.length} 个事件（自动 +${autoCount}）` : '绑定事件自动累加'}
            onClick={() => setPickerOpen((p) => !p)}
          >
            <Link2 size={12} strokeWidth={1.75} />
          </button>
          <button className="rm-metric-tool" title="删除指标" onClick={() => onRemoveMetric(goalId, metric.id)}>
            <X size={12} strokeWidth={1.75} />
          </button>

          {pickerOpen && (
            <div className="roadmap-cat-picker roadmap-event-picker rm-metric-picker">
              <div className="roadmap-event-search">
                <input
                  className="roadmap-event-search-input"
                  placeholder="搜索事件…"
                  value={search}
                  autoFocus
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="roadmap-event-list">
                {filteredEvents.map((e) => {
                  const linked = metric.linkedEventIds.includes(e.id)
                  return (
                    <button
                      key={e.id}
                      className={`roadmap-event-item ${linked ? 'roadmap-event-item-active' : ''}`}
                      onClick={() => onToggleMetricEvent(goalId, metric.id, e.id)}
                    >
                      <span className="roadmap-event-dot" style={{ backgroundColor: `var(--event-${e.categoryId}-fill)` }} />
                      <span className="roadmap-event-title">{e.title}</span>
                      {linked && <X size={10} strokeWidth={2} className="roadmap-event-check" />}
                    </button>
                  )
                })}
                {filteredEvents.length === 0 && <div className="roadmap-event-empty">无匹配事件</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="rm-metric-stepper">
        <button className="rm-step-btn" onClick={() => onIncrement(goalId, metric.id, -1)} title="−1">
          <Minus size={15} strokeWidth={2.25} />
        </button>
        <div className="rm-metric-nums">
          <span className="rm-metric-current">{current}</span>
          <span className="rm-metric-arrow">→</span>
          {editingTarget ? (
            <input
              className="rm-metric-target-input"
              value={targetDraft}
              autoFocus
              inputMode="numeric"
              onChange={(e) => setTargetDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveTarget()
                else if (e.key === 'Escape') setEditingTarget(false)
              }}
              onBlur={saveTarget}
            />
          ) : (
            <span
              className="rm-metric-target"
              onClick={() => {
                setTargetDraft(String(metric.target))
                setEditingTarget(true)
              }}
            >
              {metric.target}
            </span>
          )}
          <span className="rm-metric-unit">{metric.unit}</span>
        </div>
        <button className="rm-step-btn" onClick={() => onIncrement(goalId, metric.id, 1)} title="+1">
          <Plus size={15} strokeWidth={2.25} />
        </button>
      </div>

      <span className="rm-metric-track">
        <span className="rm-metric-fill" style={{ width: `${percent}%`, background: color }} />
      </span>
    </div>
  )
}

// ── 主卡 ─────────────────────────────────────────────────────
export function KeyMetricsCard({
  goal,
  events,
  onAddMetric,
  onIncrement,
  onUpdateMetric,
  onRemoveMetric,
  onToggleMetricEvent,
}: KeyMetricsCardProps) {
  const [adding, setAdding] = useState(false)
  const [value, setValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const metrics = goal.metrics ?? []

  const autoCounts = useMemo(() => {
    const m = new Map<string, number>()
    for (const metric of metrics) m.set(metric.id, computeMetricAutoCount(metric, events))
    return m
  }, [metrics, events])

  const aggregate = useMemo(() => aggregateMetricsPercent(metrics, autoCounts), [metrics, autoCounts])

  useEffect(() => {
    if (adding) setTimeout(() => inputRef.current?.focus(), 0)
  }, [adding])

  const submit = useCallback(async () => {
    const val = value.trim()
    setValue('')
    setAdding(false)
    if (val) await onAddMetric(goal.id, { label: val })
  }, [value, goal.id, onAddMetric])

  return (
    <div className="rm-card">
      <div className="rm-card-head">
        <div className="rm-card-head-left">
          <span className="rm-card-title">{goal.title}的关键指标</span>
        </div>
        <div className="rm-card-head-right">
          {metrics.length > 0 && <AggregateRing percent={aggregate} />}
          <button className="rm-icon-btn" title="加指标" onClick={() => setAdding(true)}>
            <Plus size={18} strokeWidth={2} />
          </button>
        </div>
      </div>

      {adding && (
        <div className="rm-metric-add-row">
          <input
            ref={inputRef}
            className="rm-task-input"
            placeholder="指标名称…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit()
              else if (e.key === 'Escape') {
                setAdding(false)
                setValue('')
              }
            }}
            onBlur={submit}
          />
        </div>
      )}

      {metrics.length === 0 && !adding ? (
        <div className="rm-task-empty">还没有关键指标，点右上角 + 添加</div>
      ) : (
        <div className="rm-metrics-grid">
          {metrics.map((m) => (
            <MetricCard
              key={m.id}
              goalId={goal.id}
              metric={m}
              autoCount={autoCounts.get(m.id) ?? 0}
              events={events}
              onIncrement={onIncrement}
              onUpdateMetric={onUpdateMetric}
              onRemoveMetric={onRemoveMetric}
              onToggleMetricEvent={onToggleMetricEvent}
            />
          ))}
        </div>
      )}
    </div>
  )
}

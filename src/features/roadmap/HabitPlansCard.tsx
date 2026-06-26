/**
 * # HabitPlansCard — 习惯调节计划卡（规划页）
 *
 * 独立于目标树的「分阶段增减某些活动时间 + 达标检测」。
 * 上：每个计划的实时状态（当前阶段 / 各流实测 vs 目标 / 连续达标）。
 * 编辑：流（关键词 + 方向 + 颜色）与阶段目标（小时/天）。
 *
 * 数据存于 settings.habitPlans（与 hygieneActivities 同为用户自定义列表）。
 * 检测纯函数在 domain/habitPlan。
 */

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Plus, X, Pencil, Trash2, ArrowDown, ArrowUp, Check, AlertTriangle } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { EVENT_COLORS, type EventColor } from '@/domain/event'
import { formatISODate, parseISODate } from '@/domain/time'
import {
  type HabitPlan,
  type PlanStream,
  type StreamDirection,
  makeStream,
  startOfLocalDay,
  evaluatePlan,
} from '@/domain/habitPlan'

// ── 工具 ────────────────────────────────────────────────────

function parseTerms(s: string): string[] {
  return s.split(/[,，、\s]+/).map((t) => t.trim()).filter(Boolean)
}

const fmt = (h: number) => h.toFixed(1)

/** 受控输入：本地草稿，失焦 / 回车提交，避免每键回写 store 造成卡顿 */
function CommitInput({
  value, onCommit, className, placeholder, inputMode,
}: {
  value: string
  onCommit: (v: string) => void
  className?: string
  placeholder?: string
  inputMode?: 'text' | 'numeric' | 'decimal'
}) {
  const [draft, setDraft] = useState(value)
  useEffect(() => { setDraft(value) }, [value])
  return (
    <input
      className={className}
      value={draft}
      placeholder={placeholder}
      inputMode={inputMode}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { if (draft !== value) onCommit(draft) }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
        else if (e.key === 'Escape') { setDraft(value); (e.target as HTMLInputElement).blur() }
      }}
    />
  )
}

// ── 状态视图 ────────────────────────────────────────────────

function PlanStatus({ plan }: { plan: HabitPlan }) {
  const events = useEventStore((s) => s.events)
  const prog = useMemo(() => evaluatePlan(plan, events, Date.now()), [plan, events])
  const streamById = useMemo(() => new Map(plan.streams.map((s) => [s.id, s])), [plan.streams])

  if (plan.streams.length === 0) {
    return <div className="habit-empty-hint">还没有流，点「编辑」添加要增减的活动</div>
  }

  return (
    <div className="habit-status">
      <div className="habit-phase-row">
        <span className="habit-phase-pill">
          第 {prog.phaseIndex + 1}/{plan.phases.length} 阶段 · {prog.phaseLabel || '—'}
        </span>
        <span className="habit-phase-left">本阶段还剩 {prog.daysLeftInPhase} 天</span>
      </div>

      {prog.streams.map((sp) => {
        const stream = streamById.get(sp.streamId)
        if (!stream) return null
        const color = stream.color ? `var(--event-${stream.color}-fill)` : 'var(--accent)'
        const dec = sp.direction === 'decrease'
        // 进度条：减少 → actual/target 越低越好（>1 溢出染红）；增加 → actual/target 充满即达标
        const ratio = sp.target > 0 ? sp.actualPerDay / sp.target : (sp.actualPerDay > 0 ? 1 : 0)
        const fillPct = Math.max(0, Math.min(100, ratio * 100))
        return (
          <div key={sp.streamId} className="habit-stream-row">
            <span className="habit-stream-dir" style={{ color }}>
              {dec ? <ArrowDown size={13} strokeWidth={2.25} /> : <ArrowUp size={13} strokeWidth={2.25} />}
            </span>
            <span className="habit-stream-label" style={{ color }}>{stream.label}</span>
            <span className="habit-stream-actual">{fmt(sp.actualPerDay)}<span className="habit-unit">h/天</span></span>
            <span className="habit-stream-target">目标 {dec ? '≤' : '≥'} {fmt(sp.target)}</span>
            <span className="habit-track">
              <span
                className="habit-track-fill"
                style={{ width: `${fillPct}%`, background: sp.onTrack ? color : 'var(--color-text-danger, #B53535)' }}
              />
            </span>
            <span className={`habit-stream-flag ${sp.onTrack ? 'is-ok' : 'is-off'}`}>
              {sp.onTrack
                ? <><Check size={12} strokeWidth={2.5} /> 达标</>
                : <><AlertTriangle size={12} strokeWidth={2.25} /> {dec ? `超 ${fmt(sp.actualPerDay - sp.target)}` : `差 ${fmt(sp.target - sp.actualPerDay)}`}</>}
            </span>
            <span className="habit-stream-streak">连续 {sp.currentStreak} 天</span>
          </div>
        )
      })}
    </div>
  )
}

// ── 编辑器 ──────────────────────────────────────────────────

function PlanEditor({ plan, onUpdate }: { plan: HabitPlan; onUpdate: (p: HabitPlan) => void }) {
  const setStreams = (streams: PlanStream[]) => onUpdate({ ...plan, streams })

  const addStream = () => {
    setStreams([...plan.streams, makeStream(crypto.randomUUID(), { label: '新活动', direction: 'decrease', color: 'accent' })])
  }
  const removeStream = (id: string) => {
    onUpdate({
      ...plan,
      streams: plan.streams.filter((s) => s.id !== id),
      phases: plan.phases.map((ph) => {
        const t = { ...ph.targets }; delete t[id]; return { ...ph, targets: t }
      }),
    })
  }
  const patchStream = (id: string, patch: Partial<PlanStream>) =>
    setStreams(plan.streams.map((s) => (s.id === id ? { ...s, ...patch } : s)))

  const setTarget = (phaseId: string, streamId: string, raw: string) => {
    const v = parseFloat(raw)
    const val = Number.isFinite(v) && v >= 0 ? v : 0
    onUpdate({
      ...plan,
      phases: plan.phases.map((ph) => (ph.id === phaseId ? { ...ph, targets: { ...ph.targets, [streamId]: val } } : ph)),
    })
  }

  return (
    <div className="habit-editor">
      <div className="habit-edit-meta">
        <label className="habit-edit-field">
          <span>起始</span>
          <input
            type="date"
            className="habit-input"
            value={formatISODate(new Date(plan.startDate))}
            onChange={(e) => {
              const d = parseISODate(e.target.value)
              if (!isNaN(d.getTime())) onUpdate({ ...plan, startDate: startOfLocalDay(d.getTime()) })
            }}
          />
        </label>
        <label className="habit-edit-field">
          <span>每阶段</span>
          <CommitInput
            className="habit-input habit-input-num"
            inputMode="numeric"
            value={String(plan.phaseLengthDays)}
            onCommit={(v) => {
              const n = parseInt(v, 10)
              if (Number.isFinite(n) && n > 0) onUpdate({ ...plan, phaseLengthDays: n })
            }}
          />
          <span>天</span>
        </label>
      </div>

      {/* 流 */}
      <div className="habit-edit-section-title">流（要调节的活动）</div>
      <div className="habit-stream-edit-list">
        {plan.streams.map((s) => (
          <div key={s.id} className="habit-stream-edit">
            <button
              className="habit-dir-toggle"
              title={s.direction === 'decrease' ? '减少（点切换为增加）' : '增加（点切换为减少）'}
              onClick={() => patchStream(s.id, { direction: (s.direction === 'decrease' ? 'increase' : 'decrease') as StreamDirection })}
            >
              {s.direction === 'decrease' ? <ArrowDown size={14} strokeWidth={2.25} /> : <ArrowUp size={14} strokeWidth={2.25} />}
              <span>{s.direction === 'decrease' ? '减少' : '增加'}</span>
            </button>
            <CommitInput className="habit-input habit-input-label" placeholder="活动名" value={s.label} onCommit={(v) => patchStream(s.id, { label: v.trim() || '未命名' })} />
            <CommitInput className="habit-input habit-input-terms" placeholder="关键词，逗号分隔（匹配事件标题）" value={s.terms.join(', ')} onCommit={(v) => patchStream(s.id, { terms: parseTerms(v) })} />
            <span className="habit-color-dots">
              {EVENT_COLORS.map((c: EventColor) => (
                <button
                  key={c}
                  className={`habit-color-dot ${s.color === c ? 'is-active' : ''}`}
                  style={{ background: `var(--event-${c}-fill)` }}
                  onClick={() => patchStream(s.id, { color: c })}
                  title={c}
                />
              ))}
            </span>
            <button className="habit-icon-btn" title="删除流" onClick={() => removeStream(s.id)}><X size={14} strokeWidth={2} /></button>
          </div>
        ))}
        <button className="habit-add-stream" onClick={addStream}><Plus size={14} strokeWidth={2} /> 加一条流</button>
      </div>

      {/* 阶段目标 */}
      {plan.streams.length > 0 && (
        <>
          <div className="habit-edit-section-title">阶段目标（小时/天）</div>
          <div className="habit-target-grid" style={{ gridTemplateColumns: `auto repeat(${plan.streams.length}, minmax(56px, 1fr))` }}>
            <span className="habit-grid-corner" />
            {plan.streams.map((s) => (
              <span key={s.id} className="habit-grid-head" style={{ color: s.color ? `var(--event-${s.color}-fill)` : 'var(--accent)' }}>
                {s.label}{s.direction === 'decrease' ? '↓' : '↑'}
              </span>
            ))}
            {plan.phases.map((ph) => (
              <FragmentRow key={ph.id}>
                <span className="habit-grid-phase">{ph.label}</span>
                {plan.streams.map((s) => (
                  <CommitInput
                    key={s.id}
                    className="habit-input habit-target-cell"
                    inputMode="decimal"
                    value={ph.targets[s.id] != null ? String(ph.targets[s.id]) : ''}
                    onCommit={(v) => setTarget(ph.id, s.id, v)}
                  />
                ))}
              </FragmentRow>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

// grid 需要把每行的单元格平铺到同一个 grid 容器里，用 Fragment 包一行
function FragmentRow({ children }: { children: ReactNode }) {
  return <>{children}</>
}

// ── 主卡 ────────────────────────────────────────────────────

export function HabitPlansCard() {
  const plans = useAppSettingsStore((s) => s.settings.habitPlans) ?? []
  const createHabitPlan = useAppSettingsStore((s) => s.createHabitPlan)
  const updateHabitPlan = useAppSettingsStore((s) => s.updateHabitPlan)
  const deleteHabitPlan = useAppSettingsStore((s) => s.deleteHabitPlan)
  const [editingId, setEditingId] = useState<string | null>(null)

  const handleCreate = async () => {
    const plan = await createHabitPlan('新习惯计划')
    setEditingId(plan.id)
  }

  return (
    <div className="habit-card">
      <style>{HABIT_CSS}</style>
      <div className="habit-card-head">
        <span className="habit-card-title">习惯计划</span>
        <button className="habit-new-btn" onClick={handleCreate}><Plus size={15} strokeWidth={2} /> 新建</button>
      </div>

      {plans.length === 0 ? (
        <div className="habit-empty">分阶段地少做某些事、多做某些事，并检测是否达标。点「新建」开始。</div>
      ) : (
        <div className="habit-plan-list">
          {plans.map((plan) => {
            const editing = editingId === plan.id
            return (
              <div key={plan.id} className="habit-plan">
                <div className="habit-plan-head">
                  <CommitInput
                    className="habit-input habit-plan-title"
                    value={plan.title}
                    onCommit={(v) => updateHabitPlan({ ...plan, title: v.trim() || '未命名计划' })}
                  />
                  <div className="habit-plan-actions">
                    <button
                      className={`habit-icon-btn ${editing ? 'is-active' : ''}`}
                      title={editing ? '收起编辑' : '编辑'}
                      onClick={() => setEditingId(editing ? null : plan.id)}
                    >
                      <Pencil size={14} strokeWidth={1.9} />
                    </button>
                    <button className="habit-icon-btn" title="删除计划" onClick={() => { if (editingId === plan.id) setEditingId(null); deleteHabitPlan(plan.id) }}>
                      <Trash2 size={14} strokeWidth={1.9} />
                    </button>
                  </div>
                </div>

                <PlanStatus plan={plan} />
                {editing && <PlanEditor plan={plan} onUpdate={updateHabitPlan} />}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Scoped CSS ──────────────────────────────────────────────

const HABIT_CSS = `
.habit-card {
  background: var(--surface-raised, var(--heatmap-bg-card));
  border: 1px solid var(--border-subtle, var(--heatmap-rule));
  border-radius: 12px;
  padding: 16px 18px;
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
}
.habit-card-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
.habit-card-title { font-size: 15px; font-weight: 600; color: var(--text-primary, var(--heatmap-ink-1)); letter-spacing: 0.02em; }
.habit-new-btn, .habit-add-stream {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 12px; font-weight: 500; color: var(--accent);
  background: transparent; border: 1px dashed var(--accent); border-radius: 8px;
  padding: 4px 10px; cursor: pointer; transition: background-color 0.2s ease;
}
.habit-new-btn:hover, .habit-add-stream:hover { background: var(--event-accent-bg, rgba(196,122,90,0.1)); }
.habit-empty, .habit-empty-hint { font-size: 13px; color: var(--text-tertiary, var(--heatmap-ink-3)); padding: 8px 2px; line-height: 1.6; }
.habit-empty-hint { padding: 6px 0; font-style: italic; }

.habit-plan-list { display: flex; flex-direction: column; gap: 16px; }
.habit-plan { border-top: 1px solid var(--border-subtle, var(--heatmap-rule)); padding-top: 12px; }
.habit-plan:first-child { border-top: none; padding-top: 0; }
.habit-plan-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.habit-plan-title { font-size: 14px; font-weight: 600; flex: 1; }
.habit-plan-actions { display: flex; gap: 2px; }

.habit-icon-btn {
  width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
  border-radius: 6px; border: none; background: transparent; cursor: pointer;
  color: var(--text-tertiary, var(--heatmap-ink-3)); transition: background-color 0.2s ease, color 0.2s ease;
}
.habit-icon-btn:hover { background: var(--surface-sunken, rgba(0,0,0,0.05)); color: var(--text-primary, var(--heatmap-ink-1)); }
.habit-icon-btn.is-active { color: var(--accent); }

/* 状态 */
.habit-status { display: flex; flex-direction: column; gap: 7px; }
.habit-phase-row { display: flex; align-items: center; gap: 10px; margin-bottom: 2px; }
.habit-phase-pill { font-size: 12px; font-weight: 600; color: var(--text-secondary, var(--heatmap-ink-2)); background: var(--surface-sunken, rgba(0,0,0,0.05)); border-radius: 999px; padding: 2px 10px; }
.habit-phase-left { font-size: 11px; color: var(--text-tertiary, var(--heatmap-ink-3)); }

.habit-stream-row { display: grid; grid-template-columns: 16px minmax(48px, 88px) 64px 78px 1fr auto auto; align-items: center; gap: 8px; font-size: 12px; }
.habit-stream-dir { display: inline-flex; }
.habit-stream-label { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.habit-stream-actual { font-family: 'JetBrains Mono', monospace; font-size: 13px; color: var(--text-primary, var(--heatmap-ink-1)); }
.habit-unit { font-size: 10px; color: var(--text-tertiary, var(--heatmap-ink-3)); margin-left: 1px; }
.habit-stream-target { font-size: 11px; color: var(--text-tertiary, var(--heatmap-ink-3)); white-space: nowrap; }
.habit-track { height: 5px; border-radius: 999px; background: var(--surface-sunken, rgba(0,0,0,0.06)); overflow: hidden; min-width: 40px; }
.habit-track-fill { display: block; height: 100%; border-radius: 999px; transition: width 400ms ease-out; }
.habit-stream-flag { display: inline-flex; align-items: center; gap: 3px; font-size: 11px; font-weight: 500; white-space: nowrap; }
.habit-stream-flag.is-ok { color: var(--color-text-success, #2D7D46); }
.habit-stream-flag.is-off { color: var(--color-text-danger, #B53535); }
.habit-stream-streak { font-size: 11px; color: var(--text-tertiary, var(--heatmap-ink-3)); white-space: nowrap; }

/* 编辑器 */
.habit-editor { margin-top: 12px; padding: 12px; border-radius: 8px; background: var(--surface-sunken, rgba(0,0,0,0.03)); display: flex; flex-direction: column; gap: 12px; }
.habit-edit-meta { display: flex; gap: 16px; flex-wrap: wrap; }
.habit-edit-field { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-secondary, var(--heatmap-ink-2)); }
.habit-edit-section-title { font-size: 12px; font-weight: 600; color: var(--text-secondary, var(--heatmap-ink-2)); }

.habit-input {
  font-family: inherit; font-size: 13px; color: var(--text-primary, var(--heatmap-ink-1));
  background: var(--surface-base, var(--heatmap-bg)); border: 1px solid var(--border-subtle, var(--heatmap-rule));
  border-radius: 6px; padding: 4px 8px; outline: none;
}
.habit-input:focus { border-color: var(--accent); }
.habit-input-num { width: 48px; text-align: center; }
.habit-input-label { width: 96px; }
.habit-input-terms { flex: 1; min-width: 140px; }
.habit-target-cell { width: 100%; text-align: center; padding: 4px 4px; }

.habit-stream-edit-list { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; }
.habit-stream-edit { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; width: 100%; }
.habit-dir-toggle {
  display: inline-flex; align-items: center; gap: 3px; font-size: 12px; font-weight: 500;
  color: var(--text-secondary, var(--heatmap-ink-2)); background: var(--surface-base, var(--heatmap-bg));
  border: 1px solid var(--border-subtle, var(--heatmap-rule)); border-radius: 6px; padding: 4px 8px; cursor: pointer;
}
.habit-color-dots { display: inline-flex; gap: 4px; }
.habit-color-dot { width: 16px; height: 16px; border-radius: 999px; border: 2px solid transparent; cursor: pointer; padding: 0; }
.habit-color-dot.is-active { border-color: var(--text-primary, var(--heatmap-ink-1)); }

.habit-target-grid { display: grid; gap: 6px 8px; align-items: center; }
.habit-grid-corner { }
.habit-grid-head { font-size: 11px; font-weight: 600; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.habit-grid-phase { font-size: 12px; color: var(--text-secondary, var(--heatmap-ink-2)); white-space: nowrap; }

@media (max-width: 719px) {
  .habit-stream-row { grid-template-columns: 14px 1fr auto; row-gap: 2px; }
  .habit-stream-target, .habit-track, .habit-stream-streak { display: none; }
}
`

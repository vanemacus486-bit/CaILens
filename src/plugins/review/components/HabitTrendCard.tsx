/**
 * # HabitTrendCard — 习惯计划进度（复盘·趋势侧）
 *
 * 每个活跃计划的每条流一张近 8 周 actual-vs-target 小图：
 * 实线 = 实测小时/周（流颜色），虚线阶梯 = 目标（随阶段升/降）。
 * 关键词流只是某分类的子集，故独立成图，不叠在分类趋势线上。
 */

import { useMemo } from 'react'
import { ComposedChart, Area, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'
import { format } from 'date-fns'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useAppSettingsStore } from '@/stores/settingsStore'
import { useEventStore } from '@/stores/eventStore'
import { streamWeeklySeries, type HabitPlan, type PlanStream } from '@/domain/habitPlan'

function StreamMini({ plan, stream, events }: { plan: HabitPlan; stream: PlanStream; events: ReturnType<typeof useEventStore.getState>['rangeEvents'] }) {
  const data = useMemo(
    () =>
      streamWeeklySeries(plan, stream, events, Date.now(), 8).map((p) => ({
        label: format(new Date(p.weekStart), 'MM.dd'),
        actual: Math.round(p.actual * 10) / 10,
        target: Math.round(p.target * 10) / 10,
      })),
    [plan, stream, events],
  )
  const color = stream.color ? `var(--event-${stream.color}-fill)` : 'var(--accent)'
  const dec = stream.direction === 'decrease'

  return (
    <div className="habit-trend-stream">
      <div className="habit-trend-stream-head" style={{ color }}>
        {dec ? <ArrowDown size={12} strokeWidth={2.25} /> : <ArrowUp size={12} strokeWidth={2.25} />}
        <span className="habit-trend-stream-name">{stream.label}</span>
        <span className="habit-trend-dir-note">{dec ? '目标递减' : '目标递增'}</span>
      </div>
      <div className="habit-trend-chart">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 6, right: 8, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={{ stroke: 'var(--line)' }}
              interval="preserveStartEnd"
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: 'var(--font-mono)' }}
              tickLine={false}
              axisLine={false}
              width={26}
            />
            <Area type="monotone" dataKey="actual" fill={color} fillOpacity={0.08} stroke="none" isAnimationActive={false} />
            <Line type="monotone" dataKey="actual" stroke={color} strokeWidth={1.75} dot={false} isAnimationActive={false} />
            <Line type="stepAfter" dataKey="target" stroke="var(--ink-3)" strokeWidth={1} strokeDasharray="4 3" dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export function HabitTrendCard() {
  const plans = useAppSettingsStore((s) => s.settings.habitPlans)
  const events = useEventStore((s) => s.rangeEvents)
  const active = useMemo(
    () => (plans ?? []).filter((p) => p.status === 'active' && p.streams.length > 0),
    [plans],
  )

  if (active.length === 0) return null

  return (
    <div className="habit-trend">
      <style>{HABIT_TREND_CSS}</style>
      <div className="habit-trend-head">
        <span className="habit-trend-title">习惯计划进度</span>
        <span className="habit-trend-legend">实线 实测 · 虚线 目标（小时/周）</span>
      </div>
      {active.map((plan) => (
        <div key={plan.id} className="habit-trend-plan">
          <div className="habit-trend-plan-name">{plan.title}</div>
          <div className="habit-trend-streams">
            {plan.streams.map((s) => (
              <StreamMini key={s.id} plan={plan} stream={s} events={events} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

const HABIT_TREND_CSS = `
.habit-trend {
  margin-top: 36px;
  padding-top: 24px;
  border-top: 1px solid var(--heatmap-rule, rgba(0,0,0,0.1));
  font-family: 'Source Serif 4', 'Noto Serif SC', serif;
}
.habit-trend-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; }
.habit-trend-title { font-size: 18px; font-weight: 600; color: var(--heatmap-ink-1, #2b2b2b); }
.habit-trend-legend { font-size: 11px; color: var(--heatmap-ink-3, #999); }
.habit-trend-plan { margin-bottom: 20px; }
.habit-trend-plan-name { font-size: 13px; font-weight: 600; color: var(--heatmap-ink-2, #555); margin-bottom: 8px; }
.habit-trend-streams { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px 24px; }
.habit-trend-stream-head { display: flex; align-items: center; gap: 5px; font-size: 12px; font-weight: 600; margin-bottom: 2px; }
.habit-trend-stream-name { }
.habit-trend-dir-note { font-size: 10px; font-weight: 400; color: var(--heatmap-ink-3, #999); margin-left: 2px; }
.habit-trend-chart { height: 112px; }
.habit-trend .recharts-cartesian-axis-tick text { fill: var(--ink-3, #999) !important; }
`
